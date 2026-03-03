# Daily News

매일 주요 뉴스를 AI로 정리해 Markdown으로 저장하고, GitHub Pages로 발행하는 프로젝트입니다.

---

## 개요

- **데이터 범위**: 최근 24시간 뉴스 + 최신 시장 데이터 기준
- **신뢰도 표기**: 항목별 `[높음 / 중간 / 낮음]`
- **루머/커뮤니티성 정보**: `[루머]` 태그로 분리
- **출처 표기**: 요약 뒤 `[출처: URL]` 포함

---

## 현재 저장 구조

```txt
daily-news/
├─ README.md
├─ prompt.md
├─ app.js / index.html / style.css       # 대시보드(UI)
├─ api/posts.liquid                       # 게시글 메타 생성
├─ md/
│  ├─ ai/YYYY-MM-DD.md
│  ├─ tech/YYYY-MM-DD.md
│  └─ economy/YYYY-MM-DD.md
└─ scripts/
   ├─ generate-daily-news.mjs            # LLM 생성
   └─ validate-daily-news.mjs            # 품질 검증
```

예시:
- `md/ai/2026-03-03.md`
- `md/tech/2026-03-03.md`
- `md/economy/2026-03-03.md`

---

## 자동 생성 파이프라인 (GitHub Actions)

워크플로: `.github/workflows/daily-news-generate.yml`

### 트리거
- **스케줄**: 매일 06:05 KST
- **수동 실행**: `workflow_dispatch`
- **외부 트리거**: `repository_dispatch` (`event_type: daily-news-generate`)

### 필요 설정 (Repository Settings → Secrets and variables → Actions)

- **Secret (필수)**
  - `LLM_API_KEY`

- **Variable (선택)**
  - `LLM_MODEL` (기본: `gpt-4.1-mini`)
  - `LLM_BASE_URL` (기본: `https://api.openai.com/v1`)

### 동작 순서
1. `scripts/generate-daily-news.mjs` 실행
2. 실패 시 재시도(최대 3회)
3. `scripts/validate-daily-news.mjs` 검증
4. 변경이 있으면 `md/` 하위 파일 자동 commit/push

---

## 로컬 실행 (선택)

```bash
# 특정 날짜 생성
TARGET_DATE=2026-03-03 LLM_API_KEY=... node scripts/generate-daily-news.mjs

# 검증
TARGET_DATE=2026-03-03 node scripts/validate-daily-news.mjs
```

---

## 트러블슈팅

### 1) Actions가 실패할 때
- `LLM_API_KEY` 누락 여부 확인
- OpenAI 429 (`insufficient_quota`) 발생 시 Billing/Quota 확인

### 2) 생성은 됐는데 커밋이 안 될 때
- 변경 파일이 없으면 커밋하지 않음(정상)

### 3) 대시보드에 글이 안 보일 때
- `md/*/*.md` 파일 경로/파일명 확인
- GitHub Pages 반영 지연(캐시) 확인

---

## 참고

- 메인 대시보드: `https://chenjae-kr.github.io/daily-news/`
- 이 프로젝트는 생성 안정성을 위해 **OpenClaw cron(트리거) + GitHub Actions(실행)** 구조를 사용합니다.
