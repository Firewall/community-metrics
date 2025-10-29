# Community Metrics

A GitHub community metrics analyzer for tracking repository engagement and contributions. This tool fetches and analyzes community activity including discussions, pull requests, issues, and top contributors.

> **Note:** All code in this repository was generated using [Claude Code](https://claude.com/claude-code) powered by the Claude Sonnet 4.5 model (`claude-sonnet-4-5@20250929`).

## Features

- **Discussion Metrics**: Track upvotes and comments on repository discussions
- **Pull Request Analysis**: Monitor open community PRs and calculate merge rates
- **Issue Tracking**: Analyze community-submitted issues and resolution rates
- **Activity Scoring**: Identify top community contributors based on recent activity
- **Historical Tracking**: Automatic snapshots saved to track metrics over time
- **Interactive Dashboard**: Beautiful charts visualizing trends and patterns
- **GitHub Actions Integration**: Generate automated reports in CI/CD pipelines
- **Configurable**: Works with any GitHub repository

## Installation

1. Clone the repository:
```bash
git clone https://github.com/yourusername/community-metrics.git
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

4. Edit `.env` and add your GitHub Personal Access Token:
```
GH_TOKEN=your_github_token_here
```

Generate a token at: https://github.com/settings/tokens

## Usage

### Basic Usage

Run metrics collection (saves historical snapshot):
```bash
npm start
```

Generate visualization dashboard:
```bash
npm run dashboard
```

Then open `dashboard.html` in your browser to view the interactive charts.

### Analyzing Different Repositories

Set environment variables to analyze any repository:

```bash
# Using environment variables
REPO_OWNER=kubernetes REPO_NAME=kubernetes npm start
```

Or update your `.env` file:
```
REPO_OWNER=kubernetes
REPO_NAME=kubernetes
```

### Custom Maintainers List

By default, the tool uses `data/maintainers.json` to identify maintainers. To use a custom list:

1. Create a JSON file with this structure:
```json
{
  "maintainers": ["user1", "user2"],
  "bots": ["dependabot", "mergify"],
  "emeritus": ["former-maintainer"]
}
```

2. Set the path in your `.env`:
```
MAINTAINERS_FILE=/path/to/custom-maintainers.json
```

### Configuration Options

All configuration can be done via environment variables:

| Variable | Description | Default |
|----------|-------------|---------|
| `GH_TOKEN` | GitHub Personal Access Token (required) | - |
| `REPO_OWNER` | Repository owner/organization | `podman-desktop` |
| `REPO_NAME` | Repository name | `podman-desktop` |
| `MAINTAINERS_FILE` | Path to maintainers JSON file | `data/maintainers.json` |
| `LOOKBACK_MONTHS` | Months to look back for recent activity | `1` |

## Output

The tool provides comprehensive metrics:

- **Discussion Metrics**: Total upvotes and comments
- **Pull Requests**: Open community PRs, all-time stats, merge rate
- **Issues**: Open/closed community issues, resolution rate
- **Top Contributors**: Top 5 most active community members in the last month

### Historical Data

Each time you run `npm start`, a snapshot is automatically saved to `data/history/` with:
- Timestamp and date
- All metrics (discussions, PRs, issues, rates)
- Top active users

Snapshots are stored as JSON files and committed to git for version-controlled history.

### Visualization Dashboard

The dashboard provides interactive charts showing:
- Pull requests over time
- Issues over time
- Discussion engagement trends
- PR merge rate and issue close rate trends
- Current statistics summary

### Scoring System

Activity scoring for top contributors:
- PR created: 3 points
- Issue created: 2 points
- Comment: 1 point

## GitHub Actions Integration

The tool automatically detects when running in GitHub Actions and generates:
- Workflow outputs for all metrics
- Job summary with formatted metrics

### Automated Dashboard Updates

The included workflow (`.github/workflows/metrics-dashboard.yml`) automatically:
1. Runs daily to collect metrics
2. Saves snapshots to `data/history/`
3. Generates updated dashboard
4. Commits changes to git
5. Deploys dashboard to GitHub Pages

To enable:
1. Push this branch to GitHub
2. Enable GitHub Pages in repository settings (deploy from `gh-pages` branch)
3. The workflow runs automatically daily, or trigger manually from Actions tab

Your dashboard will be available at: `https://yourusername.github.io/community-metrics/dashboard.html`

Example custom workflow:

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
│   ├── index.js              # Main entry point
│   ├── generate-dashboard.js # Dashboard generator script
│   ├── config.js             # Configuration management
│   ├── queries/
│   │   └── github-queries.js # GraphQL queries
│   ├── fetchers/
│   │   ├── discussions.js    # Discussion metrics
│   │   ├── pull-requests.js  # PR metrics
│   │   ├── issues.js         # Issue metrics
│   │   └── activity.js       # Activity tracking
│   ├── reporters/
│   │   ├── console.js        # Console output
│   │   ├── github-actions.js # GitHub Actions integration
│   │   └── dashboard.js      # HTML dashboard generator
│   └── utils/
│       ├── graphql-client.js # GraphQL API client
│       ├── helpers.js        # Helper functions
│       ├── maintainers.js    # Maintainers data loader
│       └── history.js        # Historical data management
├── data/
│   ├── maintainers.json      # Maintainers list
│   └── history/              # Historical snapshots (JSON)
├── .github/
│   └── workflows/
│       └── metrics-dashboard.yml # Automated updates workflow
├── .env.example              # Environment template
├── dashboard.html            # Generated visualization (gitignored)
├── package.json
└── README.md
```

## Development

### Running in Development Mode

```bash
npm run dev
```

This uses Node's `--watch` flag to automatically restart on file changes.

### Adding New Metrics

1. Create a new fetcher in `src/fetchers/`
2. Add GraphQL query to `src/queries/github-queries.js`
3. Update reporters in `src/reporters/` to display new metrics
4. Import and call fetcher in `src/index.js`

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
