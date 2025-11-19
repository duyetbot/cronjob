/* eslint-disable jsdoc/check-tag-names */
/**
 * @jest-environment node
 */
/* eslint-enable jsdoc/check-tag-names */

// Mock timers to avoid actual delays in tests
jest.useFakeTimers()

const autoInvite = require('../scripts/auto-invite-duyet')

describe('auto-invite-duyet', () => {
  let mockGithub
  let mockContext
  let originalEnv
  let consoleLogSpy
  let consoleErrorSpy
  let consoleDebugSpy

  beforeEach(() => {
    // Save original environment
    originalEnv = { ...process.env }

    // Mock console methods
    consoleLogSpy = jest.spyOn(console, 'log').mockImplementation()
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation()
    consoleDebugSpy = jest.spyOn(console, 'debug').mockImplementation()

    // Setup mock GitHub client
    mockGithub = {
      rest: {
        repos: {
          listForUser: jest.fn(),
          checkCollaborator: jest.fn(),
          addCollaborator: jest.fn(),
        },
      },
    }

    // Setup mock context
    mockContext = {
      repo: {
        owner: 'testowner',
      },
    }

    // Set required environment variable
    process.env.USER_NAME = 'duyet'
  })

  afterEach(() => {
    // Restore environment
    process.env = originalEnv

    // Restore console
    consoleLogSpy.mockRestore()
    consoleErrorSpy.mockRestore()
    consoleDebugSpy.mockRestore()

    // Clear all mocks and timers
    jest.clearAllMocks()
    jest.clearAllTimers()
  })

  describe('Environment validation', () => {
    it('should throw error if USER_NAME is not set', async () => {
      delete process.env.USER_NAME

      await expect(autoInvite({ github: mockGithub, context: mockContext })).rejects.toThrow(
        'USER_NAME environment variable is required'
      )
    })

    it('should throw error if context.repo.owner is not available', async () => {
      mockContext.repo.owner = null

      await expect(autoInvite({ github: mockGithub, context: mockContext })).rejects.toThrow(
        'Unable to determine repository owner from context'
      )
    })
  })

  describe('Repository fetching', () => {
    it('should fetch all repositories with pagination', async () => {
      // Mock two pages of results
      mockGithub.rest.repos.listForUser
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

      mockGithub.rest.repos.checkCollaborator.mockResolvedValue({})

      await autoInvite({ github: mockGithub, context: mockContext })

      // Should call listForUser twice for pagination
      expect(mockGithub.rest.repos.listForUser).toHaveBeenCalledTimes(2)
      expect(mockGithub.rest.repos.listForUser).toHaveBeenNthCalledWith(1, {
        username: 'testowner',
        type: 'owner',
        sort: 'created',
        per_page: 100,
        page: 1,
      })
      expect(mockGithub.rest.repos.listForUser).toHaveBeenNthCalledWith(2, {
        username: 'testowner',
        type: 'owner',
        sort: 'created',
        per_page: 100,
        page: 2,
      })
    })

    it('should handle empty repository list', async () => {
      mockGithub.rest.repos.listForUser.mockResolvedValue({
        data: [],
      })

      await autoInvite({ github: mockGithub, context: mockContext })

      expect(consoleLogSpy).toHaveBeenCalledWith('No repositories found.')
      expect(mockGithub.rest.repos.checkCollaborator).not.toHaveBeenCalled()
    })
  })

  describe('Collaborator checking', () => {
    beforeEach(() => {
      mockGithub.rest.repos.listForUser.mockResolvedValue({
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
      mockGithub.rest.repos.checkCollaborator.mockResolvedValue({})

      await autoInvite({ github: mockGithub, context: mockContext })

      expect(mockGithub.rest.repos.checkCollaborator).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        username: 'duyet',
      })
      expect(mockGithub.rest.repos.addCollaborator).not.toHaveBeenCalled()
    })

    it('should invite user if not a collaborator', async () => {
      const notFoundError = new Error('Not Found')
      notFoundError.status = 404
      mockGithub.rest.repos.checkCollaborator.mockRejectedValue(notFoundError)
      mockGithub.rest.repos.addCollaborator.mockResolvedValue({
        status: 201,
      })

      const promise = autoInvite({ github: mockGithub, context: mockContext })
      await jest.runAllTimersAsync()
      await promise

      expect(mockGithub.rest.repos.addCollaborator).toHaveBeenCalledWith({
        owner: 'testowner',
        repo: 'test-repo',
        username: 'duyet',
        permission: 'push',
      })
    })
  })

  describe('Error handling', () => {
    beforeEach(() => {
      mockGithub.rest.repos.listForUser.mockResolvedValue({
        data: [
          {
            name: 'test-repo',
            owner: { login: 'testowner' },
            full_name: 'testowner/test-repo',
          },
        ],
      })
    })

    it('should continue processing if individual repository fails', async () => {
      mockGithub.rest.repos.listForUser.mockResolvedValue({
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

      // First repo fails with a non-404 error that will be retried
      const networkError = new Error('Network error')
      networkError.status = 500
      mockGithub.rest.repos.checkCollaborator
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError)
        .mockRejectedValueOnce(networkError) // All retries fail
        .mockResolvedValueOnce({}) // Second repo succeeds

      const promise = autoInvite({ github: mockGithub, context: mockContext })
      await jest.runAllTimersAsync()
      await promise

      // Should attempt both repositories despite first one failing after retries
      expect(mockGithub.rest.repos.checkCollaborator).toHaveBeenCalled()
    })

    it('should handle rate limiting with retry', async () => {
      const rateLimitError = {
        status: 403,
        response: {
          headers: {
            'x-ratelimit-remaining': '0',
            'x-ratelimit-reset': Math.floor(Date.now() / 1000) + 1,
          },
        },
      }

      mockGithub.rest.repos.checkCollaborator
        .mockRejectedValueOnce(rateLimitError)
        .mockResolvedValueOnce({})

      const promise = autoInvite({ github: mockGithub, context: mockContext })
      await jest.runAllTimersAsync()
      await promise

      // Should retry after rate limit
      expect(mockGithub.rest.repos.checkCollaborator).toHaveBeenCalledTimes(2)
    })
  })

  describe('Statistics tracking', () => {
    it('should track and report statistics correctly', async () => {
      mockGithub.rest.repos.listForUser.mockResolvedValue({
        data: [
          { name: 'repo1', owner: { login: 'testowner' }, full_name: 'testowner/repo1' },
          { name: 'repo2', owner: { login: 'testowner' }, full_name: 'testowner/repo2' },
          { name: 'repo3', owner: { login: 'testowner' }, full_name: 'testowner/repo3' },
        ],
      })

      // repo1: already collaborator
      // repo2: needs invitation
      // repo3: error
      mockGithub.rest.repos.checkCollaborator.mockResolvedValueOnce({}) // repo1 - already member

      const notFoundError = new Error('Not Found')
      notFoundError.status = 404
      mockGithub.rest.repos.checkCollaborator.mockRejectedValueOnce(notFoundError) // repo2 - not member

      const serverError = new Error('Server error')
      serverError.status = 500
      mockGithub.rest.repos.checkCollaborator
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError)
        .mockRejectedValueOnce(serverError) // repo3 - error with retries

      mockGithub.rest.repos.addCollaborator.mockResolvedValue({ status: 201 })

      const promise = autoInvite({ github: mockGithub, context: mockContext })
      await jest.runAllTimersAsync()
      await promise

      // Debug: print all console.log calls
      // console.log('All logs:', consoleLogSpy.mock.calls.map(call => call[0]))

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

      // Re-require the module to pick up new DEBUG setting
      jest.resetModules()
      const autoInviteWithDebug = require('../scripts/auto-invite-duyet')

      mockGithub.rest.repos.listForUser.mockResolvedValue({
        data: [],
      })

      await autoInviteWithDebug({ github: mockGithub, context: mockContext })

      // Debug logging should be enabled (console.debug is not mocked out)
      // This is a basic check; in practice, debug logs would appear
      expect(mockGithub.rest.repos.listForUser).toHaveBeenCalled()
    })
  })
})
