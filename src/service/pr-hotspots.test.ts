import { describe, expect, it, vi } from "vitest";

import { getPullRequestHotspots } from "./pr-hotspots.js";

describe("getPullRequestHotspots", () => {
  it("maps Sonar hotspots into a stable report shape", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          components: [
            {
              key: "my_project:src/config.ts",
              path: "src/config.ts",
            },
          ],
          hotspots: [
            {
              component: "my_project:src/config.ts",
              key: "AZ-HOTSPOT-1",
              line: 15,
              message: "Make sure this is safe.",
              project: "my_project",
              securityCategory: "others",
              status: "TO_REVIEW",
              vulnerabilityProbability: "MEDIUM",
            },
          ],
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
        }),
      ),
    );

    const result = await getPullRequestHotspots(
      {
        baseUrl: "https://sonarcloud.io",
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        page: 1,
        pageSize: 100,
        projectKey: "my_project",
        pullRequest: "123",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      analysisUrl: "https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123",
      hotspots: [
        {
          file: "src/config.ts",
          key: "AZ-HOTSPOT-1",
          line: 15,
          message: "Make sure this is safe.",
          resolution: undefined,
          securityCategory: "others",
          status: "TO_REVIEW",
          vulnerabilityProbability: "MEDIUM",
        },
      ],
      page: 1,
      pageSize: 100,
      projectKey: "my_project",
      pullRequest: "123",
      total: 1,
    });
  });

  it("extracts file path from component key when no component map entry", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(
      new Response(
        JSON.stringify({
          components: [], // No component mapping
          hotspots: [
            {
              component: "my_project:src/other.ts",
              key: "AZ-HOTSPOT-2",
              line: 42,
              message: "Check command injection.",
              project: "my_project",
              securityCategory: "command-injection",
              status: "TO_REVIEW",
              vulnerabilityProbability: "HIGH",
            },
          ],
          paging: { pageIndex: 1, pageSize: 100, total: 1 },
        }),
      ),
    );

    const result = await getPullRequestHotspots(
      {
        baseUrl: "https://sonarcloud.io",
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        projectKey: "my_project",
        pullRequest: "456",
      },
    );

    expect(result.hotspots[0].file).toBe("src/other.ts");
  });

  it("throws error when projectKey is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      getPullRequestHotspots(
        { fetchImpl: fetchMock, token: "token" },
        { projectKey: "", pullRequest: "123" },
      ),
    ).rejects.toThrow("Missing projectKey");

    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("throws error when pullRequest is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      getPullRequestHotspots(
        { fetchImpl: fetchMock, token: "token" },
        { projectKey: "my_project", pullRequest: "" },
      ),
    ).rejects.toThrow("Missing pullRequest");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
