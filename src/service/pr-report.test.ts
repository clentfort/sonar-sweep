import { describe, expect, it, vi } from "vitest";

import { getPullRequestReport } from "./pr-report.js";

describe("getPullRequestReport", () => {
  it("aggregates status, issues, and measures", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            projectStatus: {
              conditions: [
                {
                  actualValue: "82.5",
                  comparator: "LT",
                  errorThreshold: "80",
                  metricKey: "new_coverage",
                  status: "OK",
                },
              ],
              status: "OK",
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            facets: [
              {
                property: "issueStatuses",
                values: [
                  { count: 2, val: "OPEN" },
                  { count: 1, val: "CONFIRMED" },
                  { count: 1, val: "ACCEPTED" },
                ],
              },
            ],
            total: 4,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            component: {
              measures: [
                { metric: "new_security_hotspots", periods: [{ index: 1, value: "3" }] },
                { metric: "new_coverage", periods: [{ index: 1, value: "82.5" }] },
                { metric: "new_duplicated_lines_density", periods: [{ index: 1, value: "1.2" }] },
              ],
            },
          }),
        ),
      );

    const report = await getPullRequestReport(
      {
        baseUrl: "https://sonarcloud.io",
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        projectKey: "my_project",
        pullRequest: "123",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(3);
    expect(report).toEqual({
      analysisUrl: "https://sonarcloud.io/dashboard?id=my_project&pullRequest=123",
      failingQualityGateConditions: [],
      issueCounts: {
        acceptedIssues: 1,
        newIssues: 3,
      },
      measures: {
        coverageOnNewCode: 82.5,
        duplicationOnNewCode: 1.2,
        securityHotspots: 3,
      },
      projectKey: "my_project",
      pullRequest: "123",
      qualityGateStatus: "OK",
    });
  });

  it("fails when project key is missing", async () => {
    await expect(
      getPullRequestReport(
        {
          fetchImpl: vi.fn(),
          token: "token",
        },
        {
          projectKey: " ",
          pullRequest: "123",
        },
      ),
    ).rejects.toThrow("Missing projectKey");
  });

  it("exposes failing quality gate conditions", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            projectStatus: {
              conditions: [
                {
                  actualValue: "60.3",
                  comparator: "LT",
                  errorThreshold: "80",
                  metricKey: "new_coverage",
                  status: "ERROR",
                },
              ],
              status: "ERROR",
            },
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            facets: [{ property: "issueStatuses", values: [] }],
            total: 0,
          }),
        ),
      )
      .mockResolvedValueOnce(
        new Response(
          JSON.stringify({
            component: {
              measures: [],
            },
          }),
        ),
      );

    const report = await getPullRequestReport(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        projectKey: "my_project",
        pullRequest: "123",
      },
    );

    expect(report.failingQualityGateConditions).toEqual([
      {
        actualValue: "60.3",
        comparator: "LT",
        errorThreshold: "80",
        metricKey: "new_coverage",
      },
    ]);
  });
});
