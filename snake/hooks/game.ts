import type { Cell, Dir, Game, Status } from '../types'

export const COLS = 20
export const ROWS = 14

const STEP: Record<Dir, Cell> = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
}
const OPPOSITE: Record<Dir, Dir> = { up: 'down', down: 'up', left: 'right', right: 'left' }

const same = (a: Cell, b: Cell) => a.x === b.x && a.y === b.y

/** 씨앗에서 다음 씨앗으로 (선형 합동) */
const roll = (seed: number) => (Math.imul(seed, 1664525) + 1013904223) >>> 0

/** 뱀이 없는 칸 가운데 하나에 먹이를 놓는다 */
const placeFood = (snake: Cell[], seed: number): { food: Cell; seed: number } => {
  const free: Cell[] = []
  for (let y = 0; y < ROWS; y++) {
    for (let x = 0; x < COLS; x++) {
      if (!snake.some(part => part.x === x && part.y === y)) free.push({ x, y })
    }
  }
  const next = roll(seed)
  const food = free[next % Math.max(1, free.length)] ?? { x: 0, y: 0 }

  return { food, seed: next }
}

export const newGame = (best = 0, seed = 20261001): Game => {
  const y = Math.floor(ROWS / 2)
  const snake: Cell[] = [
    { x: 6, y },
    { x: 5, y },
    { x: 4, y },
  ]
  const placed = placeFood(snake, seed)

  return { snake, dir: 'right', turn: 'right', food: placed.food, score: 0, best, status: 'idle', seed: placed.seed }
}

/** 상태만 바꾼 판 */
export const withStatus = (game: Game, status: Status): Game => ({ ...game, status })

/** 방향을 바꾼다. 지금 가는 방향의 반대로는 못 꺾는다 */
export const steer = (game: Game, dir: Dir): Game => (game.status !== 'running' || OPPOSITE[game.dir] === dir ? game : { ...game, turn: dir })

/** 한 칸 전진: 벽이나 제 몸에 닿으면 끝, 먹이를 먹으면 한 칸 자란다 */
export const advance = (game: Game): Game => {
  if (game.status !== 'running') return game
  const dir = game.turn
  const head = game.snake[0]
  if (!head) return { ...game, status: 'over' }
  const next = { x: head.x + STEP[dir].x, y: head.y + STEP[dir].y }
  const ate = same(next, game.food)
  // 먹지 않으면 꼬리가 빠지므로 꼬리 자리로는 들어갈 수 있다
  const body = ate ? game.snake : game.snake.slice(0, -1)
  const isOut = next.x < 0 || next.y < 0 || next.x >= COLS || next.y >= ROWS
  if (isOut || body.some(part => same(part, next))) {
    return { ...game, dir, status: 'over', best: Math.max(game.best, game.score) }
  }
  const snake = [next, ...body]
  if (!ate) return { ...game, dir, snake }
  const score = game.score + 1
  const placed = placeFood(snake, game.seed)

  return { ...game, dir, snake, score, best: Math.max(game.best, score), food: placed.food, seed: placed.seed }
}
