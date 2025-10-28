import { calculateRate } from '../utils/helpers.js';

export function displayMetrics(metrics) {
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

  const prMergeRate = calculateRate(totalMergedCommunityPRs, totalCommunityPRs);
  const issueResolutionRate = calculateRate(closedCommunityIssues, totalCommunityIssues);

  console.log("\n📊 Podman Desktop Metrics");
  console.log("==========================");
  console.log(`👍 Total Upvotes: ${totalUpvotes}`);
  console.log(`💬 Total Comments: ${totalComments}`);

  console.log("\n🔄 Pull Requests:");
  console.log(`   Open Community PRs: ${openCommunityPRs.length}`);
  console.log(`   All-time Community PRs: ${totalCommunityPRs}`);
  console.log(`   Merged Community PRs: ${totalMergedCommunityPRs}`);

  console.log("\n🎯 Issues:");
  console.log(`   Open Community Issues: ${openCommunityIssues}`);
  console.log(`   Closed Community Issues: ${closedCommunityIssues}`);
  console.log(`   All-time Community Issues: ${totalCommunityIssues}`);

  console.log("\n📈 Rates:");
  console.log(`   Community PR Merge Rate: ${prMergeRate}%`);
  console.log(`   Community Issue Resolution Rate: ${issueResolutionRate}%`);

  return { prMergeRate, issueResolutionRate };
}

export function displayTopActiveUsers(topUsers) {
  if (topUsers.length === 0) return;

  console.log("\n🌟 Top 5 Most Active Community Users (Last Month):");
  console.log("===================================================");

  topUsers.forEach((user, index) => {
    const activities = [];
    if (user.prs > 0) activities.push(`${user.prs} PR${user.prs > 1 ? 's' : ''}`);
    if (user.issues > 0) activities.push(`${user.issues} issue${user.issues > 1 ? 's' : ''}`);
    if (user.comments > 0) activities.push(`${user.comments} comment${user.comments > 1 ? 's' : ''}`);

    console.log(`${index + 1}. @${user.username} (${user.total} points)`);
    console.log(`   ${activities.join(', ')}`);
  });

  console.log("\n   📝 Scoring: PR created = 3pts, Issue created = 2pts, Comment = 1pt");
}

export function displayOpenPRs(openCommunityPRs) {
  if (openCommunityPRs.length === 0) return;

  console.log("\n🚀 Current Open Community Pull Requests:");
  console.log("=========================================");

  openCommunityPRs
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .forEach((pr, index) => {
      const createdDate = new Date(pr.createdAt).toLocaleDateString();
      console.log(
        `${index + 1}. #${pr.number} - ${pr.title} by @${pr.author.login} (${createdDate})`
      );
      console.log(`   ${pr.url}`);
    });
}
