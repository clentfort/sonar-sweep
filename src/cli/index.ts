/* oxlint-disable import/no-namespace, typescript-eslint/no-explicit-any */
import { hideBin } from "yargs/helpers";
import yargs from "yargs/yargs";

import * as hotspotReview from "./commands/hotspot-review.js";
import * as issueAccept from "./commands/issue-accept.js";
import * as prCoverage from "./commands/pr-coverage.js";
import * as prHotspots from "./commands/pr-hotspots.js";
import * as prIssues from "./commands/pr-issues.js";
import * as prReport from "./commands/pr-report.js";
import * as prReview from "./commands/pr-review.js";

export async function run(argv: Array<string> = process.argv): Promise<void> {
  const cli = yargs(hideBin(argv))
    .scriptName("sonar-sweep")
    .env("SONAR")
    .command(hotspotReview as any)
    .command(issueAccept as any)
    .command(prCoverage as any)
    .command(prHotspots as any)
    .command(prIssues as any)
    .command(prReport as any)
    .command(prReview as any);

  await cli
    .demandCommand(1, "Provide a command")
    .strict()
    .help()
    .fail((message: string, error: Error | undefined, yargsInstance) => {
      if (error) {
        process.stderr.write(`${error.message}\n`);
        process.exit(1);
      }

      process.stderr.write(`${message}\n`);
      yargsInstance.showHelp();
      process.exit(1);
    })
    .parseAsync();
}
