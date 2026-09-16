# 🔍 로트추적 분석기 (미주 FMS)

> **미주 FMS 제조 공정 데이터 연계 Lot 계보 역추적 및 불량 상관관계 분석 시스템**  
> 🔗 **배포 데모 (Live)**: [https://lottracking.netlify.app/](https://lottracking.netlify.app/)

---

## 📌 주요 기능

- **공정 전주기 Lot 추적 (Genealogy Tracking)**:
  - 원소재 입고 $\rightarrow$ 1차 가공 $\rightarrow$ 열처리/표면처리 $\rightarrow$ 정밀 가공 $\rightarrow$ 검사 $\rightarrow$ 출하 전 공정의 Lot 연계 계보 추적
- **불량 원인 역추적 및 상관 분석**:
  - 특정 불량 발생 Lot 입력 시 연관된 투입 원소재 Lot, 가공 설비 번호, 작업 일자 및 동일 설비에서 가공된 인접 Lot 동시 조회
- **대용량 엑셀 데이터 인메모리 처리**:
  - `ExcelJS`를 사용한 대용량 공정 로그 파싱 및 색인
- **서식 보존 엑셀 리포트 다운로드**:
  - 필터링 및 추적 결과를 헤더 색상, 테두리, 셀 서식이 완벽히 적용된 엑셀 파일(`.xlsx`)로 내보내기 (`FileSaver.js`)
- **다중 조건 검색**:
  - 와일드카드, 정규식, 다중 Lot 번호 콤마 구분 일괄 검색 지원

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3, Vanilla JavaScript (ES6+)
- **Excel Handling**: `ExcelJS` (v4.3.0), `FileSaver.js` (v2.0.5)
- **Typography**: Google Fonts (Inter, Noto Sans KR)
- **Deployment**: Netlify

---

## 🚀 로컬 실행 방법

```bash
start index.html
```
