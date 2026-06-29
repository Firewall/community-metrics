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

function buildRepoToProjectMap() {
  const map = {};
  for (const project of config.projects) {
    for (const repo of project.repos) {
      map[`${repo.owner}/${repo.name}`] = project.id;
    }
    map[`aggregate-${project.id}`] = project.id;
  }
  return map;
}

export async function generateDashboardHTML() {
  const snapshots = await getDailySnapshots();

  if (snapshots.length === 0) {
    return generateEmptyDashboard();
  }

  const repoToProject = buildRepoToProjectMap();

  const projectData = {};
  for (const project of config.projects) {
    projectData[project.id] = {
      id: project.id,
      name: project.name,
      logo: project.logo,
      social: project.social,
      snapshotsByRepo: {},
      repoKeys: [],
      flags: { hasSocialMetrics: false, hasRepoMetrics: false },
    };
  }

  for (const snapshot of snapshots) {
    const label = snapshot.repoLabel;
    if (!label) continue;

    const projectId = repoToProject[label];
    if (!projectId || !projectData[projectId]) continue;

    const pd = projectData[projectId];
    const displayLabel = label.startsWith('aggregate-') ? 'All Repositories' : label;

    if (!pd.snapshotsByRepo[displayLabel]) {
      pd.snapshotsByRepo[displayLabel] = [];
    }
    pd.snapshotsByRepo[displayLabel].push(snapshot);
  }

  for (const pd of Object.values(projectData)) {
    pd.repoKeys = Object.keys(pd.snapshotsByRepo).sort((a, b) => {
      if (a === 'All Repositories') return -1;
      if (b === 'All Repositories') return 1;
      return a.localeCompare(b);
    });

    if (pd.repoKeys.length > 0) {
      const firstRepo = pd.repoKeys[0];
      const repoSnapshots = pd.snapshotsByRepo[firstRepo];
      const latestSnapshot = repoSnapshots[repoSnapshots.length - 1];

      pd.flags.hasSocialMetrics = !!(latestSnapshot.metrics.social && (
        latestSnapshot.metrics.social.blueskyFollowers > 0 ||
        latestSnapshot.metrics.social.mastodonFollowers > 0 ||
        latestSnapshot.metrics.social.linkedinFollowers > 0 ||
        latestSnapshot.metrics.social.twitterFollowers > 0
      ));
      pd.flags.hasRepoMetrics = !!(latestSnapshot.metrics.repository?.stars > 0);
    }
  }

  const projectKeys = config.projects.map(p => p.id).filter(id => projectData[id].repoKeys.length > 0);

  if (projectKeys.length === 0) {
    return generateEmptyDashboard();
  }

  const dashboardData = { projects: projectData, projectKeys };

  let html = loadTemplate('index.html');
  const styles = loadTemplate('styles.css');
  const script = loadTemplate('script.js');

  html = html.replace('{{STYLES}}', styles);
  html = html.replace('{{SCRIPT}}', script);
  html = html.replace('{{DATA_SCRIPT}}', `window.DASHBOARD_DATA = ${JSON.stringify(dashboardData)};`);

  const projectOptions = projectKeys.map(id =>
    `<option value="${id}">${projectData[id].name}</option>`
  ).join('');
  html = html.replace('{{PROJECT_OPTIONS}}', projectOptions);
  html = html.replace('{{REPO_OPTIONS}}', '');

  return html;
}

function generateEmptyDashboard() {
  return loadTemplate('empty.html');
}
