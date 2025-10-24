#!/usr/bin/env node
const path = require('path');
const fs = require('fs');

const projectRoot = path.resolve(__dirname, '..');

function setupBabel() {
  let transformSync;
  let expoPreset;
  try {
    ({ transformSync } = require('@babel/core'));
    expoPreset = require('babel-preset-expo');
  } catch (err) {
    console.error('botPlay: Missing Babel dependencies. Run `npm install` before executing this script.');
    process.exit(1);
  }

  const exts = ['.js', '.jsx', '.ts', '.tsx'];
  const originalLoaders = {};

  exts.forEach((ext) => {
    const original = require.extensions[ext] || require.extensions['.js'];
    originalLoaders[ext] = original;
    require.extensions[ext] = function transpile(module, filename) {
      if (!filename.startsWith(projectRoot) || filename.includes(`${path.sep}node_modules${path.sep}`)) {
        return original(module, filename);
      }

      const source = fs.readFileSync(filename, 'utf8');
      const { code } = transformSync(source, {
        presets: [expoPreset],
        filename,
        babelrc: false,
        configFile: false,
        sourceMaps: 'inline',
      });
      module._compile(code, filename);
    };
  });

  return () => {
    exts.forEach((ext) => {
      if (originalLoaders[ext]) {
        require.extensions[ext] = originalLoaders[ext];
      }
    });
  };
}

function getClientState(client) {
  if (typeof client.getState === 'function') {
    return client.getState();
  }
  if (client.store && typeof client.store.getState === 'function') {
    return client.store.getState();
  }
  throw new Error('Unable to access client state');
}

function updatePlayer(client, playerID) {
  if (typeof client.updatePlayerID === 'function') {
    client.updatePlayerID(String(playerID));
  } else {
    client.playerID = String(playerID);
  }
}

function formatResult(gameover) {
  if (!gameover) return 'No result';
  if (gameover.draw) return 'Draw';
  if (typeof gameover.winner !== 'undefined') return `Player ${gameover.winner}`;
  if (typeof gameover === 'object') return JSON.stringify(gameover);
  return String(gameover);
}

function simulateGame(id, entry, getBotMove) {
  const { Client } = require('boardgame.io/client');
  const metaId = entry?.meta?.id || id;
  const label = entry?.meta?.title || metaId || id;

  const client = Client({
    game: entry.Game,
    numPlayers: 2,
    seed: Date.now(),
  });
  client.start();

  const MAX_MOVES = 5000;
  let moves = 0;
  let state = getClientState(client);
  let reason = 'gameover';

  while (!state.ctx.gameover && moves < MAX_MOVES) {
    const currentPlayer = state.ctx.currentPlayer;
    updatePlayer(client, currentPlayer);
    const botMove = getBotMove(metaId, state.G, currentPlayer, entry.Game);
    if (!botMove || typeof botMove.move !== 'string') {
      reason = 'no-move';
      break;
    }
    const moveFn = client.moves[botMove.move];
    if (typeof moveFn !== 'function') {
      reason = 'missing-move';
      break;
    }
    const args = Array.isArray(botMove.args) ? botMove.args : [];
    const result = moveFn(...args);
    if (result === 'INVALID_MOVE') {
      reason = 'invalid-move';
      break;
    }
    moves += 1;
    state = getClientState(client);
  }

  if (!state.ctx.gameover && moves >= MAX_MOVES) {
    reason = 'max-moves';
  }

  client.stop && client.stop();

  return {
    id: metaId,
    label,
    moves,
    gameover: state.ctx.gameover,
    reason,
  };
}

function main() {
  const restoreBabel = setupBabel();
  try {
    const { games } = require('../games/registry');
    const { getBotMove } = require('../ai/botMoves');

    Object.entries(games).forEach(([id, entry]) => {
      if (!entry || !entry.Game) {
        console.warn(`Skipping game '${id}' – missing Game definition.`);
        return;
      }
      try {
        const { label, gameover, moves, reason } = simulateGame(id, entry, getBotMove);
        if (gameover) {
          console.log(`${label}: ${formatResult(gameover)} in ${moves} moves`);
        } else {
          console.log(`${label}: Stopped after ${moves} moves (${reason}).`);
        }
      } catch (err) {
        console.error(`Error running game '${id}':`, err.message);
      }
    });
  } finally {
    restoreBabel();
  }
}

main();
