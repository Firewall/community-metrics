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
 * Fetches LinkedIn follower count for a company page
 * Note: LinkedIn's API requires authentication and has restrictions.
 * This is a placeholder for when proper API access is configured.
 * @param {string} companyUrl - LinkedIn company URL
 * @returns {Promise<number>} Follower count
 */
export async function fetchLinkedInFollowers(companyUrl) {
  try {
    // LinkedIn requires OAuth authentication and approved API access
    // For now, we'll return 0 and log that manual tracking is needed
    console.warn(`LinkedIn tracking for ${companyUrl} requires manual configuration`);
    console.warn('LinkedIn API requires OAuth authentication and approved API access');
    return 0;
  } catch (error) {
    console.error(`Failed to fetch LinkedIn followers for ${companyUrl}:`, error.message);
    return 0;
  }
}

/**
 * Fetches X/Twitter follower count
 * Note: Twitter/X API v2 requires authentication
 * This is a placeholder for when proper API access is configured.
 * @param {string} handle - Twitter/X handle (e.g., 'podmandesktop')
 * @returns {Promise<number>} Follower count
 */
export async function fetchTwitterFollowers(handle) {
  try {
    // Twitter/X API v2 requires authentication
    // For now, we'll return 0 and log that manual tracking is needed
    console.warn(`Twitter/X tracking for @${handle} requires manual configuration`);
    console.warn('Twitter/X API requires authentication and API access');
    return 0;
  } catch (error) {
    console.error(`Failed to fetch Twitter followers for @${handle}:`, error.message);
    return 0;
  }
}

/**
 * Fetches Mastodon follower count for an account
 * Uses the public Mastodon API (no authentication required)
 * @param {string} instance - Mastodon instance (e.g., 'fosstodon.org')
 * @param {string} username - Mastodon username (e.g., 'podmandesktop')
 * @returns {Promise<number>} Follower count
 */
export async function fetchMastodonFollowers(instance, username) {
  try {
    // First, look up the account ID
    const searchResponse = await fetch(
      `https://${instance}/api/v1/accounts/lookup?acct=${username}`
    );

    if (!searchResponse.ok) {
      throw new Error(`Mastodon API error: ${searchResponse.status} ${searchResponse.statusText}`);
    }

    const accountData = await searchResponse.json();
    return accountData.followers_count || 0;
  } catch (error) {
    console.error(`Failed to fetch Mastodon followers for @${username}@${instance}:`, error.message);
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

  if (socialConfig?.linkedin) {
    metrics.linkedinFollowers = await fetchLinkedInFollowers(socialConfig.linkedin);
  }

  if (socialConfig?.twitter) {
    metrics.twitterFollowers = await fetchTwitterFollowers(socialConfig.twitter);
  }

  if (socialConfig?.mastodon) {
    const { instance, username } = socialConfig.mastodon;
    metrics.mastodonFollowers = await fetchMastodonFollowers(instance, username);
  }

  // Return null if no metrics were collected
  return Object.keys(metrics).length > 0 ? metrics : null;
}
