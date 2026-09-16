# ⚙️ FMS 설비 데이터 분석 및 이상 탐지 시스템

> **FMS 가공 설비 측정 데이터(CSV/Excel)의 실시간 SPC 통계 공정 관리, 이상 징후 탐지 및 파레토 분석 대시보드**  
> 🔗 **배포 데모 (Live)**: [https://measure.schjschj.workers.dev/](https://measure.schjschj.workers.dev/)

---

## 📌 주요 기능

- **대용량 설비 데이터 파싱**:
  - FMS 측정 장비 및 가공 라인 CSV / Excel 파일 드래그 앤 드롭 즉시 파싱 (`PapaParse`, `SheetJS`)
- **통계적 공정 관리 (SPC - Statistical Process Control)**:
  - 평균값($\mu$), 표준편차($\sigma$), 공정능력지수($C_p, C_{pk}$) 실시간 산출
  - 관리상한(UCL), 관리하한(LCL), 규격상한(USL), 규격하한(LSL) 관리선 자동 오버레이
  - 정규분포 히스토그램 및 Cpk 적합성 평가
- **시계열 이상 징후 탐지 (Anomaly Detection)**:
  - 시간대별 불량률 및 측정 오차 급증 구간 실시간 시각화
  - 호기별/로트별/측정 항목별 이상 패턴 하이라이팅
- **파레토(Pareto) Top 10 불량 요인 분석**:
  - 발생 빈도 및 누적 점유율 분석을 통한 핵심 불량 원인 도출
- **인터랙티브 드릴다운 대시보드**:
  - 모델별, 로트별, 설비 호기별 동적 필터링 및 ECharts 기반 반응형 차트

---

## 🛠️ 기술 스택

- **Frontend**: Vanilla JavaScript (ES6+), HTML5, CSS3
- **Visualization Engine**: Apache ECharts (v5.5.0)
- **Data Parsers**: `PapaParse` (v5.4.1), `SheetJS xlsx` (v0.18.5)
- **Icons**: Lucide Icons
- **Deployment**: Cloudflare Workers

---

## 🚀 로컬 실행 방법

```bash
start index.html
```
