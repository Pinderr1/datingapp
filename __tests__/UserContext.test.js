import React, { useEffect } from 'react';
import { createRoot } from 'react-dom/client';
import { act } from 'react-dom/test-utils';
import { UserProvider, useUser } from '../contexts/UserContext';

jest.mock('firebase/auth', () => ({
  onAuthStateChanged: jest.fn(),
}));

jest.mock('firebase/firestore', () => ({
  doc: jest.fn(),
  getDoc: jest.fn(),
}));

jest.mock('../firebaseConfig', () => ({
  auth: {},
  db: {},
}));

const { onAuthStateChanged } = require('firebase/auth');
const { getDoc } = require('firebase/firestore');

const flushPromises = () => new Promise((resolve) => setTimeout(resolve, 0));

describe('UserProvider auth state handling', () => {
  let listener;
  let root;
  let container;

  beforeEach(() => {
    jest.clearAllMocks();
    listener = undefined;

    onAuthStateChanged.mockImplementation((_auth, callback) => {
      listener = callback;
      return jest.fn();
    });

    getDoc.mockResolvedValue({
      exists: () => true,
      data: () => ({ displayName: 'Test User' }),
    });

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

  test('keeps existing profile when auth user UID remains unchanged', async () => {
    const states = [];

    function TestConsumer() {
      const value = useUser();
      useEffect(() => {
        states.push({
          profile: value.profile,
          loading: value.loading,
          firebaseUser: value.firebaseUser,
        });
      }, [value.profile, value.loading, value.firebaseUser]);
      return null;
    }

    await act(async () => {
      root.render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );
      await flushPromises();
    });

    expect(typeof listener).toBe('function');

    await act(async () => {
      listener({ uid: 'user-1' });
      await flushPromises();
    });

    const initialLength = states.length;

    await act(async () => {
      listener({ uid: 'user-1' });
      await flushPromises();
    });

    const newStates = states.slice(initialLength);
    expect(newStates).not.toHaveLength(0);
    newStates.forEach((state) => {
      expect(state.profile?.uid).toBe('user-1');
      expect(state.loading).toBe(false);
    });

    expect(getDoc).toHaveBeenCalledTimes(1);
  });

  test('clears profile on sign out', async () => {
    const states = [];

    function TestConsumer() {
      const value = useUser();
      useEffect(() => {
        states.push({
          profile: value.profile,
          loading: value.loading,
          firebaseUser: value.firebaseUser,
        });
      }, [value.profile, value.loading, value.firebaseUser]);
      return null;
    }

    await act(async () => {
      root.render(
        <UserProvider>
          <TestConsumer />
        </UserProvider>
      );
      await flushPromises();
    });

    await act(async () => {
      listener({ uid: 'user-1' });
      await flushPromises();
    });

    await act(async () => {
      listener(null);
      await flushPromises();
    });

    const lastState = states[states.length - 1];
    expect(lastState.profile).toBeNull();
    expect(lastState.firebaseUser).toBeNull();
  });
});

