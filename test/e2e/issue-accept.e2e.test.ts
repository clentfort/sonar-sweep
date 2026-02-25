import { createServer } from "node:http";

import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { runCli } from "./support/run-cli.js";
import { setupCliProcess } from "./support/setup-cli-process.js";

describe("issue-accept e2e", () => {
  const { stderrSpy, stdoutSpy } = setupCliProcess();
  let server: ReturnType<typeof createServer>;
  let baseUrl = "";

  beforeAll(async () => {
    server = createServer((request, response) => {
      const url = new URL(request.url ?? "/", "http://127.0.0.1");

      if (url.pathname === "/api/issues/do_transition" && request.method === "POST") {
        response.statusCode = 204;
        response.end("");
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

  it("accepts issue and returns JSON", async () => {
    await runCli([
      "issue-accept",
      "AZ-issue",
      "--token",
      "token",
      "--base-url",
      baseUrl,
      "--comment",
      "Accepted as known false alarm",
      "--json",
    ]);

    expect(stderrSpy()).not.toHaveBeenCalled();
    const output = String(stdoutSpy().mock.calls[0]?.[0]);
    const parsed = JSON.parse(output);

    expect(parsed).toEqual({
      applied: true,
      issueKey: "AZ-issue",
      transition: "accept",
    });
  });
});
