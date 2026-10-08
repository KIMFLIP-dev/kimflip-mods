export type Cell = { x: number; y: number }
export type Dir = 'up' | 'down' | 'left' | 'right'
export type Status = 'idle' | 'running' | 'paused' | 'over'

export type Game = {
  snake: Cell[]
  dir: Dir
  /** 다음 틱에 적용할 방향 (한 틱에 두 번 꺾어 제 몸으로 돌아가는 것을 막는다) */
  turn: Dir
  food: Cell
  score: number
  best: number
  status: Status
  /** 먹이 자리를 정하는 난수 씨앗 */
  seed: number
}

declare module 'claude-code' {
  interface PluginState {
    snake: { game: Game }
  }
}
