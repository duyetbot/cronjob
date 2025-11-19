/**
 * Type definitions for GitHub Actions context and Octokit
 */

import type { Octokit as OctokitCore } from '@octokit/core'
import type { Api } from '@octokit/plugin-rest-endpoint-methods/dist-types/types'

/**
 * GitHub Actions Octokit instance with REST API methods
 */
export type Octokit = OctokitCore & Api

/**
 * GitHub Actions context
 */
export interface GitHubContext {
  payload: unknown
  eventName: string
  sha: string
  ref: string
  workflow: string
  action: string
  actor: string
  repo: {
    owner: string
    repo: string
  }
  issue: {
    owner: string
    repo: string
    number: number
  }
  runId: number
  runNumber: number
  apiUrl: string
  serverUrl: string
  graphqlUrl: string
}

/**
 * Parameters passed to GitHub Actions scripts
 */
export interface ScriptParams {
  /**
   * Pre-authenticated Octokit client
   */
  github: Octokit

  /**
   * GitHub Actions context
   */
  context: GitHubContext

  /**
   * Core utilities for logging and setting outputs
   */
  core?: {
    debug: (message: string) => void
    info: (message: string) => void
    warning: (message: string) => void
    error: (message: string) => void
    setOutput: (name: string, value: string) => void
    setFailed: (message: string) => void
  }
}
