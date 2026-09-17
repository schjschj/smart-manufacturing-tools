# 🏭 SANG-A Quality Tool

> **상아프론테크 (SANG-A FRONT-TECH) 품질 보증, 검사 비전 분석, 설비 공정 이상 탐지, 글로벌 물류 시뮬레이션 및 업무 자동화 통합 엔지니어링 웹 플랫폼 (8종)**  
> 🔗 **실시간 라이브 웹 포털 (GitHub Pages)**: [https://schjschj.github.io/smart-manufacturing-tools/](https://schjschj.github.io/smart-manufacturing-tools/)

---

## 📋 통합 도구 8종 목록 (2행 x 4열)

| 도구명 | 디렉토리 / 링크 | 주요 기능 및 특징 | 서비스 링크 |
| :--- | :--- | :--- | :--- |
| **이미지 일괄 변환기** | [`imagetrans2/`](./imagetrans2) | 대용량 검사 이미지를 WebP, JPG, PNG, BMP 포맷으로 변환하고 해상도 리사이즈 및 압축을 처리하며, 조건별 Sorting, 육안선별을 위한 이미지 배분을 실행 | [Netlify](https://imagetrans2.netlify.app/) |
| **NanoMeasure 치수 측정** | [`imagemeasure/`](./imagemeasure) | 비전 이미지를 캘리브레이션, 파인튜닝을 통해 치수&면적을 측정 (불량실물은 없는데 이미지만 있을 시) | [Netlify](https://imagemeasure.netlify.app/) |
| **FMS 데이터 분석 & 이상 탐지** | [`fms-measure-anomaly/`](./fms-measure-anomaly) | 자동화 설비의 측정데이터(CSV,Excel) Raw 파일을 바탕으로 설비성 불량(LMS,수대성) 공정별 측정편차, SPC통계 공정분석, 시계열 이상 탐지 및 파레토 분석 등 다양한 품질적 분석 수행 | [Cloudflare](https://measure.schjschj.workers.dev/) |
| **로트추적 분석기 (미주 FMS)** | [`lottracking/`](./lottracking) | 양산-인천-미주 공정의 투입 로트를 정전개,역전개하여, 불량 발생시 신속하고 정확한 Risk Range 설정 | [Netlify](https://lottracking.netlify.app/) |
| **비전 방식별 비교 대시보드** | [`vision-inspection-dashboard/`](./vision-inspection-dashboard) | 머신비전 4대 기술(2D, 2.5D, 3D, AI)의 검출력, 택트타임, 조명 민감도, 투자비를 레이더 차트로 비교하고 ROI 시뮬레이션 | [Netlify](https://magical-narwhal-ae37fe.netlify.app/) |
| **SFTC 연장근무 자동등록** | [`sftc-overtime/`](./sftc-overtime) | 연장근무 등록 자동화, 매일 정기 실행 예약 스케줄링 및 실시간 로그 모니터링 확인 | 내부 테스트 URL은 환경 설정으로 주입 |
| **글로벌 재고·물류 모니터** | [`retro-inventory-monitor`](https://github.com/schjschj/retro-inventory-monitor) | 인천-미주-고객 거점별 재고현황 및 물류 이송을 시뮬레이션 (SANG-A 한-미 글로벌 전술 지휘센터) | [Vercel](https://retro-inventory-monitor.vercel.app/) |
| **설비 알람 이력 분석기** | `automation-alarm-monitor` | 자동화 설비의 알람 이력을 바탕으로 공정별 설비 특이점을 분석 | [Render](https://automation-alarm-monitor.onrender.com/) |

---

## 🖥️ 화면 최적화 (Single Screen Responsive 2x4 Grid)
- 표준 데스크톱 환경(1920x1080, 1600x900, 1440x900 등)에서 **수직 스크롤 없이(No-Scroll)** 2행 x 4열(2x4) 그리드로 한눈에 8개 도구를 조망하고 실행할 수 있도록 뷰포트 높이(`100vh`)에 최적화되었습니다.

---

## 👤 개발 및 관리
- 개발자: **CJ SONG** ([@schjschj](https://github.com/schjschj))
