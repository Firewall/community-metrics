import { writeFileSync } from 'fs';

export function outputGitHubActions(metrics, rates, topUsers) {
  if (!process.env.GITHUB_ACTIONS) return;

  const {
    totalUpvotes,
    totalComments,
    openCommunityPRs,
    totalCommunityPRs,
    totalMergedCommunityPRs,
    openCommunityIssues,
    closedCommunityIssues,
    totalCommunityIssues,
  } = metrics;

  const { prMergeRate, issueResolutionRate } = rates;

  // Set outputs
  const outputs = [
    ['upvotes', totalUpvotes],
    ['comments', totalComments],
    ['open_community_prs', openCommunityPRs.length],
    ['total_community_prs', totalCommunityPRs],
    ['merged_community_prs', totalMergedCommunityPRs],
    ['open_community_issues', openCommunityIssues],
    ['closed_community_issues', closedCommunityIssues],
    ['total_community_issues', totalCommunityIssues],
    ['pr_merge_rate', prMergeRate],
    ['issue_resolution_rate', issueResolutionRate],
    ['top_active_users_count', topUsers.length],
  ];

  outputs.forEach(([key, value]) => {
    console.log(`::set-output name=${key}::${value}`);
  });

  generateJobSummary(metrics, rates, topUsers);
}

function generateJobSummary(metrics, rates, topUsers) {
  const {
    totalUpvotes,
    totalComments,
    openCommunityPRs,
    totalCommunityPRs,
    totalMergedCommunityPRs,
    openCommunityIssues,
    closedCommunityIssues,
    totalCommunityIssues,
  } = metrics;

  const { prMergeRate, issueResolutionRate } = rates;

  let summary = `## 📊 Repository Metrics

### 💬 Discussions
- 👍 **Total Upvotes:** ${totalUpvotes}
- 💬 **Total Comments:** ${totalComments}

### 🔄 Pull Requests
- 🔄 **Open Community PRs:** ${openCommunityPRs.length}
- 📈 **All-time Community PRs:** ${totalCommunityPRs}
- ✅ **Merged Community PRs:** ${totalMergedCommunityPRs}
- 🎯 **PR Merge Rate:** ${prMergeRate}%

### 🎯 Issues
- 🔓 **Open Community Issues:** ${openCommunityIssues}
- ✅ **Closed Community Issues:** ${closedCommunityIssues}
- 📊 **All-time Community Issues:** ${totalCommunityIssues}
- 🎯 **Issue Resolution Rate:** ${issueResolutionRate}%`;

  if (topUsers.length > 0) {
    summary += `\n\n### 🌟 Top Active Community Users (Last Month)\n\n`;
    topUsers.forEach((user, index) => {
      const activities = [];
      if (user.prs > 0) activities.push(`${user.prs} PR${user.prs > 1 ? 's' : ''}`);
      if (user.issues > 0) activities.push(`${user.issues} issue${user.issues > 1 ? 's' : ''}`);
      if (user.comments > 0) activities.push(`${user.comments} comment${user.comments > 1 ? 's' : ''}`);

      summary += `${index + 1}. **@${user.username}** (${user.total} points) - ${activities.join(', ')}\n`;
    });
    summary += `\n*Scoring: PR created = 3pts, Issue created = 2pts, Comment = 1pt*`;
  }

  if (openCommunityPRs.length > 0) {
    summary += `\n\n### 🚀 Current Open Community Pull Requests\n\n`;
    openCommunityPRs
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10) // Limit to 10 most recent for summary
      .forEach((pr) => {
        const createdDate = new Date(pr.createdAt).toLocaleDateString();
        summary += `- [#${pr.number} ${pr.title}](${pr.url}) by @${pr.author.login} (${createdDate})\n`;
      });

    if (openCommunityPRs.length > 10) {
      summary += `\n*...and ${openCommunityPRs.length - 10} more*`;
    }
  }

  summary += `\n\n*Last updated: ${new Date().toISOString()}*`;

  if (process.env.GITHUB_STEP_SUMMARY) {
    writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}
