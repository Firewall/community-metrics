#!/usr/bin/env node

/**
 * Community Metrics - GitHub Repository Analytics
 * Generated with Claude Code (claude-sonnet-4-5@20250929)
 * https://claude.com/claude-code
 */

import { fetchDiscussions } from './fetchers/discussions.js';
import { fetchOpenCommunityPRs, fetchAllTimeCommunityPRs } from './fetchers/pull-requests.js';
import { fetchAllTimeCommunityIssues } from './fetchers/issues.js';
import { fetchRecentActivity } from './fetchers/activity.js';
import { displayMetrics, displayTopActiveUsers, displayOpenPRs } from './reporters/console.js';
import { outputGitHubActions } from './reporters/github-actions.js';
import { setCurrentRepo } from './utils/graphql-client.js';
import { config } from './config.js';
import { saveSnapshot } from './utils/history.js';

async function fetchRepoMetrics(repo) {
  setCurrentRepo(repo);

  console.log(`\n🔍 Fetching ${repo.owner}/${repo.name} data...`);

  // Fetch discussions, open community PRs, and recent activity in parallel
  const [discussionsData, openCommunityPRs, topActiveUsers] = await Promise.all([
    fetchDiscussions(),
    fetchOpenCommunityPRs(),
    fetchRecentActivity(),
  ]);

  // Fetch all-time community data in parallel
  const [
    { totalCommunityPRs, totalMergedCommunityPRs },
    { totalCommunityIssues, openCommunityIssues, closedCommunityIssues },
  ] = await Promise.all([
    fetchAllTimeCommunityPRs(),
    fetchAllTimeCommunityIssues(),
  ]);

  const { totalUpvotes, totalComments } = discussionsData;

  return {
    repo,
    metrics: {
      totalUpvotes,
      totalComments,
      openCommunityPRs,
      totalCommunityPRs,
      totalMergedCommunityPRs,
      openCommunityIssues,
      closedCommunityIssues,
      totalCommunityIssues,
    },
    topActiveUsers,
  };
}

function aggregateMetrics(repoResults) {
  const aggregate = {
    totalUpvotes: 0,
    totalComments: 0,
    openCommunityPRs: [],
    totalCommunityPRs: 0,
    totalMergedCommunityPRs: 0,
    openCommunityIssues: 0,
    closedCommunityIssues: 0,
    totalCommunityIssues: 0,
  };

  const allActiveUsers = new Map();

  repoResults.forEach(({ metrics, topActiveUsers }) => {
    aggregate.totalUpvotes += metrics.totalUpvotes;
    aggregate.totalComments += metrics.totalComments;
    aggregate.openCommunityPRs.push(...metrics.openCommunityPRs);
    aggregate.totalCommunityPRs += metrics.totalCommunityPRs;
    aggregate.totalMergedCommunityPRs += metrics.totalMergedCommunityPRs;
    aggregate.openCommunityIssues += metrics.openCommunityIssues;
    aggregate.closedCommunityIssues += metrics.closedCommunityIssues;
    aggregate.totalCommunityIssues += metrics.totalCommunityIssues;

    // Merge active users
    topActiveUsers.forEach(user => {
      if (!allActiveUsers.has(user.username)) {
        allActiveUsers.set(user.username, {
          username: user.username,
          prs: 0,
          issues: 0,
          comments: 0,
          total: 0
        });
      }
      const existing = allActiveUsers.get(user.username);
      existing.prs += user.prs;
      existing.issues += user.issues;
      existing.comments += user.comments;
      existing.total += user.total;
    });
  });

  // Get top 5 active users from aggregated data
  const topActiveUsers = Array.from(allActiveUsers.values())
    .sort((a, b) => b.total - a.total)
    .slice(0, 5);

  return { aggregate, topActiveUsers };
}

async function main() {
  try {
    const repoResults = [];

    // Fetch metrics for each repository
    for (const repo of config.repos) {
      const result = await fetchRepoMetrics(repo);
      repoResults.push(result);

      // Display individual repo results
      const rates = displayMetrics(result.metrics, result.repo);
      displayTopActiveUsers(result.topActiveUsers);
      displayOpenPRs(result.metrics.openCommunityPRs);

      // Save snapshot to history
      const repoLabel = `${result.repo.owner}/${result.repo.name}`;
      await saveSnapshot(result.metrics, result.topActiveUsers, rates, repoLabel);

      // Output GitHub Actions for individual repo if only one repo
      if (config.repos.length === 1) {
        outputGitHubActions(result.metrics, rates, result.topActiveUsers);
      }
    }

    // If multiple repos, show aggregate
    if (config.repos.length > 1) {
      console.log('\n\n');
      console.log('═'.repeat(60));
      console.log('📊 AGGREGATE METRICS (All Repositories)');
      console.log('═'.repeat(60));

      const { aggregate, topActiveUsers } = aggregateMetrics(repoResults);
      const rates = displayMetrics(aggregate);
      displayTopActiveUsers(topActiveUsers);
      displayOpenPRs(aggregate.openCommunityPRs);

      // Save aggregate snapshot
      await saveSnapshot(aggregate, topActiveUsers, rates, 'aggregate');

      outputGitHubActions(aggregate, rates, topActiveUsers);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
