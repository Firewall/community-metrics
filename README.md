# Community Metrics

A GitHub community metrics analyzer for tracking repository engagement and contributions. Fetches and analyzes discussions, pull requests, issues, and top contributors — with an interactive dashboard and automated daily snapshots via GitHub Actions.

## Features

- Track discussion upvotes and comments
- Monitor open PRs, merge rates, and issue resolution rates
- Identify top community contributors based on recent activity
- Historical snapshots saved automatically to track trends over time
- Interactive dashboard with charts visualizing trends and patterns
- Optional social media follower tracking (Bluesky, LinkedIn, Mastodon, Twitter/X)
- Multi-repository support with aggregate metrics
- GitHub Actions integration with job summaries and workflow outputs

## Installation

1. Clone the repository:
```bash
git clone https://github.com/Firewall/community-metrics.git
cd community-metrics
```

2. Install dependencies:
```bash
npm install
```

3. Set up your environment:
```bash
cp .env.example .env
```

4. Add your GitHub Personal Access Token to `.env`:
```
GH_TOKEN=your_github_token_here
```

Generate a token at: https://github.com/settings/tokens

## Usage

Run metrics collection (uses cached data from today if available):
```bash
npm start
```

Fetch fresh data (ignores cache):
```bash
npm run start:fresh
```

Generate and open the visualization dashboard:
```bash
npm run dashboard
# then open dashboard.html in your browser
```

### Analyzing Multiple Repositories

Set the `REPOS` environment variable to a comma-separated list of `owner/repo` values:

```bash
REPOS=kubernetes/kubernetes,kubernetes/kops npm start
```

Or add it to your `.env` file:
```
REPOS=kubernetes/kubernetes,kubernetes/kops
```

### Social Media Tracking (Optional)

Track social media follower growth alongside your GitHub metrics by adding any of the following to your `.env`:

```
BLUESKY_HANDLE=yourhandle.bsky.social
LINKEDIN_COMPANY=https://www.linkedin.com/company/your-company
MASTODON_INSTANCE=fosstodon.org
MASTODON_USERNAME=yourusername

# Twitter/X requires manual tracking (their API requires paid access)
TWITTER_HANDLE=yourhandle
TWITTER_FOLLOWERS=1234
```

### Custom Maintainers List

The tool uses `data/maintainers.json` to distinguish maintainers from community contributors. To use a custom file:

1. Create a JSON file:
```json
{
  "maintainers": ["user1", "user2"],
  "bots": ["dependabot", "mergify"],
  "emeritus": ["former-maintainer"]
}
```

2. Point to it in your `.env`:
```
MAINTAINERS_FILE=/path/to/custom-maintainers.json
```

## Configuration

All configuration is done via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GH_TOKEN` | GitHub Personal Access Token (required) | - |
| `REPOS` | Comma-separated list of repos (`owner/repo`) | - |
| `MAINTAINERS_FILE` | Path to maintainers JSON file | `data/maintainers.json` |
| `LOOKBACK_MONTHS` | Months to look back for activity scoring | `1` |
| `BLUESKY_HANDLE` | Bluesky handle for follower tracking | - |
| `LINKEDIN_COMPANY` | LinkedIn company page URL | - |
| `TWITTER_HANDLE` | Twitter/X handle without @ | - |
| `TWITTER_FOLLOWERS` | Manual Twitter/X follower count | - |
| `MASTODON_INSTANCE` | Mastodon instance domain | - |
| `MASTODON_USERNAME` | Mastodon username | - |

## GitHub Actions

The included workflow (`.github/workflows/metrics-dashboard.yml`) runs daily to:
1. Collect metrics and save a snapshot to `data/history/`
2. Generate an updated dashboard
3. Commit changes to git
4. Deploy the dashboard to GitHub Pages

To enable:
1. Enable GitHub Pages in your repository settings (deploy from the `gh-pages` branch)
2. The workflow will run automatically each day, or trigger it manually from the Actions tab

Your dashboard will be available at:
```
https://Firewall.github.io/community-metrics/dashboard.html
```

### Custom Workflow Example

```yaml
name: Community Metrics

on:
  schedule:
    - cron: '0 0 * * 0'  # Weekly on Sunday
  workflow_dispatch:

jobs:
  metrics:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with:
          node-version: '20'
      - run: npm install
      - name: Generate Metrics
        env:
          GH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
        run: npm start
      - name: Generate Dashboard
        run: npm run dashboard
```

## Project Structure

```
community-metrics/
├── src/
│   ├── index.js                  # Main entry point
│   ├── generate-dashboard.js     # Dashboard generator
│   ├── config.js                 # Configuration
│   ├── queries/
│   │   └── github-queries.js     # GraphQL queries
│   ├── fetchers/
│   │   ├── discussions.js        # Discussion metrics
│   │   ├── pull-requests.js      # PR metrics
│   │   ├── issues.js             # Issue metrics
│   │   └── activity.js           # Activity tracking
│   ├── reporters/
│   │   ├── console.js            # Console output
│   │   ├── github-actions.js     # GitHub Actions integration
│   │   └── dashboard.js          # Dashboard generator
│   └── utils/
│       ├── graphql-client.js     # GraphQL API client
│       ├── helpers.js            # Utility functions
│       ├── maintainers.js        # Maintainers data loader
│       └── history.js            # Historical data management
├── data/
│   ├── maintainers.json          # Maintainers list
│   └── history/                  # Historical snapshots (JSON)
├── .github/
│   └── workflows/
│       └── metrics-dashboard.yml
├── .env.example
├── package.json
└── README.md
```

## Development

Run with auto-restart on file changes:
```bash
npm run dev
```

### Adding New Metrics

1. Create a fetcher in `src/fetchers/`
2. Add the GraphQL query to `src/queries/github-queries.js`
3. Update `src/reporters/` to display the new data
4. Import and call the fetcher in `src/index.js`

## License

MIT
