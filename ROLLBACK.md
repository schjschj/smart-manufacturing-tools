# 백업과 원복

수정 전 기준 커밋은 `053ea8fd9d2f297cc94ba2f85731adf8cf7f6174`이며 다음 참조로 보존한다.

- 브랜치: `backup/pre-feedback-20260917`
- 태그: `pre-feedback-20260917`
- 작업 브랜치: `feature/internal-feedback-improvements`

원복 시 새 브랜치에서 `git switch -c rollback/pre-feedback pre-feedback-20260917` 후 프리뷰 빌드와 기능 확인을 거쳐 배포한다. 기존 작업 브랜치를 강제 초기화하거나 삭제하지 않는다.

공통 암호와 세션 서명 키는 저장소에 기록하지 않는다. Cloudflare Worker 환경에는 `wrangler secret put TEAM_PASSWORD`, `wrangler secret put SESSION_SECRET`으로 등록한다.
