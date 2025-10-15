import { useEffect, useState, useCallback } from 'react';
import { INVALID_MOVE } from 'boardgame.io/core';
import { Client } from 'boardgame.io/client';
import { db } from '../firebaseConfig';
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
import { games } from '../app/games/registry';
import { useUser } from '../contexts/UserContext';
import { useSound } from '../contexts/SoundContext';
import { snapshotExists } from '../utils/firestore';

export default function useGameSession(sessionId, gameId, opponentId) {
  const { user } = useUser();
  const { play } = useSound();
  const gameEntry = games[gameId];
  const Game = gameEntry?.Game;
  const [session, setSession] = useState(null);
  const [moveHistory, setMoveHistory] = useState([]);

  useEffect(() => {
    if (!Game || !sessionId || !user?.uid) return;
    const ref = doc(db, 'games', sessionId);
    let initializationPromise = null;

    const resolveParticipants = (data) => {
      if (Array.isArray(data?.players) && data.players.length) {
        return data.players;
      }
      if (Array.isArray(data?.users) && data.users.length) {
        return data.users;
      }
      return [user.uid, opponentId].filter(Boolean);
    };

    const ensureInitialized = async (existingData, create) => {
      try {
        const participants = resolveParticipants(existingData);
        const numPlayers = Math.max(participants.length || 0, 1);
        const client = Client({ game: Game, numPlayers });
        client.start();
        const state = client.getState();
        if (typeof client.stop === 'function') {
          client.stop();
        }

        const now = serverTimestamp();
        const payload = {
          state: state?.G ?? {},
          currentPlayer: state?.ctx?.currentPlayer ?? '0',
          players: participants,
          users: participants,
          updatedAt: now,
        };

        if (create || !existingData?.createdAt) {
          payload.createdAt = existingData?.createdAt || now;
        }

        if (create) {
          await setDoc(ref, {
            gameId,
            ...payload,
          });
        } else {
          await updateDoc(ref, payload);
        }
      } catch (err) {
        console.warn('Failed to initialize game session', err);
      }
    };

    const unsub = onSnapshot(ref, async (snap) => {
      if (snapshotExists(snap)) {
        const data = snap.data();

        if (!data?.state || !data?.currentPlayer) {
          if (!initializationPromise) {
            initializationPromise = ensureInitialized(data, false).finally(() => {
              initializationPromise = null;
            });
          }
        }

        const participants = Array.isArray(data?.players)
          ? data.players
          : Array.isArray(data?.users)
          ? data.users
          : [];
        if (participants.includes(user.uid)) {
          setSession(data);
        }
      } else if (!initializationPromise) {
        initializationPromise = ensureInitialized(null, true).finally(() => {
          initializationPromise = null;
        });
      }
    });
    return unsub;
  }, [Game, sessionId, user?.uid, opponentId, gameId]);

  useEffect(() => {
    if (!sessionId || !user?.uid || !session?.players?.includes(user.uid)) {
      setMoveHistory([]);
      return undefined;
    }
    const movesQuery = query(
      collection(db, 'games', sessionId, 'moves'),
      orderBy('at', 'asc')
    );
    const unsub = onSnapshot(movesQuery, (snap) => {
      setMoveHistory(snap.docs.map((docSnap) => ({ id: docSnap.id, ...docSnap.data() })));
    });
    return () => unsub();
  }, [sessionId, user?.uid, session?.players]);

  const sendMove = useCallback(async (moveName, ...args) => {
    if (!session || !Game || !session.state || typeof session.currentPlayer === 'undefined') return;
    if (!Array.isArray(session.players)) return;
    const idx = session.players.indexOf(user.uid);
    if (idx === -1) return;
    if (String(idx) !== session.currentPlayer) return;
    if (session.gameover) return;

    const G = JSON.parse(JSON.stringify(session.state));
    let nextPlayer = session.currentPlayer;
    const ctx = {
      currentPlayer: session.currentPlayer,
      events: {
        endTurn: () => {
          nextPlayer = session.currentPlayer === '0' ? '1' : '0';
        },
      },
    };

    const move = Game.moves[moveName];
    if (!move) return;
    const res = move({ G, ctx }, ...args);
    if (res === INVALID_MOVE) return;

    if (Game.turn?.moveLimit === 1 && nextPlayer === session.currentPlayer) {
      nextPlayer = session.currentPlayer === '0' ? '1' : '0';
    }

    const gameover = Game.endIf ? Game.endIf({ G, ctx: { currentPlayer: nextPlayer } }) : undefined;

    try {
      const sessionRef = doc(db, 'games', sessionId);
      await updateDoc(sessionRef, {
        state: G,
        currentPlayer: nextPlayer,
        gameover: gameover || null,
        updatedAt: serverTimestamp(),
      });
      await addDoc(collection(db, 'games', sessionId, 'moves'), {
        action: moveName,
        player: String(idx),
        at: serverTimestamp(),
      });
      play('game_move');
    } catch (e) {
      console.warn('Failed to update game session', e);
    }
  }, [session, Game, sessionId, user?.uid]);

  const moves = {};
  if (Game) {
    for (const name of Object.keys(Game.moves)) {
      moves[name] = (...args) => sendMove(name, ...args);
    }
  }

  return {
    G: session?.state,
    ctx: { currentPlayer: session?.currentPlayer, gameover: session?.gameover },
    moves,
    moveHistory,
    loading: !session,
  };
}
