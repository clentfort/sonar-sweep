import type { Argv } from "yargs";

import { transitionIssue } from "../../service/issue-transition.js";

type IssueAcceptArgs = {
  baseUrl: string;
  comment?: string;
  issueKey: string;
  json: boolean;
  token: string;
};

export const command = "issue-accept <issueKey>";
export const describe = "Mark a Sonar issue as accepted (transition=accept)";

export function builder(yargs: Argv): Argv<IssueAcceptArgs> {
  return yargs
    .positional("issueKey", {
      coerce: (value: unknown) => String(value).trim(),
      demandOption: "Provide an issue key",
      type: "string",
    })
    .option("token", {
      default: process.env.SONAR_TOKEN,
      defaultDescription: "SONAR_TOKEN",
      demandOption: "Provide --token or set SONAR_TOKEN",
      type: "string",
    })
    .option("baseUrl", {
      alias: ["base-url", "url"],
      coerce: (value: unknown) => String(value).replace(/\/$/, ""),
      default: process.env.SONAR_BASE_URL ?? "https://sonarcloud.io",
      defaultDescription: "SONAR_BASE_URL or https://sonarcloud.io",
      type: "string",
    })
    .option("comment", {
      describe: "Optional acceptance comment",
      type: "string",
    })
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: IssueAcceptArgs): Promise<void> {
  const result = await transitionIssue(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      comment: args.comment,
      issueKey: args.issueKey,
      transition: "accept",
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`Accepted issue ${result.issueKey} (${result.transition})\n`);
}
