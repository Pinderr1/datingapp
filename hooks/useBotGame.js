import { useMemo, useEffect, useState, useRef } from 'react';
import { Client } from 'boardgame.io/client';
import { useSound } from '../contexts/SoundContext';

export default function useBotGame(game, getBotMove, onGameEnd) {
  const getBotMoveRef = useRef(getBotMove);
  const onGameEndRef = useRef(onGameEnd);
  const { play } = useSound();

  useEffect(() => {
    getBotMoveRef.current = getBotMove;
  }, [getBotMove]);

  useEffect(() => {
    onGameEndRef.current = onGameEnd;
  }, [onGameEnd]);

  const client = useMemo(() => {
    return Client({
      game,
      numPlayers: 2,
    });
  }, [game]);

  const [state, setState] = useState(client.getState());

  // subscribe to game state changes
  useEffect(() => {
    client.start();
    const unsub = client.subscribe((s) => {
      setState(s);

      // when game over, call callback
      if (s.ctx.gameover && onGameEndRef.current) {
        onGameEndRef.current(s.ctx.gameover);
      }
    });
    return () => {
      unsub();
      client.stop();
    };
  }, [client]);

  // helper: run AI move when it's AI's turn
  const maybePlayBotMove = async (latestState) => {
    const s = latestState ?? client.getState();
    const { currentPlayer, gameover } = s.ctx;
    if (gameover) return;

    // bot is player "1"
    if (String(currentPlayer) === '1') {
      const move = getBotMoveRef.current(s.G, s.ctx, game);
      if (move && client.moves[move.name]) {
        // small delay to make AI feel human
        await new Promise((r) => setTimeout(r, 400));
        client.updatePlayerID('1');
        client.moves[move.name](...(move.args || []));
        play('game_move');
      }
    }
  };

  const moves = useMemo(() => {
    const obj = {};
    for (const name of Object.keys(client.moves)) {
      obj[name] = async (...args) => {
        client.updatePlayerID('0'); // human is player 0
        client.moves[name](...args);
        play('game_move');
        // after player moves, let AI play
        await maybePlayBotMove();
      };
    }
    return obj;
  }, [client, play]);

  return {
    G: state.G,
    ctx: state.ctx,
    moves,
    reset: () => {
      client.reset();
      setState(client.getState());
    },
  };
}
