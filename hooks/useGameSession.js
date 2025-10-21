import { useEffect, useState, useCallback } from 'react';
import { INVALID_MOVE } from 'boardgame.io/core';
import { Client } from 'boardgame.io/client';
import { db, auth } from '../firebaseConfig';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import { games } from '../games/registry';
import { useUser } from '../contexts/UserContext';
import { useSound } from '../contexts/SoundContext';
import { snapshotExists } from '../utils/firestore';

export default function useGameSession(sessionId, gameId, opponentId) {
  const { user } = useUser();
  const { play } = useSound();
  const [session, setSession] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);
  const [permissionError, setPermissionError] = useState(false);

  const gameEntry = games[gameId];
  const Game = gameEntry?.Game;

  const serializeState = useCallback((state) => {
    if (!state) return null;
    const snapshot = {
      G: state.G ?? {},
      ctx: state.ctx ?? {},
      plugins: state.plugins ?? {},
    };
    if (typeof state._stateID === 'number') snapshot._stateID = state._stateID;
    return JSON.parse(JSON.stringify(snapshot));
  }, []);

  const hydrateClient = useCallback((client, storedState, fallbackCurrentPlayer) => {
    let baseState = client.getState();
    let stateToLoad = baseState;

    if (storedState?.G || storedState?.ctx || storedState?.plugins) {
      stateToLoad = {
        ...baseState,
        ...storedState,
        G: storedState.G ?? baseState.G,
        ctx: { ...baseState.ctx, ...(storedState.ctx ?? {}) },
        plugins: { ...baseState.plugins, ...(storedState.plugins ?? {}) },
      };
      if (typeof storedState._stateID === 'number') stateToLoad._stateID = storedState._stateID;
    } else if (storedState) {
      stateToLoad = { ...baseState, G: storedState };
    }

    stateToLoad = {
      ...stateToLoad,
      ctx: {
        ...stateToLoad.ctx,
        currentPlayer:
          fallbackCurrentPlayer ??
          storedState?.ctx?.currentPlayer ??
          baseState?.ctx?.currentPlayer ??
          '0',
      },
    };

    client.updateState(JSON.parse(JSON.stringify(stateToLoad)));
    return client.getState();
  }, []);

  // --- SESSION SNAPSHOT LISTENER ---
  useEffect(() => {
    if (!Game || !sessionId) return;
    let unsubscribe;
    let mounted = true;

    const startListener = async () => {
      const currentUser = auth.currentUser || user;
      if (!currentUser?.uid) return;

      const ref = doc(db, 'games', sessionId);
      let initializationPromise = null;

      const ensureInitialized = async (existingData, create) => {
        try {
          const participants = Array.isArray(existingData?.players)
            ? existingData.players
            : Array.isArray(existingData?.users)
            ? existingData.users
            : [currentUser.uid, opponentId].filter(Boolean);

          const numPlayers = Math.max(participants.length || 0, 1);
          const client = Client({ game: Game, numPlayers });
          client.start();
          const state = client.getState();
          if (typeof client.stop === 'function') client.stop();

          const now = serverTimestamp();
          const payload = {
            state: serializeState(state) ?? { G: {}, ctx: {}, plugins: {} },
            currentPlayer: state?.ctx?.currentPlayer ?? '0',
            players: participants,
            users: participants,
            updatedAt: now,
          };

          if (create || !existingData?.createdAt) payload.createdAt = existingData?.createdAt || now;

          if (create) {
            await setDoc(ref, { gameId, ...payload });
          } else {
            await updateDoc(ref, payload);
          }
        } catch (err) {
          console.warn('Failed to initialize game session', err);
        }
      };

      unsubscribe = onSnapshot(
        ref,
        async (snap) => {
          if (!mounted) return;
          if (snapshotExists(snap)) {
            const data = snap.data();

            // Permission guard
            const participants = Array.isArray(data?.players)
              ? data.players
              : Array.isArray(data?.users)
              ? data.users
              : [];
            if (!participants.includes(currentUser.uid)) {
              console.warn('User is not participant in this game session');
              setPermissionError(true);
              setSession(null);
              return;
            }

            // Session exists but uninitialized
            if (!data?.state || !data?.currentPlayer) {
              if (!initializationPromise) {
                initializationPromise = ensureInitialized(data, false).finally(() => {
                  initializationPromise = null;
                });
              }
            }

            setSession(data);
            setPermissionError(false);
          } else if (!initializationPromise) {
            initializationPromise = ensureInitialized(null, true).finally(() => {
              initializationPromise = null;
            });
          }
        },
        (err) => {
          if (err.code === 'permission-denied') {
            console.warn('Permission denied for game session', sessionId);
            setPermissionError(true);
            setSession(null);
            return;
          }
          console.error('Game session listener failed:', err);
        }
      );
    };

    startListener();

    return () => {
      mounted = false;
      if (unsubscribe) unsubscribe();
    };
  }, [Game, sessionId, gameId, opponentId, user?.uid, serializeState]);

  // --- MOVE HISTORY LISTENER ---
  useEffect(() => {
    if (!sessionId || !user?.uid || !session?.players?.includes(user.uid) || permissionError) {
      setMoveHistory([]);
      return;
    }

    const movesQuery = query(collection(db, 'games', sessionId, 'moves'), orderBy('at', 'asc'));
    const unsub = onSnapshot(
      movesQuery,
      (snap) => {
        setMoveHistory(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
      },
      (err) => {
        if (err.code === 'permission-denied') {
          console.warn('Permission denied for game moves', sessionId);
          setMoveHistory([]);
        } else {
          console.error('Failed to load move history:', err);
        }
      }
    );

    return () => unsub();
  }, [sessionId, session?.players, user?.uid, permissionError]);

  // --- SEND MOVE ---
  const sendMove = useCallback(
    async (moveName, ...args) => {
      const storedCurrentPlayer = session?.currentPlayer ?? session?.state?.ctx?.currentPlayer;
      if (!session || !Game || !session.state || !user?.uid) return;
      if (!Array.isArray(session.players)) return;
      const idx = session.players.indexOf(user.uid);
      if (idx === -1) return;
      if (String(idx) !== String(storedCurrentPlayer)) return;
      if (session.gameover ?? session.state?.ctx?.gameover) return;

      const move = Game.moves[moveName];
      if (!move) return;

      const numPlayers = Math.max(session.players.length || 0, 1);
      const playerID = String(idx);

      const client = Client({ game: Game, numPlayers });
      client.start();
      client.updatePlayerID?.(playerID);

      const hydratedState = hydrateClient(client, session.state, storedCurrentPlayer);
      const clientMove = client.moves?.[moveName];
      if (typeof clientMove !== 'function') {
        client.stop?.();
        return;
      }

      const res = clientMove(...args);
      if (res === INVALID_MOVE) {
        client.stop?.();
        return;
      }

      const storeState = client.store?.getState?.();
      const masterState = storeState?._state ?? null;
      const nextState = client.getState();
      client.stop?.();

      const nextPlayer = nextState?.ctx?.currentPlayer ?? storedCurrentPlayer;
      const gameover = nextState?.ctx?.gameover ?? null;
      const persistedState = masterState ?? nextState;

      try {
        const sessionRef = doc(db, 'games', sessionId);
        await updateDoc(sessionRef, {
          state: serializeState(persistedState),
          currentPlayer: nextPlayer,
          gameover,
          updatedAt: serverTimestamp(),
        });
        await addDoc(collection(db, 'games', sessionId, 'moves'), {
          action: moveName,
          player: String(idx),
          at: serverTimestamp(),
        });
        play('game_move');
      } catch (err) {
        if (err.code === 'permission-denied') {
          console.warn('Permission denied updating game session', sessionId);
        } else {
          console.error('Failed to update game session:', err);
        }
      }
    },
    [session, Game, sessionId, user?.uid, hydrateClient, serializeState, play]
  );

  const moves = {};
  if (Game) {
    for (const name of Object.keys(Game.moves)) {
      moves[name] = (...args) => sendMove(name, ...args);
    }
  }

  const storedCtx = session?.state?.ctx;
  const derivedCtx = storedCtx
    ? {
        ...storedCtx,
        currentPlayer: storedCtx.currentPlayer ?? session?.currentPlayer,
        gameover: storedCtx.gameover ?? session?.gameover ?? null,
      }
    : {
        currentPlayer: session?.currentPlayer,
        gameover: session?.gameover ?? null,
      };

  return {
    G: session?.state?.G ?? session?.state ?? {},
    ctx: derivedCtx,
    moves,
    moveHistory,
    loading: !session && !permissionError,
    permissionDenied: permissionError,
  };
}
