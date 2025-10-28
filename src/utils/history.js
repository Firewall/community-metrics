import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const HISTORY_DIR = path.join(__dirname, '../../data/history');

async function ensureHistoryDir() {
  try {
    await fs.mkdir(HISTORY_DIR, { recursive: true });
  } catch (error) {
    console.error('Failed to create history directory:', error);
    throw error;
  }
}

export async function saveSnapshot(metrics, topActiveUsers, rates, repoLabel = null) {
  await ensureHistoryDir();

  const timestamp = new Date().toISOString();
  const date = timestamp.split('T')[0];

  const snapshot = {
    timestamp,
    date,
    repoLabel,
    metrics: {
      discussions: {
        totalUpvotes: metrics.totalUpvotes,
        totalComments: metrics.totalComments,
      },
      pullRequests: {
        open: metrics.openCommunityPRs?.length || 0,
        total: metrics.totalCommunityPRs,
        merged: metrics.totalMergedCommunityPRs,
        mergeRate: rates.prMergeRate,
      },
      issues: {
        open: metrics.openCommunityIssues,
        closed: metrics.closedCommunityIssues,
        total: metrics.totalCommunityIssues,
        closeRate: rates.issueCloseRate,
      },
    },
    topActiveUsers: topActiveUsers.slice(0, 5).map(user => ({
      username: user.username,
      prs: user.prs,
      issues: user.issues,
      comments: user.comments,
      total: user.total,
    })),
  };

  const filename = `${date}-${Date.now()}.json`;
  const filepath = path.join(HISTORY_DIR, filename);

  await fs.writeFile(filepath, JSON.stringify(snapshot, null, 2));
  console.log(`📊 Snapshot saved: ${filename}`);

  return snapshot;
}

export async function loadHistory() {
  try {
    await ensureHistoryDir();

    const files = await fs.readdir(HISTORY_DIR);
    const jsonFiles = files.filter(f => f.endsWith('.json'));

    const snapshots = await Promise.all(
      jsonFiles.map(async (file) => {
        const content = await fs.readFile(path.join(HISTORY_DIR, file), 'utf-8');
        return JSON.parse(content);
      })
    );

    return snapshots.sort((a, b) =>
      new Date(a.timestamp) - new Date(b.timestamp)
    );
  } catch (error) {
    console.error('Failed to load history:', error);
    return [];
  }
}

export async function getDailySnapshots() {
  const history = await loadHistory();

  const dailyMap = new Map();

  history.forEach(snapshot => {
    const existing = dailyMap.get(snapshot.date);
    if (!existing || new Date(snapshot.timestamp) > new Date(existing.timestamp)) {
      dailyMap.set(snapshot.date, snapshot);
    }
  });

  return Array.from(dailyMap.values()).sort((a, b) =>
    new Date(a.date) - new Date(b.date)
  );
}

export async function getRecentSnapshots(days = 30) {
  const dailySnapshots = await getDailySnapshots();
  return dailySnapshots.slice(-days);
}
