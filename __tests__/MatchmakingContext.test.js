import React, { useEffect } from 'react';
import { act } from 'react-dom/test-utils';
import { createRoot } from 'react-dom/client';
import { MatchmakingProvider, useMatchmaking } from '../contexts/MatchmakingContext';

jest.mock('../contexts/UserContext', () => ({
  useUser: jest.fn(),
}));

const { useUser } = require('../contexts/UserContext');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('MatchmakingProvider authentication', () => {
  let root;
  let container;
  let setDocMock;

  beforeEach(() => {
    ({ setDoc: setDocMock } = global.__firestoreMocks);
    jest.clearAllMocks();
    setDocMock.mockClear();

    container = document.createElement('div');
    document.body.appendChild(container);
    root = createRoot(container);
  });

  afterEach(() => {
    if (root) {
      act(() => {
        root.unmount();
      });
    }
    if (container?.parentNode) {
      container.parentNode.removeChild(container);
    }
  });

  test('cancelInvite rejects when user is unauthenticated', async () => {
    useUser.mockReturnValue({ user: null });

    const onResult = jest.fn();

    function TestComponent({ inviteId, onResult: handleResult }) {
      const { cancelInvite } = useMatchmaking();

      useEffect(() => {
        cancelInvite(inviteId).then(
          (value) => handleResult({ value }),
          (error) => handleResult({ error })
        );
      }, [cancelInvite, inviteId, handleResult]);

      return null;
    }

    await act(async () => {
      root.render(
        <MatchmakingProvider>
          <TestComponent inviteId="invite-1" onResult={onResult} />
        </MatchmakingProvider>
      );
      await flushPromises();
    });

    await act(async () => {
      await flushPromises();
    });

    expect(onResult).toHaveBeenCalledTimes(1);
    const [{ error }] = onResult.mock.calls[0];
    expect(error).toBeInstanceOf(Error);
    expect(error.message).toContain('authenticated');
    expect(setDocMock).not.toHaveBeenCalled();
  });
});

