import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync, readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '..');

// Load environment variables from .env if it exists
const envPath = join(ROOT_DIR, '.env');
if (existsSync(envPath)) {
  try {
    process.loadEnvFile(envPath);
  } catch (error) {
    console.warn('Failed to load .env file:', error.message);
  }
}

const GH_TOKEN = process.env.GH_TOKEN;

if (!GH_TOKEN) {
  console.error("Please set GH_TOKEN environment variable");
  process.exit(1);
}

function parseRepoString(repoStr) {
  const [owner, name] = repoStr.trim().split('/');
  return { owner, name };
}

function loadProjects() {
  const projectsPath = join(ROOT_DIR, 'data/projects.json');
  try {
    const data = JSON.parse(readFileSync(projectsPath, 'utf-8'));
    const projectsFilter = process.env.PROJECTS
      ? process.env.PROJECTS.split(',').map(p => p.trim())
      : null;

    return data.projects
      .filter(p => !projectsFilter || projectsFilter.includes(p.id))
      .map(p => ({
        ...p,
        repos: p.repos.map(parseRepoString),
        maintainersFile: join(ROOT_DIR, p.maintainersFile),
      }));
  } catch (error) {
    console.warn('Failed to load projects.json, falling back to defaults:', error.message);
    return [];
  }
}

const projects = loadProjects();

// REPOS env var overrides all project repos
function parseRepos() {
  const reposEnv = process.env.REPOS;
  if (reposEnv) {
    return reposEnv.split(',').map(parseRepoString);
  }
  const allRepos = projects.flatMap(p => p.repos);
  const seen = new Set();
  return allRepos.filter(r => {
    const key = `${r.owner}/${r.name}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

export const config = {
  ghToken: GH_TOKEN,
  repos: parseRepos(),
  projects,
  maintainersFile: process.env.MAINTAINERS_FILE || join(ROOT_DIR, 'data/maintainers.json'),
  lookbackMonths: parseInt(process.env.LOOKBACK_MONTHS) || 1,
  social: {
    bluesky: process.env.BLUESKY_HANDLE || 'podman-desktop.io',
    linkedin: process.env.LINKEDIN_COMPANY || 'https://www.linkedin.com/company/podman-desktop',
    twitter: process.env.TWITTER_HANDLE || 'podmandesktop',
    mastodon: {
      instance: process.env.MASTODON_INSTANCE || 'fosstodon.org',
      username: process.env.MASTODON_USERNAME || 'podmandesktop',
    },
  },
};
