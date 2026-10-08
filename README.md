# kimflip-mods

김플립이 만든 Claude Code 모드(mods) 모음입니다. Claude Code 2.1.287 이상에서 동작합니다.

## 들어 있는 모드

| 모드 | 하는 일 |
|---|---|
| `snake` | 클로드가 일하는 동안 대화 옆 패널에서 하는 스네이크 게임. `/snake` 로 엽니다 |

## 설치

```bash
claude plugin marketplace add KIMFLIP-dev/kimflip-mods
claude plugin install snake@kimflip-mods
```

이미 열려 있는 세션에서는 `/reload-plugins` 를 치면 바로 적용됩니다.

설치 없이 한 번만 써 보려면 저장소를 받아서 폴더를 지정해 켭니다.

```bash
git clone https://github.com/KIMFLIP-dev/kimflip-mods.git
claude --plugin-dir ./kimflip-mods/snake
```

## 깔기 전에 확인하기

모드는 샌드박스 없이 내 권한으로 돌아갑니다. 모르는 사람이 만든 모드는 깔기 전에 무엇을 하는지 먼저 확인하세요.

```bash
claude plugin validate ./kimflip-mods/snake
```

이 명령은 모드를 실행하지 않고, 무엇을 지켜보고(hooks) 무엇을 하려는지(calls) 목록으로 보여 줍니다.

## snake

- `/snake` — 패널을 엽니다. 뱀은 첫 방향 키를 누를 때 출발합니다
- `w` `a` `s` `d` 이동 · `p` 멈춤/계속 · `r` 새 게임 · `Esc` 프롬프트로 돌아가기 (패널은 남습니다)
- 방향키가 아니라 w a s d 인 이유: 모드는 방향키를 묶을 수 없습니다
- 명령과 게임은 모델을 거치지 않아 토큰이 들지 않습니다
- 쓰는 것: 타이머, 세션 상태 저장, 패널 그리기, 알림. 파일·네트워크·프로그램 실행은 건드리지 않습니다

지우려면 `claude plugin uninstall snake@kimflip-mods` 입니다.
