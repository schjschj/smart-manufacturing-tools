# 🏭 SANG-A Quality Tool

> **상아프론테크 (SANG-A FRONT-TECH) 품질 보증, 검사 비전 분석, 설비 공정 이상 탐지 및 업무 자동화 통합 웹 엔지니어링 스위트**  
> 🔗 **실시간 라이브 웹 포털 (GitHub Pages)**: [https://schjschj.github.io/smart-manufacturing-tools/](https://schjschj.github.io/smart-manufacturing-tools/)

---

## 📋 통합 도구 6종 목록

| 도구명 | 디렉토리 | 주요 기능 및 특징 | 원본 / 라이브 데모 |
| :--- | :--- | :--- | :--- |
| **이미지 일괄 변환기** | [`imagetrans2/`](./imagetrans2) | 대용량 검사 이미지를 WebP, JPG, PNG, BMP 포맷으로 변환하고 해상도 리사이즈 및 압축을 처리하며, 조건별 Sorting, 육안선별을 위한 이미지 배분을 실행 | [Netlify](https://imagetrans2.netlify.app/) |
| **NanoMeasure 치수 측정** | [`imagemeasure/`](./imagemeasure) | 비전 이미지를 캘리브레이션, 파인튜닝을 통해 치수&면적을 측정 (불량실물은 없는데 이미지만 있을 시) | [Netlify](https://imagemeasure.netlify.app/) |
| **FMS 데이터 분석 & 이상 탐지** | [`fms-measure-anomaly/`](./fms-measure-anomaly) | 자동화 설비의 측정데이터(CSV,Excel) Raw 파일을 바탕으로 설비성 불량(LMS,수대성) 공정별 측정편차, SPC통계 공정분석, 시계열 이상 탐지 및 파레토 분석 등 다양한 품질적 분석 수행 | [Cloudflare](https://measure.schjschj.workers.dev/) |
| **로트추적 분석기 (미주 FMS)** | [`lottracking/`](./lottracking) | 양산-인천-미주 공정의 투입 로트를 정전개,역전개하여, 불량 발생시 신속하고 정확한 Risk Range 설정 | [Netlify](https://lottracking.netlify.app/) |
| **비전 방식별 비교 대시보드** | [`vision-inspection-dashboard/`](./vision-inspection-dashboard) | 머신비전 4대 기술(2D, 2.5D, 3D, AI)의 검출력, 택트타임, 조명 민감도, 투자비를 레이더 차트로 비교하고 ROI 시뮬레이션 | [Netlify](https://magical-narwhal-ae37fe.netlify.app/) |
| **SFTC 연장근무 자동등록** | [`sftc-overtime/`](./sftc-overtime) | 연장근무 등록 자동화, 매일 정기 실행 예약 스케줄링 및 실시간 로그 모니터링 확인 | [Cloudflare Tunnel](https://meters-gui-dependence-confidentiality.trycloudflare.com/) |

---

## 🖥️ 화면 최적화 (Single Screen Responsive)
- 표준 데스크톱 환경(1920x1080, 1440x900, 1366x768 등)에서 **수직 스크롤 없이(No-Scroll)** 3x2 그리드로 한눈에 6개 도구를 조망하고 실행할 수 있도록 뷰포트 높이(`100vh`)에 최적화되었습니다.
- 모바일 및 태블릿 등 낮은 화면 해상도에서는 유연하게 반응형 스크롤 레이아웃으로 자동 전환됩니다.

---

## 👤 개발 및 관리
- GitHub: [@schjschj](https://github.com/schjschj)
