import { paginatedFetch, getNodes } from '../utils/graphql-client.js';
import { isCommunityContributor } from '../utils/helpers.js';

export async function fetchOpenCommunityPRs() {
  const allPRs = [];

  await paginatedFetch('openPullRequests', (data) => {
    const pullRequests = getNodes(data, 'openPullRequests');
    const communityPRs = pullRequests.filter((pr) => isCommunityContributor(pr.author));
    allPRs.push(...communityPRs);
  });

  return allPRs;
}

export async function fetchAllTimeCommunityPRs() {
  let totalCommunityPRs = 0;
  let totalMergedCommunityPRs = 0;

  await paginatedFetch('allPullRequests', (data) => {
    const pullRequests = getNodes(data, 'allPullRequests');
    let count = 0;

    pullRequests.forEach((pr) => {
      if (isCommunityContributor(pr.author)) {
        totalCommunityPRs++;
        count++;
        if (pr.state === "MERGED") {
          totalMergedCommunityPRs++;
        }
      }
    });

    return { count };
  }, "Counting all-time community PRs");

  return { totalCommunityPRs, totalMergedCommunityPRs };
}
