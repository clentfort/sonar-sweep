import { execFileSync } from "node:child_process";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { createServer } from "node:http";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it } from "vitest";

import { runCli } from "./support/run-cli.js";
import { setupCliProcess } from "./support/setup-cli-process.js";

describe("project key auto-detection e2e", () => {
  const { stderrSpy, stdoutSpy } = setupCliProcess();
  let server: ReturnType<typeof createServer>;
  let baseUrl = "";
  let tempRepoPath = "";
  let originalCwd = "";

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/api/qualitygates/project_status") {
        if (url.searchParams.get("projectKey") !== "auto_detected_project") {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: "wrong project key" }));
          return;
        }

        response.setHeader("content-type", "application/json");
        response.end(JSON.stringify({ projectStatus: { conditions: [], status: "OK" } }));
        return;
      }

      if (url.pathname === "/api/issues/search") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({ facets: [{ property: "issueStatuses", values: [] }], total: 0 }),
        );
        return;
      }

      if (url.pathname === "/api/measures/component") {
        if (url.searchParams.get("component") !== "auto_detected_project") {
          response.statusCode = 400;
          response.end(JSON.stringify({ error: "wrong component key" }));
          return;
        }

        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            component: {
              measures: [
                { metric: "new_security_hotspots", periods: [{ index: 1, value: "0" }] },
                { metric: "new_coverage", periods: [{ index: 1, value: "100" }] },
                { metric: "new_duplicated_lines_density", periods: [{ index: 1, value: "0" }] },
              ],
            },
          }),
        );
        return;
      }

      response.statusCode = 404;
      response.end(JSON.stringify({ error: "not found" }));
    });

    await new Promise<void>((resolve) => {
      server.listen(0, "127.0.0.1", () => resolve());
    });

    const address = server.address();
    if (!address || typeof address === "string") {
      throw new Error("Failed to get test server address");
    }
    baseUrl = `http://127.0.0.1:${address.port}`;
  });

  beforeEach(() => {
    originalCwd = process.cwd();
    tempRepoPath = mkdtempSync(join(tmpdir(), "sonar-sweep-e2e-"));
    execFileSync("git", ["init"], { cwd: tempRepoPath, stdio: "ignore" });
    writeFileSync(
      join(tempRepoPath, "sonar-project.properties"),
      ["sonar.projectKey=auto_detected_project", "sonar.organization=example-org"].join("\n"),
      "utf8",
    );
    process.chdir(tempRepoPath);
  });

  afterEach(() => {
    process.chdir(originalCwd);
    if (tempRepoPath) {
      rmSync(tempRepoPath, { force: true, recursive: true });
    }
  });

  afterAll(async () => {
    await new Promise<void>((resolve, reject) => {
      server.close((error) => {
        if (error) {
          reject(error);
          return;
        }
        resolve();
      });
    });
  });

  it("uses sonar-project.properties when project key is omitted", async () => {
    await runCli(["pr-report", "77", "--token", "token", "--base-url", baseUrl, "--json"]);

    expect(stderrSpy()).not.toHaveBeenCalled();
    const output = String(stdoutSpy().mock.calls[0]?.[0]);
    const parsed = JSON.parse(output);

    expect(parsed.projectKey).toBe("auto_detected_project");
    expect(parsed.pullRequest).toBe("77");
  });
});
