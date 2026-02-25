import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./pr-report.js";

const { getPullRequestReportMock } = vi.hoisted(() => ({
  getPullRequestReportMock: vi.fn(),
}));

vi.mock("../../service/pr-report.js", () => ({
  getPullRequestReport: getPullRequestReportMock,
}));

describe("pr-report command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    const result = builder(yargs([]));
    expect(result).toBeDefined();
  });

  it("prints human output by default", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestReportMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      failingQualityGateConditions: [],
      issueCounts: {
        acceptedIssues: 2,
        newIssues: 1,
      },
      measures: {
        coverageOnNewCode: 91.234,
        duplicationOnNewCode: 1,
        securityHotspots: 0,
      },
      projectKey: "project",
      pullRequest: "42",
      qualityGateStatus: "OK",
    });

    await handler({
      baseUrl: "https://sonar",
      json: false,
      projectKey: "project",
      pullRequest: "42",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Quality Gate passed");
    expect(output).toContain("- 1 New issues");
    expect(output).toContain("- 91.2% Coverage on New Code");
  });

  it("prints JSON when requested", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestReportMock.mockResolvedValue({
      analysisUrl: "https://sonar/dashboard?id=project&pullRequest=42",
      failingQualityGateConditions: [
        {
          actualValue: "75",
          comparator: "LT",
          errorThreshold: "80",
          metricKey: "new_coverage",
        },
      ],
      issueCounts: {
        acceptedIssues: 0,
        newIssues: 0,
      },
      measures: {
        coverageOnNewCode: 75,
        duplicationOnNewCode: 0,
        securityHotspots: 1,
      },
      projectKey: "project",
      pullRequest: "42",
      qualityGateStatus: "ERROR",
    });

    await handler({
      baseUrl: "https://sonar",
      json: true,
      projectKey: "project",
      pullRequest: "42",
      token: "token",
    });

    expect(stdout).toHaveBeenCalledTimes(1);
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"qualityGateStatus": "ERROR"');
    expect(String(stdout.mock.calls[0]?.[0])).toContain('"metricKey": "new_coverage"');
  });
});
