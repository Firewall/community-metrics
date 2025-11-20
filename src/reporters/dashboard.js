import { getDailySnapshots } from '../utils/history.js';
import { config } from '../config.js';

export async function generateDashboardHTML() {
  const snapshots = await getDailySnapshots();

  if (snapshots.length === 0) {
    return generateEmptyDashboard();
  }

  const allRepos = [...new Set(snapshots.map(s => s.repoLabel))].filter(Boolean);
  const snapshotsByRepo = {};

  allRepos.forEach(repo => {
    if (repo === 'aggregate') {
      snapshotsByRepo['All Repositories'] = snapshots.filter(s => s.repoLabel === repo);
    } else {
      snapshotsByRepo[repo] = snapshots.filter(s => s.repoLabel === repo);
    }
  });

  const repoKeys = Object.keys(snapshotsByRepo).sort((a, b) => {
    if (a === 'All Repositories') return -1;
    if (b === 'All Repositories') return 1;
    return a.localeCompare(b);
  });

  const firstRepo = repoKeys[0];
  const initialSnapshots = snapshotsByRepo[firstRepo] || snapshots;

  const dates = initialSnapshots.map(s => s.date);
  const prData = initialSnapshots.map(s => s.metrics.pullRequests.open);
  const issuesData = initialSnapshots.map(s => s.metrics.issues.open);
  const upvotesData = initialSnapshots.map(s => s.metrics.discussions.totalUpvotes);
  const commentsData = initialSnapshots.map(s => s.metrics.discussions.totalComments);
  const prMergeRates = initialSnapshots.map(s => s.metrics.pullRequests.mergeRate);
  const issueCloseRates = initialSnapshots.map(s => s.metrics.issues.closeRate);
  const blueskyFollowers = initialSnapshots.map(s => s.metrics.social?.blueskyFollowers || null);
  const mastodonFollowers = initialSnapshots.map(s => s.metrics.social?.mastodonFollowers || null);
  const linkedinFollowers = initialSnapshots.map(s => s.metrics.social?.linkedinFollowers || null);
  const twitterFollowers = initialSnapshots.map(s => s.metrics.social?.twitterFollowers || null);
  const stars = initialSnapshots.map(s => s.metrics.repository?.stars || null);

  const latestSnapshot = initialSnapshots[initialSnapshots.length - 1];
  const hasSocialMetrics = latestSnapshot.metrics.social && (
    latestSnapshot.metrics.social.blueskyFollowers > 0 ||
    latestSnapshot.metrics.social.mastodonFollowers > 0 ||
    latestSnapshot.metrics.social.linkedinFollowers > 0 ||
    latestSnapshot.metrics.social.twitterFollowers > 0
  );
  const hasRepoMetrics = latestSnapshot.metrics.repository?.stars > 0;

  // Determine which social datasets to include
  const hasBluesky = blueskyFollowers.some(v => v !== null && v > 0);
  const hasMastodon = mastodonFollowers.some(v => v !== null && v > 0);
  const hasLinkedIn = linkedinFollowers.some(v => v !== null && v > 0);
  const hasTwitter = twitterFollowers.some(v => v !== null && v > 0);

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Metrics Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    :root {
      --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      --gradient-accent: linear-gradient(135deg, #6366f1 0%, #8b5cf6 50%, #ec4899 100%);
      --bg-dark: #0a0e27;
      --bg-card-start: #1e293b;
      --bg-card-end: #0f172a;
      --text-primary: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --border-color: rgba(100, 116, 139, 0.2);
      --shadow-card: 0 20px 60px rgba(0,0,0,0.4);
      --shadow-hover: 0 25px 80px rgba(102, 126, 234, 0.25);
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(102, 126, 234, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(240, 147, 251, 0.15) 0px, transparent 50%);
      min-height: 100vh;
      padding: 2.5rem 1.5rem;
      color: var(--text-secondary);
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: "cv02", "cv03", "cv04", "cv11";
      line-height: 1.6;
    }
    .container {
      max-width: 1440px;
      margin: 0 auto;
    }
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      margin-bottom: 0.75rem;
    }
    .logo-img {
      height: clamp(3rem, 6vw, 4.5rem);
      width: auto;
      filter: drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3));
      transition: transform 0.3s ease;
    }
    .logo-img:hover {
      transform: scale(1.05);
    }
    h1 {
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      margin: 0;
      font-size: clamp(2rem, 5vw, 3.5rem);
      font-weight: 900;
      letter-spacing: -0.03em;
      line-height: 1.1;
      text-shadow: 0 0 40px rgba(102, 126, 234, 0.3);
      display: inline-block;
    }
    .section-title {
      color: var(--text-primary);
      font-size: clamp(1.25rem, 2.5vw, 1.625rem);
      font-weight: 700;
      margin-top: 3rem;
      margin-bottom: 1.75rem;
      padding-bottom: 0.875rem;
      border-bottom: 2px solid rgba(102, 126, 234, 0.25);
      letter-spacing: -0.015em;
      position: relative;
    }
    .section-title:first-of-type {
      margin-top: 0;
    }
    .section-title::after {
      content: '';
      position: absolute;
      bottom: -2px;
      left: 0;
      width: 60px;
      height: 2px;
      background: var(--gradient-primary);
      border-radius: 2px;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(500px, 100%), 1fr));
      gap: 1.75rem;
      margin-bottom: 2.5rem;
    }
    .chart-card {
      background: linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%);
      border-radius: 20px;
      padding: 2rem;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border-color);
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .chart-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: var(--gradient-primary);
      opacity: 0;
      transition: opacity 0.3s ease;
    }
    .chart-card:hover {
      transform: translateY(-4px);
      box-shadow: var(--shadow-hover);
      border-color: rgba(102, 126, 234, 0.4);
    }
    .chart-card:hover::before {
      opacity: 1;
    }
    .chart-card h2 {
      color: var(--text-primary);
      margin-bottom: 1.5rem;
      font-size: 1.3125rem;
      font-weight: 700;
      letter-spacing: -0.02em;
      line-height: 1.3;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(min(240px, 100%), 1fr));
      gap: 1.5rem;
      margin-bottom: 3rem;
    }
    .stat-card {
      background: linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%);
      border-radius: 20px;
      padding: 2.25rem 2rem;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border-color);
      text-align: center;
      transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
      overflow: hidden;
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-primary);
      transform: scaleX(0);
      transform-origin: left;
      transition: transform 0.3s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .stat-card:hover {
      transform: translateY(-6px) scale(1.02);
      box-shadow: var(--shadow-hover);
      border-color: rgba(102, 126, 234, 0.4);
    }
    .stat-card:hover::before {
      transform: scaleX(1);
    }
    .stat-value {
      font-size: clamp(2rem, 4vw, 3.25rem);
      font-weight: 900;
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.1;
      letter-spacing: -0.03em;
      display: block;
    }
    .stat-label {
      color: var(--text-muted);
      margin-top: 0.875rem;
      font-size: 0.875rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.08em;
    }
    .footer {
      text-align: center;
      color: var(--text-muted);
      margin-top: 4rem;
      padding-top: 2rem;
      font-size: 0.875rem;
      font-weight: 500;
      letter-spacing: 0.02em;
      border-top: 1px solid var(--border-color);
    }
    .stat-card.clickable {
      cursor: pointer;
      position: relative;
    }
    .stat-card.clickable::after {
      content: '👁️';
      position: absolute;
      top: 1.25rem;
      right: 1.25rem;
      opacity: 0;
      transition: all 0.3s ease;
      font-size: 1.25rem;
      filter: drop-shadow(0 2px 4px rgba(0,0,0,0.2));
    }
    .stat-card.clickable:hover::after {
      opacity: 0.7;
      transform: scale(1.1);
    }
    a.stat-card {
      text-decoration: none;
      color: inherit;
      display: block;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 14, 39, 0.92);
      backdrop-filter: blur(12px) saturate(180%);
      -webkit-backdrop-filter: blur(12px) saturate(180%);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
      animation: fadeIn 0.3s ease;
    }
    @keyframes fadeIn {
      from { opacity: 0; }
      to { opacity: 1; }
    }
    .modal.active {
      display: flex;
    }
    .modal-content {
      background: linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%);
      border-radius: 24px;
      padding: 2.5rem;
      max-width: 95vw;
      width: 100%;
      max-height: 85vh;
      overflow-y: auto;
      border: 1px solid rgba(100, 116, 139, 0.3);
      box-shadow: 0 30px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.05);
      animation: slideUp 0.4s cubic-bezier(0.4, 0, 0.2, 1);
      position: relative;
    }
    @keyframes slideUp {
      from {
        opacity: 0;
        transform: translateY(20px) scale(0.95);
      }
      to {
        opacity: 1;
        transform: translateY(0) scale(1);
      }
    }
    .modal-content::-webkit-scrollbar {
      width: 8px;
    }
    .modal-content::-webkit-scrollbar-track {
      background: rgba(0,0,0,0.1);
      border-radius: 4px;
    }
    .modal-content::-webkit-scrollbar-thumb {
      background: rgba(102, 126, 234, 0.3);
      border-radius: 4px;
    }
    .modal-content::-webkit-scrollbar-thumb:hover {
      background: rgba(102, 126, 234, 0.5);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 2rem;
      padding-bottom: 1.25rem;
      border-bottom: 1px solid var(--border-color);
    }
    .modal-header h2 {
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.875rem;
      font-weight: 800;
      margin: 0;
      letter-spacing: -0.02em;
    }
    .modal-close {
      background: rgba(239, 68, 68, 0.12);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.25);
      border-radius: 10px;
      padding: 0.625rem 1.25rem;
      cursor: pointer;
      font-weight: 600;
      font-size: 0.9375rem;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      font-family: 'Inter', sans-serif;
    }
    .modal-close:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
      transform: translateY(-1px);
      box-shadow: 0 4px 12px rgba(239, 68, 68, 0.2);
    }
    .pr-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .pr-item {
      background: rgba(100, 116, 139, 0.08);
      border: 1px solid var(--border-color);
      border-radius: 14px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
    }
    .pr-item:hover {
      background: rgba(102, 126, 234, 0.08);
      border-color: rgba(102, 126, 234, 0.4);
      transform: translateX(6px);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
    }
    .pr-number {
      color: #667eea;
      font-weight: 700;
      font-size: 0.875rem;
      margin-bottom: 0.625rem;
      letter-spacing: 0.02em;
    }
    .pr-title {
      color: var(--text-primary);
      font-size: 1.0625rem;
      font-weight: 600;
      margin-bottom: 0.625rem;
      line-height: 1.5;
      letter-spacing: -0.01em;
    }
    .pr-repo {
      color: #8b5cf6;
      font-size: 0.8125rem;
      font-weight: 500;
      margin-bottom: 0.625rem;
      opacity: 0.9;
    }
    .pr-meta {
      display: flex;
      gap: 1.25rem;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.875rem;
      color: var(--text-muted);
      margin-top: 0.875rem;
    }
    .pr-author {
      color: #f093fb;
      display: flex;
      align-items: center;
      gap: 0.625rem;
      font-weight: 500;
    }
    .pr-avatar {
      width: 26px;
      height: 26px;
      border-radius: 50%;
      border: 2px solid rgba(240, 147, 251, 0.35);
      transition: all 0.2s ease;
    }
    .pr-item:hover .pr-avatar {
      border-color: rgba(240, 147, 251, 0.6);
      transform: scale(1.05);
    }
    .pr-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 600;
      transition: all 0.2s ease;
      border-bottom: 1px solid transparent;
    }
    .pr-link:hover {
      color: #764ba2;
      border-bottom-color: #764ba2;
    }
    .empty-state {
      text-align: center;
      padding: 3rem 1rem;
      color: #94a3b8;
    }
    .empty-state-icon {
      font-size: 3rem;
      margin-bottom: 1rem;
    }
    .repo-selector {
      display: flex;
      justify-content: center;
      margin-bottom: 2.5rem;
      gap: 1.25rem;
      align-items: center;
      flex-wrap: wrap;
    }
    .repo-selector label {
      color: var(--text-muted);
      font-weight: 600;
      font-size: 0.9375rem;
      letter-spacing: 0.02em;
    }
    .repo-selector select {
      background: linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%);
      color: var(--text-primary);
      border: 1px solid var(--border-color);
      border-radius: 12px;
      padding: 0.875rem 3rem 0.875rem 1.25rem;
      font-size: 1rem;
      font-weight: 600;
      cursor: pointer;
      outline: none;
      appearance: none;
      font-family: 'Inter', sans-serif;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='14' height='14' viewBox='0 0 14 14'%3E%3Cpath fill='%23cbd5e1' d='M7 10L2 5h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1.25rem center;
      transition: all 0.25s cubic-bezier(0.4, 0, 0.2, 1);
      box-shadow: 0 2px 8px rgba(0,0,0,0.1);
    }
    .repo-selector select:hover {
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 0 4px 16px rgba(102, 126, 234, 0.15);
      transform: translateY(-1px);
    }
    .repo-selector select:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 4px rgba(102, 126, 234, 0.2), 0 4px 16px rgba(102, 126, 234, 0.15);
      outline: none;
    }
    .repo-selector select option {
      background: #1e293b;
      color: #f1f5f9;
      padding: 0.75rem 1rem;
      font-weight: 600;
      font-size: 1rem;
      font-family: 'Inter', sans-serif;
    }
    .repo-selector select option:checked,
    .repo-selector select option:hover,
    .repo-selector select option:focus {
      background: #667eea;
      color: #ffffff;
    }
    #issues-table-container {
      overflow-x: auto;
      max-height: calc(85vh - 200px);
    }
    .issues-table {
      width: 100%;
      border-collapse: collapse;
      margin-top: 1rem;
      min-width: 800px;
    }
    .issues-table thead tr {
      background: rgba(100, 116, 139, 0.1);
      border-bottom: 2px solid var(--border-color);
    }
    .issues-table th {
      color: var(--text-primary);
      font-weight: 700;
      font-size: 0.875rem;
      text-transform: uppercase;
      letter-spacing: 0.08em;
      padding: 1rem 1.25rem;
      text-align: left;
    }
    .issues-table tbody tr {
      border-bottom: 1px solid var(--border-color);
      transition: all 0.2s ease;
      cursor: pointer;
    }
    .issues-table tbody tr:hover {
      background: rgba(102, 126, 234, 0.08);
      border-color: rgba(102, 126, 234, 0.4);
    }
    .issues-table td {
      padding: 1.25rem 1.25rem;
      color: var(--text-secondary);
      font-size: 0.9375rem;
    }
    .issue-id {
      color: #667eea;
      font-weight: 700;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    }
    .issue-title {
      color: var(--text-primary);
      font-weight: 600;
      max-width: 400px;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .issue-repo {
      color: #8b5cf6;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .issue-user {
      display: flex;
      align-items: center;
      gap: 0.625rem;
      color: #f093fb;
      font-weight: 500;
      font-size: 0.875rem;
    }
    .issue-avatar {
      width: 28px;
      height: 28px;
      border-radius: 50%;
      border: 2px solid rgba(240, 147, 251, 0.35);
      transition: all 0.2s ease;
    }
    .issues-table tbody tr:hover .issue-avatar {
      border-color: rgba(240, 147, 251, 0.6);
      transform: scale(1.05);
    }
    .issue-assignee-empty {
      color: var(--text-muted);
      font-style: italic;
      font-size: 0.8125rem;
    }
    .issue-type {
      font-size: 0.875rem;
    }
    .issue-type-badge {
      display: inline-block;
      padding: 0.375rem 0.75rem;
      border-radius: 12px;
      font-weight: 600;
      font-size: 0.8125rem;
      text-transform: capitalize;
    }
    .issue-type-badge.bug {
      background: rgba(244, 63, 94, 0.15);
      color: #f43f5e;
      border: 1px solid rgba(244, 63, 94, 0.3);
    }
    .issue-type-badge.enhancement {
      background: rgba(59, 130, 246, 0.15);
      color: #3b82f6;
      border: 1px solid rgba(59, 130, 246, 0.3);
    }
    .issue-type-badge.feature {
      background: rgba(139, 92, 246, 0.15);
      color: #8b5cf6;
      border: 1px solid rgba(139, 92, 246, 0.3);
    }
    .issue-type-badge.question {
      background: rgba(245, 158, 11, 0.15);
      color: #f59e0b;
      border: 1px solid rgba(245, 158, 11, 0.3);
    }
    .issue-type-badge.documentation {
      background: rgba(34, 197, 94, 0.15);
      color: #22c55e;
      border: 1px solid rgba(34, 197, 94, 0.3);
    }
    .issue-type-badge.default {
      background: rgba(102, 126, 234, 0.15);
      color: #667eea;
      border: 1px solid rgba(102, 126, 234, 0.3);
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header-logo">
      <img src="https://podman-desktop.io/img/logo.svg" 
           alt="Podman Desktop Logo" 
           class="logo-img">
      <h1>Community Metrics Dashboard</h1>
    </div>

    <div class="repo-selector">
      <label for="repoSelect">Repository:</label>
      <select id="repoSelect">
        ${repoKeys.map(repo =>
          `<option value="${repo}">${repo === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + repo}</option>`
        ).join('')}
      </select>
    </div>

    <h2 class="section-title">Repository Metrics</h2>
    <div class="stats-grid">
      <div class="stat-card clickable" id="open-prs-card">
        <div class="stat-value" id="stat-prs">${latestSnapshot.metrics.pullRequests.open}</div>
        <div class="stat-label">Open PRs</div>
      </div>
      <div class="stat-card clickable" id="open-issues-card">
        <div class="stat-value" id="stat-issues">${latestSnapshot.metrics.issues.open}</div>
        <div class="stat-label">Open Issues</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-pr-rate">${latestSnapshot.metrics.pullRequests.mergeRate}%</div>
        <div class="stat-label">PR Merge Rate</div>
      </div>
      <div class="stat-card">
        <div class="stat-value" id="stat-issue-rate">${latestSnapshot.metrics.issues.closeRate}%</div>
        <div class="stat-label">Issue Close Rate</div>
      </div>
      ${hasRepoMetrics ? `
      <div class="stat-card">
        <div class="stat-value" id="stat-stars">${latestSnapshot.metrics.repository.stars.toLocaleString()}</div>
        <div class="stat-label">GitHub Stars</div>
      </div>
      ` : ''}
    </div>

    <div class="grid">
      <div class="chart-card">
        <h2>Pull Requests Over Time</h2>
        <canvas id="prChart"></canvas>
      </div>

      <div class="chart-card">
        <h2>Issues Over Time</h2>
        <canvas id="issuesChart"></canvas>
      </div>

      <div class="chart-card">
        <h2>Discussion Engagement</h2>
        <canvas id="discussionsChart"></canvas>
      </div>

      <div class="chart-card">
        <h2>Success Rates</h2>
        <canvas id="ratesChart"></canvas>
      </div>

      ${hasRepoMetrics ? `
      <div class="chart-card">
        <h2>GitHub Stars</h2>
        <canvas id="starsChart"></canvas>
      </div>
      ` : ''}
    </div>

    ${hasSocialMetrics ? `
    <h2 class="section-title">Social Media</h2>
    <div class="stats-grid">
      ${latestSnapshot.metrics.social?.linkedinFollowers > 0 ? `
      <a href="${config.social.linkedin}" target="_blank" class="stat-card">
        <div class="stat-value" id="stat-linkedin">${latestSnapshot.metrics.social.linkedinFollowers.toLocaleString()}</div>
        <div class="stat-label">💼 LinkedIn</div>
      </a>
      ` : ''}
      ${latestSnapshot.metrics.social?.blueskyFollowers > 0 ? `
      <a href="https://bsky.app/profile/${config.social.bluesky}" target="_blank" class="stat-card">
        <div class="stat-value" id="stat-bluesky">${latestSnapshot.metrics.social.blueskyFollowers.toLocaleString()}</div>
        <div class="stat-label">☁️ Bluesky</div>
      </a>
      ` : ''}
      ${latestSnapshot.metrics.social?.mastodonFollowers > 0 ? `
      <a href="https://${config.social.mastodon.instance}/@${config.social.mastodon.username}" target="_blank" class="stat-card">
        <div class="stat-value" id="stat-mastodon">${latestSnapshot.metrics.social.mastodonFollowers.toLocaleString()}</div>
        <div class="stat-label">🐘 Mastodon</div>
      </a>
      ` : ''}
      ${latestSnapshot.metrics.social?.twitterFollowers > 0 ? `
      <a href="https://twitter.com/${config.social.twitter}" target="_blank" class="stat-card">
        <div class="stat-value" id="stat-twitter">${latestSnapshot.metrics.social.twitterFollowers.toLocaleString()}</div>
        <div class="stat-label">𝕏 Twitter</div>
      </a>
      ` : ''}
    </div>

    <div class="grid">
      <div class="chart-card">
        <h2>Social Media Followers</h2>
        <canvas id="socialChart"></canvas>
      </div>
    </div>
    ` : ''}

    <div class="modal" id="prs-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">Open Pull Requests</h2>
          <button class="modal-close" onclick="document.getElementById('prs-modal').classList.remove('active')">Close</button>
        </div>
        <div id="prs-list"></div>
      </div>
    </div>

    <div class="modal" id="issues-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="issues-modal-title">Open Issues</h2>
          <button class="modal-close" onclick="document.getElementById('issues-modal').classList.remove('active')">Close</button>
        </div>
        <div id="issues-table-container"></div>
      </div>
    </div>

    <div class="footer">
      Generated with Community Metrics Analyzer
    </div>
  </div>

  <script>
    const snapshotsByRepo = ${JSON.stringify(snapshotsByRepo)};
    const repoKeys = ${JSON.stringify(repoKeys)};
    const hasSocialMetrics = ${hasSocialMetrics};
    const hasRepoMetrics = ${hasRepoMetrics};

    const chartConfig = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#f1f5f9',
            font: {
              family: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
              size: 13,
              weight: 600
            },
            padding: 18,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.98)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(100, 116, 139, 0.4)',
          borderWidth: 1,
          padding: 14,
          cornerRadius: 10,
          displayColors: true,
          titleFont: {
            family: 'Inter, sans-serif',
            size: 13,
            weight: 700
          },
          bodyFont: {
            family: 'Inter, sans-serif',
            size: 12,
            weight: 500
          }
        }
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: 'rgba(100, 116, 139, 0.12)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Inter, sans-serif',
              size: 12,
              weight: 500
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(100, 116, 139, 0.12)',
            drawBorder: false,
            lineWidth: 1
          },
          ticks: {
            color: '#94a3b8',
            font: {
              family: 'Inter, sans-serif',
              size: 12,
              weight: 500
            }
          }
        }
      }
    };

    const prChart = new Chart(document.getElementById('prChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [{
          label: 'Open PRs',
          data: ${JSON.stringify(prData)},
          borderColor: '#667eea',
          backgroundColor: 'rgba(102, 126, 234, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#667eea',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: chartConfig
    });

    const issuesChart = new Chart(document.getElementById('issuesChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [{
          label: 'Open Issues',
          data: ${JSON.stringify(issuesData)},
          borderColor: '#f093fb',
          backgroundColor: 'rgba(240, 147, 251, 0.15)',
          fill: true,
          tension: 0.4,
          borderWidth: 3,
          pointRadius: 4,
          pointBackgroundColor: '#f093fb',
          pointBorderColor: '#0f172a',
          pointBorderWidth: 2,
          pointHoverRadius: 6
        }]
      },
      options: chartConfig
    });

    const discussionsChart = new Chart(document.getElementById('discussionsChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [
          {
            label: 'Total Upvotes',
            data: ${JSON.stringify(upvotesData)},
            borderColor: '#4facfe',
            backgroundColor: 'rgba(79, 172, 254, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#4facfe',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          },
          {
            label: 'Total Comments',
            data: ${JSON.stringify(commentsData)},
            borderColor: '#00f2fe',
            backgroundColor: 'rgba(0, 242, 254, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#00f2fe',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }
        ]
      },
      options: chartConfig
    });

    const ratesChart = new Chart(document.getElementById('ratesChart'), {
      type: 'line',
      data: {
        labels: ${JSON.stringify(dates)},
        datasets: [
          {
            label: 'PR Merge Rate (%)',
            data: ${JSON.stringify(prMergeRates)},
            borderColor: '#43e97b',
            backgroundColor: 'rgba(67, 233, 123, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#43e97b',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          },
          {
            label: 'Issue Close Rate (%)',
            data: ${JSON.stringify(issueCloseRates)},
            borderColor: '#38f9d7',
            backgroundColor: 'rgba(56, 249, 215, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#38f9d7',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }
        ]
      },
      options: {
        ...chartConfig,
        scales: {
          ...chartConfig.scales,
          y: {
            beginAtZero: true,
            max: 100,
            grid: {
              color: 'rgba(100, 116, 139, 0.12)',
              drawBorder: false,
              lineWidth: 1
            },
            ticks: {
              color: '#94a3b8',
              font: {
                family: 'Inter, sans-serif',
                size: 12,
                weight: 500
              }
            }
          }
        }
      }
    });

    let starsChart = null;
    if (hasRepoMetrics) {
      starsChart = new Chart(document.getElementById('starsChart'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(dates)},
          datasets: [{
            label: 'GitHub Stars',
            data: ${JSON.stringify(stars)},
            borderColor: '#fbbf24',
            backgroundColor: 'rgba(251, 191, 36, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#fbbf24',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            spanGaps: true
          }]
        },
        options: chartConfig
      });
    }

    let socialChart = null;
    if (hasSocialMetrics) {
      const socialDatasets = [];

      ${hasLinkedIn ? `
      socialDatasets.push({
        label: 'LinkedIn',
        data: ${JSON.stringify(linkedinFollowers)},
        borderColor: '#0077b5',
        backgroundColor: 'rgba(0, 119, 181, 0.15)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#0077b5',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        spanGaps: true
      });
      ` : ''}

      ${hasBluesky ? `
      socialDatasets.push({
        label: 'Bluesky',
        data: ${JSON.stringify(blueskyFollowers)},
        borderColor: '#0085ff',
        backgroundColor: 'rgba(0, 133, 255, 0.15)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#0085ff',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        spanGaps: true
      });
      ` : ''}

      ${hasMastodon ? `
      socialDatasets.push({
        label: 'Mastodon',
        data: ${JSON.stringify(mastodonFollowers)},
        borderColor: '#6364ff',
        backgroundColor: 'rgba(99, 100, 255, 0.15)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#6364ff',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        spanGaps: true
      });
      ` : ''}

      ${hasTwitter ? `
      socialDatasets.push({
        label: 'Twitter/X',
        data: ${JSON.stringify(twitterFollowers)},
        borderColor: '#1da1f2',
        backgroundColor: 'rgba(29, 161, 242, 0.15)',
        fill: false,
        tension: 0.4,
        borderWidth: 3,
        pointRadius: 4,
        pointBackgroundColor: '#1da1f2',
        pointBorderColor: '#0f172a',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        spanGaps: true
      });
      ` : ''}

      socialChart = new Chart(document.getElementById('socialChart'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(dates)},
          datasets: socialDatasets
        },
        options: chartConfig
      });
    }

    document.getElementById('repoSelect').addEventListener('change', (e) => {
      updateDashboard(e.target.value);
    });

    let currentRepoLabel = repoKeys[0];

    function showPRsModal() {
      const snapshots = snapshotsByRepo[currentRepoLabel] || [];
      if (snapshots.length === 0) return;

      const latestSnapshot = snapshots[snapshots.length - 1];
      const openPRs = latestSnapshot.metrics.pullRequests.openPRs || [];

      const modalTitle = document.getElementById('modal-title');
      const prsList = document.getElementById('prs-list');

      modalTitle.textContent = \`Open Pull Requests - \${currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel}\`;

      if (openPRs.length === 0) {
        prsList.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">🎉</div>
            <p>No open pull requests!</p>
          </div>
        \`;
      } else {
        prsList.innerHTML = \`
          <ul class="pr-list">
            \${openPRs.map(pr => {
              const repoMatch = pr.url.match(/github\\.com\\/([^/]+\\/[^/]+)\\/pull/);
              const repo = repoMatch ? repoMatch[1] : '';
              return \`
              <li class="pr-item">
                <div class="pr-number">#\${pr.number}</div>
                <div class="pr-title">\${pr.title}</div>
                \${repo ? \`<div class="pr-repo">📦 \${repo}</div>\` : ''}
                <div class="pr-meta">
                  <span class="pr-author">
                    <img src="https://github.com/\${pr.author}.png?size=48" alt="\${pr.author}" class="pr-avatar" />
                    @\${pr.author}
                  </span>
                  <span>📅 \${new Date(pr.createdAt).toLocaleDateString()}</span>
                  <a href="\${pr.url}" target="_blank" class="pr-link">View on GitHub →</a>
                </div>
              </li>
            \`;
            }).join('')}
          </ul>
        \`;
      }

      document.getElementById('prs-modal').classList.add('active');
    }

    document.getElementById('open-prs-card').addEventListener('click', showPRsModal);

    document.getElementById('prs-modal').addEventListener('click', (e) => {
      if (e.target.id === 'prs-modal') {
        document.getElementById('prs-modal').classList.remove('active');
      }
    });

    function showIssuesModal() {
      const snapshots = snapshotsByRepo[currentRepoLabel] || [];
      if (snapshots.length === 0) return;

      const latestSnapshot = snapshots[snapshots.length - 1];
      const openIssues = (latestSnapshot.metrics.issues.openIssues || []).sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA; // Sort descending (newest first)
      });

      const modalTitle = document.getElementById('issues-modal-title');
      const issuesContainer = document.getElementById('issues-table-container');

      modalTitle.textContent = \`Open Issues - \${currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel}\`;

      if (openIssues.length === 0) {
        issuesContainer.innerHTML = \`
          <div class="empty-state">
            <div class="empty-state-icon">🎉</div>
            <p>No open issues!</p>
          </div>
        \`;
      } else {
        issuesContainer.innerHTML = \`
          <table class="issues-table">
            <thead>
              <tr>
                <th>Issue ID</th>
                <th>Issue Name</th>
                <th>Type</th>
                <th>Repo</th>
                <th>Creator</th>
                <th>Assignee</th>
              </tr>
            </thead>
            <tbody>
              \${openIssues.map(issue => {
                const repoMatch = issue.url.match(/github\\.com\\/([^/]+\\/[^/]+)\\/issues/);
                const repo = repoMatch ? repoMatch[1] : '';
                const assignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : null;
                const labels = issue.labels?.nodes || issue.labels || [];
                const issueType = labels.find(l => {
                  const name = typeof l === 'string' ? l : l.name;
                  const lower = name.toLowerCase();
                  return lower.includes('bug') || lower.includes('enhancement') || lower.includes('feature') || lower.includes('question') || lower.includes('documentation');
                }) || (labels.length > 0 ? (typeof labels[0] === 'string' ? labels[0] : labels[0].name) : '');
                const issueTypeDisplay = typeof issueType === 'string' ? issueType : (issueType.name || '');
                // Extract type from label (e.g., "kind/bug" -> "bug", "bug" -> "bug")
                const typeName = issueTypeDisplay.toLowerCase();
                let displayType = '';
                let typeClass = 'default';
                if (typeName.includes('bug')) {
                  displayType = 'Bug';
                  typeClass = 'bug';
                } else if (typeName.includes('enhancement')) {
                  displayType = 'Enhancement';
                  typeClass = 'enhancement';
                } else if (typeName.includes('feature')) {
                  displayType = 'Feature';
                  typeClass = 'feature';
                } else if (typeName.includes('question')) {
                  displayType = 'Question';
                  typeClass = 'question';
                } else if (typeName.includes('documentation')) {
                  displayType = 'Documentation';
                  typeClass = 'documentation';
                } else if (issueTypeDisplay) {
                  // Use the label name, removing prefix if present (e.g., "kind/bug" -> "bug")
                  displayType = issueTypeDisplay.split('/').pop().split(' ')[0]; // Get last part after / and remove emoji
                  typeClass = 'default';
                }
                const issueUrl = issue.url.replace(/"/g, '&quot;');
                const issueTitle = issue.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
                return \`
                <tr onclick="window.open('\${issueUrl}', '_blank')" title="Click to open issue on GitHub">
                  <td class="issue-id">#\${issue.number}</td>
                  <td class="issue-title">\${issueTitle}</td>
                  <td class="issue-type">\${displayType ? \`<span class="issue-type-badge \${typeClass}">\${displayType}</span>\` : '-'}</td>
                  <td class="issue-repo">\${repo || 'N/A'}</td>
                  <td>
                    <div class="issue-user">
                      <img src="https://github.com/\${issue.author}.png?size=56" alt="\${issue.author}" class="issue-avatar" />
                      @\${issue.author}
                    </div>
                  </td>
                  <td>
                    \${assignee ? \`
                      <div class="issue-user">
                        <img src="https://github.com/\${assignee}.png?size=56" alt="\${assignee}" class="issue-avatar" />
                        @\${assignee}
                      </div>
                    \` : \`<span class="issue-assignee-empty">Unassigned</span>\`}
                  </td>
                </tr>
              \`;
              }).join('')}
            </tbody>
          </table>
        \`;
      }

      document.getElementById('issues-modal').classList.add('active');
    }

    document.getElementById('open-issues-card').addEventListener('click', showIssuesModal);

    document.getElementById('issues-modal').addEventListener('click', (e) => {
      if (e.target.id === 'issues-modal') {
        document.getElementById('issues-modal').classList.remove('active');
      }
    });

    function updateDashboard(repoLabel) {
      currentRepoLabel = repoLabel;
      const snapshots = snapshotsByRepo[repoLabel] || [];
      if (snapshots.length === 0) return;

      const latestSnapshot = snapshots[snapshots.length - 1];
      const dates = snapshots.map(s => s.date);
      const prData = snapshots.map(s => s.metrics.pullRequests.open);
      const issuesData = snapshots.map(s => s.metrics.issues.open);
      const upvotesData = snapshots.map(s => s.metrics.discussions.totalUpvotes);
      const commentsData = snapshots.map(s => s.metrics.discussions.totalComments);
      const prMergeRates = snapshots.map(s => s.metrics.pullRequests.mergeRate);
      const issueCloseRates = snapshots.map(s => s.metrics.issues.closeRate);
      const blueskyFollowers = snapshots.map(s => s.metrics.social?.blueskyFollowers || null);
      const mastodonFollowers = snapshots.map(s => s.metrics.social?.mastodonFollowers || null);
      const linkedinFollowers = snapshots.map(s => s.metrics.social?.linkedinFollowers || null);
      const twitterFollowers = snapshots.map(s => s.metrics.social?.twitterFollowers || null);
      const starsData = snapshots.map(s => s.metrics.repository?.stars || null);

      document.getElementById('stat-prs').textContent = latestSnapshot.metrics.pullRequests.open;
      document.getElementById('stat-issues').textContent = latestSnapshot.metrics.issues.open;
      document.getElementById('stat-pr-rate').textContent = latestSnapshot.metrics.pullRequests.mergeRate + '%';
      document.getElementById('stat-issue-rate').textContent = latestSnapshot.metrics.issues.closeRate + '%';

      if (hasRepoMetrics && latestSnapshot.metrics.repository?.stars) {
        const el = document.getElementById('stat-stars');
        if (el) el.textContent = latestSnapshot.metrics.repository.stars.toLocaleString();
      }

      if (hasSocialMetrics) {
        if (latestSnapshot.metrics.social?.linkedinFollowers) {
          const el = document.getElementById('stat-linkedin');
          if (el) el.textContent = latestSnapshot.metrics.social.linkedinFollowers.toLocaleString();
        }
        if (latestSnapshot.metrics.social?.blueskyFollowers) {
          const el = document.getElementById('stat-bluesky');
          if (el) el.textContent = latestSnapshot.metrics.social.blueskyFollowers.toLocaleString();
        }
        if (latestSnapshot.metrics.social?.mastodonFollowers) {
          const el = document.getElementById('stat-mastodon');
          if (el) el.textContent = latestSnapshot.metrics.social.mastodonFollowers.toLocaleString();
        }
        if (latestSnapshot.metrics.social?.twitterFollowers) {
          const el = document.getElementById('stat-twitter');
          if (el) el.textContent = latestSnapshot.metrics.social.twitterFollowers.toLocaleString();
        }
      }

      prChart.data.labels = dates;
      prChart.data.datasets[0].data = prData;
      prChart.update();

      issuesChart.data.labels = dates;
      issuesChart.data.datasets[0].data = issuesData;
      issuesChart.update();

      discussionsChart.data.labels = dates;
      discussionsChart.data.datasets[0].data = upvotesData;
      discussionsChart.data.datasets[1].data = commentsData;
      discussionsChart.update();

      ratesChart.data.labels = dates;
      ratesChart.data.datasets[0].data = prMergeRates;
      ratesChart.data.datasets[1].data = issueCloseRates;
      ratesChart.update();

      if (hasRepoMetrics && starsChart) {
        starsChart.data.labels = dates;
        starsChart.data.datasets[0].data = starsData;
        starsChart.update();
      }

      if (hasSocialMetrics && socialChart) {
        // Rebuild datasets for the selected repo
        const newSocialDatasets = [];

        if (linkedinFollowers.some(v => v !== null && v > 0)) {
          newSocialDatasets.push({
            label: 'LinkedIn',
            data: linkedinFollowers,
            borderColor: '#0077b5',
            backgroundColor: 'rgba(0, 119, 181, 0.15)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#0077b5',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            spanGaps: true
          });
        }

        if (blueskyFollowers.some(v => v !== null && v > 0)) {
          newSocialDatasets.push({
            label: 'Bluesky',
            data: blueskyFollowers,
            borderColor: '#0085ff',
            backgroundColor: 'rgba(0, 133, 255, 0.15)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#0085ff',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            spanGaps: true
          });
        }

        if (mastodonFollowers.some(v => v !== null && v > 0)) {
          newSocialDatasets.push({
            label: 'Mastodon',
            data: mastodonFollowers,
            borderColor: '#6364ff',
            backgroundColor: 'rgba(99, 100, 255, 0.15)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#6364ff',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            spanGaps: true
          });
        }

        if (twitterFollowers.some(v => v !== null && v > 0)) {
          newSocialDatasets.push({
            label: 'Twitter/X',
            data: twitterFollowers,
            borderColor: '#1da1f2',
            backgroundColor: 'rgba(29, 161, 242, 0.15)',
            fill: false,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#1da1f2',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6,
            spanGaps: true
          });
        }

        socialChart.data.labels = dates;
        socialChart.data.datasets = newSocialDatasets;
        socialChart.update();
      }
    }
  </script>
</body>
</html>`;
}

