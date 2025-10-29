import { paginatedFetch, getNodes } from '../utils/graphql-client.js';
import { isCommunityContributor, isWithinLastMonth } from '../utils/helpers.js';

export async function fetchRecentActivity() {
  const userActivity = new Map();

  // Track activity: PRs created = 3 points, Issues created = 2 points, Comments = 1 point
  const addActivity = (username, type, points = 1) => {
    if (!isCommunityContributor({ login: username })) return;

    if (!userActivity.has(username)) {
      userActivity.set(username, {
        username,
        prs: 0,
        issues: 0,
        comments: 0,
        total: 0
      });
    }

    const user = userActivity.get(username);
    user[type] += 1;
    user.total += points;
  };

  // Fetch recent PRs and their comments
  await paginatedFetch('recentPullRequests', (data) => {
    const pullRequests = getNodes(data, 'recentPullRequests');
    let recentCount = 0;
    let shouldStop = false;

    pullRequests.forEach((pr) => {
      if (!isWithinLastMonth(pr.createdAt)) {
        shouldStop = true;
        return;
      }

      recentCount++;

      // PR creation
      if (pr.author?.login) {
        addActivity(pr.author.login, 'prs', 3);
      }

      // PR comments
      pr.comments.nodes.forEach((comment) => {
        if (comment.author?.login && isWithinLastMonth(comment.createdAt)) {
          addActivity(comment.author.login, 'comments', 1);
        }
      });
    });

    return { count: recentCount, shouldStop };
  }, "Fetching recent PR activity");

  // Fetch recent issues and their comments
  await paginatedFetch('recentIssues', (data) => {
    const issues = getNodes(data, 'recentIssues');
    let recentCount = 0;
    let shouldStop = false;

    issues.forEach((issue) => {
      if (!isWithinLastMonth(issue.createdAt)) {
        shouldStop = true;
        return;
      }

      recentCount++;

      // Issue creation
      if (issue.author?.login) {
        addActivity(issue.author.login, 'issues', 2);
      }

      // Issue comments
      issue.comments.nodes.forEach((comment) => {
        if (comment.author?.login && isWithinLastMonth(comment.createdAt)) {
          addActivity(comment.author.login, 'comments', 1);
        }
      });
    });

    return { count: recentCount, shouldStop };
  }, "Fetching recent issue activity");

  // Fetch recent discussions and their comments
  await paginatedFetch('recentDiscussions', (data) => {
    const discussions = getNodes(data, 'recentDiscussions');
    let recentCount = 0;
    let shouldStop = false;

    discussions.forEach((discussion) => {
      if (!isWithinLastMonth(discussion.createdAt)) {
        shouldStop = true;
        return;
      }

      recentCount++;

      // Discussion comments
      discussion.comments.nodes.forEach((comment) => {
        if (comment.author?.login && isWithinLastMonth(comment.createdAt)) {
          addActivity(comment.author.login, 'comments', 1);
        }
      });
    });

    return { count: recentCount, shouldStop };
  }, "Fetching recent discussion activity");

  // Get top 5 most active users
  const topUsers = Array.from(userActivity.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return topUsers;
}
