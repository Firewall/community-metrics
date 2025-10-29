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

export async function hasSnapshotForToday(repoLabel = null) {
  await ensureHistoryDir();

  const today = new Date().toISOString().split('T')[0];

  try {
    const files = await fs.readdir(HISTORY_DIR);
    const todayFiles = files.filter(f => f.startsWith(today) && f.endsWith('.json'));

    if (repoLabel) {
      for (const file of todayFiles) {
        const content = await fs.readFile(path.join(HISTORY_DIR, file), 'utf-8');
        const snapshot = JSON.parse(content);
        if (snapshot.repoLabel === repoLabel) {
          return { exists: true, snapshot, filename: file };
        }
      }
      return { exists: false };
    }

    if (todayFiles.length > 0) {
      const content = await fs.readFile(path.join(HISTORY_DIR, todayFiles[0]), 'utf-8');
      const snapshot = JSON.parse(content);
      return { exists: true, snapshot, filename: todayFiles[0] };
    }

    return { exists: false };
  } catch (error) {
    console.error('Failed to check for existing snapshot:', error);
    return { exists: false };
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
        openPRs: (metrics.openCommunityPRs || []).map(pr => ({
          number: pr.number,
          title: pr.title,
          author: pr.author?.login || 'unknown',
          url: pr.url,
          createdAt: pr.createdAt,
        })),
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

  const saferepoLabel = (repoLabel || 'unknown').replace(/\//g, '_');
  const filename = `${date}-${saferepoLabel}.json`;
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
    const key = `${snapshot.date}-${snapshot.repoLabel || 'unknown'}`;
    const existing = dailyMap.get(key);
    if (!existing || new Date(snapshot.timestamp) > new Date(existing.timestamp)) {
      dailyMap.set(key, snapshot);
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
