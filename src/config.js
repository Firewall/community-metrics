import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { existsSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables from .env if it exists
const envPath = join(__dirname, '../.env');
if (existsSync(envPath)) {
  process.loadEnvFile();
}

const GH_TOKEN = process.env.GH_TOKEN;

if (!GH_TOKEN) {
  console.error("Please set GH_TOKEN environment variable");
  process.exit(1);
}

// Default repositories for podman-desktop ecosystem
const DEFAULT_REPOS = [
  'podman-desktop/podman-desktop',
  'podman-desktop/extension-bootc',
  'podman-desktop/extension-kubernetes-dashboard',
  'podman-desktop/extension-postgresql',
  'podman-desktop/extension-minikube',
  'podman-desktop/extension-github',
  'podman-desktop/extension-podman-quadlet',
  'podman-desktop/extension-apple-container',
  'podman-desktop/extension-kreate',
  'podman-desktop/extension-layers-explorer',
  'podman-desktop/podman-desktop-catalog',
  'podman-desktop/extension-template-minimal',
  'podman-desktop/extension-template-full',
  'podman-desktop/extension-template-webview',
  'podman-desktop/community',
  'containers/podman-desktop-extension-ai-lab',
];

// Parse repositories from REPOS environment variable
// Format: "owner1/repo1,owner2/repo2" or single "owner/repo"
function parseRepos() {
  const reposEnv = process.env.REPOS;

  if (reposEnv) {
    // Multiple repos format: "owner1/repo1,owner2/repo2"
    return reposEnv.split(',').map(repo => {
      const [owner, name] = repo.trim().split('/');
      return { owner, name };
    });
  } else {
    // Use default repositories
    return DEFAULT_REPOS.map(repo => {
      const [owner, name] = repo.split('/');
      return { owner, name };
    });
  }
}

export const config = {
  ghToken: GH_TOKEN,
  repos: parseRepos(),
  maintainersFile: process.env.MAINTAINERS_FILE || join(__dirname, '../data/maintainers.json'),
  lookbackMonths: parseInt(process.env.LOOKBACK_MONTHS) || 1,
  social: {
    // Set BLUESKY_HANDLE environment variable to track Bluesky followers
    // Example: export BLUESKY_HANDLE=yourhandle.bsky.social
    bluesky: process.env.BLUESKY_HANDLE || 'podman-desktop.io',

    // LinkedIn company page
    // Example: export LINKEDIN_COMPANY=https://www.linkedin.com/company/podman-desktop
    linkedin: process.env.LINKEDIN_COMPANY || 'https://www.linkedin.com/company/podman-desktop',

    // Twitter/X handle (without @)
    // Example: export TWITTER_HANDLE=podmandesktop
    twitter: process.env.TWITTER_HANDLE || 'podmandesktop',

    // Mastodon account (instance and username)
    // Example: export MASTODON_INSTANCE=fosstodon.org MASTODON_USERNAME=podmandesktop
    mastodon: {
      instance: process.env.MASTODON_INSTANCE || 'fosstodon.org',
      username: process.env.MASTODON_USERNAME || 'podmandesktop',
    },
  },
};
