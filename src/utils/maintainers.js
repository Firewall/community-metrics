import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let maintainersList = null;

export function getMaintainersList() {
  if (maintainersList) {
    return maintainersList;
  }

  try {
    const maintainersPath = config.maintainersFile || join(__dirname, '../../data/maintainers.json');
    const data = JSON.parse(readFileSync(maintainersPath, 'utf-8'));

    // Combine all groups into a single list
    maintainersList = [
      ...(data.maintainers || []),
      ...(data.bots || []),
      ...(data.emeritus || [])
    ];

    return maintainersList;
  } catch (error) {
    console.error(`Error loading maintainers file: ${error.message}`);
    return [];
  }
}
