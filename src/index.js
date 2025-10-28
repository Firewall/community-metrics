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
import { config } from './config.js';

async function main() {
  try {
    console.log(`🔍 Fetching ${config.repo.owner}/${config.repo.name} data...`);

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

    const metrics = {
      totalUpvotes,
      totalComments,
      openCommunityPRs,
      totalCommunityPRs,
      totalMergedCommunityPRs,
      openCommunityIssues,
      closedCommunityIssues,
      totalCommunityIssues,
    };

    const rates = displayMetrics(metrics);
    displayTopActiveUsers(topActiveUsers);
    displayOpenPRs(openCommunityPRs);
    outputGitHubActions(metrics, rates, topActiveUsers);

  } catch (error) {
    console.error("❌ Error:", error.message);
    process.exit(1);
  }
}

main();
