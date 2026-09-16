# 🏭 Smart Manufacturing & Machine Vision Web Suite

> **스마트 팩토리 제조 및 머신 비전 검사 특화 웹 애플리케이션 5종 통합 저장소**  
> GitHub Pages 및 로컬 브라우저에서 별도 빌드 과정 없이 즉시 실행 가능한 정적 웹 애플리케이션 모음입니다.

---

## 📋 포함된 애플리케이션 목록

| 앱 디렉토리 | 서비스명 | 주요 기능 및 용도 | 원문 배포 데모 |
| :--- | :--- | :--- | :--- |
| [`imagetrans2/`](./imagetrans2) | **이미지 일괄 변환기** | 브라우저 기반 대용량 이미지 WebP/JPG/PNG/AVIF 포맷 변환, 리사이즈, 압축 최적화 | [Netlify](https://imagetrans2.netlify.app/) |
| [`imagemeasure/`](./imagemeasure) | **NanoMeasure Defect 측정 시스템** | 현미경/비전 검사 이미지 기준자 캘리브레이션, 결함 치수 정밀 측정, PDF 성적서 출력 | [Netlify](https://imagemeasure.netlify.app/) |
| [`fms-measure-anomaly/`](./fms-measure-anomaly) | **FMS 데이터 분석 & 이상 탐지** | 설비 측정 데이터(CSV/Excel)의 SPC 공정능력지수(Cpk), 이상 징후 탐지, 파레토 분석 | [Cloudflare Workers](https://measure.schjschj.workers.dev/) |
| [`lottracking/`](./lottracking) | **로트추적 분석기 (미주 FMS)** | 공정 전주기 Lot 이력 역추적, 설비/공정 불량 상관관계 분석, 서식 보존 엑셀 리포트 | [Netlify](https://lottracking.netlify.app/) |
| [`vision-inspection-dashboard/`](./vision-inspection-dashboard) | **비전 방식별 비교 대시보드** | 머신비전 4대 기술(2D / 2.5D / 3D / AI) 다차원 비교, 결함 매트릭스 및 ROI 시뮬레이터 | [Netlify](https://magical-narwhal-ae37fe.netlify.app/) |

---

## 🌟 통합 포털 허브 (`index.html`)

본 저장소의 루트에 위치한 `index.html`은 5개 도구를 한눈에 둘러보고 클릭 한 번으로 실행할 수 있는 반응형 포털 허브입니다.

### 로컬 실행 방법
저장소를 클론한 후 브라우저에서 `index.html`을 열기만 하면 됩니다:
```bash
git clone https://github.com/schjschj/smart-manufacturing-tools.git
cd smart-manufacturing-tools
start index.html
```

---

## 🛠️ 공통 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, Modern Responsive CSS3
- **그래픽 & 렌더링**: HTML5 Canvas 2D API, Apache ECharts, Chart.js
- **데이터 처리**: PapaParse (CSV), SheetJS (XLSX), ExcelJS, FileSaver.js
- **문서 생성**: jsPDF, html2canvas
- **인프라/배포**: Netlify, Cloudflare Workers, GitHub Pages 호환

---

## 👤 작성자
- GitHub: [@schjschj](https://github.com/schjschj)
