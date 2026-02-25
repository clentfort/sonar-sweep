import { describe, expect, it, vi } from "vitest";

import { getPullRequestIssues } from "./pr-issues.js";

describe("getPullRequestIssues", () => {
  it("maps Sonar issues into a stable report shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          components: [
            {
              key: "my_project:src/app.ts",
              path: "src/app.ts",
            },
          ],
          facets: [],
          issues: [
            {
              component: "my_project:src/app.ts",
              effort: "5min",
              issueStatus: "OPEN",
              key: "AZ-1",
              line: 42,
              message: "Fix this.",
              rule: "ts:S1234",
              severity: "MAJOR",
              status: "OPEN",
              type: "CODE_SMELL",
            },
          ],
          paging: { pageIndex: 1, pageSize: 50, total: 1 },
          total: 1,
        }),
      ),
    );

    const report = await getPullRequestIssues(
      {
        baseUrl: "https://sonarcloud.io",
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        page: 1,
        pageSize: 50,
        projectKey: "my_project",
        pullRequest: "123",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(report).toEqual({
      analysisUrl: "https://sonarcloud.io/dashboard?id=my_project&pullRequest=123",
      issues: [
        {
          effort: "5min",
          file: "src/app.ts",
          issueStatus: "OPEN",
          key: "AZ-1",
          line: 42,
          message: "Fix this.",
          rule: "ts:S1234",
          severity: "MAJOR",
          status: "OPEN",
          type: "CODE_SMELL",
        },
      ],
      page: 1,
      pageSize: 50,
      projectKey: "my_project",
      pullRequest: "123",
      total: 1,
    });
  });
});
