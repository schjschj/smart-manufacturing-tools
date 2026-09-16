# 🖼️ 이미지 일괄 변환기 (Batch Image Converter)

> **대용량 이미지 리사이즈, 포맷 변환, 압축 품질 최적화 및 일괄 다운로드 웹 애플리케이션**  
> 🔗 **배포 데모 (Live)**: [https://imagetrans2.netlify.app/](https://imagetrans2.netlify.app/)

---

## 📌 주요 기능

- **다중 이미지 일괄 처리**: 드래그 앤 드롭 및 파일 탐색기를 통한 수십~수백 장의 이미지 동시 업로드
- **다양한 최신 포맷 변환**:
  - `WEBP` (고효율 웹 압축)
  - `JPEG / JPG` (범용 사진 규격)
  - `PNG` (무손실 투명도 보존)
  - `AVIF` (차세대 초고압축 규격)
- **정밀 리사이즈 옵션**:
  - 원본 비율 유지 축소 (75%, 50%, 25%)
  - 사용자 지정 가로/세로 픽셀 고정 (Aspect Ratio 연동 On/Off)
  - 긴 축(Long side) / 짧은 축(Short side) 기준 리사이즈
- **품질(Quality) 슬라이더**: 1% ~ 100% 실시간 조절 및 예상 절감 용량 프리뷰
- **100% 클라이언트 사이드 동작**: 서버로 이미지가 전송되지 않아 완벽한 보안 및 프라이버시 보장
- **일괄 번들 다운로드**: 변환 완료된 파일들을 순차적 자동 다운로드 및 브라우저 메모리 안전 관리

---

## 🛠️ 기술 스택

- **Frontend**: HTML5, CSS3 (Modern Dark Glassmorphism UI), Vanilla JavaScript (ES6+)
- **Graphic Engine**: HTML5 Canvas 2D API (`drawImage`, `toBlob`, `createObjectURL`)
- **Typography**: Google Fonts (Outfit, JetBrains Mono)
- **Deployment**: Netlify

---

## 🚀 로컬 실행 방법

별도의 빌드나 의존성 설치 없이 웹 브라우저에서 바로 실행할 수 있습니다.

```bash
# 브라우저에서 index.html 파일 열기
start index.html
```
