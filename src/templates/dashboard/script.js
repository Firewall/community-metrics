document.addEventListener('DOMContentLoaded', () => {
  const { snapshotsByRepo, repoKeys, flags } = window.DASHBOARD_DATA;
  const { hasSocialMetrics, hasRepoMetrics } = flags;

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

  // Initialize Chart instances (empty initially, will be populated by updateDashboard)
  const prChart = new Chart(document.getElementById('prChart'), {
    type: 'line',
    data: { labels: [], datasets: [{
      label: 'Open PRs',
      data: [],
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
    }] },
    options: chartConfig
  });

  const issuesChart = new Chart(document.getElementById('issuesChart'), {
    type: 'line',
    data: { labels: [], datasets: [{
      label: 'Open Issues',
      data: [],
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
    }] },
    options: chartConfig
  });

  const discussionsChart = new Chart(document.getElementById('discussionsChart'), {
    type: 'line',
    data: { labels: [], datasets: [
      {
        label: 'Total Upvotes',
        data: [],
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
        data: [],
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
    ] },
    options: chartConfig
  });

  const ratesChart = new Chart(document.getElementById('ratesChart'), {
    type: 'line',
    data: { labels: [], datasets: [
      {
        label: 'PR Merge Rate (%)',
        data: [],
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
        data: [],
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
    ] },
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
      data: { labels: [], datasets: [{
        label: 'GitHub Stars',
        data: [],
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
      }] },
      options: chartConfig
    });
  }

  let socialChart = null;
  if (hasSocialMetrics) {
    socialChart = new Chart(document.getElementById('socialChart'), {
      type: 'line',
      data: { labels: [], datasets: [] },
      options: chartConfig
    });
  }

  let currentRepoLabel = repoKeys[0];

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

  document.getElementById('repoSelect').addEventListener('change', (e) => {
    updateDashboard(e.target.value);
  });

  // Initial render
  updateDashboard(currentRepoLabel);

  // Modal Logic
  function showPRsModal() {
    const snapshots = snapshotsByRepo[currentRepoLabel] || [];
    if (snapshots.length === 0) return;

    const latestSnapshot = snapshots[snapshots.length - 1];
    const openPRs = latestSnapshot.metrics.pullRequests.openPRs || [];

    const modalTitle = document.getElementById('modal-title');
    const prsList = document.getElementById('prs-list');

    modalTitle.textContent = `Open Pull Requests - ${currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel}`;

    if (openPRs.length === 0) {
      prsList.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <p>No open pull requests!</p>
        </div>
      `;
    } else {
      prsList.innerHTML = `
        <ul class="pr-list">
          ${openPRs.map(pr => {
            const repoMatch = pr.url.match(/github\.com\/([^/]+\/[^/]+)\/pull/);
            const repo = repoMatch ? repoMatch[1] : '';
            return `
            <li class="pr-item">
              <div class="pr-number">#${pr.number}</div>
              <div class="pr-title">${pr.title}</div>
              ${repo ? `<div class="pr-repo">📦 ${repo}</div>` : ''}
              <div class="pr-meta">
                <span class="pr-author">
                  <img src="https://github.com/${pr.author}.png?size=48" alt="${pr.author}" class="pr-avatar" />
                  @${pr.author}
                </span>
                <span>📅 ${new Date(pr.createdAt).toLocaleDateString()}</span>
                <a href="${pr.url}" target="_blank" class="pr-link">View on GitHub →</a>
              </div>
            </li>
          `;
          }).join('')}
        </ul>
      `;
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

    modalTitle.textContent = `Open Issues - ${currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel}`;

    if (openIssues.length === 0) {
      issuesContainer.innerHTML = `
        <div class="empty-state">
          <div class="empty-state-icon">🎉</div>
          <p>No open issues!</p>
        </div>
      `;
    } else {
      issuesContainer.innerHTML = `
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
            ${openIssues.map(issue => {
              const repoMatch = issue.url.match(/github\.com\/([^/]+\/[^/]+)\/issues/);
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
              return `
              <tr onclick="window.open('${issueUrl}', '_blank')" title="Click to open issue on GitHub">
                <td class="issue-id">#${issue.number}</td>
                <td class="issue-title">${issueTitle}</td>
                <td class="issue-type">${displayType ? `<span class="issue-type-badge ${typeClass}">${displayType}</span>` : '-'}</td>
                <td class="issue-repo">${repo || 'N/A'}</td>
                <td>
                  <div class="issue-user">
                    <img src="https://github.com/${issue.author}.png?size=56" alt="${issue.author}" class="issue-avatar" />
                    @${issue.author}
                  </div>
                </td>
                <td>
                  ${assignee ? `
                    <div class="issue-user">
                      <img src="https://github.com/${assignee}.png?size=56" alt="${assignee}" class="issue-avatar" />
                      @${assignee}
                    </div>
                  ` : `<span class="issue-assignee-empty">Unassigned</span>`}
                </td>
              </tr>
            `;
            }).join('')}
          </tbody>
        </table>
      `;
    }

    document.getElementById('issues-modal').classList.add('active');
  }

  document.getElementById('open-issues-card').addEventListener('click', showIssuesModal);

  document.getElementById('issues-modal').addEventListener('click', (e) => {
    if (e.target.id === 'issues-modal') {
      document.getElementById('issues-modal').classList.remove('active');
    }
  });
});

