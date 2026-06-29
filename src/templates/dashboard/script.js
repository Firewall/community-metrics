document.addEventListener('DOMContentLoaded', () => {
  const { projects, projectKeys } = window.DASHBOARD_DATA;

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
  let socialChart = null;
  let currentProjectId = projectKeys[0];
  let currentRepoLabel = '';
  let currentTimeRange = '1y';

  function ensureStarsChart() {
    if (!starsChart) {
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
    return starsChart;
  }

  function ensureSocialChart() {
    if (!socialChart) {
      socialChart = new Chart(document.getElementById('socialChart'), {
        type: 'line',
        data: { labels: [], datasets: [] },
        options: chartConfig
      });
    }
    return socialChart;
  }

  function switchProject(projectId) {
    currentProjectId = projectId;
    const project = projects[projectId];
    if (!project) return;

    document.getElementById('project-logo').src = project.logo;
    document.getElementById('project-logo').alt = project.name + ' Logo';
    document.getElementById('project-title').textContent = project.name + ' Community Metrics';

    const repoSelect = document.getElementById('repoSelect');
    repoSelect.innerHTML = project.repoKeys.map(repo =>
      '<option value="' + repo + '">' + (repo === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + repo) + '</option>'
    ).join('');

    // Stars
    const hasStars = project.flags.hasRepoMetrics;
    document.getElementById('stars-stat-card').style.display = hasStars ? '' : 'none';
    document.getElementById('stars-chart-card').style.display = hasStars ? '' : 'none';

    // Social
    const hasSocial = project.flags.hasSocialMetrics;
    document.getElementById('social-section').style.display = hasSocial ? '' : 'none';

    if (hasSocial && project.social) {
      renderSocialStatCards(project);
    }

    currentRepoLabel = project.repoKeys[0] || '';
    repoSelect.value = currentRepoLabel;
    updateDashboard(currentRepoLabel);
  }

  function renderSocialStatCards(project) {
    const firstRepo = project.repoKeys[0];
    const repoSnapshots = project.snapshotsByRepo[firstRepo] || [];
    if (repoSnapshots.length === 0) return;

    const latest = repoSnapshots[repoSnapshots.length - 1];
    const social = latest.metrics.social;
    const socialConfig = project.social;
    if (!social || !socialConfig) return;

    let cards = '';
    if (social.linkedinFollowers > 0 && socialConfig.linkedin) {
      cards += '<a href="' + socialConfig.linkedin + '" target="_blank" class="stat-card">' +
        '<div class="stat-value" id="stat-linkedin">' + social.linkedinFollowers.toLocaleString() + '</div>' +
        '<div class="stat-label">💼 LinkedIn</div></a>';
    }
    if (social.blueskyFollowers > 0 && socialConfig.bluesky) {
      cards += '<a href="https://bsky.app/profile/' + socialConfig.bluesky + '" target="_blank" class="stat-card">' +
        '<div class="stat-value" id="stat-bluesky">' + social.blueskyFollowers.toLocaleString() + '</div>' +
        '<div class="stat-label">☁️ Bluesky</div></a>';
    }
    if (social.mastodonFollowers > 0 && socialConfig.mastodon) {
      cards += '<a href="https://' + socialConfig.mastodon.instance + '/@' + socialConfig.mastodon.username + '" target="_blank" class="stat-card">' +
        '<div class="stat-value" id="stat-mastodon">' + social.mastodonFollowers.toLocaleString() + '</div>' +
        '<div class="stat-label">🐘 Mastodon</div></a>';
    }
    if (social.twitterFollowers > 0 && socialConfig.twitter) {
      cards += '<a href="https://twitter.com/' + socialConfig.twitter + '" target="_blank" class="stat-card">' +
        '<div class="stat-value" id="stat-twitter">' + social.twitterFollowers.toLocaleString() + '</div>' +
        '<div class="stat-label">𝕏 Twitter</div></a>';
    }
    document.getElementById('social-stats-grid').innerHTML = cards;
  }

  function updateDashboard(repoLabel) {
    currentRepoLabel = repoLabel;
    const project = projects[currentProjectId];
    if (!project) return;

    const allSnapshots = project.snapshotsByRepo[repoLabel] || [];
    if (allSnapshots.length === 0) return;

    const latestSnapshot = allSnapshots[allSnapshots.length - 1];

    const now = new Date();
    const snapshots = allSnapshots.filter(s => {
      const date = new Date(s.date);
      const diffTime = now - date;
      const diffDays = diffTime / (1000 * 60 * 60 * 24);
      if (currentTimeRange === '1m') return diffDays <= 30;
      if (currentTimeRange === '1y') return diffDays <= 365;
      return true;
    });

    const dates = snapshots.map(s => s.date);
    const prData = snapshots.map(s => s.metrics.pullRequests.open);
    const issuesData = snapshots.map(s => s.metrics.issues.open);
    const upvotesData = snapshots.map(s => s.metrics.discussions.totalUpvotes);
    const commentsData = snapshots.map(s => s.metrics.discussions.totalComments);
    const prMergeRates = snapshots.map(s => s.metrics.pullRequests.mergeRate);
    const issueCloseRates = snapshots.map(s => s.metrics.issues.closeRate);
    const starsData = snapshots.map(s => s.metrics.repository?.stars || null);

    const cutoffDate = new Date();
    if (currentTimeRange === '1m') {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (currentTimeRange === '1y') {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    }

    const filteredOpenPRs = (latestSnapshot.metrics.pullRequests.openPRs || []).filter(pr => {
      const createdDate = new Date(pr.createdAt);
      return createdDate >= cutoffDate;
    });

    const filteredOpenIssues = (latestSnapshot.metrics.issues.openIssues || []).filter(issue => {
      const createdDate = new Date(issue.createdAt);
      return createdDate >= cutoffDate;
    });

    document.getElementById('stat-prs').textContent = filteredOpenPRs.length;
    document.getElementById('stat-issues').textContent = filteredOpenIssues.length;
    document.getElementById('stat-pr-rate').textContent = latestSnapshot.metrics.pullRequests.mergeRate + '%';
    document.getElementById('stat-issue-rate').textContent = latestSnapshot.metrics.issues.closeRate + '%';

    if (project.flags.hasRepoMetrics && latestSnapshot.metrics.repository?.stars) {
      const el = document.getElementById('stat-stars');
      if (el) el.textContent = latestSnapshot.metrics.repository.stars.toLocaleString();
    }

    if (project.flags.hasSocialMetrics) {
      const social = latestSnapshot.metrics.social;
      if (social) {
        if (social.linkedinFollowers) {
          const el = document.getElementById('stat-linkedin');
          if (el) el.textContent = social.linkedinFollowers.toLocaleString();
        }
        if (social.blueskyFollowers) {
          const el = document.getElementById('stat-bluesky');
          if (el) el.textContent = social.blueskyFollowers.toLocaleString();
        }
        if (social.mastodonFollowers) {
          const el = document.getElementById('stat-mastodon');
          if (el) el.textContent = social.mastodonFollowers.toLocaleString();
        }
        if (social.twitterFollowers) {
          const el = document.getElementById('stat-twitter');
          if (el) el.textContent = social.twitterFollowers.toLocaleString();
        }
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

    if (project.flags.hasRepoMetrics) {
      const chart = ensureStarsChart();
      chart.data.labels = dates;
      chart.data.datasets[0].data = starsData;
      chart.update();
    }

    if (project.flags.hasSocialMetrics) {
      const blueskyFollowers = snapshots.map(s => s.metrics.social?.blueskyFollowers || null);
      const mastodonFollowers = snapshots.map(s => s.metrics.social?.mastodonFollowers || null);
      const linkedinFollowers = snapshots.map(s => s.metrics.social?.linkedinFollowers || null);
      const twitterFollowers = snapshots.map(s => s.metrics.social?.twitterFollowers || null);

      const chart = ensureSocialChart();
      const newSocialDatasets = [];

      if (linkedinFollowers.some(v => v !== null && v > 0)) {
        newSocialDatasets.push({
          label: 'LinkedIn', data: linkedinFollowers,
          borderColor: '#0077b5', backgroundColor: 'rgba(0, 119, 181, 0.15)',
          fill: false, tension: 0.4, borderWidth: 3, pointRadius: 4,
          pointBackgroundColor: '#0077b5', pointBorderColor: '#0f172a',
          pointBorderWidth: 2, pointHoverRadius: 6, spanGaps: true
        });
      }
      if (blueskyFollowers.some(v => v !== null && v > 0)) {
        newSocialDatasets.push({
          label: 'Bluesky', data: blueskyFollowers,
          borderColor: '#0085ff', backgroundColor: 'rgba(0, 133, 255, 0.15)',
          fill: false, tension: 0.4, borderWidth: 3, pointRadius: 4,
          pointBackgroundColor: '#0085ff', pointBorderColor: '#0f172a',
          pointBorderWidth: 2, pointHoverRadius: 6, spanGaps: true
        });
      }
      if (mastodonFollowers.some(v => v !== null && v > 0)) {
        newSocialDatasets.push({
          label: 'Mastodon', data: mastodonFollowers,
          borderColor: '#6364ff', backgroundColor: 'rgba(99, 100, 255, 0.15)',
          fill: false, tension: 0.4, borderWidth: 3, pointRadius: 4,
          pointBackgroundColor: '#6364ff', pointBorderColor: '#0f172a',
          pointBorderWidth: 2, pointHoverRadius: 6, spanGaps: true
        });
      }
      if (twitterFollowers.some(v => v !== null && v > 0)) {
        newSocialDatasets.push({
          label: 'Twitter/X', data: twitterFollowers,
          borderColor: '#1da1f2', backgroundColor: 'rgba(29, 161, 242, 0.15)',
          fill: false, tension: 0.4, borderWidth: 3, pointRadius: 4,
          pointBackgroundColor: '#1da1f2', pointBorderColor: '#0f172a',
          pointBorderWidth: 2, pointHoverRadius: 6, spanGaps: true
        });
      }

      chart.data.labels = dates;
      chart.data.datasets = newSocialDatasets;
      chart.update();
    }
  }

  function updateHash() {
    var params = 'project=' + encodeURIComponent(currentProjectId);
    if (currentRepoLabel) params += '&repo=' + encodeURIComponent(currentRepoLabel);
    if (currentTimeRange !== '1y') params += '&time=' + encodeURIComponent(currentTimeRange);
    history.replaceState(null, '', '#' + params);
  }

  function readHash() {
    var hash = location.hash.slice(1);
    if (!hash) return null;
    var result = {};
    hash.split('&').forEach(function(part) {
      var kv = part.split('=');
      if (kv.length === 2) result[decodeURIComponent(kv[0])] = decodeURIComponent(kv[1]);
    });
    return result;
  }

  document.getElementById('projectSelect').addEventListener('change', (e) => {
    switchProject(e.target.value);
    updateHash();
  });

  document.getElementById('repoSelect').addEventListener('change', (e) => {
    updateDashboard(e.target.value);
    updateHash();
  });

  document.getElementById('timeRangeSelect').addEventListener('change', (e) => {
    currentTimeRange = e.target.value;
    updateDashboard(currentRepoLabel);
    updateHash();
  });

  // Modal Logic
  function showPRsModal() {
    const project = projects[currentProjectId];
    if (!project) return;

    const snapshots = project.snapshotsByRepo[currentRepoLabel] || [];
    if (snapshots.length === 0) return;

    const latestSnapshot = snapshots[snapshots.length - 1];
    let openPRs = latestSnapshot.metrics.pullRequests.openPRs || [];

    const cutoffDate = new Date();
    if (currentTimeRange === '1m') {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (currentTimeRange === '1y') {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    }

    openPRs = openPRs.filter(pr => {
      const createdDate = new Date(pr.createdAt);
      return createdDate >= cutoffDate;
    });

    const modalTitle = document.getElementById('modal-title');
    const prsList = document.getElementById('prs-list');

    const timeRangeText = currentTimeRange === '1m' ? 'Last Month' : 'Last Year';
    modalTitle.textContent = 'Open Pull Requests (' + timeRangeText + ') - ' + (currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel);

    if (openPRs.length === 0) {
      prsList.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>No open pull requests!</p></div>';
    } else {
      prsList.innerHTML = '<ul class="pr-list">' + openPRs.map(function(pr) {
        var repoMatch = pr.url.match(/github\.com\/([^/]+\/[^/]+)\/pull/);
        var repo = repoMatch ? repoMatch[1] : '';
        return '<li class="pr-item">' +
          '<div class="pr-number">#' + pr.number + '</div>' +
          '<div class="pr-title">' + pr.title + '</div>' +
          (repo ? '<div class="pr-repo">📦 ' + repo + '</div>' : '') +
          '<div class="pr-meta">' +
            '<span class="pr-author">' +
              '<img src="https://github.com/' + pr.author + '.png?size=48" alt="' + pr.author + '" class="pr-avatar" loading="lazy" decoding="async" />' +
              ' @' + pr.author +
            '</span>' +
            '<span>📅 ' + new Date(pr.createdAt).toLocaleDateString() + '</span>' +
            '<a href="' + pr.url + '" target="_blank" class="pr-link">View on GitHub →</a>' +
          '</div></li>';
      }).join('') + '</ul>';
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
    const project = projects[currentProjectId];
    if (!project) return;

    const snapshots = project.snapshotsByRepo[currentRepoLabel] || [];
    if (snapshots.length === 0) return;

    const latestSnapshot = snapshots[snapshots.length - 1];

    const cutoffDate = new Date();
    if (currentTimeRange === '1m') {
      cutoffDate.setMonth(cutoffDate.getMonth() - 1);
    } else if (currentTimeRange === '1y') {
      cutoffDate.setFullYear(cutoffDate.getFullYear() - 1);
    }

    const openIssues = (latestSnapshot.metrics.issues.openIssues || [])
      .filter(issue => {
        const createdDate = new Date(issue.createdAt);
        return createdDate >= cutoffDate;
      })
      .sort((a, b) => {
        const dateA = new Date(a.createdAt);
        const dateB = new Date(b.createdAt);
        return dateB - dateA;
      });

    const modalTitle = document.getElementById('issues-modal-title');
    const issuesContainer = document.getElementById('issues-table-container');

    const timeRangeText = currentTimeRange === '1m' ? 'Last Month' : 'Last Year';
    modalTitle.textContent = 'Open Issues (' + timeRangeText + ') - ' + (currentRepoLabel === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + currentRepoLabel);

    if (openIssues.length === 0) {
      issuesContainer.innerHTML = '<div class="empty-state"><div class="empty-state-icon">🎉</div><p>No open issues!</p></div>';
    } else {
      issuesContainer.innerHTML = '<table class="issues-table"><thead><tr>' +
        '<th>Issue ID</th><th>Issue Name</th><th>Type</th><th>Repo</th><th>Creator</th><th>Assignee</th>' +
        '</tr></thead><tbody>' +
        openIssues.map(function(issue) {
          var repoMatch = issue.url.match(/github\.com\/([^/]+\/[^/]+)\/issues/);
          var repo = repoMatch ? repoMatch[1] : '';
          var assignee = issue.assignees && issue.assignees.length > 0 ? issue.assignees[0] : null;
          var labels = issue.labels || [];
          var issueType = labels.find(function(l) {
            var name = typeof l === 'string' ? l : l.name;
            var lower = name.toLowerCase();
            return lower.includes('bug') || lower.includes('enhancement') || lower.includes('feature') || lower.includes('question') || lower.includes('documentation');
          }) || (labels.length > 0 ? (typeof labels[0] === 'string' ? labels[0] : labels[0].name) : '');
          var issueTypeDisplay = typeof issueType === 'string' ? issueType : (issueType.name || '');
          var typeName = issueTypeDisplay.toLowerCase();
          var displayType = '';
          var typeClass = 'default';
          if (typeName.includes('bug')) { displayType = 'Bug'; typeClass = 'bug'; }
          else if (typeName.includes('enhancement')) { displayType = 'Enhancement'; typeClass = 'enhancement'; }
          else if (typeName.includes('feature')) { displayType = 'Feature'; typeClass = 'feature'; }
          else if (typeName.includes('question')) { displayType = 'Question'; typeClass = 'question'; }
          else if (typeName.includes('documentation')) { displayType = 'Documentation'; typeClass = 'documentation'; }
          else if (issueTypeDisplay) { displayType = issueTypeDisplay.split('/').pop().split(' ')[0]; typeClass = 'default'; }
          var issueUrl = issue.url.replace(/"/g, '&quot;');
          var issueTitle = issue.title.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
          return '<tr onclick="window.open(\'' + issueUrl + '\', \'_blank\')" title="Click to open issue on GitHub">' +
            '<td class="issue-id">#' + issue.number + '</td>' +
            '<td class="issue-title">' + issueTitle + '</td>' +
            '<td class="issue-type">' + (displayType ? '<span class="issue-type-badge ' + typeClass + '">' + displayType + '</span>' : '-') + '</td>' +
            '<td class="issue-repo">' + (repo || 'N/A') + '</td>' +
            '<td><div class="issue-user"><img src="https://github.com/' + issue.author + '.png?size=56" alt="' + issue.author + '" class="issue-avatar" /> @' + issue.author + '</div></td>' +
            '<td>' + (assignee ?
              '<div class="issue-user"><img src="https://github.com/' + assignee + '.png?size=56" alt="' + assignee + '" class="issue-avatar" /> @' + assignee + '</div>' :
              '<span class="issue-assignee-empty">Unassigned</span>') +
            '</td></tr>';
        }).join('') + '</tbody></table>';
    }

    document.getElementById('issues-modal').classList.add('active');
  }

  document.getElementById('open-issues-card').addEventListener('click', showIssuesModal);

  document.getElementById('issues-modal').addEventListener('click', (e) => {
    if (e.target.id === 'issues-modal') {
      document.getElementById('issues-modal').classList.remove('active');
    }
  });

  // Initial render — restore state from URL hash if present
  var initialParams = readHash();
  var initialProject = initialParams && initialParams.project && projects[initialParams.project] ? initialParams.project : projectKeys[0];
  var initialTime = initialParams && initialParams.time ? initialParams.time : '1y';
  currentTimeRange = initialTime;
  document.getElementById('timeRangeSelect').value = currentTimeRange;
  document.getElementById('projectSelect').value = initialProject;
  switchProject(initialProject);

  if (initialParams && initialParams.repo && projects[initialProject].repoKeys.indexOf(initialParams.repo) !== -1) {
    document.getElementById('repoSelect').value = initialParams.repo;
    updateDashboard(initialParams.repo);
  }

  updateHash();
});
