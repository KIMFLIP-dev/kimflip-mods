import { expect, test } from 'claude-code/testing'

import { advance, COLS, newGame, steer } from '../hooks/game'
import type { Game } from '../types'

test('뱀은 틱마다 한 칸 나아가고, 멈춘 판은 움직이지 않는다', async () => {
  const idle = newGame()
  expect(advance(idle)).toBe(idle)
  const running: Game = { ...idle, status: 'running' }
  const moved = advance(running)
  expect(moved.snake[0]).toEqual({ x: 7, y: 7 })
  expect(moved.snake.length).toBe(3)
})

test('반대 방향으로는 못 꺾고, 먹이를 먹으면 자란다', async () => {
  const running: Game = { ...newGame(), status: 'running' }
  expect(steer(running, 'left').turn).toBe('right')
  expect(steer(running, 'up').turn).toBe('up')
  const fed = advance({ ...running, food: { x: 7, y: 7 } })
  expect(fed.score).toBe(1)
  expect(fed.snake.length).toBe(4)
})

test('벽에 닿으면 끝나고 최고 점수가 남는다', async () => {
  let g: Game = { ...newGame(), status: 'running', score: 3, food: { x: 0, y: 0 } }
  for (let i = 0; i < COLS; i++) g = advance(g)
  expect(g.status).toBe('over')
  expect(g.best).toBe(3)
})
