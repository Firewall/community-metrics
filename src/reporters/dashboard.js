import { getDailySnapshots } from '../utils/history.js';
import { config } from '../config.js';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const TEMPLATES_DIR = join(__dirname, '../templates/dashboard');

function loadTemplate(name) {
  return readFileSync(join(TEMPLATES_DIR, name), 'utf-8');
}

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
  const latestSnapshot = initialSnapshots[initialSnapshots.length - 1];
  
  // Flags
  const hasSocialMetrics = latestSnapshot.metrics.social && (
    latestSnapshot.metrics.social.blueskyFollowers > 0 ||
    latestSnapshot.metrics.social.mastodonFollowers > 0 ||
    latestSnapshot.metrics.social.linkedinFollowers > 0 ||
    latestSnapshot.metrics.social.twitterFollowers > 0
  );
  const hasRepoMetrics = latestSnapshot.metrics.repository?.stars > 0;

  // Load templates
  let html = loadTemplate('index.html');
  const styles = loadTemplate('styles.css');
  const script = loadTemplate('script.js');

  // Prepare Data
  const dashboardData = {
    snapshotsByRepo,
    repoKeys,
    flags: {
      hasSocialMetrics,
      hasRepoMetrics
    }
  };

  // Replacements
  html = html.replace('{{STYLES}}', styles);
  html = html.replace('{{SCRIPT}}', script);
  html = html.replace('{{DATA_SCRIPT}}', `window.DASHBOARD_DATA = ${JSON.stringify(dashboardData)};`);

  // Repo Options
  const repoOptions = repoKeys.map(repo =>
    `<option value="${repo}">${repo === 'All Repositories' ? '🌐 All Repositories' : '📦 ' + repo}</option>`
  ).join('');
  html = html.replace('{{REPO_OPTIONS}}', repoOptions);

  // Stars Stat Card
  const starsStatCard = hasRepoMetrics ? `
      <div class="stat-card">
        <div class="stat-value" id="stat-stars">${latestSnapshot.metrics.repository.stars.toLocaleString()}</div>
        <div class="stat-label">GitHub Stars</div>
      </div>
      ` : '';
  html = html.replace('{{STARS_STAT_CARD}}', starsStatCard);

  // Stars Chart Card
  const starsChartCard = hasRepoMetrics ? `
      <div class="chart-card">
        <h2>GitHub Stars</h2>
        <canvas id="starsChart"></canvas>
      </div>
      ` : '';
  html = html.replace('{{STARS_CHART_CARD}}', starsChartCard);

  // Social Section
  const socialSection = hasSocialMetrics ? `
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
    ` : '';
  html = html.replace('{{SOCIAL_SECTION}}', socialSection);

  return html;
}

function generateEmptyDashboard() {
  return loadTemplate('empty.html');
}
