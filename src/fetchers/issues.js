import { paginatedFetch, getNodes } from '../utils/graphql-client.js';
import { isCommunityContributor } from '../utils/helpers.js';

export async function fetchOpenCommunityIssues(repo) {
  const allIssues = [];

  await paginatedFetch('openIssues', (data) => {
    const issues = getNodes(data, 'openIssues');
    const communityIssues = issues.filter((issue) => isCommunityContributor(issue.author));
    allIssues.push(...communityIssues);
  }, repo);

  return allIssues;
}

export async function fetchAllTimeCommunityIssues(repo) {
  let totalCommunityIssues = 0;
  let openCommunityIssues = 0;
  let closedCommunityIssues = 0;

  await paginatedFetch('allIssues', (data) => {
    const issues = getNodes(data, 'allIssues');
    let count = 0;

    issues.forEach((issue) => {
      if (isCommunityContributor(issue.author)) {
        totalCommunityIssues++;
        count++;
        if (issue.state === "OPEN") {
          openCommunityIssues++;
        } else if (issue.state === "CLOSED") {
          closedCommunityIssues++;
        }
      }
    });

    return { count };
  }, repo, "Counting all-time community issues");

  return { totalCommunityIssues, openCommunityIssues, closedCommunityIssues };
}
