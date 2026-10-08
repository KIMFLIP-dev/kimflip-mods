import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, Timer } from 'claude-code'

import type { Dir, Game } from '../types'
import { advance, COLS, newGame, ROWS, steer, withStatus } from './game'

const PANE = 'snake'
const TICK_MS = 140
const game = atom({ plugin: 'snake', key: 'game' } as const, newGame())

// 색 (0x00RRGGBB). 0x01000000 = 터미널 기본색
const DEFAULT = 0x01000000
const BOARD = 0x00262626
const BODY = 0x005fd75f
const HEAD = 0x00afffaf
const FOOD = 0x00ff5f5f
const BLOCK = 0x2588
const DOT = 0x25cf
const SPACE = 0x20

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
const base64 = (bytes: Uint8Array): string => {
  let out = ''
  for (let i = 0; i < bytes.length; i += 3) {
    const a = bytes[i] ?? 0
    const b = bytes[i + 1] ?? 0
    const c = bytes[i + 2] ?? 0
    out += B64[a >> 2]
    out += B64[((a & 3) << 4) | (b >> 4)]
    out += i + 1 < bytes.length ? B64[((b & 15) << 2) | (c >> 6)] : '='
    out += i + 2 < bytes.length ? B64[c & 63] : '='
  }

  return out
}

/** 판을 Raster 칸으로: 한 칸을 가로 cellW 글자로 그린다 (2면 정사각형에 가깝다) */
const cellsOf = (g: Game, cellW: number): string => {
  const words = new Uint32Array(COLS * cellW * ROWS * 3)
  const put = (x: number, y: number, glyph: number, fg: number) => {
    for (let k = 0; k < cellW; k++) {
      const at = (y * COLS * cellW + x * cellW + k) * 3
      words[at] = k === 0 || glyph === BLOCK ? glyph : SPACE
      words[at + 1] = fg
      words[at + 2] = BOARD
    }
  }
  for (let y = 0; y < ROWS; y++) for (let x = 0; x < COLS; x++) put(x, y, SPACE, DEFAULT)
  put(g.food.x, g.food.y, DOT, FOOD)
  g.snake.forEach((part, i) => put(part.x, part.y, BLOCK, i === 0 ? HEAD : BODY))

  return base64(new Uint8Array(words.buffer))
}

/** 글자만으로 그린 판 (Raster 가 없는 화면용) */
const rowsOf = (g: Game): string[] =>
  Array.from({ length: ROWS }, (_, y) =>
    Array.from({ length: COLS }, (_, x) => {
      if (g.snake.some(part => part.x === x && part.y === y)) return '█'
      return g.food.x === x && g.food.y === y ? '●' : '·'
    }).join(''),
  )

// 타이머는 모듈 변수다: 다시 불러오면(핫 리로드) 사라지므로 session.start 에서 돌던 판을 멈춤으로 돌린다
let timer: Timer | undefined

function stop(): void {
  timer?.cancel()
  timer = undefined
}

async function tick($: EngineInterface): Promise<void> {
  await update($, game, advance)
  const now = await read($, game)
  if (now.status !== 'running') stop()
  if (now.status === 'over') void $.ui.toast(`스네이크: 게임 오버 · ${now.score}점`)
}

function start($: EngineInterface): void {
  if (timer) return
  timer = $.clock.every(TICK_MS, () => void tick($))
}

/** /snake 로 패널을 열 때: 끝난 판이면 새 판을 깔아 두고, 첫 방향 키를 기다린다 (열자마자 달려가 벽에 박지 않게) */
async function ready($: EngineInterface): Promise<void> {
  await update($, game, g => (g.status === 'over' ? newGame(g.best, g.seed) : g))
}

/** 방향 키: 기다리는 판이면 그 키로 출발하고, 달리는 판이면 방향만 바꾼다 */
async function go($: EngineInterface, dir: Dir): Promise<void> {
  const now = await read($, game)
  if (now.status === 'idle') {
    await update($, game, g => steer(withStatus(g, 'running'), dir))
    start($)
    return
  }
  await update($, game, g => steer(g, dir))
}

