import { describe, expect, it, vi } from "vitest";

import { getPullRequestReview } from "./pr-review.js";

describe("getPullRequestReview", () => {
  it("includes issue snippets from source lines", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(
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
                issueStatus: "OPEN",
                key: "AZ-1",
                line: 3,
                message: "Fix this.",
                rule: "ts:S1",
                severity: "MINOR",
                status: "OPEN",
                type: "CODE_SMELL",
              },
            ],
            paging: { pageIndex: 1, pageSize: 20, total: 1 },
            total: 1,
          }),
        ),
      )
      .mockResolvedValueOnce(new Response(["a", "b", "c", "d", "e"].join("\n")));

    const report = await getPullRequestReview(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        contextLines: 1,
        projectKey: "my_project",
        pullRequest: "123",
      },
    );

    expect(report.total).toBe(1);
    expect(report.issues[0]?.file).toBe("src/app.ts");
    expect(report.issues[0]?.snippet?.lines).toEqual([
      { highlight: false, line: 2, text: "b" },
      { highlight: true, line: 3, text: "c" },
      { highlight: false, line: 4, text: "d" },
    ]);
  });
});
