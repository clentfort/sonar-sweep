import type { Argv } from "yargs";

import { reviewHotspot } from "../../service/hotspot-transition.js";
import type { HotspotResolution } from "../../service/sonarcloud-client.js";

type HotspotReviewArgs = {
  baseUrl: string;
  comment?: string;
  hotspotKey: string;
  json: boolean;
  resolution: HotspotResolution;
  token: string;
};

export const command = "hotspot-review <hotspotKey>";
export const describe = "Mark a security hotspot as reviewed (SAFE, ACKNOWLEDGED, or FIXED)";

export function builder(yargs: Argv): Argv<HotspotReviewArgs> {
  return yargs
    .positional("hotspotKey", {
      coerce: (value: unknown) => String(value).trim(),
      demandOption: "Provide a hotspot key",
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
    .option("resolution", {
      alias: "r",
      choices: ["SAFE", "ACKNOWLEDGED", "FIXED"] as const,
      default: "SAFE" as const,
      describe:
        "Resolution type: SAFE (not a risk), ACKNOWLEDGED (risk accepted), FIXED (code changed)",
      type: "string",
    })
    .option("comment", {
      alias: "c",
      describe: "Optional review comment",
      type: "string",
    })
    .option("json", {
      default: false,
      describe: "Print raw JSON for automation/agents",
      type: "boolean",
    });
}

export async function handler(args: HotspotReviewArgs): Promise<void> {
  const result = await reviewHotspot(
    {
      baseUrl: args.baseUrl,
      token: args.token,
    },
    {
      comment: args.comment,
      hotspotKey: args.hotspotKey,
      resolution: args.resolution,
    },
  );

  if (args.json) {
    process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
    return;
  }

  process.stdout.write(`Reviewed hotspot ${result.hotspotKey} as ${result.resolution}\n`);
}
