import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./pr-review.js";

const { getPullRequestReviewMock } = vi.hoisted(() => ({
  getPullRequestReviewMock: vi.fn(),
}));

vi.mock("../../service/pr-review.js", () => ({
  getPullRequestReview: getPullRequestReviewMock,
}));

describe("pr-review command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    expect(builder(yargs([]))).toBeDefined();
  });

  it("prints contextual review output", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestReviewMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      issues: [
        {
          file: "src/app.ts",
          issueStatus: "OPEN",
          issueUrl: "https://sonar/issue",
          key: "AZ-1",
          line: 10,
          message: "Fix this.",
          rule: "ts:S1",
          severity: "MINOR",
          snippet: {
            endLine: 11,
            lines: [
              { highlight: false, line: 9, text: "x" },
              { highlight: true, line: 10, text: "y" },
              { highlight: false, line: 11, text: "z" },
            ],
            startLine: 9,
          },
          status: "OPEN",
          type: "CODE_SMELL",
        },
      ],
      projectKey: "project",
      pullRequest: "42",
      total: 1,
    });

    await handler({
      baseUrl: "https://sonar",
      contextLines: 3,
      json: false,
      page: 1,
      pageSize: 20,
      projectKey: "project",
      pullRequest: "42",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Found 1 open issue(s)");
    expect(output).toContain("Context:");
    expect(output).toContain(">   10 | y");
  });
});
