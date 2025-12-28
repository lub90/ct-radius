import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authenticateUser } from '../src/index.js';
import { CtAuthProvider } from '../src/core/CtAuthProvider.js';
import { AcceptResponse, RejectResponse, ChallengeResponse } from '../src/types/RadiusResponse.js';
import { AuthenticationError } from '../src/errors/AuthenticationError.js';
import { MockLogger } from './helpers/MockLogger.js';
import { ConsoleChecker } from './helpers/ConsoleChecker.js';

vi.mock('../src/core/CtAuthProvider.js');

describe('authenticateUser', () => {
  let consoleChecker: ConsoleChecker;
  let mockLogger: MockLogger;
  let mockArgs: any;

  beforeEach(() => {
    consoleChecker = new ConsoleChecker();
    consoleChecker.setup();

    mockLogger = new MockLogger();

    mockArgs = {
      config: 'config.json',
      env: 'env',
      username: 'user',
    };

    process.exit = vi.fn() as any;
  });

  afterEach(() => {
    consoleChecker.teardown();
    mockLogger.clear();
    vi.restoreAllMocks();
  });

  describe('successful authorization', () => {
    it('should handle AcceptResponse', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new AcceptResponse()) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Accept');
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle RejectResponse', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new RejectResponse()) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
      expect(process.exit).toHaveBeenCalledWith(0);
    });

    it('should handle ChallengeResponse', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new ChallengeResponse('password')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Cleartext-Password := password');
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
      expect(process.exit).toHaveBeenCalledWith(0);
    });
  });

  describe('error handling', () => {
    it('should handle AuthenticationError from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw new AuthenticationError("auth error");
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(mockLogger.logs).toEqual([{ level: 'warn', msg: 'Authentication Error: auth error' }]);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle Error from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw new Error('internal error');
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: internal error' }]);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle AuthenticationError from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue(new AuthenticationError('auth error')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(mockLogger.logs).toEqual([{ level: 'warn', msg: 'Authentication Error: auth error' }]);
      expect(process.exit).toHaveBeenCalledWith(1);
    });

    it('should handle Error from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue(new Error('internal error')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      await authenticateUser(mockArgs, mockLogger);

      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: internal error' }]);
      expect(process.exit).toHaveBeenCalledWith(1);
    });
  });
});