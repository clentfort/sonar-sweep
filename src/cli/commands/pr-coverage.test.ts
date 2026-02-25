import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./pr-coverage.js";

const { getPullRequestCoverageMock } = vi.hoisted(() => ({
  getPullRequestCoverageMock: vi.fn(),
}));

vi.mock("../../service/pr-coverage.js", () => ({
  getPullRequestCoverage: getPullRequestCoverageMock,
}));

describe("pr-coverage command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    expect(builder(yargs([]))).toBeDefined();
  });

  it("prints text output", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestCoverageMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      files: [
        {
          coverageOnNewCode: 60,
          file: "src/a.ts",
          linesToCover: 10,
          uncoveredLines: 4,
        },
      ],
      projectKey: "project",
      pullRequest: "42",
      threshold: 80,
    });

    await handler({
      baseUrl: "https://sonar",
      includePassing: false,
      json: false,
      maxFiles: 20,
      projectKey: "project",
      pullRequest: "42",
      threshold: 80,
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Found 1 file(s) below 80.0%");
    expect(output).toContain("src/a.ts: 60.0%");
  });
});
