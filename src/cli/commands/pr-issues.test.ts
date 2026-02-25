import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./pr-issues.js";

const { getPullRequestIssuesMock } = vi.hoisted(() => ({
  getPullRequestIssuesMock: vi.fn(),
}));

vi.mock("../../service/pr-issues.js", () => ({
  getPullRequestIssues: getPullRequestIssuesMock,
}));

describe("pr-issues command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    const result = builder(yargs([]));
    expect(result).toBeDefined();
  });

  it("prints issue list output", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestIssuesMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      issues: [
        {
          effort: "1min",
          file: "src/app.ts",
          issueStatus: "OPEN",
          key: "AZ-1",
          line: 10,
          message: "Fix this.",
          rule: "ts:S1",
          severity: "MINOR",
          status: "OPEN",
          type: "CODE_SMELL",
        },
      ],
      page: 1,
      pageSize: 100,
      projectKey: "project",
      pullRequest: "42",
      total: 1,
    });

    await handler({
      baseUrl: "https://sonar",
      json: false,
      page: 1,
      pageSize: 100,
      projectKey: "project",
      pullRequest: "42",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Found 1 open issue(s)");
    expect(output).toContain("src/app.ts:10");
  });

  it("prints JSON when requested", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestIssuesMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      issues: [],
      page: 1,
      pageSize: 100,
      projectKey: "project",
      pullRequest: "42",
      total: 0,
    });

    await handler({
      baseUrl: "https://sonar",
      json: true,
      page: 1,
      pageSize: 100,
      projectKey: "project",
      pullRequest: "42",
      token: "token",
    });

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"issues": []');
  });
});
