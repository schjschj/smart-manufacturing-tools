# ⏱️ SFTC 연장근무 자동등록 시스템

> **SANG-A SFTC 팀원 연장근무 신청 자동화, 일정 예약 및 실행 로그 모니터링 대시보드**  
> 🔗 **배포 터널 (Live Tunnel)**: 공개 소스에 기록하지 않고 `window.SFTC_API_BASE_URL` 런타임 설정으로 주입합니다.

---

## 📌 주요 기능

- **즉시 실행 & 시스템 진단**:
  - 그룹웨어 연장근무 등록 프로세스 원클릭 즉시 실행 및 헬스체크 진단
  - 실시간 SSE(Server-Sent Events) 기반 터미널 로그 스트리밍 모니터링
- **팀원 계정 관리**:
  - 부서/팀원 계정 정보(사번, 계정ID, 비밀번호, 기본 사유) 테이블 관리
  - 근무 사유(모달 편집기) 및 대상자 활성화/비활성화 토글
- **매일 정기 실행 예약 스케줄러**:
  - 설정된 예약 시각(예: 매일 17:30)에 백그라운드 자동 등록 스케줄링
- **실행 결과 및 로그 이력 조회**:
  - 최근 실행 상태(성공/실패 건수, 소요시간) 대시보드 카드
  - 일자별 로그 파일 브라우징 및 상세 내역 뷰어

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3 (Modern Dark Theme), Vanilla JavaScript (ES6+)
- **Communication**: Server-Sent Events (SSE), REST API
- **Deployment / Tunnel**: Cloudflare Tunnel (trycloudflare.com)
