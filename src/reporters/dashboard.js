import { getDailySnapshots } from '../utils/history.js';

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
  const blueskyFollowers = initialSnapshots.map(s => s.metrics.social?.blueskyFollowers || 0);

  const latestSnapshot = initialSnapshots[initialSnapshots.length - 1];
  const hasSocialMetrics = latestSnapshot.metrics.social?.blueskyFollowers > 0;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Community Metrics Dashboard</title>
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <style>
    * {
      margin: 0;
      padding: 0;
      box-sizing: border-box;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
      background: #0a0e27;
      min-height: 100vh;
      padding: 2rem;
      color: #e2e8f0;
    }
    .container {
      max-width: 1400px;
      margin: 0 auto;
    }
    h1 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      text-align: center;
      margin-bottom: 0.5rem;
      font-size: 3rem;
      font-weight: 800;
      letter-spacing: -0.02em;
    }
    .last-updated {
      text-align: center;
      color: #64748b;
      margin-bottom: 2.5rem;
      font-size: 0.95rem;
      font-weight: 500;
    }
    .grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(500px, 1fr));
      gap: 1.5rem;
      margin-bottom: 2rem;
    }
    .chart-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      padding: 1.75rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid rgba(100, 116, 139, 0.2);
      transition: transform 0.2s ease, box-shadow 0.2s ease;
    }
    .chart-card:hover {
      transform: translateY(-2px);
      box-shadow: 0 25px 70px rgba(0,0,0,0.5);
    }
    .chart-card h2 {
      color: #f1f5f9;
      margin-bottom: 1.25rem;
      font-size: 1.25rem;
      font-weight: 600;
      letter-spacing: -0.01em;
    }
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 1.25rem;
      margin-bottom: 2.5rem;
    }
    .stat-card {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      padding: 2rem;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid rgba(100, 116, 139, 0.2);
      text-align: center;
      transition: transform 0.2s ease, box-shadow 0.2s ease;
      position: relative;
      overflow: hidden;
    }
    .stat-card:hover {
      transform: translateY(-4px);
      box-shadow: 0 25px 70px rgba(0,0,0,0.5);
    }
    .stat-card::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 3px;
      background: linear-gradient(90deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
    }
    .stat-value {
      font-size: 3rem;
      font-weight: 800;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      line-height: 1.2;
    }
    .stat-label {
      color: #94a3b8;
      margin-top: 0.75rem;
      font-size: 0.9rem;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }
    .footer {
      text-align: center;
      color: #64748b;
      margin-top: 3rem;
      font-size: 0.9rem;
      font-weight: 500;
    }
    .stat-card.clickable {
      cursor: pointer;
      position: relative;
    }
    .stat-card.clickable::after {
      content: '👁️';
      position: absolute;
      top: 1rem;
      right: 1rem;
      opacity: 0;
      transition: opacity 0.2s ease;
      font-size: 1.2rem;
    }
    .stat-card.clickable:hover::after {
      opacity: 0.5;
    }
    .modal {
      display: none;
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(10, 14, 39, 0.9);
      backdrop-filter: blur(8px);
      z-index: 1000;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .modal.active {
      display: flex;
    }
    .modal-content {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      padding: 2rem;
      max-width: 900px;
      max-height: 80vh;
      overflow-y: auto;
      border: 1px solid rgba(100, 116, 139, 0.3);
      box-shadow: 0 25px 80px rgba(0,0,0,0.6);
    }
    .modal-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      margin-bottom: 1.5rem;
      padding-bottom: 1rem;
      border-bottom: 1px solid rgba(100, 116, 139, 0.2);
    }
    .modal-header h2 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      font-size: 1.75rem;
      font-weight: 800;
      margin: 0;
    }
    .modal-close {
      background: rgba(239, 68, 68, 0.1);
      color: #f87171;
      border: 1px solid rgba(239, 68, 68, 0.3);
      border-radius: 8px;
      padding: 0.5rem 1rem;
      cursor: pointer;
      font-weight: 600;
      transition: all 0.2s ease;
    }
    .modal-close:hover {
      background: rgba(239, 68, 68, 0.2);
      border-color: rgba(239, 68, 68, 0.5);
    }
    .pr-list {
      list-style: none;
      padding: 0;
      margin: 0;
    }
    .pr-item {
      background: rgba(100, 116, 139, 0.1);
      border: 1px solid rgba(100, 116, 139, 0.2);
      border-radius: 12px;
      padding: 1.25rem;
      margin-bottom: 1rem;
      transition: all 0.2s ease;
    }
    .pr-item:hover {
      background: rgba(102, 126, 234, 0.05);
      border-color: rgba(102, 126, 234, 0.3);
      transform: translateX(4px);
    }
    .pr-number {
      color: #667eea;
      font-weight: 700;
      font-size: 0.9rem;
      margin-bottom: 0.5rem;
    }
    .pr-title {
      color: #e2e8f0;
      font-size: 1.05rem;
      font-weight: 600;
      margin-bottom: 0.5rem;
    }
    .pr-meta {
      display: flex;
      gap: 1rem;
      flex-wrap: wrap;
      align-items: center;
      font-size: 0.85rem;
      color: #94a3b8;
      margin-top: 0.75rem;
    }
    .pr-author {
      color: #f093fb;
      display: flex;
      align-items: center;
      gap: 0.5rem;
    }
    .pr-avatar {
      width: 24px;
      height: 24px;
      border-radius: 50%;
      border: 2px solid rgba(240, 147, 251, 0.3);
    }
    .pr-link {
      color: #667eea;
      text-decoration: none;
      font-weight: 500;
      transition: color 0.2s ease;
    }
    .pr-link:hover {
      color: #764ba2;
      text-decoration: underline;
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
      margin-bottom: 2rem;
      gap: 1rem;
      align-items: center;
    }
    .repo-selector label {
      color: #94a3b8;
      font-weight: 600;
      font-size: 0.95rem;
    }
    .repo-selector select {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      color: #e2e8f0;
      border: 1px solid rgba(100, 116, 139, 0.3);
      border-radius: 8px;
      padding: 0.75rem 2.5rem 0.75rem 1rem;
      font-size: 1rem;
      font-weight: 500;
      cursor: pointer;
      outline: none;
      appearance: none;
      background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 12 12'%3E%3Cpath fill='%23e2e8f0' d='M6 9L1 4h10z'/%3E%3C/svg%3E");
      background-repeat: no-repeat;
      background-position: right 1rem center;
      transition: all 0.2s ease;
    }
    .repo-selector select:hover {
      border-color: rgba(102, 126, 234, 0.5);
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
    }
    .repo-selector select:focus {
      border-color: #667eea;
      box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.2);
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Community Metrics Dashboard</h1>
    <div class="last-updated">Last updated: ${new Date().toLocaleString()}</div>

    <div class="repo-selector">
      <label for="repoSelect">Repository:</label>
      <select id="repoSelect">
        ${repoKeys.map(repo =>
          `<option value="${repo}">${repo === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + repo}</option>`
        ).join('')}
      </select>
    </div>

    <div class="stats-grid">
      <div class="stat-card clickable" id="open-prs-card">
        <div class="stat-value" id="stat-prs">${latestSnapshot.metrics.pullRequests.open}</div>
        <div class="stat-label">Open PRs</div>
      </div>
      <div class="stat-card">
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
      ${hasSocialMetrics ? `
      <div class="stat-card">
        <div class="stat-value" id="stat-bluesky">${latestSnapshot.metrics.social.blueskyFollowers.toLocaleString()}</div>
        <div class="stat-label">☁️ Bluesky Followers</div>
      </div>
      ` : ''}
    </div>

    <div class="modal" id="prs-modal">
      <div class="modal-content">
        <div class="modal-header">
          <h2 id="modal-title">Open Pull Requests</h2>
          <button class="modal-close" onclick="document.getElementById('prs-modal').classList.remove('active')">Close</button>
        </div>
        <div id="prs-list"></div>
      </div>
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

      ${hasSocialMetrics ? `
      <div class="chart-card">
        <h2>☁️ Bluesky Followers</h2>
        <canvas id="socialChart"></canvas>
      </div>
      ` : ''}
    </div>

    <div class="footer">
      Generated with Community Metrics Analyzer
    </div>
  </div>

  <script>
    const snapshotsByRepo = ${JSON.stringify(snapshotsByRepo)};
    const repoKeys = ${JSON.stringify(repoKeys)};
    const hasSocialMetrics = ${hasSocialMetrics};

    const chartConfig = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: {
          display: true,
          position: 'top',
          labels: {
            color: '#e2e8f0',
            font: {
              size: 12,
              weight: 500
            },
            padding: 15,
            usePointStyle: true,
            pointStyle: 'circle'
          }
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.95)',
          titleColor: '#f1f5f9',
          bodyColor: '#cbd5e1',
          borderColor: 'rgba(100, 116, 139, 0.3)',
          borderWidth: 1,
          padding: 12,
          cornerRadius: 8,
          displayColors: true
        }
      },
      scales: {
        x: {
          grid: {
            display: true,
            color: 'rgba(100, 116, 139, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11,
              weight: 500
            }
          }
        },
        y: {
          beginAtZero: true,
          grid: {
            color: 'rgba(100, 116, 139, 0.1)',
            drawBorder: false
          },
          ticks: {
            color: '#94a3b8',
            font: {
              size: 11,
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
              color: 'rgba(100, 116, 139, 0.1)',
              drawBorder: false
            },
            ticks: {
              color: '#94a3b8',
              font: {
                size: 11,
                weight: 500
              }
            }
          }
        }
      }
    });

    let socialChart = null;
    if (hasSocialMetrics) {
      socialChart = new Chart(document.getElementById('socialChart'), {
        type: 'line',
        data: {
          labels: ${JSON.stringify(dates)},
          datasets: [{
            label: 'Bluesky Followers',
            data: ${JSON.stringify(blueskyFollowers)},
            borderColor: '#0085ff',
            backgroundColor: 'rgba(0, 133, 255, 0.15)',
            fill: true,
            tension: 0.4,
            borderWidth: 3,
            pointRadius: 4,
            pointBackgroundColor: '#0085ff',
            pointBorderColor: '#0f172a',
            pointBorderWidth: 2,
            pointHoverRadius: 6
          }]
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
            \${openPRs.map(pr => \`
              <li class="pr-item">
                <div class="pr-number">#\${pr.number}</div>
                <div class="pr-title">\${pr.title}</div>
                <div class="pr-meta">
                  <span class="pr-author">
                    <img src="https://github.com/\${pr.author}.png?size=48" alt="\${pr.author}" class="pr-avatar" />
                    @\${pr.author}
                  </span>
                  <span>📅 \${new Date(pr.createdAt).toLocaleDateString()}</span>
                  <a href="\${pr.url}" target="_blank" class="pr-link">View on GitHub →</a>
                </div>
              </li>
            \`).join('')}
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
      const blueskyFollowers = snapshots.map(s => s.metrics.social?.blueskyFollowers || 0);

      document.getElementById('stat-prs').textContent = latestSnapshot.metrics.pullRequests.open;
      document.getElementById('stat-issues').textContent = latestSnapshot.metrics.issues.open;
      document.getElementById('stat-pr-rate').textContent = latestSnapshot.metrics.pullRequests.mergeRate + '%';
      document.getElementById('stat-issue-rate').textContent = latestSnapshot.metrics.issues.closeRate + '%';

      if (hasSocialMetrics && latestSnapshot.metrics.social?.blueskyFollowers) {
        document.getElementById('stat-bluesky').textContent = latestSnapshot.metrics.social.blueskyFollowers.toLocaleString();
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

      if (hasSocialMetrics && socialChart) {
        socialChart.data.labels = dates;
        socialChart.data.datasets[0].data = blueskyFollowers;
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
  <style>
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Inter', sans-serif;
      background: #0a0e27;
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 2rem;
    }
    .message {
      background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%);
      border-radius: 16px;
      padding: 3.5rem;
      text-align: center;
      box-shadow: 0 20px 60px rgba(0,0,0,0.4);
      border: 1px solid rgba(100, 116, 139, 0.2);
      max-width: 500px;
    }
    h1 {
      background: linear-gradient(135deg, #667eea 0%, #764ba2 50%, #f093fb 100%);
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      margin-bottom: 1.25rem;
      font-size: 2.25rem;
      font-weight: 800;
    }
    p {
      color: #cbd5e1;
      line-height: 1.7;
      font-size: 1.05rem;
    }
    code {
      background: rgba(100, 116, 139, 0.2);
      color: #f093fb;
      padding: 0.35rem 0.75rem;
      border-radius: 6px;
      font-family: 'Courier New', monospace;
      font-weight: 600;
    }
  </style>
</head>
<body>
  <div class="message">
    <h1>📊 No Data Yet</h1>
    <p>No historical data available. Run the metrics collector to start tracking your community metrics over time!</p>
    <p style="margin-top: 1.75rem; font-size: 0.95rem; color: #94a3b8;">Run: <code>npm start</code></p>
  </div>
</body>
</html>`;
}
