import type { Argv } from "yargs";

import { resolveProjectKey } from "../project-key.js";
import { getPullRequestCoverage } from "../../service/pr-coverage.js";

type PullRequestCoverageArgs = {
  baseUrl: string;
  includePassing: boolean;
  json: boolean;
  maxFiles: number;
  projectKey?: string;
  pullRequest: string;
  threshold: number;
  token: string;
};

export const command = "pr-coverage <pullRequest> [projectKey]";
export const describe = "List files with low new-code coverage for a pull request";

export function builder(yargs: Argv): Argv<PullRequestCoverageArgs> {
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
    .option("threshold", {
      coerce: (value: unknown) => Math.max(0, Math.min(100, Number(value))),
      default: 80,
      describe: "Coverage threshold percentage",
      type: "number",
    })
    .option("includePassing", {
      default: false,
      describe: "Include files that meet threshold too",
      type: "boolean",
    })
    .option("maxFiles", {
      alias: ["max", "limit"],
      coerce: (value: unknown) => Math.max(1, Number(value)),
      default: 20,
      type: "number",
    })
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: PullRequestCoverageArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey);
  const report = await getPullRequestCoverage(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      includePassing: args.includePassing,
      maxFiles: args.maxFiles,
      projectKey,
      pullRequest: args.pullRequest,
      threshold: args.threshold,
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  process.stdout.write(
    `Found ${report.files.length} file(s) below ${report.threshold.toFixed(1)}% new-code coverage\n`,
  );
  for (const file of report.files) {
    process.stdout.write(
      `- ${file.file}: ${file.coverageOnNewCode.toFixed(1)}% (${file.uncoveredLines}/${file.linesToCover} uncovered lines)\n`,
    );
  }
  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`);
}