async function restart($: EngineInterface): Promise<void> {
  stop()
  await update($, game, g => newGame(g.best, g.seed))
}

async function pause($: EngineInterface): Promise<void> {
  const now = await read($, game)
  if (now.status === 'running') {
    stop()
    await update($, game, g => withStatus(g, 'paused'))
  } else if (now.status === 'paused') {
    await update($, game, g => withStatus(g, 'running'))
    start($)
  }
}

export const register: Register = on => {
  on('session.start', async ($, e, next) => {
    await $.command.register({ name: 'snake', description: '클로드가 일하는 동안 할 스네이크 게임' })
    await update($, game, g => (g.status === 'running' ? withStatus(g, 'paused') : g))

    return next(e)
  })

  on('command.run', { command: 'snake' }, async $ => {
    await $.ui.open({ id: PANE, title: 'SNAKE', focus: true, rows: ROWS + 7, columns: COLS * 2 + 4 })
    await ready($)

    return { text: '스네이크 패널을 열었습니다. w a s d 로 출발 · p 멈춤 · r 새 게임 · Esc 프롬프트로' }
  })

  on('ui.close', async ($, e, next) => {
    if (e.id === PANE) {
      stop()
      await update($, game, g => (g.status === 'running' ? withStatus(g, 'paused') : g))
    }

    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const g = await read($, game)
    const turn = (dir: Dir) => () => void go($, dir)
    const note = g.status === 'over' ? '게임 오버 — r 로 다시' : g.status === 'paused' ? '멈춤 — p 로 계속' : g.status === 'idle' ? 'w a s d 를 누르면 출발' : ''

    if (e.surface === 'terminal') {
      const { Box, Text, Button, Raster } = $.ui.resolve(e)
      const cellW = e.props.bodyColumns >= COLS * 2 + 2 ? 2 : 1

      return (
        <Box flexDirection="column">
          <Text bold>SNAKE</Text>
          <Text dimColor>
            score {g.score} · best {g.best}
          </Text>
          <Box borderStyle="round" borderDimColor alignSelf="flex-start">
            <Raster key="board" columns={COLS * cellW} rows={ROWS} cells={cellsOf(g, cellW)} />
          </Box>
          <Box flexDirection="row" columnGap={2}>
            <Button plain hotkey="w" label="위" onPress={turn('up')} />
            <Button plain hotkey="a" label="왼쪽" onPress={turn('left')} />
            <Button plain hotkey="s" label="아래" onPress={turn('down')} />
            <Button plain hotkey="d" label="오른쪽" onPress={turn('right')} />
          </Box>
          <Box flexDirection="row" columnGap={2}>
            <Button plain hotkey="p" label={g.status === 'paused' ? '계속' : '멈춤'} onPress={() => void pause($)} />
            <Button plain hotkey="r" label="새 게임" onPress={() => void restart($)} />
          </Box>
          {note !== '' && <Text color="yellow">{note}</Text>}
        </Box>
      )
    }

    const { Box, Text, Button } = $.ui.resolve(e)

    return (
      <Box flexDirection="column">
        <Text bold>SNAKE</Text>
        <Text dimColor>
          score {g.score} · best {g.best}
        </Text>
        {rowsOf(g).map(row => (
          <Text>{row}</Text>
        ))}
        <Box flexDirection="row" columnGap={2}>
          <Button plain hotkey="w" label="위" onPress={turn('up')} />
          <Button plain hotkey="a" label="왼쪽" onPress={turn('left')} />
          <Button plain hotkey="s" label="아래" onPress={turn('down')} />
          <Button plain hotkey="d" label="오른쪽" onPress={turn('right')} />
          <Button plain hotkey="p" label={g.status === 'paused' ? '계속' : '멈춤'} onPress={() => void pause($)} />
          <Button plain hotkey="r" label="새 게임" onPress={() => void restart($)} />
        </Box>
        {note !== '' && <Text>{note}</Text>}
      </Box>
    )
  })
}
