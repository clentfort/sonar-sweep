import { SonarCloudClient, type SonarCloudClientOptions } from "./sonarcloud-client.js";

export type IssueTransitionInput = {
  comment?: string;
  issueKey: string;
  transition: "accept" | "wontfix" | "falsepositive" | "confirm" | "reopen" | "resolve";
};

export type IssueTransitionResult = {
  applied: true;
  issueKey: string;
  transition: string;
};

export async function transitionIssue(
  clientOptions: SonarCloudClientOptions,
  input: IssueTransitionInput,
): Promise<IssueTransitionResult> {
  const issueKey = input.issueKey.trim();
  const transition = input.transition.trim();
  const comment = input.comment?.trim();

  if (!issueKey) {
    throw new Error("Missing issueKey");
  }

  if (!transition) {
    throw new Error("Missing transition");
  }

  const client = new SonarCloudClient(clientOptions);
  await client.doIssueTransition(issueKey, transition, comment);

  return {
    applied: true,
    issueKey,
    transition,
  };
}
