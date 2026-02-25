import type { Argv } from "yargs";
import { getPullRequestHotspots } from "../../service/pr-hotspots.js";
import { resolveProjectKey } from "../project-key.js";

type PullRequestHotspotsArgs = {
  baseUrl: string;
  json: boolean;
  page: number;
  pageSize: number;
  projectKey?: string;
  pullRequest: string;
  status: "TO_REVIEW" | "REVIEWED";
  token: string;
};

export const command = "pr-hotspots <pullRequest> [projectKey]";
export const describe = "Fetch security hotspots for a pull request";

export function builder(yargs: Argv): Argv<PullRequestHotspotsArgs> {
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
    .option("status", {
      alias: "s",
      choices: ["TO_REVIEW", "REVIEWED"] as const,
      default: "TO_REVIEW" as const,
      describe: "Filter hotspots by status",
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

export async function handler(args: PullRequestHotspotsArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey);
  const result = await getPullRequestHotspots(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      page: args.page,
      pageSize: args.pageSize,
      projectKey,
      pullRequest: args.pullRequest,
      status: args.status,
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  const statusLabel = args.status === "TO_REVIEW" ? "unreviewed" : "reviewed";
  process.stdout.write(
    `Found ${result.total} ${statusLabel} security hotspot(s) for PR ${result.pullRequest} (${result.projectKey})\n`,
  );

  if (result.hotspots.length === 0) {
    process.stdout.write(`\nSee analysis details: ${result.analysisUrl}\n`);
    return;
  }

  process.stdout.write("\n");
  for (const hotspot of result.hotspots) {
    const location = hotspot.line ? `${hotspot.file}:${hotspot.line}` : hotspot.file;
    const resolutionInfo = hotspot.resolution ? ` (${hotspot.resolution})` : "";
    process.stdout.write(
      `[${hotspot.vulnerabilityProbability}] ${hotspot.key}\n` +
        `  ${location}\n` +
        `  ${hotspot.message}${resolutionInfo}\n\n`,
    );
  }

  process.stdout.write(`See analysis details: ${result.analysisUrl}\n`);
}
