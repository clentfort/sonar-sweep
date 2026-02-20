import { execFileSync } from 'node:child_process'
import { existsSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

export function resolveProjectKey(projectKey?: string): string {
  if (projectKey?.trim()) {
    return projectKey.trim()
  }

  const gitRoot = getGitRoot()
  const sonarPropsPath = join(gitRoot, 'sonar-project.properties')
  if (!existsSync(sonarPropsPath)) {
    throw new Error(
      `Missing projectKey and no sonar-project.properties found at ${sonarPropsPath}. Provide --projectKey explicitly.`,
    )
  }

  const content = readFileSync(sonarPropsPath, 'utf8')
  const match = content.match(/^\s*sonar\.projectKey\s*=\s*(.+)\s*$/m)
  const key = match?.[1]?.trim()
  if (!key) {
    throw new Error(
      `Could not read sonar.projectKey from ${sonarPropsPath}. Provide --projectKey explicitly.`,
    )
  }

  return key
}

function getGitRoot(): string {
  try {
    return execFileSync('git', ['rev-parse', '--show-toplevel'], {
      encoding: 'utf8',
      stdio: ['ignore', 'pipe', 'ignore'],
    }).trim()
  } catch {
    return process.cwd()
  }
}
