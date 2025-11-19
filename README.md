# cronjob

[![CI](https://github.com/duyetbot/cronjob/actions/workflows/ci.yml/badge.svg)](https://github.com/duyetbot/cronjob/actions/workflows/ci.yml)
[![Auto Accept Collabs](https://github.com/duyetbot/cronjob/actions/workflows/auto-accept-collabs.yml/badge.svg)](https://github.com/duyetbot/cronjob/actions/workflows/auto-accept-collabs.yml)
[![Auto Invite @duyet](https://github.com/duyetbot/cronjob/actions/workflows/auto-invite-duyet.yml/badge.svg)](https://github.com/duyetbot/cronjob/actions/workflows/auto-invite-duyet.yml)
[![Crates Puller](https://github.com/duyetbot/cronjob/actions/workflows/crates-puller.yml/badge.svg)](https://github.com/duyetbot/cronjob/actions/workflows/crates-puller.yml)

> Automated GitHub repository management suite powered by **TypeScript**, **Bun**, and **GitHub Actions**

A collection of intelligent automation workflows designed to streamline GitHub account management, reduce manual work, and ensure consistent repository access across projects.

## 🚀 Tech Stack

- **TypeScript** - Type-safe code with excellent IDE support
- **Bun** - Ultra-fast JavaScript runtime (3x faster than Node.js)
- **GitHub Actions** - Serverless automation platform
- **ESLint** - Code quality enforcement
- **Prettier** - Consistent code formatting

## Features

### 🤝 Auto Accept Collaborators

Automatically accepts collaboration invitations, eliminating the need for manual review and approval.

- **Triggers**: Hourly schedule, push to main/master, issue comments, manual dispatch
- **Permissions**: Read contents, write issues and pull requests
- **Use Case**: Streamline team onboarding and collaboration workflows

### 👥 Auto Invite User (@duyet)

Automatically invites a specified user to all repositories owned by the account, ensuring consistent access across projects.

- **Triggers**: Hourly schedule, push to main/master, manual dispatch
- **Features**:
  - Pagination support for accounts with many repositories
  - Rate limiting with exponential backoff
  - Comprehensive error handling
  - Detailed execution statistics and logging
  - Debug mode for troubleshooting
- **Permissions**: Read contents, issues, and repository projects
- **Configuration**: Set `USER_NAME` environment variable (default: `duyet`)

### 📦 Crates Puller

Periodically fetches specified Rust crates to keep the cargo cache warm, improving build times for related projects.

- **Triggers**: Hourly schedule, push to main/master, manual dispatch
- **Crates**: `statsd-mock`, `grant`
- **Features**:
  - Cargo registry caching for faster execution
  - Verbose output for debugging
  - Dependency tree visualization
- **Permissions**: Read contents

## Setup

### Prerequisites

- GitHub repository with Actions enabled
- GitHub Personal Access Token (PAT) with appropriate permissions

### Configuration

1. **Create GitHub Token**

   Generate a Personal Access Token with the following scopes:
   - `repo` - Full control of private repositories
   - `admin:org` - For managing organization repositories
   - `workflow` - Update GitHub Actions workflows

2. **Add Secret to Repository**

   Add your token as a repository secret:
   - Go to `Settings` → `Secrets and variables` → `Actions`
   - Click `New repository secret`
   - Name: `TOKEN`
   - Value: Your GitHub Personal Access Token

3. **Enable GitHub Actions**

   Ensure GitHub Actions are enabled for your repository:
   - Go to `Settings` → `Actions` → `General`
   - Select `Allow all actions and reusable workflows`

4. **Customize Workflows** (Optional)
   - **Change invited user**: Edit `.github/workflows/auto-invite-duyet.yml` and modify `USER_NAME` env variable
   - **Adjust schedules**: Modify the `cron` expressions in workflow files
   - **Add more crates**: Edit the `CRATES` env variable in `crates-puller.yml`

## Development

### Prerequisites

- **Bun** >= 1.0.0 ([Installation guide](https://bun.sh/docs/installation))
- Git

### Local Setup

```bash
# Clone the repository
git clone https://github.com/duyetbot/cronjob.git
cd cronjob

# Install dependencies with Bun (fast!)
bun install
```

### Building

```bash
# Build TypeScript to JavaScript
bun run build

# Type check without building
bun run type-check
```

### Testing

```bash
# Run tests with Bun's built-in test runner
bun test

# Run tests with coverage
bun test --coverage

# Watch mode for development
bun test --watch
```

### Code Quality

```bash
# Type check + lint + format check (all-in-one)
bun run check

# Lint TypeScript code
bun run lint

# Fix linting issues
bun run lint:fix

# Check formatting
bun run format:check

# Format code
bun run format

# Run full CI pipeline locally
bun run ci
```

### Manual Workflow Execution

All workflows support manual triggering via `workflow_dispatch`:

1. Go to the `Actions` tab
2. Select the workflow you want to run
3. Click `Run workflow`
4. Choose the branch and click `Run workflow`

## Project Structure

```
.
├── .github/
│   ├── workflows/           # GitHub Actions automation
│   │   ├── auto-accept-collabs.yml
│   │   ├── auto-invite-duyet.yml
│   │   ├── crates-puller.yml
│   │   └── ci.yml
│   └── dependabot.yml       # Automated dependency updates
├── scripts/
│   ├── auto-invite-duyet.ts          # Auto-invite automation logic (TypeScript)
│   └── auto-invite-duyet-wrapper.ts  # GitHub Actions wrapper
├── tests/
│   └── auto-invite-duyet.test.ts     # Test suite (TypeScript)
├── types/
│   └── github-actions.d.ts           # Type definitions
├── .editorconfig                     # Editor configuration
├── .eslintrc.json                    # ESLint configuration (TypeScript)
├── .gitignore                        # Git ignore rules
├── .prettierrc.json                  # Prettier configuration
├── CLAUDE.md                         # Project philosophy and guidelines
├── tsconfig.json                     # TypeScript configuration
├── package.json                      # Bun dependencies and scripts
├── bun.lockb                         # Bun lock file
└── README.md                         # This file
```

## Workflow Details

### Auto Accept Collabs

Uses the trusted `kbrashears5/github-action-auto-accept-collabs` action to handle collaboration invitations.

**Configuration**:

- Runs hourly at minute 0
- 10-minute timeout
- Concurrency: Single instance (no cancellation)

### Auto Invite @duyet

Custom TypeScript implementation using GitHub's Octokit REST API, powered by Bun.

**Features**:

- ✅ Type-safe TypeScript implementation
- ✅ Blazing-fast execution with Bun runtime
- ✅ Pagination for large repository lists (100 per page)
- ✅ Rate limiting detection and exponential backoff
- ✅ Comprehensive error handling with proper types
- ✅ Detailed statistics tracking
- ✅ Debug mode support

**Debug Mode**:

Enable debug logging by uncommenting the `DEBUG: true` line in the workflow file.

### Crates Puller

Maintains a warm cargo cache for specified Rust crates.

**Optimizations**:

- Cargo registry caching (speeds up subsequent runs)
- Minimal toolchain installation
- Changed from 15-minute to hourly schedule (better resource usage)

## Monitoring

### Workflow Status

Check the status of all workflows:

- [CI](https://github.com/duyetbot/cronjob/actions/workflows/ci.yml)
- [Auto Accept Collabs](https://github.com/duyetbot/cronjob/actions/workflows/auto-accept-collabs.yml)
- [Auto Invite @duyet](https://github.com/duyetbot/cronjob/actions/workflows/auto-invite-duyet.yml)
- [Crates Puller](https://github.com/duyetbot/cronjob/actions/workflows/crates-puller.yml)

### Logs

View detailed logs for each workflow run:

1. Go to the `Actions` tab
2. Select a workflow
3. Click on a specific run
4. Expand job steps to view logs

## Troubleshooting

### Workflow Fails with Rate Limit Error

The auto-invite script includes automatic retry with exponential backoff. If you consistently hit rate limits:

- Reduce the frequency of scheduled runs
- Check if you're running multiple workflows simultaneously
- Monitor your GitHub API rate limit: https://api.github.com/rate_limit

### Token Permission Issues

Ensure your `TOKEN` secret has the required permissions:

- `repo` scope for repository access
- `admin:org` for organization repositories
- Verify the token hasn't expired

### Workflow Not Running on Schedule

- Verify the cron syntax is correct
- Check if Actions are enabled in repository settings
- Note: Scheduled workflows may be delayed during periods of high GitHub Actions load

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes (TypeScript files in `scripts/` and `tests/`)
4. Run type checking: `bun run type-check`
5. Run tests: `bun test`
6. Run linting: `bun run lint`
7. Format code: `bun run format`
8. Run full check: `bun run check`
9. Commit your changes: `git commit -m 'Add amazing feature'`
10. Push to the branch: `git push origin feature/amazing-feature`
11. Open a Pull Request

## License

MIT

## Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Octokit REST API](https://octokit.github.io/rest.js)
- [GitHub API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Cron Syntax Reference](https://docs.github.com/en/actions/using-workflows/events-that-trigger-workflows#schedule)

## Support

For issues, questions, or contributions, please [open an issue](https://github.com/duyetbot/cronjob/issues) on GitHub.
