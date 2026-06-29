#!/usr/bin/env node

/**
 * Community Metrics - GitHub Repository Analytics
 * Generated with Claude Code (claude-sonnet-4-5@20250929)
 * https://claude.com/claude-code
 */

import { fetchDiscussions } from './fetchers/discussions.js';
import { fetchOpenCommunityPRs, fetchAllTimeCommunityPRs } from './fetchers/pull-requests.js';
import { fetchOpenCommunityIssues, fetchAllTimeCommunityIssues } from './fetchers/issues.js';
import { fetchRecentActivity } from './fetchers/activity.js';
import { fetchSocialMetrics } from './fetchers/social-media.js';
import { fetchRepositoryMetadata } from './fetchers/repository.js';
import { displayMetrics, displayTopActiveUsers, displayOpenPRs } from './reporters/console.js';
import { outputGitHubActions } from './reporters/github-actions.js';
import { config } from './config.js';
import { saveSnapshot, hasSnapshotForToday } from './utils/history.js';
import { setMaintainersFile } from './utils/maintainers.js';

// Parse command line arguments
const args = process.argv.slice(2);
const ignoreCache = args.includes('--no-cache') || args.includes('--ignore-cache');

async function fetchRepoMetrics(repo, socialMetrics = null) {
  const repoLabel = `${repo.owner}/${repo.name}`;
  const cached = !ignoreCache && await hasSnapshotForToday(repoLabel);

  if (cached && cached.exists) {
    console.log(`\n📦 [${repoLabel}] Using cached snapshot (${cached.filename})`);

    const openPRs = (cached.snapshot.metrics.pullRequests.openPRs || []).map(pr => ({
      number: pr.number,
      title: pr.title,
      author: { login: pr.author },
      url: pr.url,
      createdAt: pr.createdAt,
    }));

    const openIssues = (cached.snapshot.metrics.issues.openIssues || []).map(issue => ({
      number: issue.number,
      title: issue.title,
      author: { login: issue.author },
      assignees: { nodes: (issue.assignees || []).map(login => ({ login })) },
      labels: { nodes: (issue.labels || []).map(name => ({ name })) },
      url: issue.url,
      createdAt: issue.createdAt,
    }));

    return {
      repo,
      metrics: {
        totalUpvotes: cached.snapshot.metrics.discussions.totalUpvotes,
        totalComments: cached.snapshot.metrics.discussions.totalComments,
        openCommunityPRs: openPRs,
        totalCommunityPRs: cached.snapshot.metrics.pullRequests.total,
        totalMergedCommunityPRs: cached.snapshot.metrics.pullRequests.merged,
        openCommunityIssues: Array.isArray(cached.snapshot.metrics.issues.open) ? cached.snapshot.metrics.issues.open : (openIssues.length || cached.snapshot.metrics.issues.open),
        openCommunityIssuesList: openIssues,
        closedCommunityIssues: cached.snapshot.metrics.issues.closed,
        totalCommunityIssues: cached.snapshot.metrics.issues.total,
      },
      topActiveUsers: cached.snapshot.topActiveUsers,
      socialMetrics: socialMetrics || cached.snapshot.metrics.social,
      repoMetadata: cached.snapshot.metrics.repository,
      cached: true,
    };
  }

  console.log(`\n🔍 [${repoLabel}] Fetching data...`);

  // Fetch discussions, open community PRs, open community issues, recent activity, and repo metadata in parallel
  const [discussionsData, openCommunityPRs, openCommunityIssuesList, topActiveUsers, repoMetadata] = await Promise.all([
    fetchDiscussions(repo),
    fetchOpenCommunityPRs(repo),
    fetchOpenCommunityIssues(repo),
    fetchRecentActivity(repo),
    fetchRepositoryMetadata(repo),
  ]);

  // Fetch all-time community data in parallel
  const [
    { totalCommunityPRs, totalMergedCommunityPRs },
    { totalCommunityIssues, openCommunityIssues, closedCommunityIssues },
  ] = await Promise.all([
    fetchAllTimeCommunityPRs(repo),
    fetchAllTimeCommunityIssues(repo),
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
      openCommunityIssues: openCommunityIssuesList.length || openCommunityIssues,
      openCommunityIssuesList,
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
    openCommunityIssuesList: [],
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
    aggregate.openCommunityIssues += Array.isArray(metrics.openCommunityIssues) ? metrics.openCommunityIssues.length : metrics.openCommunityIssues;
    if (metrics.openCommunityIssuesList) {
      aggregate.openCommunityIssuesList.push(...metrics.openCommunityIssuesList);
    }
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

async function processProject(project) {
  console.log('\n\n');
  console.log('═'.repeat(60));
  console.log(`🏗️  PROJECT: ${project.name}`);
  console.log('═'.repeat(60));

  setMaintainersFile(project.maintainersFile);

  let socialMetrics = null;
  if (project.social) {
    console.log('\n📱 Fetching social media metrics...');
    socialMetrics = await fetchSocialMetrics(project.social);
  }

  console.log(`\n🚀 Fetching metrics for ${project.repos.length} repositories in parallel...`);

  const repoResults = await Promise.all(
    project.repos.map(repo => fetchRepoMetrics(repo, socialMetrics))
  );

  for (const result of repoResults) {
    const rates = displayMetrics(result.metrics, result.repo);
    displayTopActiveUsers(result.topActiveUsers);
    displayOpenPRs(result.metrics.openCommunityPRs);

    if (!result.cached) {
      const repoLabel = `${result.repo.owner}/${result.repo.name}`;
      await saveSnapshot(result.metrics, result.topActiveUsers, rates, repoLabel, result.socialMetrics, result.repoMetadata);
    }

    if (project.repos.length === 1) {
      outputGitHubActions(result.metrics, rates, result.topActiveUsers);
    }
  }

  if (project.repos.length > 1) {
    console.log('\n\n');
    console.log('─'.repeat(60));
    console.log(`📊 AGGREGATE METRICS - ${project.name}`);
    console.log('─'.repeat(60));

    const { aggregate, topActiveUsers, aggregateRepoMetadata } = aggregateMetrics(repoResults);
    const rates = displayMetrics(aggregate);
    displayTopActiveUsers(topActiveUsers);
    displayOpenPRs(aggregate.openCommunityPRs);

    const hasNewData = repoResults.some(r => !r.cached);
    if (hasNewData) {
      const socialMetrics = repoResults[0]?.socialMetrics;
      await saveSnapshot(aggregate, topActiveUsers, rates, `aggregate-${project.id}`, socialMetrics, aggregateRepoMetadata);
    } else {
      console.log('\n📦 Using cached aggregate data (no new snapshots needed today)');
    }

    outputGitHubActions(aggregate, rates, topActiveUsers);
  }
}

async function main() {
  try {
    if (ignoreCache) {
      console.log('\n⚠️  Cache disabled - fetching fresh data for all repositories');
    }

    for (const project of config.projects) {
      await processProject(project);
    }

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
