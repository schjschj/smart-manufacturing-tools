/**
 * NanoMeasure Defect Lab - Main Application Logic
 * 
 * Includes:
 * 1. Multi-image batch upload & Left Sidebar Image Queue Management.
 * 2. Bottom-Right Loupe positioning (No image obstruction).
 * 3. HTML2Canvas + jsPDF Korean PDF Report Renderer.
 * 4. Rotated Bounding Box Fixes & 22px Hit Radius.
 */

document.addEventListener('DOMContentLoaded', () => {
  console.log("NanoMeasure Defect Lab initialized with Multi-Image Queue & Bottom-Right Loupe.");

  // --- DOM Elements ---
  const mainCanvas = document.getElementById('mainCanvas');
  const ctx = mainCanvas ? mainCanvas.getContext('2d') : null;
  const canvasWrapper = document.getElementById('canvasWrapper');
  const emptyState = document.getElementById('emptyState');
  const imageFileInput = document.getElementById('imageFileInput');
  const loadSampleBtn = document.getElementById('loadSampleBtn');

  // Multi-Image Queue Elements (Left Sidebar Card 4)
  const imageQueueList = document.getElementById('imageQueueList');
  const imageCountBadge = document.getElementById('imageCountBadge');

  // Header Actions
  const exportPngBtn = document.getElementById('exportPngBtn');
  const exportCsvBtn = document.getElementById('exportCsvBtn');
  const exportPdfBtn = document.getElementById('exportPdfBtn');
  const showShortcutsBtn = document.getElementById('showShortcutsBtn');
  const shortcutsModal = document.getElementById('shortcutsModal');
  const closeShortcutsModalBtn = document.getElementById('closeShortcutsModalBtn');

  // Toolbar & Collapse Controls
  const canvasToolbar = document.getElementById('canvasToolbar');
  const toggleToolbarBtn = document.getElementById('toggleToolbarBtn');
  const measureSubtoolGroup = document.getElementById('measureSubtoolGroup');

  // Subtool Buttons
  const toolLineBtn = document.getElementById('toolLineBtn');
  const toolPolylineBtn = document.getElementById('toolPolylineBtn');
  const toolRectBtn = document.getElementById('toolRectBtn');
  const toolCircleBtn = document.getElementById('toolCircleBtn');

  // Precision Selector
  const precisionSelect = document.getElementById('precisionSelect');

  // Loupe & Toggles
  const loupeContainer = document.getElementById('loupeContainer');
  const loupeCanvas = document.getElementById('loupeCanvas');
  const loupeCtx = loupeCanvas ? loupeCanvas.getContext('2d') : null;
  const toggleEdgeSnapCheck = document.getElementById('toggleEdgeSnapCheck');
  const toggleLoupeCheck = document.getElementById('toggleLoupeCheck');
  const toggleBboxCheck = document.getElementById('toggleBboxCheck');
  const toggleDefectLinesCheck = document.getElementById('toggleDefectLinesCheck');
  const loupeZoomButtons = document.querySelectorAll('.loupe-zoom-btn');
  const currentZoomBadge = document.getElementById('currentZoomBadge');

  // Toolbar & view controls
  const modeCalibrateBtn = document.getElementById('modeCalibrateBtn');
  const modeMeasureBtn = document.getElementById('modeMeasureBtn');
  const zoomInBtn = document.getElementById('zoomInBtn');
  const zoomOutBtn = document.getElementById('zoomOutBtn');
  const zoomLevelDisplay = document.getElementById('zoomLevelDisplay');
  const resetViewBtn = document.getElementById('resetViewBtn');

  // Image Adjustment Controls
  const brightnessSlider = document.getElementById('brightnessSlider');
  const contrastSlider = document.getElementById('contrastSlider');
  const resetImgAdjustBtn = document.getElementById('resetImgAdjustBtn');

  // Text Size Control
  const textSizeSlider = document.getElementById('textSizeSlider');
  const textSizeDisplay = document.getElementById('textSizeDisplay');

  // Preset Controls
  const presetSelect = document.getElementById('presetSelect');
  const savePresetBtn = document.getElementById('savePresetBtn');
  const deletePresetBtn = document.getElementById('deletePresetBtn');

  // Quick Frame Buttons
  const frameFit80Btn = document.getElementById('frameFit80Btn');
  const frameFit100Btn = document.getElementById('frameFit100Btn');

  // Sidebar Controls (Calibration)
  const realWidthInput = document.getElementById('realWidthInput');
  const realHeightInput = document.getElementById('realHeightInput');
  const unitSelect = document.getElementById('unitSelect');
  const applyCalibBtn = document.getElementById('applyCalibBtn');
  const resetCalibBtn = document.getElementById('resetCalibBtn');
  const preserveCalibCheck = document.getElementById('preserveCalibCheck');
  const bboxPxDims = document.getElementById('bboxPxDims');
  const scaleRatioDisplay = document.getElementById('scaleRatioDisplay');
  const calibStatusBadge = document.getElementById('calibStatusBadge');

  // Rotation Controls
  const boxRotationSlider = document.getElementById('boxRotationSlider');
  const boxRotationInput = document.getElementById('boxRotationInput');
  const resetRotationBtn = document.getElementById('resetRotationBtn');

  // Fine-Tuning Calibration
  const fineTuneDefectSelect = document.getElementById('fineTuneDefectSelect');
  const fineTuneCurrentValue = document.getElementById('fineTuneCurrentValue');
  const fineTuneTargetInput = document.getElementById('fineTuneTargetInput');
  const fineFactorDisplay = document.getElementById('fineFactorDisplay');
  const applyFineTuneBtn = document.getElementById('applyFineTuneBtn');
  const resetFineTuneBtn = document.getElementById('resetFineTuneBtn');

  // Defect Table
  const defectTableBody = document.getElementById('defectTableBody');
  const defectCountBadge = document.getElementById('defectCountBadge');
  const clearDefectsBtn = document.getElementById('clearDefectsBtn');

  // Status Displays
  const cursorPosDisplay = document.getElementById('cursorPosDisplay');
  const helpTextDisplay = document.getElementById('helpTextDisplay');

  // --- Application State ---
  let img = null;
  let currentImageName = "sample_image.png";
  let uploadedImages = []; // Multi-image queue: Array of { name, src }
  let activeImageIndex = 0;

  let currentMode = 'CALIBRATE';
  let activeSubtool = 'LINE';
  
  // Transform State (Pan & Zoom)
  let zoom = 1.0;
  let panX = 0;
  let panY = 0;
  let isPanning = false;
  let isSpaceKeyDown = false;
  let startPanX = 0;
  let startPanY = 0;

  // Image Adjustments
  let imgBrightness = 100;
  let imgContrast = 100;

  // Output Precision Step (Default 0.001 -> 3 decimal places)
  let precisionStep = 0.001;

  // Calibration Bounding Box State & Persistence
  let bbox = { x: 0, y: 0, w: 0, h: 0, rotation: 0 };
  let isCalibrated = false;
  let scaleX = 1.0; 
  let scaleY = 1.0; 
  let preserveCalibration = true;

  // Fine-tuning correction multiplier
  let fineCorrectionFactor = 1.0;
  const fineTuneHistory = [];
  const APP_VERSION = '0.9.0';

  function safeSpreadsheetText(value) {
    const text = String(value ?? '');
    return /^[=+\-@]/u.test(text) ? `'${text}` : text;
  }

  // Label Text Size (px, Min 7px, default 14px)
  let labelFontSize = 14;

  // 5-Stage Loupe Magnification Level
  let loupeZoomLevel = 5;

  // Edge Snap State
  let isEdgeSnapActive = true;

  // Defect line visibility toggles
  let globalDefectLinesVisible = true;

  // Bounding Box Interaction State
  let isDraggingBbox = false;
  let isResizingBbox = false;
  let isRotatingBbox = false;
  let activeHandle = null;
  let bboxDragStart = { x: 0, y: 0 };
  let initialBbox = { x: 0, y: 0, w: 0, h: 0, rotation: 0 };
  const HANDLE_SIZE = 12;

  // Defect Measurement State
  let defects = [];
  let nextDefectId = 1;
  let activeMeasurePoints = [];
  let currentCursorImgPos = { x: 0, y: 0 };

  const DEFECT_COLORS = ['#ef4444', '#f59e0b', '#10b981', '#3b82f6', '#8b5cf6', '#ec4899', '#06b6d4'];
  const STORAGE_KEY = 'NanoMeasure_Calib_State_v1';
  const PRESETS_KEY = 'NanoMeasure_Presets_v1';

  // --- Canvas Sizing Setup ---
  function initCanvasSize() {
    if (!mainCanvas || !canvasWrapper) return;
    const rect = canvasWrapper.getBoundingClientRect();
    const w = Math.max(300, Math.floor(rect.width || canvasWrapper.clientWidth || window.innerWidth - 320));
    const h = Math.max(300, Math.floor(rect.height || canvasWrapper.clientHeight || window.innerHeight - 90));
    
    if (mainCanvas.width !== w || mainCanvas.height !== h) {
      mainCanvas.width = w;
      mainCanvas.height = h;
    }
    requestRender();
  }

  window.addEventListener('resize', () => {
    initCanvasSize();
    if (img) resetViewToFitImage();
  });
  setTimeout(initCanvasSize, 50);

  // --- Multi-Image Queue Rendering & Switching ---
  function renderImageQueue() {
    if (!imageQueueList || !imageCountBadge) return;
    imageCountBadge.textContent = `${uploadedImages.length}개`;

    if (uploadedImages.length === 0) {
      imageQueueList.innerHTML = '<li class="empty-queue-msg">업로드된 이미지가 없습니다.</li>';
      return;
    }

    imageQueueList.innerHTML = uploadedImages.map((imgObj, idx) => `
      <li class="queue-item ${idx === activeImageIndex ? 'active' : ''}" data-idx="${idx}" title="${escapeHtml(imgObj.name)}">
        <div class="queue-item-info">
          <i class="fa-solid fa-file-image" style="color: ${idx === activeImageIndex ? 'var(--primary)' : 'var(--text-muted)'};"></i>
          <span class="queue-item-name">${escapeHtml(imgObj.name)}</span>
        </div>
      </li>
    `).join('');

    imageQueueList.querySelectorAll('.queue-item').forEach(item => {
      item.addEventListener('click', (e) => {
        const idx = parseInt(e.currentTarget.dataset.idx);
        switchActiveImage(idx);
      });
    });
  }

  function switchActiveImage(idx) {
    if (idx < 0 || idx >= uploadedImages.length) return;
    activeImageIndex = idx;
    currentImageName = uploadedImages[idx].name;
    renderImageQueue();
    loadImgSource(uploadedImages[idx].src);
  }

  // --- Keyboard Shortcuts Listener ---
  window.addEventListener('keydown', (e) => {
    const activeTag = document.activeElement ? document.activeElement.tagName : '';
    if (activeTag === 'INPUT' || activeTag === 'SELECT' || activeTag === 'TEXTAREA') return;

    if (e.code === 'Space' && !isSpaceKeyDown) {
      isSpaceKeyDown = true;
      mainCanvas.style.cursor = 'grabbing';
      e.preventDefault();
    } else if (e.key === 'z' || e.key === 'Z') {
      if (!e.ctrlKey) applyZoom(1.25, mainCanvas.width / 2, mainCanvas.height / 2);
    } else if (e.key === 'x' || e.key === 'X') {
      applyZoom(0.8, mainCanvas.width / 2, mainCanvas.height / 2);
    } else if (e.key === 'c' || e.key === 'C') {
      setMode('CALIBRATE');
    } else if (e.key === 'm' || e.key === 'M') {
      setMode('MEASURE');
    } else if ((e.key === 'Delete' || e.key === 'Backspace')) {
      if (defects.length > 0) {
        defects.pop();
        renderDefectTable();
        populateFineTuneDropdown();
        updateFineTuneUI();
        requestRender();
      }
    } else if (e.key === 'Escape') {
      activeMeasurePoints = [];
      if (helpTextDisplay) helpTextDisplay.textContent = '측정이 취소되었습니다.';
      requestRender();
    } else if (e.ctrlKey && (e.key === 'z' || e.key === 'Z')) {
      if (defects.length > 0) {
        defects.pop();
        renderDefectTable();
        populateFineTuneDropdown();
        updateFineTuneUI();
        requestRender();
      }
      e.preventDefault();
    }
  });

  window.addEventListener('keyup', (e) => {
    if (e.code === 'Space') {
      isSpaceKeyDown = false;
      mainCanvas.style.cursor = 'crosshair';
    }
  });

  // Shortcuts Modal Toggle
  if (showShortcutsBtn && shortcutsModal) {
    showShortcutsBtn.addEventListener('click', () => {
      shortcutsModal.style.display = 'flex';
    });
  }

  if (closeShortcutsModalBtn && shortcutsModal) {
    closeShortcutsModalBtn.addEventListener('click', () => {
      shortcutsModal.style.display = 'none';
    });
  }

  if (shortcutsModal) {
    shortcutsModal.addEventListener('click', (e) => {
      if (e.target === shortcutsModal) shortcutsModal.style.display = 'none';
    });
  }

  // --- Quick Frame Resize Buttons ---
  if (frameFit80Btn) {
    frameFit80Btn.addEventListener('click', () => {
      if (!img) return;
      const marginX = img.width * 0.1;
      const marginY = img.height * 0.1;
      bbox = {
        x: marginX,
        y: marginY,
        w: Math.max(10, img.width * 0.8),
        h: Math.max(10, img.height * 0.8),
        rotation: 0
      };
      updateRotationUI(0);
      updateCalibrationScale();
      requestRender();
    });
  }

  if (frameFit100Btn) {
    frameFit100Btn.addEventListener('click', () => {
      if (!img) return;
      bbox = {
        x: 0,
        y: 0,
        w: img.width,
        h: img.height,
        rotation: 0
      };
      updateRotationUI(0);
      updateCalibrationScale();
      requestRender();
    });
  }

  // --- Calibration Presets ---
  function loadPresetsFromStorage() {
    let presets = [
      { name: '[예시] 소형 부품 (30.0 x 15.0 mm)', realW: 30.0, realH: 15.0, unit: 'mm' },
      { name: '[예시] 중형 부품 (50.0 x 50.0 mm)', realW: 50.0, realH: 50.0, unit: 'mm' },
      { name: '[예시] 마이크로 센서 (10.0 x 10.0 mm)', realW: 10.0, realH: 10.0, unit: 'mm' }
    ];

    try {
      const stored = localStorage.getItem(PRESETS_KEY);
      if (stored) {
        const customPresets = JSON.parse(stored);
        if (Array.isArray(customPresets)) presets = customPresets;
      }
    } catch (e) {
      console.warn("Unable to load presets:", e);
    }

    if (presetSelect) {
      presetSelect.innerHTML = '<option value="">-- 프리셋 선택 --</option>' +
        presets.map((p, idx) => `<option value="${idx}">${escapeHtml(p.name)} (${p.realW}x${p.realH}${p.unit})</option>`).join('');
    }
    window._calibrationPresets = presets;
  }

  if (presetSelect) {
    presetSelect.addEventListener('change', (e) => {
      const idx = e.target.value;
      if (idx !== '' && window._calibrationPresets && window._calibrationPresets[idx]) {
        const p = window._calibrationPresets[idx];
        if (realWidthInput) realWidthInput.value = p.realW;
        if (realHeightInput) realHeightInput.value = p.realH;
        if (unitSelect) unitSelect.value = p.unit;
        updateCalibrationScale();
      }
    });
  }

  if (savePresetBtn) {
    savePresetBtn.addEventListener('click', () => {
      const realW = parseFloat(realWidthInput ? realWidthInput.value : 30);
      const realH = parseFloat(realHeightInput ? realHeightInput.value : 15);
      const unit = unitSelect ? unitSelect.value : 'mm';

      const name = prompt('새 캘리브레이션 프리셋의 이름을 입력하세요:', `제품 (${realW}x${realH}${unit})`);
      if (!name) return;

      let presets = window._calibrationPresets || [];
      presets.push({ name: name, realW: realW, realH: realH, unit: unit });

      try {
        localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
      } catch (err) {
        console.warn("Unable to save presets:", err);
      }

      loadPresetsFromStorage();
      alert(`프리셋 "${name}"이(가) 저장되었습니다.`);
    });
  }

  if (deletePresetBtn) {
    deletePresetBtn.addEventListener('click', () => {
      const idx = presetSelect ? presetSelect.value : '';
      if (idx === '') {
        alert('삭제할 프리셋을 선택하세요.');
        return;
      }

      let presets = window._calibrationPresets || [];
      const targetName = presets[idx] ? presets[idx].name : '';
      if (confirm(`프리셋 "${targetName}"을(를) 삭제하시겠습니까?`)) {
        presets.splice(idx, 1);
        try {
          localStorage.setItem(PRESETS_KEY, JSON.stringify(presets));
        } catch (err) {}
        loadPresetsFromStorage();
      }
    });
  }

  loadPresetsFromStorage();

  // --- Pixel-Perfect Edge Magnet Snap Engine ---
  let tempOffscreenCanvas = document.createElement('canvas');
  let tempOffscreenCtx = tempOffscreenCanvas.getContext('2d', { willReadFrequently: true });

  if (toggleEdgeSnapCheck) {
    toggleEdgeSnapCheck.addEventListener('change', (e) => {
      isEdgeSnapActive = e.target.checked;
    });
  }

  function getSnappedEdgePoint(pt) {
    if (!isEdgeSnapActive || !img || !tempOffscreenCtx) return pt;

    const ix = Math.round(pt.x);
    const iy = Math.round(pt.y);
    const searchRadius = 8;

    if (ix - searchRadius < 0 || iy - searchRadius < 0 || ix + searchRadius >= img.width || iy + searchRadius >= img.height) {
      return pt;
    }

    try {
      if (tempOffscreenCanvas.width !== img.width || tempOffscreenCanvas.height !== img.height) {
        tempOffscreenCanvas.width = img.width;
        tempOffscreenCanvas.height = img.height;
        tempOffscreenCtx.drawImage(img, 0, 0);
      }

      const patchW = searchRadius * 2 + 1;
      const patchData = tempOffscreenCtx.getImageData(ix - searchRadius, iy - searchRadius, patchW, patchW).data;

      let maxGradient = 0;
      let bestX = ix;
      let bestY = iy;

      for (let y = 1; y < patchW - 1; y++) {
        for (let x = 1; x < patchW - 1; x++) {
          const idx = (y * patchW + x) * 4;
          const lumCenter = (patchData[idx] * 0.299 + patchData[idx + 1] * 0.587 + patchData[idx + 2] * 0.114);
          const lumRight  = (patchData[idx + 4] * 0.299 + patchData[idx + 5] * 0.587 + patchData[idx + 6] * 0.114);
          const lumBottom = (patchData[idx + patchW * 4] * 0.299 + patchData[idx + patchW * 4 + 1] * 0.587 + patchData[idx + patchW * 4 + 2] * 0.114);

          const grad = Math.abs(lumRight - lumCenter) + Math.abs(lumBottom - lumCenter);
          if (grad > maxGradient && grad > 25) {
            maxGradient = grad;
            bestX = (ix - searchRadius) + x;
            bestY = (iy - searchRadius) + y;
          }
        }
      }

      if (maxGradient > 25) {
        return { x: bestX, y: bestY, isSnapped: true };
      }
    } catch (e) {}
    return pt;
  }

  // --- PDF Inspection Report Generator (HTML2Canvas + jsPDF - Korean Font Fix) ---
  if (exportPdfBtn) {
    exportPdfBtn.addEventListener('click', async () => {
      if (!img) return;
      if (!isCalibrated) {
        alert('PDF 보고서를 만들기 전에 이미지 캘리브레이션을 완료하세요.');
        return;
      }

      const { jsPDF } = window.jspdf || {};
      const html2canvas = window.html2canvas;

      if (!jsPDF || !html2canvas) {
        alert('PDF 라이브러리를 불러오지 못했습니다. 인터넷 연결을 확인하세요.');
        return;
      }

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');

      if (imgBrightness !== 100 || imgContrast !== 100) {
        offCtx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
      }
      offCtx.drawImage(img, 0, 0);
      offCtx.filter = 'none';

      if (!toggleBboxCheck || toggleBboxCheck.checked) {
        const center = getBboxCenter(bbox);
        offCtx.save();
        offCtx.translate(center.x, center.y);
        offCtx.rotate(bbox.rotation || 0);
        offCtx.strokeStyle = '#3b82f6';
        offCtx.lineWidth = 3;
        offCtx.setLineDash([8, 6]);
        offCtx.strokeRect(-bbox.w / 2, -bbox.h / 2, bbox.w, bbox.h);
        offCtx.restore();
      }

      if (globalDefectLinesVisible) {
        defects.forEach(d => {
          if (d.visible !== false) {
            drawDefectShape(offCtx, d, false);
          }
        });
      }

      const snapshotUrl = offCanvas.toDataURL('image/jpeg', 0.88);
      const unit = unitSelect ? unitSelect.value : 'mm';
      const dateStr = new Date().toLocaleString('ko-KR');
      const hasDefects = defects.length > 0;

      let tableRowsHtml = '';
      if (defects.length === 0) {
        tableRowsHtml = `
          <tr>
            <td colspan="5" style="padding: 12px; text-align: center; color: #64748b;">측정된 결함이 없습니다 (정상 합격)</td>
          </tr>
        `;
      } else {
        tableRowsHtml = defects.map(d => `
          <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 10px 12px; font-weight: 600; color: ${d.color};">#${d.id}</td>
            <td style="padding: 10px 12px;">${getToolName(d.tool)}</td>
            <td style="padding: 10px 12px; font-weight: 600;">${formatLength(d.length)}</td>
            <td style="padding: 10px 12px;">${escapeHtml(d.note || '-')}</td>
            <td style="padding: 10px 12px; color: #ef4444; font-weight: 700;">NG (결함)</td>
          </tr>
        `).join('');
      }

      const reportContainer = document.createElement('div');
      reportContainer.id = 'pdfReportContainer';
      reportContainer.style.cssText = `
        position: absolute;
        left: -9999px;
        top: 0;
        width: 800px;
        background: #ffffff;
        color: #1e293b;
        font-family: 'Inter', 'Malgun Gothic', 'Apple SD Gothic Neo', sans-serif;
        padding: 30px;
        box-sizing: border-box;
      `;

      reportContainer.innerHTML = `
        <div style="background: #0f172a; color: #ffffff; padding: 18px 24px; border-radius: 8px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px;">
          <div>
            <h2 style="margin: 0; font-size: 20px; font-weight: 700; color: #ffffff;">NanoMeasure Defect - 품질 검사 보고서</h2>
            <p style="margin: 4px 0 0 0; font-size: 12px; color: #94a3b8;">제품 전장 캘리브레이션 기반 이미지 결함 치수 측정 정밀 분석서</p>
          </div>
          <div style="background: ${hasDefects ? '#ef4444' : '#10b981'}; color: #ffffff; font-weight: 700; font-size: 16px; padding: 8px 18px; border-radius: 6px;">
            ${hasDefects ? 'NG (결함)' : 'OK (합격)'}
          </div>
        </div>

        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 14px 18px; margin-bottom: 20px; font-size: 13px; color: #334155;">
          <div><strong>검사 일시:</strong> ${dateStr}</div>
          <div><strong>파일명:</strong> ${escapeHtml(currentImageName)}</div>
          <div><strong>캘리브레이션 스케일:</strong> ${(scaleX * fineCorrectionFactor).toFixed(4)} px/${unit}</div>
          <div><strong>총 검사 결함:</strong> ${defects.length}건</div>
          <div><strong>도구 버전:</strong> ${APP_VERSION}</div>
          <div><strong>보정 이력:</strong> ${fineTuneHistory.length}건 / 표시 해상도 ${precisionStep}</div>
        </div>

        <div style="text-align: center; margin-bottom: 20px; border: 1px solid #e2e8f0; border-radius: 8px; overflow: hidden; padding: 10px; background: #000;">
          <img src="${snapshotUrl}" style="max-width: 100%; max-height: 440px; object-fit: contain;">
        </div>

        <h3 style="font-size: 15px; margin: 0 0 10px 0; color: #0f172a;">■ 결함 측정 세부 데이터</h3>
        <table style="width: 100%; border-collapse: collapse; margin-bottom: 30px; font-size: 13px;">
          <thead>
            <tr style="background: #1e293b; color: #ffffff; text-align: left;">
              <th style="padding: 10px 12px; width: 40px;">#</th>
              <th style="padding: 10px 12px;">측정 도구</th>
              <th style="padding: 10px 12px;">실측 치수</th>
              <th style="padding: 10px 12px;">메모 / 위치</th>
              <th style="padding: 10px 12px; width: 80px;">품질 판정</th>
            </tr>
          </thead>
          <tbody>
            ${tableRowsHtml}
          </tbody>
        </table>

        <div style="display: flex; justify-content: space-between; margin-top: 25px; font-size: 13px; color: #475569;">
          <div style="border: 1px solid #cbd5e1; padding: 14px 24px; border-radius: 6px; width: 45%;">
            <strong>검사자 서명:</strong> ____________________
          </div>
          <div style="border: 1px solid #cbd5e1; padding: 14px 24px; border-radius: 6px; width: 45%;">
            <strong>승인자 서명:</strong> ____________________
          </div>
        </div>
      `;

      document.body.appendChild(reportContainer);

      try {
        const renderedCanvas = await html2canvas(reportContainer, {
          scale: 2,
          useCORS: true,
          logging: false
        });

        document.body.removeChild(reportContainer);

        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'mm',
          format: 'a4'
        });

        const imgData = renderedCanvas.toDataURL('image/jpeg', 0.92);
        const pdfWidth = pdf.internal.pageSize.getWidth();
        const pdfHeight = (pdfWidth * renderedCanvas.height) / renderedCanvas.width;

        pdf.addImage(imgData, 'JPEG', 0, 0, pdfWidth, pdfHeight);
        pdf.save(`NanoMeasure_Inspection_Report_${Date.now()}.pdf`);
      } catch (err) {
        if (reportContainer.parentNode) document.body.removeChild(reportContainer);
        console.error("PDF generation failed:", err);
        alert('PDF 보고서 생성 도중 오류가 발생했습니다.');
      }
    });
  }

  // --- Calibration Persistence (localStorage) ---
  function saveCalibrationToStorage() {
    if (!isCalibrated) return;
    const config = {
      realWidth: parseFloat(realWidthInput ? realWidthInput.value : 30),
      realHeight: parseFloat(realHeightInput ? realHeightInput.value : 15),
      unit: unitSelect ? unitSelect.value : 'mm',
      scaleX: scaleX,
      scaleY: scaleY,
      fineCorrectionFactor: fineCorrectionFactor,
      isCalibrated: true,
      preserveCalibration: preserveCalibCheck ? preserveCalibCheck.checked : true
    };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
    } catch (e) {
      console.warn("Unable to save to localStorage:", e);
    }
  }

  function loadCalibrationFromStorage() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (!stored) return false;
      const config = JSON.parse(stored);
      if (config && config.isCalibrated) {
        if (realWidthInput) realWidthInput.value = config.realWidth || 30;
        if (realHeightInput) realHeightInput.value = config.realHeight || 15;
        if (unitSelect) unitSelect.value = config.unit || 'mm';
        scaleX = config.scaleX || 1.0;
        scaleY = config.scaleY || 1.0;
        fineCorrectionFactor = config.fineCorrectionFactor || 1.0;
        isCalibrated = true;
        if (preserveCalibCheck) preserveCalibCheck.checked = config.preserveCalibration !== false;
        preserveCalibration = config.preserveCalibration !== false;
        return true;
      }
    } catch (e) {
      console.warn("Unable to load from localStorage:", e);
    }
    return false;
  }

  if (preserveCalibCheck) {
    preserveCalibCheck.addEventListener('change', (e) => {
      preserveCalibration = e.target.checked;
      if (preserveCalibration) {
        saveCalibrationToStorage();
      }
    });
  }

  // Precision Selector
  if (precisionSelect) {
    precisionSelect.addEventListener('change', (e) => {
      precisionStep = parseFloat(e.target.value);
      renderDefectTable();
      updateFineTuneUI();
      requestRender();
    });
  }

  // Measurement Subtool Selection
  function setSubtool(tool) {
    activeSubtool = tool;
    activeMeasurePoints = [];
    
    [toolLineBtn, toolPolylineBtn, toolRectBtn, toolCircleBtn].forEach(btn => {
      if (btn) btn.classList.remove('active');
    });

    if (tool === 'LINE' && toolLineBtn) toolLineBtn.classList.add('active');
    if (tool === 'POLYLINE' && toolPolylineBtn) toolPolylineBtn.classList.add('active');
    if (tool === 'RECTANGLE' && toolRectBtn) toolRectBtn.classList.add('active');
    if (tool === 'CIRCLE' && toolCircleBtn) toolCircleBtn.classList.add('active');

    if (helpTextDisplay) {
      if (tool === 'LINE') helpTextDisplay.textContent = '직선 측정: 시작점을 클릭한 후 끝점을 클릭하세요 (2-Click).';
      if (tool === 'POLYLINE') helpTextDisplay.textContent = '곡선 측정: 여러 점을 순서대로 클릭하고, 더블클릭하여 측정을 완결하세요.';
      if (tool === 'RECTANGLE') helpTextDisplay.textContent = '사각형 측정: 대각선 두 모서리를 2클릭하세요.';
      if (tool === 'CIRCLE') helpTextDisplay.textContent = '원/반경 측정: 원의 중심점을 클릭 후 테두리 점을 클릭하세요.';
    }
    requestRender();
  }

  if (toolLineBtn) toolLineBtn.addEventListener('click', () => setSubtool('LINE'));
  if (toolPolylineBtn) toolPolylineBtn.addEventListener('click', () => setSubtool('POLYLINE'));
  if (toolRectBtn) toolRectBtn.addEventListener('click', () => setSubtool('RECTANGLE'));
  if (toolCircleBtn) toolCircleBtn.addEventListener('click', () => setSubtool('CIRCLE'));

  // Collapsible Cards
  document.querySelectorAll('.card-header.clickable-header').forEach(header => {
    header.addEventListener('click', (e) => {
      if (e.target.tagName === 'BUTTON' || e.target.closest('button')) return;
      const card = header.closest('.card');
      if (card) card.classList.toggle('collapsed');
    });
  });

  // Collapsible Toolbar
  if (toggleToolbarBtn && canvasToolbar) {
    toggleToolbarBtn.addEventListener('click', () => {
      canvasToolbar.classList.toggle('collapsed');
    });
  }

  // Image Brightness & Contrast Controls
  if (brightnessSlider) {
    brightnessSlider.addEventListener('input', (e) => {
      imgBrightness = parseInt(e.target.value);
      requestRender();
    });
  }
  if (contrastSlider) {
    contrastSlider.addEventListener('input', (e) => {
      imgContrast = parseInt(e.target.value);
      requestRender();
    });
  }
  if (resetImgAdjustBtn) {
    resetImgAdjustBtn.addEventListener('click', () => {
      imgBrightness = 100;
      imgContrast = 100;
      if (brightnessSlider) brightnessSlider.value = 100;
      if (contrastSlider) contrastSlider.value = 100;
      requestRender();
    });
  }

  // Text Size Controls (Min 7px)
  if (textSizeSlider) {
    textSizeSlider.addEventListener('input', (e) => {
      labelFontSize = Math.max(7, parseInt(e.target.value));
      if (textSizeDisplay) textSizeDisplay.textContent = `${labelFontSize}px`;
      requestRender();
    });
  }

  // Loupe Zoom Selector
  loupeZoomButtons.forEach(btn => {
    btn.addEventListener('click', (e) => {
      loupeZoomButtons.forEach(b => b.classList.remove('active'));
      e.currentTarget.classList.add('active');
      loupeZoomLevel = parseInt(e.currentTarget.dataset.zoom);
      if (currentZoomBadge) currentZoomBadge.textContent = `${loupeZoomLevel}x`;
      requestRender();
    });
  });

  // Global Defect Lines Toggle
  if (toggleDefectLinesCheck) {
    toggleDefectLinesCheck.addEventListener('change', (e) => {
      globalDefectLinesVisible = e.target.checked;
      requestRender();
    });
  }

  // Rotation Controls
  function updateRotationUI(deg) {
    if (boxRotationSlider) boxRotationSlider.value = deg;
    if (boxRotationInput) boxRotationInput.value = deg;
  }

  function setBboxRotationDegrees(deg) {
    bbox.rotation = (deg * Math.PI) / 180;
    updateRotationUI(deg);
    requestRender();
  }

  if (boxRotationSlider) {
    boxRotationSlider.addEventListener('input', (e) => {
      setBboxRotationDegrees(parseFloat(e.target.value));
    });
  }
  if (boxRotationInput) {
    boxRotationInput.addEventListener('input', (e) => {
      setBboxRotationDegrees(parseFloat(e.target.value || 0));
    });
  }
  if (resetRotationBtn) {
    resetRotationBtn.addEventListener('click', () => {
      setBboxRotationDegrees(0);
    });
  }

  // --- Multi-Image Upload & Handling ---
  if (imageFileInput) {
    imageFileInput.addEventListener('change', (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const files = Array.from(e.target.files);
        let loadedCount = 0;
        const initialLen = uploadedImages.length;

        files.forEach(file => {
          const reader = new FileReader();
          reader.onload = (evt) => {
            uploadedImages.push({
              name: file.name,
              src: evt.target.result
            });
            loadedCount++;
            if (loadedCount === files.length) {
              renderImageQueue();
              switchActiveImage(initialLen);
            }
          };
          reader.readAsDataURL(file);
        });
      }
      e.target.value = '';
    });
  }

  function loadImageFromFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onerror = (err) => {
      console.error("FileReader error:", err);
      alert('파일을 읽는 도중 오류가 발생했습니다.');
    };
    reader.onload = (e) => {
      uploadedImages.push({
        name: file.name,
        src: e.target.result
      });
      renderImageQueue();
      switchActiveImage(uploadedImages.length - 1);
    };
    reader.readAsDataURL(file);
  }

  function loadImgSource(src) {
    const tempImg = new Image();
    tempImg.onerror = (err) => {
      console.error('Image load error:', err);
      alert('이미지를 불러오는데 실패했습니다. 올바른 이미지 파일인지 확인하세요.');
    };
    tempImg.onload = () => {
      img = tempImg;
      if (emptyState) emptyState.style.display = 'none';

      initCanvasSize();
      resetViewToFitImage();

      const marginX = img.width * 0.1;
      const marginY = img.height * 0.1;
      bbox = {
        x: marginX,
        y: marginY,
        w: Math.max(10, img.width - (marginX * 2)),
        h: Math.max(10, img.height - (marginY * 2)),
        rotation: bbox.rotation || 0
      };

      const shouldPreserve = preserveCalibCheck ? preserveCalibCheck.checked : preserveCalibration;

      if (!shouldPreserve || !isCalibrated) {
        isCalibrated = false;
        fineCorrectionFactor = 1.0;
      }

      defects = [];
      nextDefectId = 1;
      activeMeasurePoints = [];

      updateFineTuneUI();
      updateCalibrationScale();

      if (exportPngBtn) exportPngBtn.disabled = false;
      if (exportCsvBtn) exportCsvBtn.disabled = false;
      if (exportPdfBtn) exportPdfBtn.disabled = false;
      renderDefectTable();

      setMode('CALIBRATE');
      requestRender();
    };
    tempImg.src = src;
  }

  if (loadSampleBtn) {
    loadSampleBtn.addEventListener('click', () => {
      const sampleName = "250513-스크레치-인위-11_2.png";
      const samplePath = encodeURI(sampleName);
      
      const existingIdx = uploadedImages.findIndex(i => i.name === sampleName);
      if (existingIdx >= 0) {
        switchActiveImage(existingIdx);
      } else {
        uploadedImages.push({
          name: sampleName,
          src: samplePath
        });
        renderImageQueue();
        switchActiveImage(uploadedImages.length - 1);
      }
    });
  }

  // Multi-File Drag & Drop
  function preventDefaults(e) {
    e.preventDefault();
    e.stopPropagation();
  }

  ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
    window.addEventListener(eventName, preventDefaults, false);
    document.body.addEventListener(eventName, preventDefaults, false);
    if (canvasWrapper) canvasWrapper.addEventListener(eventName, preventDefaults, false);
    if (emptyState) emptyState.addEventListener(eventName, preventDefaults, false);
  });

  ['dragenter', 'dragover'].forEach(eventName => {
    if (canvasWrapper) {
      canvasWrapper.addEventListener(eventName, () => {
        canvasWrapper.classList.add('drag-over');
      }, false);
    }
  });

  ['dragleave', 'drop'].forEach(eventName => {
    if (canvasWrapper) {
      canvasWrapper.addEventListener(eventName, () => {
        canvasWrapper.classList.remove('drag-over');
      }, false);
    }
  });

  function handleFileDrop(e) {
    preventDefaults(e);
    const dt = e.dataTransfer;
    if (dt && dt.files && dt.files.length > 0) {
      const files = Array.from(dt.files);
      let loadedCount = 0;
      const initialLen = uploadedImages.length;

      files.forEach(file => {
        const reader = new FileReader();
        reader.onload = (evt) => {
          uploadedImages.push({
            name: file.name,
            src: evt.target.result
          });
          loadedCount++;
          if (loadedCount === files.length) {
            renderImageQueue();
            switchActiveImage(initialLen);
          }
        };
        reader.readAsDataURL(file);
      });
    }
  }

  window.addEventListener('drop', handleFileDrop, false);
  if (canvasWrapper) canvasWrapper.addEventListener('drop', handleFileDrop, false);
  if (emptyState) emptyState.addEventListener('drop', handleFileDrop, false);

  // View Transformations
  function resetViewToFitImage() {
    if (!img || !mainCanvas) return;
    initCanvasSize();

    const padding = 30;
    const availableW = Math.max(100, mainCanvas.width - padding * 2);
    const availableH = Math.max(100, mainCanvas.height - padding * 2);

    const scaleXRatio = availableW / img.width;
    const scaleYRatio = availableH / img.height;
    
    zoom = Math.max(0.01, Math.min(scaleXRatio, scaleYRatio));

    panX = Math.round((mainCanvas.width - img.width * zoom) / 2);
    panY = Math.round((mainCanvas.height - img.height * zoom) / 2);

    updateZoomDisplay();
    requestRender();
  }

  function updateZoomDisplay() {
    if (zoomLevelDisplay) {
      zoomLevelDisplay.textContent = `${Math.round(zoom * 100)}%`;
    }
  }

  if (zoomInBtn) {
    zoomInBtn.addEventListener('click', () => {
      applyZoom(1.25, mainCanvas.width / 2, mainCanvas.height / 2);
    });
  }

  if (zoomOutBtn) {
    zoomOutBtn.addEventListener('click', () => {
      applyZoom(0.8, mainCanvas.width / 2, mainCanvas.height / 2);
    });
  }

  if (resetViewBtn) {
    resetViewBtn.addEventListener('click', () => {
      resetViewToFitImage();
    });
  }

  function applyZoom(factor, centerCanvasX, centerCanvasY) {
    if (!img) return;
    const newZoom = Math.max(0.05, Math.min(50.0, zoom * factor));
    
    panX = centerCanvasX - (centerCanvasX - panX) * (newZoom / zoom);
    panY = centerCanvasY - (centerCanvasY - panY) * (newZoom / zoom);

    zoom = newZoom;
    updateZoomDisplay();
    requestRender();
  }

  // Coordinate Conversions
  function canvasToImgCoords(cx, cy) {
    return {
      x: (cx - panX) / zoom,
      y: (cy - panY) / zoom
    };
  }

  function imgToCanvasCoords(ix, iy) {
    return {
      x: ix * zoom + panX,
      y: iy * zoom + panY
    };
  }

  // Mode System
  function setMode(mode) {
    currentMode = mode;
    activeMeasurePoints = [];

    if (mode === 'CALIBRATE') {
      if (modeCalibrateBtn) modeCalibrateBtn.classList.add('active');
      if (modeMeasureBtn) modeMeasureBtn.classList.remove('active');
      if (measureSubtoolGroup) measureSubtoolGroup.style.display = 'none';
      if (helpTextDisplay) {
        helpTextDisplay.textContent = '제품 테두리에 영역을 맞추고 회전 조절점으로 기울기를 조절하세요.';
      }
    } else {
      if (modeMeasureBtn) modeMeasureBtn.classList.add('active');
      if (modeCalibrateBtn) modeCalibrateBtn.classList.remove('active');
      if (measureSubtoolGroup) measureSubtoolGroup.style.display = 'flex';
      setSubtool(activeSubtool);
    }
    requestRender();
  }

  if (modeCalibrateBtn) modeCalibrateBtn.addEventListener('click', () => setMode('CALIBRATE'));
  if (modeMeasureBtn) modeMeasureBtn.addEventListener('click', () => setMode('MEASURE'));

  // Calibration Scale & Fine-Tuning
  function updateCalibrationScale() {
    if (bboxPxDims) bboxPxDims.textContent = `${Math.round(bbox.w)} x ${Math.round(bbox.h)} px`;

    const realW = parseFloat(realWidthInput ? realWidthInput.value : 30);
    const realH = parseFloat(realHeightInput ? realHeightInput.value : 15);
    const unit = unitSelect ? unitSelect.value : 'mm';

    if (realW > 0 && realH > 0 && bbox.w > 0 && bbox.h > 0) {
      if (currentMode === 'CALIBRATE' || !isCalibrated) {
        scaleX = realW / bbox.w;
        scaleY = realH / bbox.h;
        isCalibrated = true;
        saveCalibrationToStorage();
      }

      const effectiveScaleX = scaleX * fineCorrectionFactor;
      const effectiveScaleY = scaleY * fineCorrectionFactor;
      const avgPxPerUnit = ((1 / effectiveScaleX) + (1 / effectiveScaleY)) / 2;
      
      if (scaleRatioDisplay) scaleRatioDisplay.textContent = `${avgPxPerUnit.toFixed(2)} px/${unit}`;
      if (calibStatusBadge) {
        const isPreserved = preserveCalibCheck && preserveCalibCheck.checked;
        calibStatusBadge.textContent = isPreserved ? `완료 (유지됨 - ${unit})` : `완료 (${unit})`;
        calibStatusBadge.className = 'status-badge calibrated';
      }
    } else if (!isCalibrated) {
      if (scaleRatioDisplay) scaleRatioDisplay.textContent = '-- px/unit';
      if (calibStatusBadge) {
        calibStatusBadge.textContent = '미완료';
        calibStatusBadge.className = 'status-badge uncalibrated';
      }
    }

    recalculateAllDefectLengths();
  }

  if (applyCalibBtn) {
    applyCalibBtn.addEventListener('click', () => {
      const realW = parseFloat(realWidthInput ? realWidthInput.value : 30);
      const realH = parseFloat(realHeightInput ? realHeightInput.value : 15);
      if (realW > 0 && realH > 0 && bbox.w > 0 && bbox.h > 0) {
        scaleX = realW / bbox.w;
        scaleY = realH / bbox.h;
        isCalibrated = true;
        saveCalibrationToStorage();
      }
      updateCalibrationScale();
      setMode('MEASURE');
    });
  }

  if (resetCalibBtn) {
    resetCalibBtn.addEventListener('click', () => {
      isCalibrated = false;
      scaleX = 1.0;
      scaleY = 1.0;
      fineCorrectionFactor = 1.0;
      localStorage.removeItem(STORAGE_KEY);
      updateCalibrationScale();
      updateFineTuneUI();
      renderDefectTable();
      requestRender();
      alert('캘리브레이션이 초기화되었습니다.');
    });
  }

  if (realWidthInput) realWidthInput.addEventListener('input', updateCalibrationScale);
  if (realHeightInput) realHeightInput.addEventListener('input', updateCalibrationScale);
  if (unitSelect) {
    unitSelect.addEventListener('change', () => {
      updateCalibrationScale();
      renderDefectTable();
      updateFineTuneUI();
      saveCalibrationToStorage();
      requestRender();
    });
  }

  // Fine-Tuning Logic
  function updateFineTuneUI() {
    if (!fineTuneDefectSelect) return;
    
    const selectedId = parseInt(fineTuneDefectSelect.value);
    const selectedDefect = defects.find(d => d.id === selectedId);

    if (selectedDefect) {
      if (fineTuneCurrentValue) {
        fineTuneCurrentValue.value = formatLength(selectedDefect.length);
      }
    } else {
      if (fineTuneCurrentValue) fineTuneCurrentValue.value = '-- mm';
    }

    if (fineFactorDisplay) {
      if (fineCorrectionFactor === 1.0) {
        fineFactorDisplay.textContent = '1.0000x';
        fineFactorDisplay.style.color = 'var(--text-muted)';
      } else {
        fineFactorDisplay.textContent = `${fineCorrectionFactor.toFixed(4)}x`;
        fineFactorDisplay.style.color = 'var(--accent)';
      }
    }
  }

  function populateFineTuneDropdown() {
    if (!fineTuneDefectSelect) return;
    const currentVal = fineTuneDefectSelect.value;
    
    fineTuneDefectSelect.innerHTML = '<option value="">-- 결함 선택 --</option>' +
      defects.map(d => `<option value="${d.id}">#${d.id} (${formatLength(d.length)}) - ${escapeHtml(d.note)}</option>`).join('');

    if (currentVal && defects.some(d => d.id === parseInt(currentVal))) {
      fineTuneDefectSelect.value = currentVal;
    }
  }

  if (fineTuneDefectSelect) {
    fineTuneDefectSelect.addEventListener('change', updateFineTuneUI);
  }

  if (applyFineTuneBtn) {
    applyFineTuneBtn.addEventListener('click', () => {
      const selectedId = parseInt(fineTuneDefectSelect ? fineTuneDefectSelect.value : '');
      const targetVal = parseFloat(fineTuneTargetInput ? fineTuneTargetInput.value : '');

      if (!selectedId) {
        alert('보정 기준이 될 결함 항목을 선택하세요.');
        return;
      }
      if (!targetVal || targetVal <= 0) {
        alert('올바른 실측 치수를 입력하세요.');
        return;
      }

      const defect = defects.find(d => d.id === selectedId);
      if (!defect) return;

      const baseDistance = calculateBaseDefectDistance(defect);
      if (baseDistance <= 0) return;

      const previousFactor = fineCorrectionFactor;
      fineCorrectionFactor = targetVal / baseDistance;
      fineTuneHistory.push({ timestamp: new Date().toISOString(), defectId: selectedId, measured: baseDistance, reference: targetVal, previousFactor, appliedFactor: fineCorrectionFactor });
      
      updateFineTuneUI();
      updateCalibrationScale();
      renderDefectTable();
      saveCalibrationToStorage();
      requestRender();

      alert(`보정이 적용되었습니다! (계수: ${fineCorrectionFactor.toFixed(4)}x)\n모든 결함 치수가 자동 보정되었습니다.`);
    });
  }

  if (resetFineTuneBtn) {
    resetFineTuneBtn.addEventListener('click', () => {
      fineCorrectionFactor = 1.0;
      if (fineTuneTargetInput) fineTuneTargetInput.value = '';
      updateFineTuneUI();
      updateCalibrationScale();
      renderDefectTable();
      saveCalibrationToStorage();
      requestRender();
    });
  }

  // Rotated Bounding Box Geometry & Smooth Dragging
  function getBboxCenter(b) {
    return {
      x: b.x + b.w / 2,
      y: b.y + b.h / 2
    };
  }

  function getRotatedPoint(point, center, angleRad) {
    const cos = Math.cos(angleRad);
    const sin = Math.sin(angleRad);
    const dx = point.x - center.x;
    const dy = point.y - center.y;

    return {
      x: center.x + dx * cos - dy * sin,
      y: center.x + dx * sin + dy * cos
    };
  }

  function getBboxHandles(b) {
    return {
      tl: { x: b.x,       y: b.y },
      tr: { x: b.x + b.w, y: b.y },
      bl: { x: b.x,       y: b.y + b.h },
      br: { x: b.x + b.w, y: b.y + b.h },
      t:  { x: b.x + b.w / 2, y: b.y },
      b:  { x: b.x + b.w / 2, y: b.y + b.h },
      l:  { x: b.x,           y: b.y + b.h / 2 },
      r:  { x: b.x + b.w,     y: b.y + b.h / 2 }
    };
  }

  function getActiveHandleAtCursor(cx, cy) {
    if (!img || (toggleBboxCheck && !toggleBboxCheck.checked)) return null;
    const handles = getBboxHandles(bbox);
    const hitRadius = 24; // Screen pixels

    for (const [key, pt] of Object.entries(handles)) {
      const canvasPt = imgToCanvasCoords(pt.x, pt.y);
      const dist = Math.hypot(cx - canvasPt.x, cy - canvasPt.y);
      if (dist <= hitRadius) {
        return key;
      }
    }
    return null;
  }

  function isPointInsideRotatedBbox(ix, iy) {
    const center = getBboxCenter(bbox);
    const unrotPt = getRotatedPoint({ x: ix, y: iy }, center, -(bbox.rotation || 0));
    const halfW = bbox.w / 2;
    const halfH = bbox.h / 2;

    return Math.abs(unrotPt.x - center.x) <= halfW && Math.abs(unrotPt.y - center.y) <= halfH;
  }

  // Canvas Mouse Events
  if (mainCanvas) {
    mainCanvas.addEventListener('mousedown', (e) => {
      if (!img) return;
      const rect = mainCanvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let rawImgCoords = canvasToImgCoords(cx, cy);

      if (e.button === 1 || e.button === 2 || e.shiftKey || isSpaceKeyDown) {
        isPanning = true;
        startPanX = cx - panX;
        startPanY = cy - panY;
        mainCanvas.style.cursor = 'grabbing';
        return;
      }

      if (currentMode === 'CALIBRATE' && (!toggleBboxCheck || toggleBboxCheck.checked)) {
        const handle = getActiveHandleAtCursor(cx, cy);
        if (handle) {
          isResizingBbox = true;
          activeHandle = handle;
          bboxDragStart = { x: cx, y: cy };
          initialBbox = { ...bbox };
          return;
        } else if (isPointInsideRotatedBbox(rawImgCoords.x, rawImgCoords.y)) {
          isDraggingBbox = true;
          bboxDragStart = { x: rawImgCoords.x, y: rawImgCoords.y };
          initialBbox = { ...bbox };
          return;
        }
      }

      if (currentMode === 'MEASURE') {
        const finalCoords = getSnappedEdgePoint(rawImgCoords);
        handleMeasurementClick(finalCoords);
      }
    });

    mainCanvas.addEventListener('dblclick', (e) => {
      if (currentMode === 'MEASURE' && activeSubtool === 'POLYLINE' && activeMeasurePoints.length >= 2) {
        completeMeasurement();
      }
    });

    mainCanvas.addEventListener('mousemove', (e) => {
      const rect = mainCanvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      let rawImgCoords = canvasToImgCoords(cx, cy);

      let finalImgCoords = rawImgCoords;
      if (currentMode === 'MEASURE' && isEdgeSnapActive) {
        finalImgCoords = getSnappedEdgePoint(rawImgCoords);
      }
      currentCursorImgPos = finalImgCoords;

      if (cursorPosDisplay) {
        cursorPosDisplay.textContent = `X: ${Math.round(finalImgCoords.x)}, Y: ${Math.round(finalImgCoords.y)} px ${finalImgCoords.isSnapped ? '(🧲스냅)' : ''}`;
      }

      if (isPanning) {
        panX = cx - startPanX;
        panY = cy - startPanY;
        requestRender();
        return;
      }

      if (isResizingBbox && activeHandle) {
        const screenDx = (cx - bboxDragStart.x) / zoom;
        const screenDy = (cy - bboxDragStart.y) / zoom;

        const rad = bbox.rotation || 0;
        const cos = Math.cos(-rad);
        const sin = Math.sin(-rad);
        const dx = screenDx * cos - screenDy * sin;
        const dy = screenDx * sin + screenDy * cos;

        let newB = { ...initialBbox };

        if (activeHandle.includes('r')) newB.w = Math.max(10, initialBbox.w + dx);
        if (activeHandle.includes('l')) {
          const w = Math.max(10, initialBbox.w - dx);
          newB.x = initialBbox.x + (initialBbox.w - w);
          newB.w = w;
        }
        if (activeHandle.includes('b')) newB.h = Math.max(10, initialBbox.h + dy);
        if (activeHandle.includes('t')) {
          const h = Math.max(10, initialBbox.h - dy);
          newB.y = initialBbox.y + (initialBbox.h - h);
          newB.h = h;
        }

        bbox = newB;
        updateCalibrationScale();
        requestRender();
        return;
      }

      if (isDraggingBbox) {
        const dx = rawImgCoords.x - bboxDragStart.x;
        const dy = rawImgCoords.y - bboxDragStart.y;
        bbox.x = initialBbox.x + dx;
        bbox.y = initialBbox.y + dy;
        updateCalibrationScale();
        requestRender();
        return;
      }

      if (currentMode === 'CALIBRATE' && (!toggleBboxCheck || toggleBboxCheck.checked)) {
        const handle = getActiveHandleAtCursor(cx, cy);
        if (handle === 'tl' || handle === 'br') {
          mainCanvas.style.cursor = 'nwse-resize';
        } else if (handle === 'tr' || handle === 'bl') {
          mainCanvas.style.cursor = 'nesw-resize';
        } else if (handle === 't' || handle === 'b') {
          mainCanvas.style.cursor = 'ns-resize';
        } else if (handle === 'l' || handle === 'r') {
          mainCanvas.style.cursor = 'ew-resize';
        } else if (isPointInsideRotatedBbox(rawImgCoords.x, rawImgCoords.y)) {
          mainCanvas.style.cursor = 'move';
        } else {
          mainCanvas.style.cursor = 'crosshair';
        }
      } else {
        mainCanvas.style.cursor = isSpaceKeyDown ? 'grabbing' : 'crosshair';
      }

      updateLoupe(cx, cy, finalImgCoords);
      if (currentMode === 'MEASURE' && (activeMeasurePoints.length > 0 || isEdgeSnapActive)) {
        requestRender();
      }
    });

    mainCanvas.addEventListener('wheel', (e) => {
      e.preventDefault();
      const rect = mainCanvas.getBoundingClientRect();
      const cx = e.clientX - rect.left;
      const cy = e.clientY - rect.top;
      const zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
      applyZoom(zoomFactor, cx, cy);
    }, { passive: false });

    mainCanvas.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  window.addEventListener('mouseup', () => {
    isPanning = false;
    isDraggingBbox = false;
    isResizingBbox = false;
    isRotatingBbox = false;
    activeHandle = null;
  });

  // Measurement Workflow for Multi-tools
  function handleMeasurementClick(pt) {
    if (activeSubtool === 'LINE' || activeSubtool === 'RECTANGLE' || activeSubtool === 'CIRCLE') {
      if (activeMeasurePoints.length === 0) {
        activeMeasurePoints.push(pt);
        if (helpTextDisplay) helpTextDisplay.textContent = '첫 번째 점이 지정되었습니다. 끝점을 클릭하세요.';
      } else {
        activeMeasurePoints.push(pt);
        completeMeasurement();
      }
    } else if (activeSubtool === 'POLYLINE') {
      activeMeasurePoints.push(pt);
      if (helpTextDisplay) helpTextDisplay.textContent = `점 ${activeMeasurePoints.length}개 추가됨. 계속 클릭하거나 더블클릭하여 완료하세요.`;
    }
    requestRender();
  }

  function completeMeasurement() {
    if (activeMeasurePoints.length < 2) return;

    const color = DEFECT_COLORS[(nextDefectId - 1) % DEFECT_COLORS.length];
    const item = {
      id: nextDefectId++,
      tool: activeSubtool,
      points: [...activeMeasurePoints],
      color: color,
      note: `결함 #${nextDefectId - 1} (${getToolName(activeSubtool)})`,
      length: 0,
      visible: true
    };

    item.length = calculateDefectRealLength(item);
    defects.push(item);

    activeMeasurePoints = [];
    renderDefectTable();
    populateFineTuneDropdown();

    if (helpTextDisplay) helpTextDisplay.textContent = '측정 완료! 다른 결함을 계속 측정할 수 있습니다.';
    requestRender();
  }

  function getToolName(tool) {
    if (tool === 'LINE') return '직선';
    if (tool === 'POLYLINE') return '곡선';
    if (tool === 'RECTANGLE') return '사각형';
    if (tool === 'CIRCLE') return '원/반경';
    return '측정';
  }

  // Loupe Magnifier
  function updateLoupe(cx, cy, imgCoords) {
    if (!img || !loupeContainer || !loupeCtx || (toggleLoupeCheck && !toggleLoupeCheck.checked)) {
      if (loupeContainer) loupeContainer.style.display = 'none';
      return;
    }

    loupeContainer.style.display = 'flex';

    loupeCtx.fillStyle = '#000';
    loupeCtx.fillRect(0, 0, loupeCanvas.width, loupeCanvas.height);

    const srcW = loupeCanvas.width / loupeZoomLevel;
    const srcH = loupeCanvas.height / loupeZoomLevel;
    const srcX = imgCoords.x - srcW / 2;
    const srcY = imgCoords.y - srcH / 2;

    loupeCtx.imageSmoothingEnabled = false;
    
    if (imgBrightness !== 100 || imgContrast !== 100) {
      loupeCtx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
    } else {
      loupeCtx.filter = 'none';
    }

    loupeCtx.drawImage(
      img,
      srcX, srcY, srcW, srcH,
      0, 0, loupeCanvas.width, loupeCanvas.height
    );

    loupeCtx.filter = 'none';
  }

  if (toggleLoupeCheck) {
    toggleLoupeCheck.addEventListener('change', () => {
      if (!toggleLoupeCheck.checked && loupeContainer) {
        loupeContainer.style.display = 'none';
      }
    });
  }

  if (toggleBboxCheck) {
    toggleBboxCheck.addEventListener('change', requestRender);
  }

  // Distance Calculations for Multi-Tools
  function calculateBaseTwoPointDistance(p1, p2) {
    const dx = (p2.x - p1.x) * scaleX;
    const dy = (p2.y - p1.y) * scaleY;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function calculateBaseDefectDistance(defect) {
    const pts = defect.points;
    if (!pts || pts.length < 2) return 0;

    if (defect.tool === 'LINE' || !defect.tool) {
      return calculateBaseTwoPointDistance(pts[0], pts[1]);
    } else if (defect.tool === 'POLYLINE') {
      let sum = 0;
      for (let i = 0; i < pts.length - 1; i++) {
        sum += calculateBaseTwoPointDistance(pts[i], pts[i + 1]);
      }
      return sum;
    } else if (defect.tool === 'RECTANGLE') {
      return calculateBaseTwoPointDistance(pts[0], pts[1]);
    } else if (defect.tool === 'CIRCLE') {
      return calculateBaseTwoPointDistance(pts[0], pts[1]);
    }
    return 0;
  }

  function calculateDefectRealLength(defect) {
    return calculateBaseDefectDistance(defect) * fineCorrectionFactor;
  }

  function recalculateAllDefectLengths() {
    defects.forEach(d => {
      d.length = calculateDefectRealLength(d);
    });
    renderDefectTable();
  }

  // Precision Formatting
  function formatLength(val) {
    const unit = unitSelect ? unitSelect.value : 'mm';
    let num = val;
    if (unit === 'um') num = val * 1000;
    if (unit === 'cm') num = val / 10;

    let digits = 3;
    if (precisionStep === 0.1) digits = 1;
    else if (precisionStep === 0.01) digits = 2;
    else if (precisionStep === 0.001) digits = 3;
    else if (precisionStep === 0.0001) digits = 4;

    return `${num.toFixed(digits)} ${unit}`;
  }

  function renderDefectTable() {
    if (!defectTableBody) return;
    if (defectCountBadge) defectCountBadge.textContent = `${defects.length}건`;
    if (clearDefectsBtn) clearDefectsBtn.disabled = defects.length === 0;

    if (defects.length === 0) {
      defectTableBody.innerHTML = `
        <tr class="empty-row">
          <td colspan="5">
            <div class="empty-table-msg">
              <i class="fa-solid fa-ruler-vertical"></i><br>
              측정된 결함이 없습니다.<br>
              도구를 선택하여 측정하세요.
            </div>
          </td>
        </tr>
      `;
      populateFineTuneDropdown();
      return;
    }

    defectTableBody.innerHTML = defects.map(d => {
      const isVisible = d.visible !== false;
      const toolTag = getToolName(d.tool || 'LINE');
      return `
        <tr id="defect-row-${d.id}">
          <td>
            <button class="action-btn toggle-vis-btn" data-id="${d.id}" title="${isVisible ? '숨기기' : '표시'}">
              <i class="fa-solid ${isVisible ? 'fa-eye' : 'fa-eye-slash'}" style="${!isVisible ? 'color: var(--danger); opacity: 0.6;' : 'color: var(--primary);'}"></i>
            </button>
          </td>
          <td><span class="defect-badge" style="background-color: ${d.color};">${d.id}</span></td>
          <td><span class="length-val">${formatLength(d.length)}</span> <small style="color: var(--text-subtle); font-size: 0.68rem;">(${toolTag})</small></td>
          <td>
            <input type="text" class="note-input" value="${escapeHtml(d.note)}" data-id="${d.id}">
          </td>
          <td>
            <button class="action-btn delete-btn" data-id="${d.id}" title="삭제">
              <i class="fa-solid fa-trash"></i>
            </button>
          </td>
        </tr>
      `;
    }).join('');

    defectTableBody.querySelectorAll('.toggle-vis-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        const def = defects.find(item => item.id === id);
        if (def) {
          def.visible = (def.visible === false) ? true : false;
          renderDefectTable();
          requestRender();
        }
      });
    });

    defectTableBody.querySelectorAll('.note-input').forEach(input => {
      input.addEventListener('change', (e) => {
        const id = parseInt(e.target.dataset.id);
        const def = defects.find(item => item.id === id);
        if (def) def.note = e.target.value;
        populateFineTuneDropdown();
      });
    });

    defectTableBody.querySelectorAll('.delete-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const id = parseInt(e.currentTarget.dataset.id);
        defects = defects.filter(item => item.id !== id);
        renderDefectTable();
        populateFineTuneDropdown();
        updateFineTuneUI();
        requestRender();
      });
    });

    populateFineTuneDropdown();
  }

  if (clearDefectsBtn) {
    clearDefectsBtn.addEventListener('click', () => {
      if (confirm('모든 결함 측정 기록을 삭제하시겠습니까?')) {
        defects = [];
        renderDefectTable();
        populateFineTuneDropdown();
        updateFineTuneUI();
        requestRender();
      }
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, (m) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;'
    }[m]));
  }

  function drawRoundRectPath(context, x, y, w, h, r) {
    if (context.roundRect) {
      context.roundRect(x, y, w, h, r);
    } else {
      context.rect(x, y, w, h);
    }
  }

  // --- Render Loop ---
  let animationFrameId = null;

  function requestRender() {
    if (animationFrameId) cancelAnimationFrame(animationFrameId);
    animationFrameId = requestAnimationFrame(render);
  }

  function render() {
    if (!ctx || !mainCanvas) return;
    ctx.clearRect(0, 0, mainCanvas.width, mainCanvas.height);

    if (!img) return;

    ctx.save();
    ctx.translate(panX, panY);
    ctx.scale(zoom, zoom);

    // 1. Draw Base Image with Brightness & Contrast Filter
    if (imgBrightness !== 100 || imgContrast !== 100) {
      ctx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
    } else {
      ctx.filter = 'none';
    }
    ctx.drawImage(img, 0, 0);
    ctx.filter = 'none';

    // 2. Draw Calibration Bounding Box with Rotation
    if (!toggleBboxCheck || toggleBboxCheck.checked) {
      drawBoundingBox(ctx);
    }

    // 3. Draw Finished Defect Measurements (With text label)
    if (globalDefectLinesVisible) {
      defects.forEach(d => {
        if (d.visible !== false) {
          drawDefectShape(ctx, d, false);
        }
      });
    }

    // 4. Draw Pending Measurement
    if (currentMode === 'MEASURE' && activeMeasurePoints.length > 0) {
      const pendingPts = [...activeMeasurePoints, currentCursorImgPos];
      const pendingDefect = {
        tool: activeSubtool,
        points: pendingPts,
        color: '#3b82f6',
        id: '...'
      };
      drawDefectShape(ctx, pendingDefect, true);
    }

    // 5. Draw Edge Snap Indicator Ring
    if (currentMode === 'MEASURE' && isEdgeSnapActive && currentCursorImgPos && currentCursorImgPos.isSnapped) {
      ctx.save();
      ctx.strokeStyle = '#06b6d4';
      ctx.lineWidth = 2 / zoom;
      ctx.beginPath();
      ctx.arc(currentCursorImgPos.x, currentCursorImgPos.y, 8 / zoom, 0, Math.PI * 2);
      ctx.stroke();

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(currentCursorImgPos.x, currentCursorImgPos.y, 2 / zoom, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.restore();

    // 6. Draw Overlay Scale Bar
    drawScaleBarOverlay(ctx);
  }

  // Draw Bounding Box and Handles
  function drawBoundingBox(ctx) {
    ctx.save();

    // 1. Blue dashed bounding box
    ctx.strokeStyle = '#3b82f6';
    ctx.lineWidth = 2 / zoom;
    ctx.setLineDash([6 / zoom, 4 / zoom]);
    ctx.strokeRect(bbox.x, bbox.y, bbox.w, bbox.h);
    ctx.fillStyle = 'rgba(59, 130, 246, 0.05)';
    ctx.fillRect(bbox.x, bbox.y, bbox.w, bbox.h);

    // 2. Draw 8 white handle dots directly on box corners and edge midpoints
    const handles = getBboxHandles(bbox);
    const handleRadius = Math.max(5 / zoom, 7 / Math.sqrt(zoom));

    for (const [key, pt] of Object.entries(handles)) {
      ctx.beginPath();
      ctx.fillStyle = '#ffffff';
      ctx.strokeStyle = '#2563eb';
      ctx.lineWidth = 2 / zoom;
      ctx.arc(pt.x, pt.y, handleRadius, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
    }

    ctx.restore();
  }

  // Draw Defect Shape according to Tool Type
  function drawDefectShape(ctx, defect, isPending = false) {
    const pts = defect.points;
    if (!pts || pts.length === 0) return;

    const tool = defect.tool || 'LINE';
    const color = defect.color || '#3b82f6';
    ctx.save();

    if (tool === 'LINE') {
      if (pts.length >= 2) {
        drawLinePath(ctx, pts[0], pts[1], color, isPending);
        if (!isPending) {
          const distStr = formatLength(defect.length);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          drawLabelBox(ctx, midX, midY, `#${defect.id}: ${distStr}`, color);
        }
      }
    } else if (tool === 'POLYLINE') {
      drawPolylinePath(ctx, pts, color, isPending);
      if (!isPending && pts.length >= 2) {
        const distStr = formatLength(defect.length);
        const lastPt = pts[pts.length - 1];
        drawLabelBox(ctx, lastPt.x, lastPt.y, `#${defect.id} (곡선): ${distStr}`, color);
      }
    } else if (tool === 'RECTANGLE') {
      if (pts.length >= 2) {
        drawRectPath(ctx, pts[0], pts[1], color, isPending);
        if (!isPending) {
          const distStr = formatLength(defect.length);
          const midX = (pts[0].x + pts[1].x) / 2;
          const midY = (pts[0].y + pts[1].y) / 2;
          drawLabelBox(ctx, midX, midY, `#${defect.id} (대각): ${distStr}`, color);
        }
      }
    } else if (tool === 'CIRCLE') {
      if (pts.length >= 2) {
        drawCirclePath(ctx, pts[0], pts[1], color, isPending);
        if (!isPending) {
          const radiusStr = formatLength(defect.length);
          drawLabelBox(ctx, pts[1].x, pts[1].y, `#${defect.id} (반경): ${radiusStr}`, color);
        }
      }
    }

    ctx.restore();
  }

  function drawLinePath(ctx, p1, p2, color, isPending) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 5 / zoom;
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 / zoom;
    if (isPending) ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(p1.x, p1.y);
    ctx.lineTo(p2.x, p2.y);
    ctx.stroke();

    const r = 5 / zoom;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(p1.x, p1.y, r, 0, Math.PI * 2);
    ctx.arc(p2.x, p2.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawPolylinePath(ctx, pts, color, isPending) {
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 5 / zoom;
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2.5 / zoom;
    if (isPending) ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.moveTo(pts[0].x, pts[0].y);
    for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();

    const r = 4 / zoom;
    ctx.fillStyle = color;
    pts.forEach(pt => {
      ctx.beginPath();
      ctx.arc(pt.x, pt.y, r, 0, Math.PI * 2);
      ctx.fill();
    });
  }

  function drawRectPath(ctx, p1, p2, color, isPending) {
    const minX = Math.min(p1.x, p2.x);
    const minY = Math.min(p1.y, p2.y);
    const w = Math.abs(p2.x - p1.x);
    const h = Math.abs(p2.y - p1.y);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4 / zoom;
    ctx.strokeRect(minX, minY, w, h);

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / zoom;
    if (isPending) ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.strokeRect(minX, minY, w, h);
    ctx.fillStyle = color === '#3b82f6' ? 'rgba(59, 130, 246, 0.1)' : 'rgba(255, 255, 255, 0.05)';
    ctx.fillRect(minX, minY, w, h);
  }

  function drawCirclePath(ctx, center, edge, color, isPending) {
    const rad = calculateBaseTwoPointDistance(center, edge) / (scaleX || 1);

    ctx.strokeStyle = 'rgba(0, 0, 0, 0.7)';
    ctx.lineWidth = 4 / zoom;
    ctx.beginPath();
    ctx.arc(center.x, center.y, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.strokeStyle = color;
    ctx.lineWidth = 2 / zoom;
    if (isPending) ctx.setLineDash([4 / zoom, 4 / zoom]);
    ctx.beginPath();
    ctx.arc(center.x, center.y, rad, 0, Math.PI * 2);
    ctx.stroke();

    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(edge.x, edge.y);
    ctx.stroke();

    const r = 4 / zoom;
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(center.x, center.y, r, 0, Math.PI * 2);
    ctx.arc(edge.x, edge.y, r, 0, Math.PI * 2);
    ctx.fill();
  }

  function drawLabelBox(ctx, x, y, textStr, color) {
    const fontSize = Math.max(7 / zoom, labelFontSize / zoom);
    ctx.font = `bold ${fontSize}px 'JetBrains Mono', sans-serif`;

    const textMetrics = ctx.measureText(textStr);
    const paddingX = 8 / zoom;
    const paddingY = 6 / zoom;
    const boxW = textMetrics.width + paddingX * 2;
    const boxH = fontSize + paddingY * 2;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.9)';
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5 / zoom;
    ctx.beginPath();
    drawRoundRectPath(ctx, x - boxW / 2, y - boxH / 2 - 16 / zoom, boxW, boxH, 6 / zoom);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(textStr, x, y - 16 / zoom);
  }

  function drawScaleBarOverlay(ctx) {
    if (!isCalibrated || !img || !mainCanvas) return;

    ctx.save();
    const barPx = 100 * zoom;
    const effectiveScaleX = scaleX * fineCorrectionFactor;
    const realLength = barPx * effectiveScaleX;

    const marginX = 20;
    const marginY = mainCanvas.height - 35;

    ctx.fillStyle = 'rgba(15, 23, 42, 0.85)';
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    drawRoundRectPath(ctx, marginX, marginY - 25, barPx + 20, 35, 6);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#10b981';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(marginX + 10, marginY);
    ctx.lineTo(marginX + 10 + barPx, marginY);
    ctx.moveTo(marginX + 10, marginY - 4);
    ctx.lineTo(marginX + 10, marginY + 4);
    ctx.moveTo(marginX + 10 + barPx, marginY - 4);
    ctx.lineTo(marginX + 10 + barPx, marginY + 4);
    ctx.stroke();

    ctx.fillStyle = '#f8fafc';
    ctx.font = "bold 11px 'JetBrains Mono', sans-serif";
    ctx.textAlign = 'center';
    ctx.fillText(`${formatLength(realLength)} (Scale)`, marginX + 10 + barPx / 2, marginY - 8);

    ctx.restore();
  }

  // Export PNG
  if (exportPngBtn) {
    exportPngBtn.addEventListener('click', () => {
      if (!img) return;

      const offCanvas = document.createElement('canvas');
      offCanvas.width = img.width;
      offCanvas.height = img.height;
      const offCtx = offCanvas.getContext('2d');

      if (imgBrightness !== 100 || imgContrast !== 100) {
        offCtx.filter = `brightness(${imgBrightness}%) contrast(${imgContrast}%)`;
      }
      offCtx.drawImage(img, 0, 0);
      offCtx.filter = 'none';

      if (!toggleBboxCheck || toggleBboxCheck.checked) {
        const center = getBboxCenter(bbox);
        offCtx.save();
        offCtx.translate(center.x, center.y);
        offCtx.rotate(bbox.rotation || 0);
        offCtx.strokeStyle = '#3b82f6';
        offCtx.lineWidth = 3;
        offCtx.setLineDash([8, 6]);
        offCtx.strokeRect(-bbox.w / 2, -bbox.h / 2, bbox.w, bbox.h);
        offCtx.restore();
      }

      if (globalDefectLinesVisible) {
        defects.forEach(d => {
          if (d.visible !== false) {
            drawDefectShape(offCtx, d, false);
          }
        });
      }

      const a = document.createElement('a');
      a.download = `NanoMeasure_Defect_Analysis_${Date.now()}.png`;
      a.href = offCanvas.toDataURL('image/png');
      a.click();
    });
  }

  // Export CSV
  if (exportCsvBtn) {
    exportCsvBtn.addEventListener('click', () => {
      if (!isCalibrated) {
        alert('CSV를 내보내기 전에 이미지 캘리브레이션을 완료하세요.');
        return;
      }
      if (defects.length === 0) {
        alert('내보낼 결함 측정 데이터가 없습니다.');
        return;
      }

      const unit = unitSelect ? unitSelect.value : 'mm';
      let csvContent = `App_Version,ID,Tool,Points,Real_Length,Unit,Fine_Factor,Display_Resolution,Note,Timestamp\n`;

      defects.forEach(d => {
        const noteClean = `"${safeSpreadsheetText(d.note || '').replace(/"/g, '""')}"`;
        const ptsStr = `"${JSON.stringify(d.points).replace(/"/g, '""')}"`;
        csvContent += `${APP_VERSION},${d.id},${d.tool || 'LINE'},${ptsStr},${d.length.toFixed(4)},${unit},${fineCorrectionFactor.toFixed(4)},${precisionStep},${noteClean},${new Date().toISOString()}\n`;
      });

      const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
      const a = document.createElement('a');
      a.download = `defect_measurements_${Date.now()}.csv`;
      a.href = URL.createObjectURL(blob);
      a.click();
    });
  }

  // Restore saved calibration on startup
  loadCalibrationFromStorage();

  // Auto-load sample image on startup into Queue!
  setTimeout(() => {
    const sampleName = "250513-스크레치-인위-11_2.png";
    const samplePath = encodeURI(sampleName);
    uploadedImages.push({
      name: sampleName,
      src: samplePath
    });
    renderImageQueue();
    switchActiveImage(0);
  }, 150);

});
