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
import { fetchSocialMetrics } from './fetchers/social-media.js';
import { fetchRepositoryMetadata } from './fetchers/repository.js';
import { displayMetrics, displayTopActiveUsers, displayOpenPRs } from './reporters/console.js';
import { outputGitHubActions } from './reporters/github-actions.js';
import { setCurrentRepo } from './utils/graphql-client.js';
import { config } from './config.js';
import { saveSnapshot, hasSnapshotForToday } from './utils/history.js';

async function fetchRepoMetrics(repo) {
  setCurrentRepo(repo);

  const repoLabel = `${repo.owner}/${repo.name}`;
  const cached = await hasSnapshotForToday(repoLabel);

  if (cached.exists) {
    console.log(`\n📦 Using cached snapshot for ${repoLabel} (${cached.filename})`);

    const openPRs = (cached.snapshot.metrics.pullRequests.openPRs || []).map(pr => ({
      number: pr.number,
      title: pr.title,
      author: { login: pr.author },
      url: pr.url,
      createdAt: pr.createdAt,
    }));

    return {
      repo,
      metrics: {
        totalUpvotes: cached.snapshot.metrics.discussions.totalUpvotes,
        totalComments: cached.snapshot.metrics.discussions.totalComments,
        openCommunityPRs: openPRs,
        totalCommunityPRs: cached.snapshot.metrics.pullRequests.total,
        totalMergedCommunityPRs: cached.snapshot.metrics.pullRequests.merged,
        openCommunityIssues: cached.snapshot.metrics.issues.open,
        closedCommunityIssues: cached.snapshot.metrics.issues.closed,
        totalCommunityIssues: cached.snapshot.metrics.issues.total,
      },
      topActiveUsers: cached.snapshot.topActiveUsers,
      cached: true,
    };
  }

  console.log(`\n🔍 Fetching ${repo.owner}/${repo.name} data...`);

  // Fetch discussions, open community PRs, recent activity, social media, and repo metadata in parallel
  const [discussionsData, openCommunityPRs, topActiveUsers, socialMetrics, repoMetadata] = await Promise.all([
    fetchDiscussions(),
    fetchOpenCommunityPRs(),
    fetchRecentActivity(),
    fetchSocialMetrics(config.social),
    fetchRepositoryMetadata(repo),
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
    socialMetrics,
    repoMetadata,
    cached: false,
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
  let totalStars = 0;
  let totalForks = 0;
  let totalWatchers = 0;

  repoResults.forEach(({ metrics, topActiveUsers, repoMetadata }) => {
    aggregate.totalUpvotes += metrics.totalUpvotes;
    aggregate.totalComments += metrics.totalComments;
    aggregate.openCommunityPRs.push(...metrics.openCommunityPRs);
    aggregate.totalCommunityPRs += metrics.totalCommunityPRs;
    aggregate.totalMergedCommunityPRs += metrics.totalMergedCommunityPRs;
    aggregate.openCommunityIssues += metrics.openCommunityIssues;
    aggregate.closedCommunityIssues += metrics.closedCommunityIssues;
    aggregate.totalCommunityIssues += metrics.totalCommunityIssues;

    // Aggregate repository metadata
    if (repoMetadata) {
      totalStars += repoMetadata.stars;
      totalForks += repoMetadata.forks;
      totalWatchers += repoMetadata.watchers;
    }

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

  const aggregateRepoMetadata = {
    stars: totalStars,
    forks: totalForks,
    watchers: totalWatchers,
  };

  return { aggregate, topActiveUsers, aggregateRepoMetadata };
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

      // Save snapshot to history only if not cached
      if (!result.cached) {
        const repoLabel = `${result.repo.owner}/${result.repo.name}`;
        await saveSnapshot(result.metrics, result.topActiveUsers, rates, repoLabel, result.socialMetrics, result.repoMetadata);
      }

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

      const { aggregate, topActiveUsers, aggregateRepoMetadata } = aggregateMetrics(repoResults);
      const rates = displayMetrics(aggregate);
      displayTopActiveUsers(topActiveUsers);
      displayOpenPRs(aggregate.openCommunityPRs);

      // Save aggregate snapshot only if any repo fetched new data
      const hasNewData = repoResults.some(r => !r.cached);
      if (hasNewData) {
        // Use social metrics from first repo (they're the same across all repos)
        const socialMetrics = repoResults[0]?.socialMetrics;
        await saveSnapshot(aggregate, topActiveUsers, rates, 'aggregate', socialMetrics, aggregateRepoMetadata);
      } else {
        console.log('\n📦 Using cached aggregate data (no new snapshots needed today)');
      }

      outputGitHubActions(aggregate, rates, topActiveUsers);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
