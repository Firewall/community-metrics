import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { config } from '../config.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const cache = new Map();
let activeMaintainersFile = null;

export function setMaintainersFile(filePath) {
  activeMaintainersFile = filePath;
}

export function getMaintainersList() {
  const maintainersPath = activeMaintainersFile || config.maintainersFile || join(__dirname, '../../data/maintainers.json');

  if (cache.has(maintainersPath)) {
    return cache.get(maintainersPath);
  }

  try {
    const data = JSON.parse(readFileSync(maintainersPath, 'utf-8'));

    const list = [
      ...(data.maintainers || []),
      ...(data.bots || []),
      ...(data.emeritus || [])
    ];

    cache.set(maintainersPath, list);
    return list;
  } catch (error) {
    console.error(`Error loading maintainers file: ${error.message}`);
    return [];
  }
}
