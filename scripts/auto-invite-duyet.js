/**
 * Auto-invite user to all repositories
 *
 * This script automatically invites a specified user to all repositories owned by an account.
 * It's designed to run as a GitHub Action and uses the GitHub API to manage collaborators.
 * @module auto-invite-duyet
 */

/**
 * Configuration for debug logging
 * When DEBUG env var is not set, debug logs are suppressed
 */
if (!process.env.DEBUG) {
  /**
   *
   */
  console.debug = () => {}
}

/**
 * Sleep for a specified number of milliseconds
 * Used for rate limiting and exponential backoff
 * @param {number} ms - Milliseconds to sleep
 * @returns {Promise<void>} Promise that resolves after the specified time
 */
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

/**
 * Handle GitHub API rate limiting with exponential backoff
 * @param {Function} fn - Async function to retry
 * @param {number} maxRetries - Maximum number of retry attempts
 * @param {number} baseDelay - Base delay in milliseconds for exponential backoff
 * @returns {Promise<*>} Result of the function call
 * @throws {Error} If all retries are exhausted
 */
const withRateLimitRetry = async (fn, maxRetries = 3, baseDelay = 1000) => {
  let lastError

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn()
    } catch (error) {
      lastError = error

      // Check if this is a rate limit error
      if (error.status === 403 && error.response?.headers?.['x-ratelimit-remaining'] === '0') {
        const resetTime = error.response.headers['x-ratelimit-reset']
        const waitTime = resetTime
          ? (resetTime * 1000 - Date.now()) / 1000
          : baseDelay * 2 ** attempt

        console.log(
          `Rate limit exceeded. Waiting ${Math.ceil(waitTime / 1000)}s before retry ${attempt + 1}/${maxRetries}...`
        )
        await sleep(waitTime)
        continue
      }

      // For other errors, use exponential backoff
      if (attempt < maxRetries) {
        const waitTime = baseDelay * 2 ** attempt
        console.debug(
          `Retry ${attempt + 1}/${maxRetries} after ${waitTime}ms due to:`,
          error.message
        )
        await sleep(waitTime)
      }
    }
  }

  throw lastError
}

/**
 * Fetch all repositories with pagination support
 * @param {object} github - GitHub API client (Octokit)
 * @param {string} owner - Repository owner username
 * @returns {Promise<Array>} Array of all repositories
 */
const fetchAllRepositories = async (github, owner) => {
  const repositories = []
  let page = 1
  const perPage = 100

  console.log(`Fetching repositories for owner: ${owner}`)

  // eslint-disable-next-line no-constant-condition
  while (true) {
    const response = await withRateLimitRetry(async () => {
      return await github.rest.repos.listForUser({
        username: owner,
        type: 'owner',
        sort: 'created',
        per_page: perPage,
        page,
      })
    })

    console.debug(`Fetched page ${page}: ${response.data.length} repositories`)
    repositories.push(...response.data)

    // Check if we've received all repositories
    if (response.data.length < perPage) {
      break
    }

    page++
  }

  console.log(`Total repositories found: ${repositories.length}`)
  return repositories
}

/**
 * Check if a user is already a collaborator on a repository
 * @param {object} github - GitHub API client (Octokit)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} username - Username to check
 * @returns {Promise<boolean>} True if user is a collaborator, false otherwise
 */
const isCollaborator = async (github, owner, repo, username) => {
  try {
    await withRateLimitRetry(async () => {
      return await github.rest.repos.checkCollaborator({
        owner,
        repo,
        username,
      })
    })
    return true
  } catch (error) {
    if (error.status === 404) {
      return false
    }
    throw error
  }
}

/**
 * Invite a user to a repository
 * @param {object} github - GitHub API client (Octokit)
 * @param {string} owner - Repository owner
 * @param {string} repo - Repository name
 * @param {string} username - Username to invite
 * @returns {Promise<object>} Invitation response
 */
const inviteCollaborator = async (github, owner, repo, username) => {
  return await withRateLimitRetry(async () => {
    return await github.rest.repos.addCollaborator({
      owner,
      repo,
      username,
      permission: 'push', // Default permission level
    })
  })
}

/**
 * Process a single repository: check and invite user if needed
 * @param {object} github - GitHub API client (Octokit)
 * @param {object} repo - Repository object from GitHub API
 * @param {string} username - Username to invite
 * @param {object} stats - Statistics object to track successes and failures
 * @returns {Promise<void>}
 */
const processRepository = async (github, repo, username, stats) => {
  const { owner, name: repoName, full_name: fullName } = repo

  try {
    console.log(`[${stats.processed + 1}] Checking ${fullName}...`)

    const alreadyCollaborator = await isCollaborator(github, owner.login, repoName, username)

    if (alreadyCollaborator) {
      console.log(`  ✓ ${username} is already a collaborator`)
      stats.skipped++
      return
    }

    console.log(`  → Inviting ${username} to ${fullName}...`)
    const response = await inviteCollaborator(github, owner.login, repoName, username)

    console.log(`  ✓ Invitation sent (status: ${response.status})`)
    stats.invited++
  } catch (error) {
    console.error(`  ✗ Failed to process ${fullName}:`, error.message)
    console.debug('Full error:', error)
    stats.failed++
  } finally {
    stats.processed++
  }
}

/**
 * Main entry point for the auto-invite script
 * @param {object} params - Parameters object
 * @param {object} params.github - GitHub API client (Octokit) from github-script action
 * @param {object} params.context - GitHub Actions context
 * @returns {Promise<void>}
 */
module.exports = async ({ github, context }) => {
  const startTime = Date.now()

  // Validate and get configuration
  const username = process.env.USER_NAME
  if (!username) {
    throw new Error('USER_NAME environment variable is required')
  }

  const owner = context.repo.owner
  if (!owner) {
    throw new Error('Unable to determine repository owner from context')
  }

  console.log('='.repeat(60))
  console.log('Auto-Invite User to Repositories')
  console.log('='.repeat(60))
  console.log(`Target user: ${username}`)
  console.log(`Owner: ${owner}`)
  console.log(`Started at: ${new Date().toISOString()}`)
  console.log('='.repeat(60))

  // Statistics tracking
  const stats = {
    processed: 0,
    invited: 0,
    skipped: 0,
    failed: 0,
  }

  try {
    // Fetch all repositories with pagination
    const repositories = await fetchAllRepositories(github, owner)

    if (repositories.length === 0) {
      console.log('No repositories found.')
      return
    }

    console.log('\nProcessing repositories...\n')

    // Process each repository
    for (const repo of repositories) {
      await processRepository(github, repo, username, stats)
    }
  } catch (error) {
    console.error('\n❌ Fatal error during execution:', error.message)
    console.debug('Full error:', error)
    throw error
  } finally {
    // Print summary
    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    console.log(`\n${'='.repeat(60)}`)
    console.log('Execution Summary')
    console.log('='.repeat(60))
    console.log(`Total processed:  ${stats.processed}`)
    console.log(`Invitations sent: ${stats.invited}`)
    console.log(`Already members:  ${stats.skipped}`)
    console.log(`Failed:           ${stats.failed}`)
    console.log(`Duration:         ${duration}s`)
    console.log(`Completed at:     ${new Date().toISOString()}`)
    console.log('='.repeat(60))

    // Exit with error code if there were failures
    if (stats.failed > 0) {
      console.warn(`⚠️  Warning: ${stats.failed} repositories failed to process`)
    }
  }
}
