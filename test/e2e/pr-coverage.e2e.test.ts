import { createServer } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCli } from "./support/run-cli.js";
import { setupCliProcess } from "./support/setup-cli-process.js";

describe("pr-coverage e2e", () => {
  const { stderrSpy, stdoutSpy } = setupCliProcess();
  let server: ReturnType<typeof createServer>;
  let baseUrl = "";

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/api/measures/component_tree") {
        response.setHeader("content-type", "application/json");
        response.end(
          JSON.stringify({
            components: [
              {
                key: "demo:src/a.ts",
                measures: [
                  { metric: "new_coverage", periods: [{ index: 1, value: "50" }] },
                  { metric: "new_lines_to_cover", periods: [{ index: 1, value: "10" }] },
                  { metric: "new_uncovered_lines", periods: [{ index: 1, value: "5" }] },
                ],
                name: "a.ts",
                path: "src/a.ts",
              },
              {
                key: "demo:src/b.ts",
                measures: [
                  { metric: "new_coverage", periods: [{ index: 1, value: "90" }] },
                  { metric: "new_lines_to_cover", periods: [{ index: 1, value: "10" }] },
                  { metric: "new_uncovered_lines", periods: [{ index: 1, value: "1" }] },
                ],
                name: "b.ts",
                path: "src/b.ts",
              },
            ],
            paging: { pageIndex: 1, pageSize: 500, total: 2 },
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

  it("returns low-coverage files as JSON", async () => {
    await runCli([
      "pr-coverage",
      "77",
      "--projectKey",
      "demo_project",
      "--token",
      "token",
      "--base-url",
      baseUrl,
      "--threshold",
      "80",
      "--json",
    ]);

    expect(stderrSpy()).not.toHaveBeenCalled();
    const output = String(stdoutSpy().mock.calls[0]?.[0]);
    const parsed = JSON.parse(output);

    expect(parsed.files).toEqual([
      {
        coverageOnNewCode: 50,
        file: "src/a.ts",
        linesToCover: 10,
        uncoveredLines: 5,
      },
    ]);
  });
});
