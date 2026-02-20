# sonar-sweep-cli

TypeScript CLI to fetch SonarQube Cloud pull request details for coding-agent workflows.

## What it does

- Fetches Quality Gate status for a pull request
- Fetches new issue counts and accepted issue counts
- Fetches open issue details for new code (rule, severity, file, line, message)
- Fetches per-file new-code coverage gaps for a pull request
- Fetches issue review data with source snippets for faster triage
- Applies issue transitions (for example mark issue as accepted)
- Fetches key new-code measures (security hotspots, coverage, duplication)
- Prints either human-readable output or JSON (`--json`) for automation

## Install

```bash
npm install
npm run build
```

## Authentication

The CLI uses SonarQube Cloud tokens via bearer auth.

You can pass the token explicitly:

```bash
sonar-sweep pr-report <projectKey> <pullRequest> --token <token>
```

Or set environment variables:

```bash
SONAR_TOKEN=... 
SONAR_BASE_URL=https://sonarcloud.io
```

## Usage

```bash
sonar-sweep pr-report <pullRequest>
sonar-sweep pr-issues <pullRequest>
sonar-sweep pr-coverage <pullRequest>
sonar-sweep pr-review <pullRequest>
sonar-sweep issue-accept <issueKey>
```

For `pr-*` commands, the CLI auto-detects `sonar.projectKey` from `sonar-project.properties` in the current git root. You can still override with `--projectKey`.

JSON output for agents:

```bash
sonar-sweep pr-report <pullRequest> --json
sonar-sweep pr-issues <pullRequest> --json
sonar-sweep pr-coverage <pullRequest> --json
sonar-sweep pr-review <pullRequest> --json
sonar-sweep issue-accept <issueKey> --comment "Accepted with rationale" --json
```

## Example

```bash
node dist/cli.js pr-report 2221 --projectKey sueddeutsche_app-android --json
node dist/cli.js pr-issues 2220 --projectKey sueddeutsche_app-android --json
node dist/cli.js pr-coverage 591 --projectKey sueddeutsche_szhp-pages --threshold 80 --json
node dist/cli.js pr-review 145 --projectKey sueddeutsche_szde-redirect-admin --context 4 --json
node dist/cli.js issue-accept AZx2EKMtvB1gqnjpRLA4 --comment "Reviewed and accepted" --json
```
