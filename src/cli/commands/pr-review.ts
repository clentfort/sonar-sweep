import type { Argv } from "yargs";

import { resolveProjectKey } from "../project-key.js";
import { getPullRequestReview } from "../../service/pr-review.js";

type PullRequestReviewArgs = {
  baseUrl: string;
  contextLines: number;
  json: boolean;
  page: number;
  pageSize: number;
  projectKey?: string;
  pullRequest: string;
  token: string;
};

export const command = "pr-review <pullRequest> [projectKey]";
export const describe = "Review Sonar pull request issues with code context snippets";

export function builder(yargs: Argv): Argv<PullRequestReviewArgs> {
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
    .option("contextLines", {
      alias: ["context", "C"],
      coerce: (value: unknown) => Math.max(0, Number(value)),
      default: 3,
      type: "number",
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
      default: 20,
      type: "number",
    })
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: PullRequestReviewArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey);
  const report = await getPullRequestReview(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      contextLines: args.contextLines,
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
    `Found ${report.total} open issue(s) in new code for PR ${report.pullRequest} (${report.projectKey})\n\n`,
  );

  for (const issue of report.issues) {
    const location = issue.line ? `${issue.file}:${issue.line}` : issue.file;
    process.stdout.write(
      `[${issue.issueStatus}] ${issue.severity} ${issue.type} ${issue.rule} ${location}\n${issue.message}\n`,
    );
    process.stdout.write(`Issue URL: ${issue.issueUrl}\n`);

    if (issue.snippet) {
      process.stdout.write("Context:\n");
      for (const line of issue.snippet.lines) {
        const marker = line.highlight ? ">" : " ";
        process.stdout.write(`${marker} ${line.line.toString().padStart(4, " ")} | ${line.text}\n`);
      }
    } else if (issue.sourceError) {
      process.stdout.write(`Context unavailable: ${issue.sourceError}\n`);
    }

    process.stdout.write("\n");
  }

  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`);
}
