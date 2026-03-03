# Daily News

매일 분야별 주요 뉴스를 AI로 정리하는 프로젝트입니다.

---

## 개요

- **데이터 범위**: 최근 24시간 뉴스 + 최신 시장 데이터 기준
- **루머/커뮤니티성 정보**: `[루머]` 태그로 별도 표시
- **출처 신뢰도**: 각 항목마다 `[높음 / 중간 / 낮음]` 표시
- **출처 URL**: 각 뉴스 항목의 요약 뒤에 링크 형식으로 제공

---

## 정리 분야

| # | 분야 | 세부 항목 |
|---|------|-----------|
| 1 | **경제** | 미국 시장 (S&P500, Nasdaq, Dow, 달러인덱스) |
| | | 한국 시장 (코스피, 코스닥, 원/달러 환율) |
| | | 원자재 (금, 은, 유가) |
| | | 오늘 시장에 영향을 준 주요 재료 |
| 2 | **AI** | AI 관련 새로운 소식 (모델 출시, 기업 동향, 연구) |
| 3 | **한국 부동산** | 새로운 정부 부동산 정책 |
| | | 부동산 흐름 (가격 동향, 거래량, 청약) |
| 4 | **오늘의 주요 뉴스** | 분야 구분 없이 오늘 가장 중요한 뉴스 5~10건 |
| 5 | **종합 요약** | 오늘 전체 흐름 5~10줄 총정리 |

---

## 파일 구조

```
daily-news/
 README.md              # 프로젝트 설명
 prompt.md              # AI에 입력할 뉴스 정리 프롬프트
 md/
     YYYY/
         MM/
             YYYYMMDD_dailynews.md   # 날짜별 뉴스 파일
```

**예시**: `md/2026/02/20260224_dailynews.md`

---

## 사용 방법

1. `prompt.md` 파일을 열어 날짜(`{{YYYY년 MM월 DD일}}`)를 오늘 날짜로 교체
2. 프롬프트 전체를 AI(ChatGPT, Claude 등)에 붙여넣기
3. 생성된 결과를 `md/YYYY/MM/YYYYMMDD_dailynews.md` 경로에 저장

---

## GitHub Actions 자동 생성 파이프라인

이 레포는 `.github/workflows/daily-news-generate.yml` 워크플로로 일일 뉴스 생성이 가능합니다.

### 트리거
- 매일 06:05 KST (`schedule`)
- 수동 실행 (`workflow_dispatch`)
- 외부 트리거 (`repository_dispatch`, type=`daily-news-generate`)

### 필요 설정
Repository Settings에서 아래 값을 설정하세요.

- **Secrets**
  - `LLM_API_KEY` (필수)
- **Variables (선택)**
  - `LLM_MODEL` (기본: `gpt-4.1-mini`)
  - `LLM_BASE_URL` (기본: `https://api.openai.com/v1`)

### 동작
1. `scripts/generate-daily-news.mjs` 실행 (최대 3회 재시도)
2. `scripts/validate-daily-news.mjs` 검증
3. 변경분이 있으면 `md/` 아래 파일 commit/push
