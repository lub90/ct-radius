import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import { authenticateUser } from '../src/authenticateUser.js';
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

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(0);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Accept');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
    });

    it('should handle RejectResponse', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new RejectResponse()) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(0);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
    });

    it('should handle ChallengeResponse', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new ChallengeResponse('password')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(0);
      expect(console.log).toHaveBeenCalledWith('Cleartext-Password := password');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'info', msg: 'Retrieved data for user user.' }]);
    });
  });

  describe('error handling', () => {
    it('should handle AuthenticationError from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw new AuthenticationError("auth error");
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'warn', msg: 'Authentication Error: auth error' }]);
    });

    it('should handle Error from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw new Error('internal error');
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: internal error' }]);
    });

    it('should handle AuthenticationError from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue(new AuthenticationError('auth error')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'warn', msg: 'Authentication Error: auth error' }]);
    });

    it('should handle Error from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue(new Error('internal error')) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: internal error' }]);
    });

    it('should handle string thrown from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw 'string error';
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: string error' }]);
    });

    it('should handle object thrown from CtAuthProvider constructor', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      CtAuthProviderMock.mockImplementation(function () {
        throw { custom: 'error' };
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: [object Object]' }]);
    });

    it('should handle string thrown from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue('string error') };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: string error' }]);
    });

    it('should handle object thrown from authorize', async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockRejectedValue({ custom: 'error' }) };
      CtAuthProviderMock.mockImplementation(function () {
        return mockCt as unknown as CtAuthProvider;
      });

      const exitCode = await authenticateUser(mockArgs.config, mockArgs.env, mockArgs.username, mockLogger);

      expect(CtAuthProviderMock).toHaveBeenCalledWith( mockArgs.config, mockArgs.env, mockLogger );
      expect(mockCt.authorize).toHaveBeenCalledWith(mockArgs.username);
      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith('Auth-Type := Reject');
      expect(console.log).toHaveBeenCalledTimes(1);
      expect(mockLogger.logs).toEqual([{ level: 'error', msg: 'Internal Error: [object Object]' }]);
    });

    it("should return 1 and log an internal error when logger is undefined", async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new AcceptResponse()) };
      CtAuthProviderMock.mockImplementation(() => mockCt as any);

      const exitCode = await authenticateUser(
        mockArgs.config,
        mockArgs.env,
        mockArgs.username,
        undefined as any
      );

      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith("Auth-Type := Reject");
      expect(console.log).toHaveBeenCalledTimes(1);

      // console.error should report the missing logger
      expect(console.error).toHaveBeenCalledTimes(1);
    });

    it("should return 1 and log an internal error when logger is null", async () => {
      const CtAuthProviderMock = vi.mocked(CtAuthProvider);
      const mockCt = { authorize: vi.fn().mockResolvedValue(new AcceptResponse()) };
      CtAuthProviderMock.mockImplementation(() => mockCt as any);

      const exitCode = await authenticateUser(
        mockArgs.config,
        mockArgs.env,
        mockArgs.username,
        null as any
      );

      expect(exitCode).toBe(1);
      expect(console.log).toHaveBeenCalledWith("Auth-Type := Reject");
      expect(console.log).toHaveBeenCalledTimes(1);

      // console.error should report the missing logger
      expect(console.error).toHaveBeenCalledTimes(1);
    });

  });
});