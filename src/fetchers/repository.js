/**
 * Fetches repository metadata (stars, forks, etc.)
 */

import { makeGraphQLRequest } from '../utils/graphql-client.js';

const REPO_QUERY = `
  query($owner: String!, $name: String!) {
    repository(owner: $owner, name: $name) {
      stargazerCount
      forkCount
      watchers {
        totalCount
      }
    }
  }
`;

/**
 * Fetches repository star count, forks, and watchers
 * @param {Object} repo - Repository object with owner and name
 * @returns {Promise<Object>} Repository metadata
 */
export async function fetchRepositoryMetadata(repo) {
  try {
    const data = await makeGraphQLRequest(REPO_QUERY, {
      owner: repo.owner,
      name: repo.name,
    });

    return {
      stars: data.data.repository.stargazerCount,
      forks: data.data.repository.forkCount,
      watchers: data.data.repository.watchers.totalCount,
    };
  } catch (error) {
    console.error(`Failed to fetch repository metadata for ${repo.owner}/${repo.name}:`, error.message);
    return {
      stars: 0,
      forks: 0,
      watchers: 0,
    };
  }
}
