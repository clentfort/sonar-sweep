import { describe, expect, it, vi } from "vitest";

import { getPullRequestCoverage } from "./pr-coverage.js";

describe("getPullRequestCoverage", () => {
  it("returns files below threshold sorted by coverage", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          components: [
            {
              key: "a",
              measures: [
                { metric: "new_coverage", periods: [{ index: 1, value: "60.0" }] },
                { metric: "new_lines_to_cover", periods: [{ index: 1, value: "10" }] },
                { metric: "new_uncovered_lines", periods: [{ index: 1, value: "4" }] },
              ],
              name: "a.ts",
              path: "src/a.ts",
            },
            {
              key: "b",
              measures: [
                { metric: "new_coverage", periods: [{ index: 1, value: "20.0" }] },
                { metric: "new_lines_to_cover", periods: [{ index: 1, value: "5" }] },
                { metric: "new_uncovered_lines", periods: [{ index: 1, value: "4" }] },
              ],
              name: "b.ts",
              path: "src/b.ts",
            },
            {
              key: "c",
              measures: [
                { metric: "new_coverage", periods: [{ index: 1, value: "100.0" }] },
                { metric: "new_lines_to_cover", periods: [{ index: 1, value: "2" }] },
                { metric: "new_uncovered_lines", periods: [{ index: 1, value: "0" }] },
              ],
              name: "c.ts",
              path: "src/c.ts",
            },
          ],
          paging: { pageIndex: 1, pageSize: 500, total: 3 },
        }),
      ),
    );

    const report = await getPullRequestCoverage(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        projectKey: "my_project",
        pullRequest: "123",
        threshold: 80,
      },
    );

    expect(report.files.map((item) => item.file)).toEqual(["src/b.ts", "src/a.ts"]);
  });
});
