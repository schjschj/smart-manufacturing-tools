# 🏭 SANG-A Quality Tool

> **상아프론테크 (SANG-A FRONT-TECH) 품질 보증, 검사 비전 분석, 설비 공정 이상 탐지 및 업무 자동화 통합 웹 엔지니어링 스위트**  
> 🔗 **실시간 라이브 웹 포털 (GitHub Pages)**: [https://schjschj.github.io/smart-manufacturing-tools/](https://schjschj.github.io/smart-manufacturing-tools/)

---

## 📋 통합 도구 6종 목록

| 도구명 | 디렉토리 | 주요 기능 및 특징 | 원본 / 라이브 데모 |
| :--- | :--- | :--- | :--- |
| **이미지 일괄 변환기** | [`imagetrans2/`](./imagetrans2) | 대용량 검사 이미지 WebP/JPG/PNG/AVIF 포맷 변환, 리사이즈, 압축 최적화 (100% 브라우저 메모리 처리) | [Netlify](https://imagetrans2.netlify.app/) |
| **NanoMeasure 치수 측정** | [`imagemeasure/`](./imagemeasure) | 현미경/비전 이미지 기준자 캘리브레이션, 결함 치수(거리, 박스, 면적) 정밀 측정 및 PDF 성적서 출력 | [Netlify](https://imagemeasure.netlify.app/) |
| **FMS 데이터 분석 & 이상 탐지** | [`fms-measure-anomaly/`](./fms-measure-anomaly) | 설비 측정 데이터(CSV/Excel) 실시간 파싱, SPC 통계 공정관리(Cp, Cpk, UCL/LCL), 이상 탐지 및 파레토 분석 | [Cloudflare](https://measure.schjschj.workers.dev/) |
| **로트추적 분석기 (미주 FMS)** | [`lottracking/`](./lottracking) | 전공정(원소재~가공~검사) Lot 이력 역추적(Genealogy Tracking), 설비/불량 상관분석 및 서식 보존 엑셀 다운로드 | [Netlify](https://lottracking.netlify.app/) |
| **비전 방식별 비교 대시보드** | [`vision-inspection-dashboard/`](./vision-inspection-dashboard) | 머신비전 4대 기술(2D, 2.5D, 3D, AI) 다차원 비교, 레이더 차트, 결함 매트릭스 및 설비 ROI 시뮬레이터 | [Netlify](https://magical-narwhal-ae37fe.netlify.app/) |
| **SFTC 연장근무 자동등록** | [`sftc-overtime/`](./sftc-overtime) | 그룹웨어 연장근무 신청 자동화, 매일 정기 실행 예약 스케줄러, 실시간 SSE 터미널 로그 스트리밍 | [Cloudflare Tunnel](https://meters-gui-dependence-confidentiality.trycloudflare.com/) |

---

## 🖥️ 화면 최적화 (Single Screen Responsive)
- 표준 데스크톱 환경(1920x1080, 1440x900, 1366x768 등)에서 **수직 스크롤 없이(No-Scroll)** 3x2 그리드로 한눈에 6개 도구를 조망하고 실행할 수 있도록 뷰포트 높이(`100vh`)에 최적화되었습니다.
- 모바일 및 태블릿 등 낮은 화면 해상도에서는 유연하게 반응형 스크롤 레이아웃으로 자동 전환됩니다.

---

## 👤 개발 및 관리
- GitHub: [@schjschj](https://github.com/schjschj)
