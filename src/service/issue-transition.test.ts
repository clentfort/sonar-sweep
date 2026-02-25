import { describe, expect, it, vi } from "vitest";

import { transitionIssue } from "./issue-transition.js";

describe("transitionIssue", () => {
  it("sends issue transition to Sonar", async () => {
    const fetchMock = vi.fn<typeof fetch>().mockResolvedValue(new Response("", { status: 200 }));

    const result = await transitionIssue(
      {
        fetchImpl: fetchMock,
        token: "token",
      },
      {
        comment: "Accepted for now",
        issueKey: "AZ-1",
        transition: "accept",
      },
    );

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      applied: true,
      issueKey: "AZ-1",
      transition: "accept",
    });
  });
});
