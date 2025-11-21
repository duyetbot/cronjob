/**
 * Wrapper script to run auto-invite-duyet in GitHub Actions with Bun
 *
 * This script initializes Octokit and creates a GitHub Actions-compatible context
 * to run the auto-invite script outside of the github-script action.
 */

import { Octokit } from '@octokit/rest'
import autoInvite from './auto-invite-duyet'

// Type for the github parameter expected by autoInvite
type AutoInviteGithub = Parameters<typeof autoInvite>[0]['github']

// Get GitHub token from environment
const token = process.env.GITHUB_TOKEN
if (!token) {
  console.error('❌ GITHUB_TOKEN environment variable is required')
  process.exit(1)
}

// Initialize Octokit
const github = new Octokit({
  auth: token,
})

// Create a mock context that matches GitHub Actions context
const context = {
  repo: {
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || 'duyetbot',
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'cronjob',
  },
  payload: {},
  eventName: process.env.GITHUB_EVENT_NAME || 'workflow_dispatch',
  sha: process.env.GITHUB_SHA || '',
  ref: process.env.GITHUB_REF || '',
  workflow: process.env.GITHUB_WORKFLOW || '',
  action: process.env.GITHUB_ACTION || '',
  actor: process.env.GITHUB_ACTOR || '',
  issue: {
    owner: process.env.GITHUB_REPOSITORY?.split('/')[0] || 'duyetbot',
    repo: process.env.GITHUB_REPOSITORY?.split('/')[1] || 'cronjob',
    number: 0,
  },
  runId: parseInt(process.env.GITHUB_RUN_ID || '0', 10),
  runNumber: parseInt(process.env.GITHUB_RUN_NUMBER || '0', 10),
  apiUrl: process.env.GITHUB_API_URL || 'https://api.github.com',
  serverUrl: process.env.GITHUB_SERVER_URL || 'https://github.com',
  graphqlUrl: process.env.GITHUB_GRAPHQL_URL || 'https://api.github.com/graphql',
}

// Run the auto-invite script
try {
  console.log('Starting auto-invite script...')
  await autoInvite({ github: github as unknown as AutoInviteGithub, context })
  console.log('✅ Auto-invite script completed successfully')
  process.exit(0)
} catch (error) {
  console.error('❌ Auto-invite script failed:', error)
  process.exit(1)
}
