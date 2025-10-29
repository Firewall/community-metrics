/**
 * Fetches social media metrics for tracked accounts
 */

/**
 * Fetches Bluesky follower count for a given handle
 * Uses the public AT Protocol API (no authentication required)
 * @param {string} handle - Bluesky handle (e.g., 'podmandesktop.bsky.social')
 * @returns {Promise<number>} Follower count
 */
export async function fetchBlueskyFollowers(handle) {
  try {
    const response = await fetch(
      `https://public.api.bsky.app/xrpc/app.bsky.actor.getProfile?actor=${handle}`
    );

    if (!response.ok) {
      throw new Error(`Bluesky API error: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    return data.followersCount || 0;
  } catch (error) {
    console.error(`Failed to fetch Bluesky followers for ${handle}:`, error.message);
    return 0;
  }
}

/**
 * Fetches all configured social media metrics
 * @param {Object} socialConfig - Social media configuration with handles
 * @returns {Promise<Object>} Social media metrics
 */
export async function fetchSocialMetrics(socialConfig) {
  const metrics = {};

  if (socialConfig?.bluesky) {
    metrics.blueskyFollowers = await fetchBlueskyFollowers(socialConfig.bluesky);
  }

  // Return null if no metrics were collected
  return Object.keys(metrics).length > 0 ? metrics : null;
}