function generateEmptyDashboard() {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Metrics Dashboard</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap" rel="stylesheet">
  <style>
    :root {
      --gradient-primary: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      --bg-dark: #0a0e27;
      --bg-card-start: #1e293b;
      --bg-card-end: #0f172a;
      --text-primary: #f1f5f9;
      --text-secondary: #cbd5e1;
      --text-muted: #94a3b8;
      --border-color: rgba(100, 116, 139, 0.2);
      --shadow-card: 0 20px 60px rgba(0,0,0,0.4);
    }
    .header-logo {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 1.25rem;
      margin-bottom: 1.5rem;
    }
    .logo-img {
      height: clamp(2.5rem, 5vw, 3.5rem);
      width: auto;
      filter: drop-shadow(0 4px 12px rgba(102, 126, 234, 0.3));
    }
    body {
      font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
      background: var(--bg-dark);
      background-image: 
        radial-gradient(at 0% 0%, rgba(102, 126, 234, 0.15) 0px, transparent 50%),
        radial-gradient(at 100% 100%, rgba(240, 147, 251, 0.15) 0px, transparent 50%);
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2.5rem 1.5rem;
      -webkit-font-smoothing: antialiased;
      -moz-osx-font-smoothing: grayscale;
      font-feature-settings: "cv02", "cv03", "cv04", "cv11";
    }
    .message {
      background: linear-gradient(135deg, var(--bg-card-start) 0%, var(--bg-card-end) 100%);
      border-radius: 24px;
      padding: 4rem 3.5rem;
      text-align: center;
      box-shadow: var(--shadow-card);
      border: 1px solid var(--border-color);
      max-width: 540px;
      position: relative;
      overflow: hidden;
    }
    .message::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: var(--gradient-primary);
    }
    h1 {
      background: var(--gradient-primary);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin: 0;
      font-size: clamp(1.875rem, 4vw, 2.5rem);
      font-weight: 900;
      letter-spacing: -0.02em;
      line-height: 1.2;
      display: inline-block;
    }
    p {
      color: var(--text-secondary);
      line-height: 1.75;
      font-size: 1.0625rem;
      letter-spacing: -0.01em;
    }
    code {
      background: rgba(100, 116, 139, 0.25);
      color: #f093fb;
      padding: 0.5rem 0.875rem;
      border-radius: 8px;
      font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
      font-weight: 600;
      font-size: 0.9375rem;
      letter-spacing: 0.02em;
      border: 1px solid rgba(240, 147, 251, 0.2);
    }
  </style>
</head>
<body>
  <div class="message">
    <div class="header-logo">
      <img src="https://podman-desktop.io/img/logo.svg" 
           alt="Podman Desktop Logo" 
           class="logo-img">
      <h1>No Data Yet</h1>
    </div>
    <p>No historical data available. Run the metrics collector to start tracking your community metrics over time!</p>
    <p style="margin-top: 2rem; font-size: 0.9375rem; color: var(--text-muted);">Run: <code>npm start</code></p>
  </div>
</body>
</html>`;
}
