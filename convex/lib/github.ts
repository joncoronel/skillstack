/**
 * Shared GitHub API helpers used by both github.ts (tech detection)
 * and skills.ts (skill content discovery).
 */

/** Build auth + user-agent headers for GitHub API requests. */
export function githubHeaders(): Record<string, string> {
  const token = process.env.GITHUB_TOKEN;
  const headers: Record<string, string> = {
    Accept: "application/vnd.github.v3+json",
    "User-Agent": "SkillStack",
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  return headers;
}

/** Resolve the default branch for a GitHub repo, falling back to "main". */
export async function resolveDefaultBranch(
  owner: string,
  repo: string,
): Promise<string> {
  const headers = githubHeaders();
  try {
    const res = await fetch(
      `https://api.github.com/repos/${owner}/${repo}`,
      { headers },
    );
    if (res.ok) {
      const data = (await res.json()) as { default_branch: string };
      return data.default_branch;
    }
  } catch {
    // Fall through to default
  }
  return "main";
}

export interface TreeEntry {
  path: string;
  type: string; // "blob" | "tree"
}

export interface TreeResult {
  entries: TreeEntry[];
  truncated: boolean;
  branch: string;
}

/**
 * Fetch the recursive file tree for a repo.
 * Tries branches in priority order (pass the default branch first).
 * Returns null if the tree cannot be fetched (404, 409 too large, rate limit).
 */
export async function fetchRepoTree(
  owner: string,
  repo: string,
  branches: string[],
): Promise<TreeResult | null> {
  const headers = githubHeaders();

  for (const branch of branches) {
    const url = `https://api.github.com/repos/${owner}/${repo}/git/trees/${branch}?recursive=1`;
    try {
      const res = await fetch(url, { headers });
      if (res.ok) {
        const data = (await res.json()) as {
          tree: TreeEntry[];
          truncated: boolean;
        };
        return { entries: data.tree, truncated: data.truncated, branch };
      }
      if (res.status === 404) continue;
      if (res.status === 409) {
        console.log(
          `Tree API 409 (too large) for ${owner}/${repo}/${branch}`,
        );
        return null;
      }
      // Rate limited — log details and bail
      if (res.status === 403 || res.status === 429) {
        const retryAfter = res.headers.get("retry-after");
        const remaining = res.headers.get("x-ratelimit-remaining");
        const resetEpoch = res.headers.get("x-ratelimit-reset");
        console.error(
          `GitHub rate limit hit for ${owner}/${repo}: ` +
            `status=${res.status}, remaining=${remaining}, ` +
            `retry-after=${retryAfter}, reset=${resetEpoch}`,
        );
        return null;
      }
      console.error(
        `Tree API ${res.status} for ${owner}/${repo}/${branch}`,
      );
    } catch (e) {
      console.error(
        `Tree API fetch error for ${owner}/${repo}/${branch}:`,
        e,
      );
      continue;
    }
  }
  return null;
}
