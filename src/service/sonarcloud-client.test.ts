import { describe, expect, it, vi } from "vitest";

import { SonarCloudClient } from "./sonarcloud-client.js";

describe("SonarCloudClient", () => {
  it("formats GET request errors with status, path and body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("unauthorized", { status: 401 }));

    const client = new SonarCloudClient({
      baseUrl: "https://sonarcloud.io",
      fetchImpl: fetchMock,
      token: "token",
    });

    await expect(client.getProjectStatus("project", "259")).rejects.toThrow(
      "Sonar API request failed (401) for /api/qualitygates/project_status: unauthorized",
    );
  });

  it("sends POST requests with a real bearer token", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response(null, { status: 204 }));

    const client = new SonarCloudClient({
      baseUrl: "https://sonarcloud.io",
      fetchImpl: fetchMock,
      token: "token",
    });

    await client.doIssueTransition("issue-key", "accept");

    expect(fetchMock).toHaveBeenCalledTimes(1);
    const [, init] = fetchMock.mock.calls[0];
    expect(init?.headers).toMatchObject({
      Authorization: "Bearer token",
    });
  });

  it("formats POST request errors with status, path and body", async () => {
    const fetchMock = vi
      .fn<typeof fetch>()
      .mockResolvedValueOnce(new Response("forbidden", { status: 403 }));

    const client = new SonarCloudClient({
      baseUrl: "https://sonarcloud.io",
      fetchImpl: fetchMock,
      token: "token",
    });

    await expect(client.doIssueTransition("issue-key", "accept")).rejects.toThrow(
      "Sonar API request failed (403) for /api/issues/do_transition: forbidden",
    );
  });
});
