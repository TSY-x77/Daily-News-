# DAWN WIRE — 매일 아침 8시 뉴스 브리핑

패션 · 뷰티 · 유통 · AI · 테크 · 아트, 여섯 개 분야의 새벽까지의 뉴스를 Claude가 매일 검색·요약해서
`docs/index.html`에 자동으로 반영합니다. GitHub Actions가 매일 08:00 KST(23:00 UTC)에 스크립트를
실행하고, 결과를 GitHub Pages로 공개합니다.

## 1. GitHub 저장소 만들기

1. github.com에서 새 저장소를 만듭니다 (이름 예: `dawn-wire`, Public 권장).
2. 이 폴더(`news-brief/`)의 파일 전체를 저장소에 업로드합니다.
   - GitHub 웹에서 "Add file → Upload files"로 드래그해도 되고,
   - `git init && git remote add origin <저장소 URL> && git add . && git commit -m "init" && git push -u origin main` 로 올려도 됩니다.

## 2. Anthropic API 키 발급 및 등록

1. https://console.anthropic.com 에서 API 키를 발급받습니다. (Claude.ai 구독과는 별개의 API 과금입니다 — 하루 6회 호출 정도라 비용은 매우 적습니다.)
2. 저장소 → **Settings → Secrets and variables → Actions → New repository secret**
3. Name: `ANTHROPIC_API_KEY`, Value: 발급받은 키 값을 붙여넣고 저장합니다.

## 3. GitHub Pages 켜기

1. 저장소 → **Settings → Pages**
2. "Build and deployment" → Source: **Deploy from a branch**
3. Branch: `main`, 폴더: **/docs** 선택 후 저장
4. 몇 분 후 `https://<사용자명>.github.io/<저장소명>/` 에서 사이트가 열립니다.

## 4. 자동 실행 확인

- `.github/workflows/daily-update.yml`이 매일 08:00 KST에 자동 실행되어
  뉴스를 새로 검색하고 `docs/index.html`을 갱신 후 커밋합니다.
- 저장소 → **Actions** 탭에서 실행 로그를 확인할 수 있습니다.
- 지금 바로 테스트하고 싶다면 Actions 탭 → "Daily News Brief" → **Run workflow** 버튼으로 수동 실행할 수 있습니다.

## 5. 로컬에서 미리 테스트하기 (선택)

```bash
npm install
export ANTHROPIC_API_KEY=sk-ant-...
npm run generate
open docs/index.html   # 또는 브라우저로 직접 열기
