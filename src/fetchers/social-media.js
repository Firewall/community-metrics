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
 * Parses the public LinkedIn page HTML to extract follower count from meta tags
 * @param {string} companyUrl - LinkedIn company URL (e.g., 'https://www.linkedin.com/company/podman-desktop')
 * @returns {Promise<number>} Follower count
 */
export async function fetchLinkedInFollowers(companyUrl) {
  try {
    // Fetch the LinkedIn page with a user agent to avoid being blocked
    const response = await fetch(companyUrl, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    if (!response.ok) {
      throw new Error(`LinkedIn page error: ${response.status} ${response.statusText}`);
    }

    const html = await response.text();

    // Extract follower count from meta description tag
    // Format: "Company Name | XXX followers on LinkedIn. ..."
    const metaMatch = html.match(/<meta\s+name="description"\s+content="[^"]*\|\s*([0-9,]+)\s+followers?\s+on\s+LinkedIn/i);

    if (metaMatch && metaMatch[1]) {
      // Remove commas and parse as integer
      const followerCount = parseInt(metaMatch[1].replace(/,/g, ''), 10);
      return followerCount || 0;
    }

    console.warn(`Could not parse LinkedIn follower count from ${companyUrl}`);
    return 0;
  } catch (error) {
    console.error(`Failed to fetch LinkedIn followers for ${companyUrl}:`, error.message);
    return 0;
  }
}

/**
 * Twitter/X follower tracking via manual configuration
 * Uses TWITTER_FOLLOWERS environment variable for manual tracking
 * @param {string} handle - Twitter/X handle (e.g., 'podmandesktop')
 * @returns {Promise<number>} Follower count
 */
export async function fetchTwitterFollowers(handle) {
  const manualCount = process.env.TWITTER_FOLLOWERS;
  return manualCount ? parseInt(manualCount, 10) : 0;
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
 * Fetches all configured social media metrics in parallel
 * @param {Object} socialConfig - Social media configuration with handles
 * @returns {Promise<Object>} Social media metrics (excludes zero values)
 */
export async function fetchSocialMetrics(socialConfig) {
  const promises = [];

  if (socialConfig?.bluesky) {
    promises.push(
      fetchBlueskyFollowers(socialConfig.bluesky).then(count => ['blueskyFollowers', count])
    );
  }

  if (socialConfig?.linkedin) {
    promises.push(
      fetchLinkedInFollowers(socialConfig.linkedin).then(count => ['linkedinFollowers', count])
    );
  }

  if (socialConfig?.mastodon) {
    const { instance, username } = socialConfig.mastodon;
    promises.push(
      fetchMastodonFollowers(instance, username).then(count => ['mastodonFollowers', count])
    );
  }

  if (socialConfig?.twitter) {
    promises.push(
      fetchTwitterFollowers(socialConfig.twitter).then(count => ['twitterFollowers', count])
    );
  }

  // Fetch all social metrics in parallel
  const results = await Promise.all(promises);

  // Filter out zero values to avoid cluttering charts
  const metrics = Object.fromEntries(
    results.filter(([key, value]) => value > 0)
  );

  // Return null if no metrics were collected
  return Object.keys(metrics).length > 0 ? metrics : null;
}
