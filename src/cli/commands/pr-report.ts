import type { Argv } from "yargs";

import { resolveProjectKey } from "../project-key.js";
import { getPullRequestReport } from "../../service/pr-report.js";

type PullRequestReportArgs = {
  baseUrl: string;
  json: boolean;
  projectKey?: string;
  pullRequest: string;
  token: string;
};

export const command = "pr-report <pullRequest> [projectKey]";
export const describe = "Fetch SonarQube Cloud details for a pull request";

export function builder(yargs: Argv): Argv<PullRequestReportArgs> {
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
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: PullRequestReportArgs): Promise<void> {
  const projectKey = resolveProjectKey(args.projectKey);
  const report = await getPullRequestReport(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      projectKey,
      pullRequest: args.pullRequest,
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(report, null, 2)}\n`);
    return;
  }

  const qualityGate =
    report.qualityGateStatus === "OK"
      ? "Quality Gate passed"
      : `Quality Gate failed (${report.qualityGateStatus})`;

  process.stdout.write(`${qualityGate}\n\n`);
  if (report.failingQualityGateConditions.length > 0) {
    process.stdout.write("Quality Gate Conditions\n");
    for (const condition of report.failingQualityGateConditions) {
      const metric = formatMetricLabel(condition.metricKey);
      const threshold = condition.errorThreshold ?? "n/a";
      const actual = condition.actualValue ?? "n/a";
      process.stdout.write(
        `- ${metric}: actual=${actual}, threshold=${condition.comparator} ${threshold}\n`,
      );
    }
    process.stdout.write("\n");
  }

  process.stdout.write("Issues\n");
  process.stdout.write(`- ${report.issueCounts.newIssues} New issues\n`);
  process.stdout.write(`- ${report.issueCounts.acceptedIssues} Accepted issues\n\n`);
  process.stdout.write("Measures\n");
  process.stdout.write(`- ${report.measures.securityHotspots} Security Hotspots\n`);
  process.stdout.write(`- ${report.measures.coverageOnNewCode.toFixed(1)}% Coverage on New Code\n`);
  process.stdout.write(
    `- ${report.measures.duplicationOnNewCode.toFixed(1)}% Duplication on New Code\n\n`,
  );
  process.stdout.write(`See analysis details: ${report.analysisUrl}\n`);
}

function formatMetricLabel(metricKey: string): string {
  switch (metricKey) {
    case "new_coverage":
      return "Coverage on New Code";
    case "new_duplicated_lines_density":
      return "Duplication on New Code";
    case "new_security_hotspots_reviewed":
      return "Security Hotspots Reviewed on New Code";
    case "new_reliability_rating":
      return "Reliability Rating on New Code";
    case "new_security_rating":
      return "Security Rating on New Code";
    case "new_maintainability_rating":
      return "Maintainability Rating on New Code";
    default:
      return metricKey;
  }
}
