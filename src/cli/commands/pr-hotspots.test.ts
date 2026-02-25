import { afterEach, describe, expect, it, vi } from "vitest";
import yargs from "yargs/yargs";

import { builder, handler } from "./pr-hotspots.js";

const { getPullRequestHotspotsMock } = vi.hoisted(() => ({
  getPullRequestHotspotsMock: vi.fn(),
}));

vi.mock("../../service/pr-hotspots.js", () => ({
  getPullRequestHotspots: getPullRequestHotspotsMock,
}));

vi.mock("../project-key.js", () => ({
  resolveProjectKey: (key?: string) => key ?? "auto-detected-project",
}));

describe("pr-hotspots command", () => {
  afterEach(() => {
    vi.restoreAllMocks();
  });

  it("builds command options", () => {
    expect(builder(yargs([]))).toBeDefined();
  });

  it("prints human-readable output for hotspots", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestHotspotsMock.mockResolvedValue({
      analysisUrl: "https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123",
      hotspots: [
        {
          file: "src/handler.ts",
          key: "AZ-1",
          line: 42,
          message: "Check this input",
          securityCategory: "command-injection",
          status: "TO_REVIEW",
          vulnerabilityProbability: "HIGH",
        },
        {
          file: "src/config.ts",
          key: "AZ-2",
          line: 10,
          message: "Verify config",
          securityCategory: "others",
          status: "TO_REVIEW",
          vulnerabilityProbability: "LOW",
        },
      ],
      page: 1,
      pageSize: 100,
      projectKey: "my_project",
      pullRequest: "123",
      total: 2,
    });

    await handler({
      baseUrl: "https://sonarcloud.io",
      json: false,
      page: 1,
      pageSize: 100,
      pullRequest: "123",
      status: "TO_REVIEW",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Found 2 unreviewed security hotspot(s)");
    expect(output).toContain("[HIGH] AZ-1");
    expect(output).toContain("src/handler.ts:42");
    expect(output).toContain("[LOW] AZ-2");
  });

  it("prints JSON output when --json flag is set", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    const mockResult = {
      analysisUrl: "https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123",
      hotspots: [
        {
          file: "src/app.ts",
          key: "AZ-1",
          line: 5,
          message: "Check this",
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
    };
    getPullRequestHotspotsMock.mockResolvedValue(mockResult);

    await handler({
      baseUrl: "https://sonarcloud.io",
      json: true,
      page: 1,
      pageSize: 100,
      pullRequest: "123",
      status: "TO_REVIEW",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(JSON.parse(output)).toEqual(mockResult);
  });

  it("prints message when no hotspots found", async () => {
    const stdout = vi.spyOn(process.stdout, "write").mockImplementation(() => true);
    getPullRequestHotspotsMock.mockResolvedValue({
      analysisUrl: "https://sonarcloud.io/project/security_hotspots?id=my_project&pullRequest=123",
      hotspots: [],
      page: 1,
      pageSize: 100,
      projectKey: "my_project",
      pullRequest: "123",
      total: 0,
    });

    await handler({
      baseUrl: "https://sonarcloud.io",
      json: false,
      page: 1,
      pageSize: 100,
      pullRequest: "123",
      status: "TO_REVIEW",
      token: "token",
    });

    const output = stdout.mock.calls.map((call) => call[0]).join("");
    expect(output).toContain("Found 0 unreviewed security hotspot(s)");
    expect(output).toContain("See analysis details");
  });
});
