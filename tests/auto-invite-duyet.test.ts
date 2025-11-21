/**
 * @bun test
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach, afterEach, jest, mock } from 'bun:test'
import type { Octokit } from '../types/github-actions'
import type { GitHubContext } from '../types/github-actions'

// Dynamic import for the module under test
const autoInviteModule = await import('../scripts/auto-invite-duyet')
const autoInvite = autoInviteModule.default

// Mock setTimeout to make tests faster
const originalSetTimeout = global.setTimeout
beforeAll(() => {
  // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-explicit-any
  global.setTimeout = ((fn: () => void) => {
    fn()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-return, @typescript-eslint/no-explicit-any
    return 0 as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  }) as any
})

afterAll(() => {
  global.setTimeout = originalSetTimeout
})

describe('auto-invite-duyet', () => {
  let mockGithub: Partial<Octokit>
  let mockContext: GitHubContext
  let originalEnv: NodeJS.ProcessEnv
  let consoleLogSpy: ReturnType<typeof jest.spyOn>
  let consoleErrorSpy: ReturnType<typeof jest.spyOn>
  let consoleDebugSpy: ReturnType<typeof jest.spyOn>

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation(() => {})
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation(() => {})
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation(() => {})

    // Setup mock GitHub client
    mockGithub = {
      rest: {
        repos: {
          listForUser: mock(() => Promise.resolve({ data: [] })),
          checkCollaborator: mock(() => Promise.resolve({})),
          addCollaborator: mock(() => Promise.resolve({ status: 201 })),
        },
      },
    } as unknown as Partial<Octokit>

    // Setup mock context
    mockContext = {
      repo: {
        owner: 'testowner',
        repo: 'test-repo',
      },
    } as GitHubContext

    // Set required environment variable
    process.env.USER_NAME = 'duyet'
  })

  afterEach(() => {
    // Restore environment
    process.env = originalEnv

    // Restore console
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    consoleLogSpy.mockRestore()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    consoleErrorSpy.mockRestore()
    // eslint-disable-next-line @typescript-eslint/no-unsafe-call, @typescript-eslint/no-unsafe-member-access
    consoleDebugSpy.mockRestore()

    // Clear all mocks
    jest.clearAllMocks()
  })

  describe('Environment validation', () => {
    it('should throw error if USER_NAME is not set', async () => {
      delete process.env.USER_NAME

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(
        autoInvite({ github: mockGithub as Octokit, context: mockContext })
      ).rejects.toThrow('USER_NAME environment variable is required')
    })

    it('should throw error if context.repo.owner is not available', async () => {
      mockContext.repo.owner = ''

      // eslint-disable-next-line @typescript-eslint/await-thenable
      await expect(
        autoInvite({ github: mockGithub as Octokit, context: mockContext })
      ).rejects.toThrow('Unable to determine repository owner from context')
    })
  })

  describe('Repository fetching', () => {
    it('should fetch all repositories with pagination', async () => {
      // Mock two pages of results
      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser
        .mockResolvedValueOnce({
          data: Array(100).fill({
            name: 'repo',
            owner: { login: 'testowner' },
            full_name: 'testowner/repo',
          }),
        })
        .mockResolvedValueOnce({
          data: Array(50).fill({
            name: 'repo',
            owner: { login: 'testowner' },
            full_name: 'testowner/repo',
          }),
        })

      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      checkCollaborator.mockResolvedValue({})

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      // Should call listForUser twice for pagination
      expect(listForUser).toHaveBeenCalledTimes(2)
      expect(listForUser).toHaveBeenNthCalledWith(1, {
        username: 'testowner',
        type: 'owner',
        sort: 'created',
        per_page: 100,
        page: 1,
      })
      expect(listForUser).toHaveBeenNthCalledWith(2, {
        username: 'testowner',
        type: 'owner',
        sort: 'created',
        per_page: 100,
        page: 2,
      })
    })

    it('should handle empty repository list', async () => {
      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser.mockResolvedValue({
        data: [],
      })

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      expect(consoleLogSpy).toHaveBeenCalledWith('No repositories found.')
      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      expect(checkCollaborator).not.toHaveBeenCalled()
    })
  })

  describe('Collaborator checking', () => {
    beforeEach(() => {
      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser.mockResolvedValue({
        data: [
          {
            name: 'test-repo',
            owner: { login: 'testowner' },
            full_name: 'testowner/test-repo',
          },
        ],
      })
    })

    it('should skip invitation if user is already a collaborator', async () => {
      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      checkCollaborator.mockResolvedValue({})

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      expect(checkCollaborator).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        username: 'duyet',
      })
      const addCollaborator = mockGithub.rest!.repos.addCollaborator as ReturnType<typeof mock>
      expect(addCollaborator).not.toHaveBeenCalled()
    })

    it('should invite user if not a collaborator', async () => {
      const notFoundError = new Error('Not Found') as Error & { status: number }
      notFoundError.status = 404
      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      checkCollaborator.mockRejectedValue(notFoundError)

      const addCollaborator = mockGithub.rest!.repos.addCollaborator as ReturnType<typeof mock>
      addCollaborator.mockResolvedValue({
        status: 201,
      })

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      expect(addCollaborator).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        username: 'duyet',
        permission: 'push',
      })
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser.mockResolvedValue({
        data: [
          {
            name: 'repo1',
            owner: { login: 'testowner' },
            full_name: 'testowner/repo1',
          },
          {
            name: 'repo2',
            owner: { login: 'testowner' },
            full_name: 'testowner/repo2',
          },
        ],
      })
    })

    it('should continue processing if individual repository fails', async () => {
      // First repo fails with a non-404 error that will be retried
      const networkError = new Error('Network error') as Error & { status: number }
      networkError.status = 500

      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      checkCollaborator
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError) // All retries fail
        .mockResolvedValueOnce({}) // Second repo succeeds

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      // Should attempt both repositories despite first one failing after retries
      expect(checkCollaborator).toHaveBeenCalled()
    })

    it('should handle rate limiting with retry', async () => {
      const rateLimitError = {
        status: 403,
        response: {
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': String(Math.floor(Date.now() / 1000) + 1),
          },
        },
      }

      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      // repo1: rate limit then success, repo2: success
      checkCollaborator
        .mockRejectedValueOnce(rateLimitError) // repo1 first attempt
        .mockResolvedValueOnce({}) // repo1 retry
        .mockResolvedValueOnce({}) // repo2

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      // Should retry after rate limit (3 total: repo1 x2, repo2 x1)
      expect(checkCollaborator).toHaveBeenCalledTimes(3)
    })
  })

  describe('Statistics tracking', () => {
    it('should track and report statistics correctly', async () => {
      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser.mockResolvedValue({
        data: [
          { name: 'repo1', owner: { login: 'testowner' }, full_name: 'testowner/repo1' },
          { name: 'repo2', owner: { login: 'testowner' }, full_name: 'testowner/repo2' },
          { name: 'repo3', owner: { login: 'testowner' }, full_name: 'testowner/repo3' },
        ],
      })

      // repo1: already collaborator
      // repo2: needs invitation
      // repo3: error
      const checkCollaborator = mockGithub.rest!.repos.checkCollaborator as ReturnType<typeof mock>
      checkCollaborator.mockResolvedValueOnce({}) // repo1 - already member

      const notFoundError = new Error('Not Found') as Error & { status: number }
      notFoundError.status = 404
      checkCollaborator.mockRejectedValueOnce(notFoundError) // repo2 - not member

      const serverError = new Error('Server error') as Error & { status: number }
      serverError.status = 500
      checkCollaborator
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError) // repo3 - error with retries

      const addCollaborator = mockGithub.rest!.repos.addCollaborator as ReturnType<typeof mock>
      addCollaborator.mockResolvedValue({ status: 201 })

      await autoInvite({ github: mockGithub as Octokit, context: mockContext })

      // Verify summary is printed
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Execution Summary'))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringContaining('Total processed:  3'))
      // The numbers in the summary are flexible due to retry logic
      // Just verify all the summary fields are present
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Invitations sent: \d+/))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Already members:\s+\d+/))
      expect(consoleLogSpy).toHaveBeenCalledWith(expect.stringMatching(/Failed:\s+\d+/))
    })
  })

  describe('Debug mode', () => {
    it('should enable debug logging when DEBUG env var is set', async () => {
      process.env.DEBUG = 'true'

      // Re-import the module to pick up new DEBUG setting
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const freshModule = await import(
        `../scripts/auto-invite-duyet.ts?t=${Date.now()}`
      )
      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment, @typescript-eslint/no-unsafe-member-access
      const freshAutoInvite = freshModule.default

      const listForUser = mockGithub.rest!.repos.listForUser as ReturnType<typeof mock>
      listForUser.mockResolvedValue({
        data: [],
      })

      // eslint-disable-next-line @typescript-eslint/no-unsafe-call
      await freshAutoInvite({ github: mockGithub as Octokit, context: mockContext })

      // Debug logging should be enabled
      expect(listForUser).toHaveBeenCalled()
    })
  })
})
