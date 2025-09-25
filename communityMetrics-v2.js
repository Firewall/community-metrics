#!/usr/bin/env node

// Load the .env file
process.loadEnvFile();

const { maintainers } = require('./maintainers.js');

const GH_TOKEN = process.env.GH_TOKEN;
const REPO_OWNER = "podman-desktop";
const REPO_NAME = "podman-desktop";

if (!GH_TOKEN) {
  console.error("Please set GH_TOKEN environment variable");
  process.exit(1);
}

// Date helper for last month
const lastMonth = new Date();
lastMonth.setMonth(lastMonth.getMonth() - 1);
const lastMonthISO = lastMonth.toISOString();

// GraphQL Queries
const QUERIES = {
  discussions: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            reactions(first: 100) {
              totalCount
              nodes {
                content
              }
            }
            comments {
              totalCount
            }
          }
        }
      }
    }
  `,
  openPullRequests: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 100, after: $after, states: [OPEN]) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            number
            title
            author {
              login
            }
            url
            createdAt
            updatedAt
          }
        }
      }
    }
  `,
  allPullRequests: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            author {
              login
            }
            state
            createdAt
          }
        }
      }
    }
  `,
  allIssues: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        issues(first: 100, after: $after) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            author {
              login
            }
            state
            createdAt
          }
        }
      }
    }
  `,
  recentPullRequests: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        pullRequests(first: 100, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            author {
              login
            }
            createdAt
            comments(first: 100) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }
      }
    }
  `,
  recentIssues: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        issues(first: 100, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            author {
              login
            }
            createdAt
            comments(first: 100) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }
      }
    }
  `,
  recentDiscussions: `
    query($owner: String!, $name: String!, $after: String) {
      repository(owner: $owner, name: $name) {
        discussions(first: 100, after: $after, orderBy: {field: CREATED_AT, direction: DESC}) {
          pageInfo {
            hasNextPage
            endCursor
          }
          nodes {
            author {
              login
            }
            createdAt
            comments(first: 100) {
              nodes {
                author {
                  login
                }
                createdAt
              }
            }
          }
        }
      }
    }
  `,
};

// Utility Functions
async function makeGraphQLRequest(query, variables) {
  const response = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${GH_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ query, variables }),
  });

  const data = await response.json();

  if (data.errors) {
    throw new Error(`GraphQL Error: ${JSON.stringify(data.errors)}`);
  }

  return data;
}

async function paginatedFetch(queryName, processor, progressMessage = null, extraVariables = {}) {
  let hasNextPage = true;
  let cursor = null;
  let processedCount = 0;

  if (progressMessage) {
    console.log(`📊 ${progressMessage}...`);
  }

  while (hasNextPage) {
    const variables = {
      owner: REPO_OWNER,
      name: REPO_NAME,
      after: cursor,
      ...extraVariables,
    };

    const data = await makeGraphQLRequest(QUERIES[queryName], variables);

    const result = processor(data);
    if (result) {
      processedCount += result.count || 0;
      
      // Check if we should stop early (for recent data)
      if (result.shouldStop) {
        break;
      }
    }

    // Get pagination info from the appropriate path
    const pageInfo = getPageInfo(data, queryName);
    hasNextPage = pageInfo.hasNextPage;
    cursor = pageInfo.endCursor;

    // Show progress for long-running operations
    if (progressMessage && processedCount > 0 && processedCount % 100 === 0) {
      console.log(`   Processed ${processedCount} items so far...`);
    }

    // Add small delay to be respectful to API
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
}

function getPageInfo(data, queryName) {
  switch (queryName) {
    case 'discussions':
    case 'recentDiscussions':
      return data.data.repository.discussions.pageInfo;
    case 'openPullRequests':
    case 'allPullRequests':
    case 'recentPullRequests':
      return data.data.repository.pullRequests.pageInfo;
    case 'allIssues':
    case 'recentIssues':
      return data.data.repository.issues.pageInfo;
    default:
      throw new Error(`Unknown query name: ${queryName}`);
  }
}

function getNodes(data, queryName) {
  switch (queryName) {
    case 'discussions':
    case 'recentDiscussions':
      return data.data.repository.discussions.nodes;
    case 'openPullRequests':
    case 'allPullRequests':
    case 'recentPullRequests':
      return data.data.repository.pullRequests.nodes;
    case 'allIssues':
    case 'recentIssues':
      return data.data.repository.issues.nodes;
    default:
      throw new Error(`Unknown query name: ${queryName}`);
  }
}

function isCommunityContributor(author) {
  return author && !maintainers.includes(author.login);
}

function isWithinLastMonth(dateString) {
  return new Date(dateString) >= new Date(lastMonthISO);
}

// Data Fetching Functions
async function fetchDiscussions() {
  let totalUpvotes = 0;
  let totalComments = 0;
  const positiveReactions = ["THUMBS_UP", "HEART", "HOORAY", "ROCKET"];

  await paginatedFetch('discussions', (data) => {
    const discussions = getNodes(data, 'discussions');

    discussions.forEach((discussion) => {
      totalComments += discussion.comments.totalCount;

      discussion.reactions.nodes.forEach((reaction) => {
        if (positiveReactions.includes(reaction.content)) {
          totalUpvotes++;
        }
      });
    });
  });

  return { totalUpvotes, totalComments };
}

async function fetchOpenCommunityPRs() {
  const allPRs = [];

  await paginatedFetch('openPullRequests', (data) => {
    const pullRequests = getNodes(data, 'openPullRequests');
    const communityPRs = pullRequests.filter((pr) => isCommunityContributor(pr.author));
    allPRs.push(...communityPRs);
  });

  return allPRs;
}

async function fetchAllTimeCommunityPRs() {
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

async function fetchAllTimeCommunityIssues() {
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
  }, "Counting all-time community issues");

  return { totalCommunityIssues, openCommunityIssues, closedCommunityIssues };
}

async function fetchRecentActivity() {
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

// Output Functions
function calculateRate(numerator, denominator) {
  return denominator > 0 ? ((numerator / denominator) * 100).toFixed(1) : 0;
}

function displayMetrics(metrics) {
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

function displayTopActiveUsers(topUsers) {
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

function displayOpenPRs(openCommunityPRs) {
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

function outputGitHubActions(metrics, rates, topUsers) {
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
    const fs = require("fs");
    fs.writeFileSync(process.env.GITHUB_STEP_SUMMARY, summary);
  }
}

// Main Function
async function main() {
  try {
    console.log("🔍 Fetching Podman Desktop data...");

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