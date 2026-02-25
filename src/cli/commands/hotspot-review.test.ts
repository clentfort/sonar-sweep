import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./hotspot-review.js";

const { reviewHotspotMock } = vi.hoisted(() => ({
  reviewHotspotMock: vi.fn(),
}));

vi.mock("../../service/hotspot-transition.js", () => ({
  reviewHotspot: reviewHotspotMock,
}));

describe("hotspot-review command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    expect(builder(yargs([]))).toBeDefined();
  });

  it("prints success output for SAFE resolution", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    reviewHotspotMock.mockResolvedValue({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-1",
      resolution: "SAFE",
      status: "REVIEWED",
    });

    await handler({
      baseUrl: "https://sonarcloud.io",
      comment: "Not a risk",
      hotspotKey: "AZ-HOTSPOT-1",
      json: false,
      resolution: "SAFE",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Reviewed hotspot AZ-HOTSPOT-1 as SAFE");
  });

  it("prints success output for ACKNOWLEDGED resolution", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    reviewHotspotMock.mockResolvedValue({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-2",
      resolution: "ACKNOWLEDGED",
      status: "REVIEWED",
    });

    await handler({
      baseUrl: "https://sonarcloud.io",
      hotspotKey: "AZ-HOTSPOT-2",
      json: false,
      resolution: "ACKNOWLEDGED",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Reviewed hotspot AZ-HOTSPOT-2 as ACKNOWLEDGED");
  });

  it("prints success output for FIXED resolution", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    reviewHotspotMock.mockResolvedValue({
      applied: true,
      hotspotKey: "AZ-HOTSPOT-3",
      resolution: "FIXED",
      status: "REVIEWED",
    });

    await handler({
      baseUrl: "https://sonarcloud.io",
      comment: "Fixed in this PR",
      hotspotKey: "AZ-HOTSPOT-3",
      json: false,
      resolution: "FIXED",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Reviewed hotspot AZ-HOTSPOT-3 as FIXED");
  });

  it("prints JSON output when --json flag is set", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const mockResult = {
      applied: true,
      hotspotKey: "AZ-HOTSPOT-1",
      resolution: "SAFE",
      status: "REVIEWED",
    };
    reviewHotspotMock.mockResolvedValue(mockResult);

    await handler({
      baseUrl: "https://sonarcloud.io",
      hotspotKey: "AZ-HOTSPOT-1",
      json: true,
      resolution: "SAFE",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(JSON.parse(output)).toEqual(mockResult);
  });
});
