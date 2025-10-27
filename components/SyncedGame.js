import React from 'react';
import { View } from 'react-native';
import Loader from './Loader';
import useGameSession from '../hooks/useGameSession';
import { games } from '../games/registry';
import PropTypes from 'prop-types';
import GameContainer from './GameContainer';
import { useUser } from '../contexts/UserContext';

export default function SyncedGame({ sessionId, gameId, opponent, onGameEnd }) {
  const { user } = useUser();
  const { Board } = games[gameId] || {};
  const { G, ctx, moves, playerID, loading } = useGameSession(
    sessionId,
    gameId,
    opponent?.id
  );

  if (!Board) return null;
  if (loading || !G) {
    return (
      <View style={{ padding: 20 }}>
        <Loader />
      </View>
    );
  }

  return (
    <GameContainer
      player={{
        name: user?.displayName || 'You',
        xp: user?.xp,
      }}
      opponent={{
        name: opponent?.displayName || 'Opponent',
      }}
    >
      <Board G={G} ctx={ctx} moves={moves} playerID={playerID ?? '0'} onGameEnd={onGameEnd} />
    </GameContainer>
  );
}

SyncedGame.propTypes = {
  sessionId: PropTypes.string.isRequired,
  gameId: PropTypes.string.isRequired,
  opponent: PropTypes.object,
  onGameEnd: PropTypes.func.isRequired,
};
