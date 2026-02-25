import { describe, expect, it, vi } from "vitest";

import { reviewHotspot } from "./hotspot-transition.js";

describe("reviewHotspot", () => {
  it("sends hotspot review to Sonar with SAFE resolution", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 200 }));

    const result = await reviewHotspot(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        comment: "Not a security risk",
        hotspotKey: "AZ-HOTSPOT-1",
        resolution: "SAFE",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-1",
      resolution: "SAFE",
      status: "REVIEWED",
    });
  });

  it("sends hotspot review with ACKNOWLEDGED resolution", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 200 }));

    const result = await reviewHotspot(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        hotspotKey: "AZ-HOTSPOT-2",
        resolution: "ACKNOWLEDGED",
      },
    );

    expect(result).toEqual({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-2",
      resolution: "ACKNOWLEDGED",
      status: "REVIEWED",
    });
  });

  it("sends hotspot review with FIXED resolution", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 200 }));

    const result = await reviewHotspot(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        comment: "Fixed in this PR",
        hotspotKey: "AZ-HOTSPOT-3",
        resolution: "FIXED",
      },
    );

    expect(result).toEqual({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-3",
      resolution: "FIXED",
      status: "REVIEWED",
    });
  });

  it("throws error when hotspotKey is missing", async () => {
    const fetchMock = vi.fn<typeof fetch>();

    await expect(
      reviewHotspot(
        { fetchImpl: fetchMock, token: "token" },
        { hotspotKey: "", resolution: "SAFE" },
      ),
    ).rejects.toThrow("Missing hotspotKey");

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
