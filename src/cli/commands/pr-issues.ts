import type { Argv } from "yargs";

import { resolveProjectKey } from "../project-key.js";
import { getPullRequestIssues } from "../../service/pr-issues.js";

type PullRequestIssuesArgs = {
  baseUrl: string;
  json: boolean;
  page: number;
  pageSize: number;
  projectKey?: string;
  pullRequest: string;
  token: string;
};

export const command = "pr-issues <pullRequest> [projectKey]";
export const describe = "Fetch SonarQube Cloud issue details for a pull request";

export function builder(yargs: Argv): Argv<PullRequestIssuesArgs> {
  return yargs
    .positional("projectKey", {
      describe: "Sonar project key (optional; auto-detected from sonar-project.properties)",
      type: "string",
    })
    .positional("pullRequest", {
      coerce: (value: unknown) => String(value).trim(),
      demandOption: "Provide a pull request key/id",
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
    .option("projectKey", {
      alias: ["project-key", "k"],
      describe: "Sonar project key (overrides auto-detection)",
      type: "string",
    })
    .option("page", {
      alias: "p",
      coerce: (value: unknown) => Math.max(1, Number(value)),
      default: 1,
      type: "number",
    })
    .option("pageSize", {
      alias: ["ps", "page-size"],
      coerce: (value: unknown) => Math.min(500, Math.max(1, Number(value))),
      default: 100,
      type: "number",
    })
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: PullRequestIssuesArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey);
  const report = await getPullRequestIssues(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      page: args.page,
      pageSize: args.pageSize,
      projectKey,
      pullRequest: args.pullRequest,
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `Found ${report.total} open issue(s) in new code for PR ${report.pullRequest} (${report.projectKey})\n`,
  );

  if (report.issues.length === 0) {
    process.stdout.write(`See analysis details: ${report.analysisUrl}\n`);
    return;
  }

  for (const issue of report.issues) {
    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
    process.stdout.write(
      `- [${issue.issueStatus}] ${issue.severity} ${issue.type} ${issue.rule} ${location} - ${issue.message}\n`,
    );
  }

  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`);
}
