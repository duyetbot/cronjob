# CLAUDE.md - Project Philosophy & Guidelines

## Project Overview

**cronjob** is a GitHub automation suite designed to automate repository management tasks across the duyetbot GitHub account. This project embodies the principle that great automation is invisible, reliable, and self-maintaining.

## Vision

This project exists to eliminate repetitive GitHub management tasks through intelligent automation. Every workflow should be:

- **Reliable**: Never fail silently, always provide clear feedback
- **Efficient**: Use resources wisely, respect rate limits
- **Secure**: Follow least-privilege principles, protect sensitive data
- **Maintainable**: Self-documenting code, clear structure, easy to extend

## Architecture Philosophy

### Simplicity Over Complexity

- This is a configuration-as-code project, not a traditional application
- Leverage GitHub Actions ecosystem rather than building custom solutions
- Keep dependencies minimal and well-justified
- Every line of code should have a clear purpose

### Automation Workflows

#### 1. Auto Accept Collaborators

**Purpose**: Automatically accept collaboration invitations to reduce manual work

**Design Decisions**:

- Runs hourly to balance responsiveness with resource usage
- Triggers on push for immediate testing after changes
- Triggers on issue comments for on-demand execution
- Uses trusted third-party action to handle complex GitHub API interactions

#### 2. Auto Invite User

**Purpose**: Ensure @duyet has access to all repositories for oversight and collaboration

**Design Decisions**:

- Custom JavaScript implementation for fine-grained control
- Pagination support for accounts with many repositories
- Idempotent: checks before inviting to avoid duplicate requests
- Debug mode available via environment variable
- Comprehensive error handling to prevent single failures from stopping entire process

#### 3. Crates Puller

**Purpose**: Keep Rust crate cache warm for faster builds elsewhere

**Design Decisions**:

- Runs hourly (optimized from excessive 15-minute interval)
- Focuses on specific crates: `statsd-mock` and `grant`
- Uses minimal Rust toolchain for efficiency
- Intentionally disposable: creates fresh cargo project each run

## Code Standards

### JavaScript/Node.js

- Use modern JavaScript (ES6+) features
- Prefer `async/await` over promise chains
- Always include comprehensive JSDoc comments
- Handle errors explicitly, never silently fail
- Use destructuring for cleaner code
- Validate environment variables before use

### GitHub Actions Workflows

- Always specify explicit permissions (least privilege)
- Use latest stable versions of actions
- Pin actions to major versions for stability with auto-updates
- Include timeouts on all jobs (default: 10 minutes)
- Use concurrency groups to prevent workflow conflicts
- Add meaningful names to all steps
- Cache dependencies when applicable

### Error Handling

- Log errors with sufficient context for debugging
- Distinguish between expected and unexpected errors
- Continue processing when individual items fail (fail-open for non-critical operations)
- Set appropriate exit codes
- Provide actionable error messages

### Security

- Never commit secrets or tokens
- Use GitHub Secrets for all sensitive data
- Apply least-privilege permissions to workflows
- Review third-party actions before using
- Keep dependencies updated via Dependabot
- Validate all external inputs

## Development Workflow

### Making Changes

1. All changes go through pull requests
2. Workflows must pass validation before merge
3. Test changes with manual triggers before relying on cron
4. Update documentation when adding/changing functionality

### Testing

- Test workflows individually using `workflow_dispatch` triggers
- Verify rate limiting behavior with debug mode enabled
- Check workflow logs for warnings or errors
- Validate GitHub API responses match expectations

### Code Review

- Ensure new code includes JSDoc comments
- Verify error handling is comprehensive
- Check that logging provides useful information
- Confirm security best practices are followed
- Validate that changes align with project philosophy

## File Structure

```
.
├── .github/
│   ├── workflows/          # GitHub Actions automation
│   │   ├── auto-accept-collabs.yml
│   │   ├── auto-invite-duyet.yml
│   │   ├── crates-puller.yml
│   │   └── ci.yml          # Linting and testing
│   └── dependabot.yml      # Automated dependency updates
├── scripts/
│   └── auto-invite-duyet.js # Core automation logic
├── tests/                   # Test suites
│   └── auto-invite-duyet.test.js
├── .editorconfig           # Editor consistency
├── .eslintrc.json          # Code quality rules
├── .gitignore              # VCS exclusions
├── .prettierrc.json        # Code formatting
├── CLAUDE.md               # This file - project philosophy
├── package.json            # Dependencies and scripts
└── README.md               # User-facing documentation
```

## Extending the Project

### Adding New Workflows

When adding new automation:

1. **Define the problem clearly**: What manual task are we eliminating?
2. **Choose the right tool**: Third-party action or custom script?
3. **Implement defensively**: Handle errors, respect rate limits, log clearly
4. **Document thoroughly**: Update README, add comments, explain decisions
5. **Test extensively**: Manual triggers first, then schedule
6. **Monitor initially**: Check logs frequently after deployment

### Custom Scripts

New scripts should:

- Export a single async function as the module
- Accept `{github, context}` as parameters
- Include comprehensive JSDoc documentation
- Handle pagination for API responses
- Implement proper error handling
- Support debug mode via environment variable
- Log progress clearly

### Workflow Best Practices

New workflows should:

- Include `workflow_dispatch` trigger for manual testing
- Specify explicit permissions
- Use concurrency groups if they modify state
- Set reasonable timeouts
- Use caching where applicable
- Pin action versions appropriately
- Include descriptive step names

## Monitoring & Maintenance

### What to Monitor

- Workflow success/failure rates
- GitHub API rate limit consumption
- Execution time trends
- Error patterns in logs

### Regular Maintenance

- Review Dependabot PRs promptly
- Update action versions quarterly
- Audit permissions and secrets annually
- Remove deprecated workflows

### Troubleshooting

1. Check workflow run logs in GitHub Actions tab
2. Enable debug mode: set `DEBUG=true` in workflow environment
3. Review GitHub API status if workflows fail unexpectedly
4. Verify secrets are configured correctly
5. Check rate limiting headers in API responses

## Performance Considerations

### Rate Limiting

- GitHub API has rate limits (5,000 requests/hour for authenticated requests)
- Workflows include delays and pagination to respect limits
- Monitor `X-RateLimit-Remaining` header
- Implement exponential backoff for rate limit errors

### Resource Usage

- Workflows run on GitHub-hosted runners (limited minutes)
- Optimize cron schedules: balance responsiveness vs. cost
- Use caching to speed up repeated operations
- Clean up temporary resources

## Questions?

For questions about this project's architecture or decisions, consult:

- This CLAUDE.md file for philosophy and patterns
- README.md for usage and setup instructions
- Inline code comments for implementation details
- Git history for evolution and context of changes

## Contributing

This project follows the principle: **Make it work, make it right, make it fast** - in that order.

When contributing:

1. Understand the existing patterns
2. Follow the established philosophy
3. Write self-documenting code
4. Test thoroughly
5. Document decisions

Remember: We're not just writing code to automate tasks. We're building a reliable, maintainable system that should run flawlessly for years with minimal intervention. Every decision should serve that goal.
