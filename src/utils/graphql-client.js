import { QUERIES } from '../queries/github-queries.js';
import { config } from '../config.js';

const MAX_RETRIES = 3;

export async function makeGraphQLRequest(query, variables) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    try {
      const response = await fetch("https://api.github.com/graphql", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${config.ghToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query, variables }),
      });

      if (!response.ok) {
        const status = response.status;
        const isRetryable = status === 429 || status >= 500;

        if (isRetryable && attempt < MAX_RETRIES) {
          let delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;

          if (status === 429) {
            const retryAfter = response.headers.get('Retry-After');
            if (retryAfter) {
              delay = Math.max(parseInt(retryAfter, 10) * 1000, delay);
            }
          }

          console.warn(`GitHub API returned ${status} (attempt ${attempt + 1}/${MAX_RETRIES + 1}). Retrying in ${Math.round(delay)}ms...`);
          await new Promise(resolve => setTimeout(resolve, delay));
          continue;
        }

        const body = await response.text().catch(() => '');
        throw new Error(`GitHub API HTTP ${status}: ${body.slice(0, 200)}`);
      }

      const data = await response.json();

      if (data.errors) {
        throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
      }

      return data;

    } catch (error) {
      if (error.message.startsWith('GitHub API HTTP') || error.message.startsWith('GraphQL Error')) {
        throw error;
      }

      if (attempt < MAX_RETRIES) {
        const delay = 1000 * Math.pow(2, attempt) + Math.random() * 1000;
        console.warn(`GitHub API request failed (attempt ${attempt + 1}/${MAX_RETRIES + 1}): ${error.message}. Retrying in ${Math.round(delay)}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
        continue;
      }

      throw error;
    }
  }
}

export async function paginatedFetch(queryName, processor, repo, progressMessage = null, extraVariables = {}) {
  let hasNextPage = true;
  let cursor = null;
  let processedCount = 0;

  const repoLabel = `${repo.owner}/${repo.name}`;

  if (progressMessage) {
    console.log(`📊 [${repoLabel}] ${progressMessage}...`);
  }

  while (hasNextPage) {
    const variables = {
      owner: repo.owner,
      name: repo.name,
      after: cursor,
      ...extraVariables,
    };

    const data = await makeGraphQLRequest(QUERIES[queryName], variables);

    const result = processor(data);
    if (result) {
      processedCount += result.count || 0;

      // Check if we should stop early (for recent data)
      if (result.shouldStop) {
        break;
      }
    }

    // Get pagination info from the appropriate path
    const pageInfo = getPageInfo(data, queryName);
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;

    // Show progress for long-running operations
    if (progressMessage && processedCount > 0 && processedCount % 100 === 0) {
      console.log(`   [${repoLabel}] Processed ${processedCount} items so far...`);
    }

    // Add small delay to be respectful to API (reduced for better performance)
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
}

function getPageInfo(data, queryName) {
  switch (queryName) {
    case 'discussions':
    case 'recentDiscussions':
      return data.data.repository.discussions.pageInfo;
    case 'openPullRequests':
    case 'allPullRequests':
    case 'recentPullRequests':
      return data.data.repository.pullRequests.pageInfo;
    case 'openIssues':
    case 'allIssues':
    case 'recentIssues':
      return data.data.repository.issues.pageInfo;
    default:
      throw new Error(`Unknown query name: ${queryName}`);
  }
}

export function getNodes(data, queryName) {
  switch (queryName) {
    case 'discussions':
    case 'recentDiscussions':
      return data.data.repository.discussions.nodes;
    case 'openPullRequests':
    case 'allPullRequests':
    case 'recentPullRequests':
      return data.data.repository.pullRequests.nodes;
    case 'openIssues':
    case 'allIssues':
    case 'recentIssues':
      return data.data.repository.issues.nodes;
    default:
      throw new Error(`Unknown query name: ${queryName}`);
  }
}
