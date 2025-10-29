import { QUERIES } from '../queries/github-queries.js';
import { config } from '../config.js';

// Current repository context for multi-repo support
let currentRepo = config.repos[0];

export function setCurrentRepo(repo) {
  currentRepo = repo;
}

export async function makeGraphQLRequest(query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.ghToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

export async function paginatedFetch(queryName, processor, progressMessage = null, extraVariables = {}, repo = null) {
  let hasNextPage = true;
  let cursor = null;
  let processedCount = 0;

  if (progressMessage) {
    console.log(`📊 ${progressMessage}...`);
  }

  while (hasNextPage) {
    const variables = {
      owner: currentRepo.owner,
      name: currentRepo.name,
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
      console.log(`   Processed ${processedCount} items so far...`);
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
    case 'allIssues':
    case 'recentIssues':
      return data.data.repository.issues.nodes;
    default:
      throw new Error(`Unknown query name: ${queryName}`);
  }
}
