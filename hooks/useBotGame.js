import { useMemo, useEffect, useState, useRef } from 'react'
import { Client } from 'boardgame.io/client'
import { useSound } from '../contexts/SoundContext'

export default function useBotGame(game, getBotMove, onGameEnd) {
  const getBotMoveRef = useRef(getBotMove)
  const onGameEndRef = useRef(onGameEnd)
  const { play } = useSound()
  const MAX_MOVES = 100 // safety draw limit

  useEffect(() => {
    getBotMoveRef.current = getBotMove
  }, [getBotMove])

  useEffect(() => {
    onGameEndRef.current = onGameEnd
  }, [onGameEnd])

  const client = useMemo(
    () =>
      Client({
        game,
        numPlayers: 2,
      }),
    [game]
  )

  const [state, setState] = useState(client.getState())
  const moveCountRef = useRef(0)

  useEffect(() => {
    client.start()
    const unsub = client.subscribe((s) => {
      setState(s)
      moveCountRef.current += 1

      // draw safety
      if (moveCountRef.current >= MAX_MOVES && !s.ctx.gameover) {
        const drawResult = { draw: true, reason: 'MAX_MOVES' }
        client.stop()
        if (onGameEndRef.current) onGameEndRef.current(drawResult)
        return
      }

      if (s.ctx.gameover && onGameEndRef.current) {
        onGameEndRef.current(s.ctx.gameover)
      }
    })
    return () => {
      unsub()
      client.stop()
    }
  }, [client])

  const maybePlayBotMove = async (latestState) => {
    const s = latestState ?? client.getState()
    const { currentPlayer, gameover } = s.ctx
    if (gameover) return

    if (String(currentPlayer) === '1') {
      const move = getBotMoveRef.current(s.G, s.ctx, game)
      const moveName = move?.name ?? move?.move
      if (moveName && client.moves[moveName]) {
        await new Promise((r) => setTimeout(r, 300 + Math.random() * 400))
        client.updatePlayerID('1')
        client.moves[moveName](...(move?.args || []))
        play('game_move')
      }
    }
  }

  const moves = useMemo(() => {
    const obj = {}
    for (const name of Object.keys(client.moves)) {
      obj[name] = async (...args) => {
        client.updatePlayerID('0')
        client.moves[name](...args)
        play('game_move')
        await maybePlayBotMove()
      }
    }
    return obj
  }, [client, play])

  return {
    G: state.G,
    ctx: state.ctx,
    moves,
    reset: () => {
      client.reset()
      moveCountRef.current = 0
      setState(client.getState())
    },
  }
}
