import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
process.loadEnvFile();

const GH_TOKEN = process.env.GH_TOKEN;

if (!GH_TOKEN) {
  console.error("Please set GH_TOKEN environment variable");
  process.exit(1);
}

export const config = {
  ghToken: GH_TOKEN,
  repo: {
    owner: process.env.REPO_OWNER || 'podman-desktop',
    name: process.env.REPO_NAME || 'podman-desktop',
  },
  maintainersFile: process.env.MAINTAINERS_FILE || join(__dirname, '../data/maintainers.json'),
  lookbackMonths: parseInt(process.env.LOOKBACK_MONTHS) || 1,
};
