# 🔬 NanoMeasure Defect 결함 치수 측정 시스템

> **현미경 및 머신 비전 검사 이미지 정밀 치수 측정, 캘리브레이션 및 검사 성적서 자동 생성 시스템**  
> 🔗 **배포 데모 (Live)**: [https://imagemeasure.netlify.app/](https://imagemeasure.netlify.app/)

---

## 📌 주요 기능

- **정밀 캘리브레이션 (Scale Calibration)**:
  - 이미지 내 알려진 기준자(스케일바)를 드래그하여 기준 길이(mm / $\mu$m) 입력 시 픽셀당 실제 치수($\text{px}/\mu\text{m}$) 자동 보정
- **다양한 정밀 측정 도구**:
  - **선분 거리 (Length)**: 두 지점 간의 직선 거리 측정
  - **직사각형 (Bounding Box)**: 결함 가로/세로 길이 및 사각 영역 산출
  - **다각형/원형 면적 (Area)**: 비정형 결함 외곽선 추적 및 면적 계산
  - **키보드 미세 조정**: 화살표 키를 활용한 서브픽셀 단위 미세 좌표 이동
- **결함 분류 및 판정 관리**:
  - 결함 유형 태깅 (`Scratch`, `Particle`, `Crack`, `Dent`, `Void`, `Stain` 등)
  - 공차 기준에 따른 `OK / NG` 자동/수동 판정
- **검사 성적서 및 리포트 내보내기**:
  - `jsPDF` + `html2canvas` 기반 결함 이미지 오버레이와 측정 데이터 테이블이 포함된 공식 검사 성적서 PDF 즉시 생성
  - 고해상도 측정 스냅샷 이미지 다운로드

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Canvas Rendering**: HTML5 Canvas Interactive Layer (Zoom, Pan, Layer Drawing)
- **PDF Generation**: `jsPDF` (v2.5.1), `html2canvas` (v1.4.1)
- **Icons**: FontAwesome 6.4.0
- **Deployment**: Netlify

---

## 🚀 로컬 실행 방법

```bash
start index.html
```
