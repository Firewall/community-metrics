#!/usr/bin/env node

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { generateDashboardHTML } from './reporters/dashboard.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  console.log('🎨 Generating dashboard...');

  const html = await generateDashboardHTML();
  const outputPath = path.join(__dirname, '../dashboard.html');

  await fs.writeFile(outputPath, html);

  console.log(`✅ Dashboard generated: ${outputPath}`);
  console.log('🌐 Opening dashboard in browser...');

  const { exec } = await import('child_process');
  const platform = process.platform;

  const command = platform === 'darwin' ? 'open' :
                 platform === 'win32' ? 'start' :
                 'xdg-open';

  exec(`${command} ${outputPath}`);
}

main().catch(error => {
  console.error('❌ Error generating dashboard:', error.message);
  process.exit(1);
});
