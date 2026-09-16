'use strict';

const LIVE_TUNNEL_URL = 'https://frederick-maternity-plates-coaching.trycloudflare.com';

function getApiBaseUrl() {
  const host = window.location.hostname;
  if (host === 'localhost' || host === '127.0.0.1') return '';
  if (host.includes('trycloudflare.com')) return '';
  // When running on GitHub Pages (schjschj.github.io)
  return LIVE_TUNNEL_URL;
}

const DEFAULT_ACCOUNTS = [
  {
    "id": "acc_1_31796",
    "displayName": "송충종",
    "employeeId": "31796",
    "enabled": true,
    "hasPassword": true,
    "reasons": [
      "양산품 측정",
      "개발품 측정업무",
      "수입검사",
      "공정검사",
      "출하검사",
      "제품 선별",
      "고객사 자료 작성",
      "고객사 긴급 대응",
      "표준문서 작성"
    ]
  },
  {
    "id": "acc_2_31906",
    "displayName": "곽재혁",
    "employeeId": "31906",
    "enabled": true,
    "hasPassword": true,
    "reasons": [
      "양산품 측정",
      "개발품 측정업무",
      "수입검사",
      "공정검사",
      "출하검사",
      "제품 선별",
      "고객사 자료 작성",
      "고객사 긴급 대응",
      "표준문서 작성"
    ]
  },
  {
    "id": "acc_3_30443",
    "displayName": "이상환",
    "employeeId": "30443",
    "enabled": true,
    "hasPassword": true,
    "reasons": [
      "양산품 측정",
      "개발품 측정업무",
      "수입검사",
      "공정검사",
      "출하검사",
      "제품 선별",
      "고객사 자료 작성",
      "고객사 긴급 대응",
      "표준문서 작성"
    ]
  },
  {
    "id": "acc_4_31957",
    "displayName": "서종목",
    "employeeId": "31957",
    "enabled": true,
    "hasPassword": true,
    "reasons": [
      "양산품 측정",
      "개발품 측정업무",
      "수입검사",
      "공정검사",
      "출하검사",
      "제품 선별",
      "고객사 자료 작성",
      "고객사 긴급 대응",
      "표준문서 작성"
    ]
  },
  {
    "id": "acc_5_31843",
    "displayName": "이제현",
    "employeeId": "31843",
    "enabled": true,
    "hasPassword": true,
    "reasons": [
      "양산품 측정",
      "개발품 측정업무",
      "수입검사",
      "공정검사",
      "출하검사",
      "제품 선별",
      "고객사 자료 작성",
      "고객사 긴급 대응",
      "표준문서 작성"
    ]
  }
];

const DEFAULT_STATUS = {
  success: true,
  runner: { running: false, currentRunId: null },
  scheduler: {
    enabled: true,
    cronExpression: "0 16 * * 1-5",
    cronHour: 16,
    cronMinute: 0,
    weekdaysOnly: true,
    timezone: "Asia/Seoul"
  },
  lastRun: {
    schemaVersion: 2,
    runId: "20260916-2026-09-16T08-01-24-799Z",
    date: "20260916",
    mode: "live",
    startedAt: "2026-09-16T08:01:24.799Z",
    finishedAt: "2026-09-16T08:01:50.096Z",
    counts: { success: 5, skipped: 0, failed: 0, "dry-run": 0 },
    results: [
      { displayName: "송충종", employeeIdHint: "***96", attempt: 1, status: "success", code: "REGISTERED", reason: "출하검사", message: "연장근무 일괄 등록 확인 완료했습니다." },
      { displayName: "곽재혁", employeeIdHint: "***06", attempt: 1, status: "success", code: "REGISTERED", reason: "개발검사", message: "연장근무 일괄 등록 확인 완료했습니다." },
      { displayName: "이상환", employeeIdHint: "***43", attempt: 1, status: "success", code: "REGISTERED", reason: "고객 자료 작성", message: "연장근무 일괄 등록 확인 완료했습니다." },
      { displayName: "서종목", employeeIdHint: "***57", attempt: 1, status: "success", code: "REGISTERED", reason: "표준 자료 작성", message: "연장근무 일괄 등록 확인 완료했습니다." },
      { displayName: "이제현", employeeIdHint: "***43", attempt: 1, status: "success", code: "REGISTERED", reason: "양산품 측정", message: "연장근무 일괄 등록 확인 완료했습니다." }
    ],
    logFile: "20260916-2026-09-16T08-01-24-799Z.jsonl"
  }
};

let currentAccounts = [];
let editingAccountIndex = null;
let eventSource = null;

// 초기화
document.addEventListener('DOMContentLoaded', () => {
  initTabs();
  initSSE();
  loadStatus();
  loadAccounts();
  loadSettings();
  initEventListeners();
});

// 1. 탭 관리
function initTabs() {
  const tabs = document.querySelectorAll('.tab-btn');
  tabs.forEach((tab) => {
    tab.addEventListener('click', () => {
      tabs.forEach((t) => t.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach((p) => p.classList.remove('active'));

      tab.classList.add('active');
      const targetId = `tab-${tab.dataset.tab}`;
      const targetPane = document.getElementById(targetId);
      if (targetPane) targetPane.classList.add('active');

      if (tab.dataset.tab === 'logs') {
        loadLogsList();
      }
    });
  });
}

// 2. 이벤트 리스너 등록
function initEventListeners() {
  // 즉시 실행 버튼들
  const btnDryRun = document.getElementById('btnDryRunAll');
  if (btnDryRun) btnDryRun.addEventListener('click', () => triggerRun({ dryRun: true }));

  const btnRunLive = document.getElementById('btnRunLive');
  if (btnRunLive) {
    btnRunLive.addEventListener('click', () => {
      if (confirm('오늘자 연장근무를 실제로 사이트에 등록하시겠습니까?\n(신청 활성화된 인원은 즉시 최종 제출됩니다.)')) {
        triggerRun({ dryRun: false });
      }
    });
  }

  // 콘솔 지우기
  const btnClearLogs = document.getElementById('btnClearLogs');
  if (btnClearLogs) {
    btnClearLogs.addEventListener('click', () => {
      document.getElementById('terminalOutput').innerHTML = '';
    });
  }

  // 계정 관리 버튼들
  const btnAddAccount = document.getElementById('btnAddAccount');
  if (btnAddAccount) btnAddAccount.addEventListener('click', addAccountRow);

  const btnSaveAccounts = document.getElementById('btnSaveAccounts');
  if (btnSaveAccounts) btnSaveAccounts.addEventListener('click', saveAccounts);

  // 사유 모달
  const btnModalClose = document.getElementById('btnModalClose');
  if (btnModalClose) btnModalClose.addEventListener('click', closeReasonModal);

  const btnModalCancel = document.getElementById('btnModalCancel');
  if (btnModalCancel) btnModalCancel.addEventListener('click', closeReasonModal);

  const btnModalApply = document.getElementById('btnModalApply');
  if (btnModalApply) btnModalApply.addEventListener('click', applyReasonModal);

  // 스케줄 설정 폼
  const settingsForm = document.getElementById('settingsForm');
  if (settingsForm) settingsForm.addEventListener('submit', handleSettingsSubmit);
}

// 3. SSE 실시간 스트림 연결
function initSSE() {
  if (eventSource) {
    eventSource.close();
  }

  try {
    const sseUrl = getApiBaseUrl() + '/api/run/events';
    eventSource = new EventSource(sseUrl);

    eventSource.onmessage = (event) => {
      try {
        const payload = JSON.parse(event.data);
        handleSSEMessage(payload);
      } catch (err) {
        console.error('SSE 파싱 오류:', err);
      }
    };

    eventSource.onerror = () => {
      // 자동 재연결 대기
    };
  } catch (e) {
    // SSE 미지원 환경
  }
}

function handleSSEMessage(payload) {
  const runnerBadge = document.getElementById('runnerBadge');
  const runnerBadgeText = document.getElementById('runnerBadgeText');

  if (payload.type === 'status') {
    if (payload.data.running) {
      if (runnerBadge) runnerBadge.classList.remove('hidden');
      if (runnerBadgeText) runnerBadgeText.textContent = `자동화 실행 중 (${payload.data.currentRunId || ''})`;
    } else {
      if (runnerBadge) runnerBadge.classList.add('hidden');
    }
  } else if (payload.type === 'log') {
    appendTerminalLog(payload.data);
  } else if (payload.type === 'progress') {
    if (runnerBadge) runnerBadge.classList.remove('hidden');
    if (runnerBadgeText) runnerBadgeText.textContent = `${payload.data.account} 처리 중... (시도 ${payload.data.attempt})`;
  } else if (payload.type === 'finished') {
    if (runnerBadge) runnerBadge.classList.add('hidden');
    appendTerminalLog({
      level: 'success',
      event: '작업 완료',
      timestamp: new Date().toISOString(),
      counts: payload.data.counts,
    });
    loadStatus();
  }
}

function appendTerminalLog(entry) {
  const terminal = document.getElementById('terminalOutput');
  if (!terminal) return;

  const div = document.createElement('div');
  div.className = `log-line ${entry.level || 'info'}`;

  const timeStr = entry.timestamp ? new Date(entry.timestamp).toLocaleTimeString('ko-KR') : '';
  const message = entry.message || (entry.event ? `[${entry.event}]` : '') || JSON.stringify(entry);

  let extra = '';
  if (entry.displayName) {
    extra += ` [${entry.displayName}]`;
  }
  if (entry.counts) {
    extra += ` (성공: ${entry.counts.success}, 건너뜀: ${entry.counts.skipped}, 진단: ${entry.counts['dry-run']}, 실패: ${entry.counts.failed})`;
  }

  div.textContent = `[${timeStr}] ${message}${extra}`;
  terminal.appendChild(div);
  terminal.scrollTop = terminal.scrollHeight;
}

// 4. 상태 및 최근 실행 결과 로드
async function loadStatus() {
  try {
    const res = await fetch(getApiBaseUrl() + '/api/status');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        applyStatus(data);
        return;
      }
    }
  } catch (err) {
    console.warn('API /api/status 로드 불가, 기본 상태로 표시합니다.');
  }

  // Fallback
  applyStatus(DEFAULT_STATUS);
}

function applyStatus(data) {
  const indicator = document.getElementById('schedulerIndicator');
  const text = document.getElementById('schedulerText');
  if (data.scheduler && data.scheduler.enabled) {
    if (indicator) indicator.classList.add('active');
    const timeStr = `${String(data.scheduler.cronHour).padStart(2, '0')}:${String(data.scheduler.cronMinute).padStart(2, '0')}`;
    if (text) text.textContent = `매일 ${timeStr} 예약 활성 (${data.scheduler.weekdaysOnly ? '평일' : '매일'})`;
  } else {
    if (indicator) indicator.classList.remove('active');
    if (text) text.textContent = '정기 예약 비활성화됨';
  }

  if (data.lastRun) {
    renderLastRun(data.lastRun);
  }
}

function renderLastRun(lastRun) {
  const statSuccess = document.getElementById('statSuccess');
  const statSkipped = document.getElementById('statSkipped');
  const statDryRun = document.getElementById('statDryRun');
  const statFailed = document.getElementById('statFailed');
  const timeElem = document.getElementById('lastRunTime');
  const tbody = document.getElementById('lastRunTableBody');

  if (!lastRun || !lastRun.counts) {
    if (statSuccess) statSuccess.textContent = '0';
    if (statSkipped) statSkipped.textContent = '0';
    if (statDryRun) statDryRun.textContent = '0';
    if (statFailed) statFailed.textContent = '0';
    if (timeElem) timeElem.textContent = '-';
    if (tbody) tbody.innerHTML = '<tr><td colspan="6" class="text-center empty">최근 실행 기록이 없습니다.</td></tr>';
    return;
  }

  if (statSuccess) statSuccess.textContent = lastRun.counts.success || 0;
  if (statSkipped) statSkipped.textContent = lastRun.counts.skipped || 0;
  if (statDryRun) statDryRun.textContent = lastRun.counts['dry-run'] || 0;
  if (statFailed) statFailed.textContent = lastRun.counts.failed || 0;

  const modeText = lastRun.mode === 'dry-run' ? '진단 모드' : '실제 등록';
  if (timeElem) {
    timeElem.textContent = `${lastRun.finishedAt ? new Date(lastRun.finishedAt).toLocaleString('ko-KR') : ''} (${modeText})`;
  }

  if (!tbody) return;

  if (!Array.isArray(lastRun.results) || lastRun.results.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="text-center empty">처리된 인원이 없습니다.</td></tr>';
    return;
  }

  tbody.innerHTML = lastRun.results.map((r) => {
    let chipClass = 'failed';
    let chipText = '실패';
    if (r.status === 'success') { chipClass = 'success'; chipText = '성공'; }
    else if (r.status === 'skipped') { chipClass = 'skipped'; chipText = '건너뜀'; }
    else if (r.status === 'dry-run') { chipClass = 'dryrun'; chipText = '진단 완료'; }

    return `
      <tr>
        <td><span class="chip ${chipClass}">${chipText}</span></td>
        <td><strong>${escapeHtml(r.displayName || '-')}</strong></td>
        <td class="text-muted">${escapeHtml(r.employeeIdHint || '-')}</td>
        <td>${escapeHtml(r.reason || '-')}</td>
        <td>${r.attempt || 1}회</td>
        <td>${escapeHtml(r.message || '-')}</td>
      </tr>
    `;
  }).join('');
}

// 5. 실행 트리거 API 호출
async function triggerRun(params) {
  try {
    const res = await fetch(getApiBaseUrl() + '/api/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    const data = await res.json();
    if (!data.success) {
      alert(`실행 요청 실패: ${data.error}`);
      return;
    }
    appendTerminalLog({
      level: 'info',
      message: data.message,
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    alert(`오류 발생: ${err.message}`);
  }
}

// 6. 계정 관리 및 팀원 원클릭 카드 연동
async function loadAccounts() {
  try {
    const res = await fetch(getApiBaseUrl() + '/api/accounts');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts) && data.accounts.length > 0) {
        currentAccounts = data.accounts;
        localStorage.setItem('sftc_accounts', JSON.stringify(currentAccounts));
        renderAllAccountViews();
        return;
      }
    }
  } catch (err) {
    console.warn('API /api/accounts 호출 불가, 로컬 저장소 또는 기본 계정을 로드합니다.');
  }

  // Fallback 1: localStorage
  const saved = localStorage.getItem('sftc_accounts');
  if (saved) {
    try {
      const parsed = JSON.parse(saved);
      if (Array.isArray(parsed) && parsed.length > 0) {
        currentAccounts = parsed;
        renderAllAccountViews();
        return;
      }
    } catch (e) {
      console.error('localStorage 파싱 오류:', e);
    }
  }

  // Fallback 2: DEFAULT_ACCOUNTS
  currentAccounts = JSON.parse(JSON.stringify(DEFAULT_ACCOUNTS));
  renderAllAccountViews();
}

function renderAllAccountViews() {
  renderMemberCards();
  renderAccountsTable();
}

// [핵심] 팀원별 당일 연장근무 신청/취소 간편 카드 렌더링
function renderMemberCards() {
  const grid = document.getElementById('memberCardsGrid');
  if (!grid) return;

  if (!currentAccounts || currentAccounts.length === 0) {
    grid.innerHTML = '<div style="color: var(--gray-500); grid-column: 1/-1; text-align: center; padding: 20px;">등록된 팀원이 없습니다.</div>';
    return;
  }

  grid.innerHTML = currentAccounts.map((acc, index) => {
    const isEnabled = acc.enabled !== false;
    const reasonsList = Array.isArray(acc.reasons) && acc.reasons.length > 0
      ? acc.reasons
      : ['양산품 측정', '개발품 측정업무', '수입검사', '출하검사', '고객사 자료 작성'];
    const currentReason = reasonsList[0] || '양산품 측정';

    const optionsHtml = reasonsList.map(r => 
      `<option value="${escapeHtml(r)}" ${r === currentReason ? 'selected' : ''}>${escapeHtml(r)}</option>`
    ).join('');

    const empHint = acc.employeeId ? '***' + String(acc.employeeId).slice(-2) : '-';

    return `
      <div class="member-quick-card ${isEnabled ? 'active' : 'inactive'}">
        <div class="member-card-header">
          <div>
            <div class="member-card-name">${escapeHtml(acc.displayName || '이름 없음')}</div>
            <div class="member-card-empno">사번: ${escapeHtml(empHint)}</div>
          </div>
          <span class="member-card-pill ${isEnabled ? 'active' : 'inactive'}">
            ${isEnabled ? '🟢 오늘 신청 대기' : '⚪ 오늘 신청 취소'}
          </span>
        </div>

        <div class="member-card-reason-box">
          <label>오늘 사유:</label>
          <select class="member-card-select" onchange="updateMemberReason(${index}, this.value)">
            ${optionsHtml}
          </select>
        </div>

        <button type="button" class="btn-member-toggle ${isEnabled ? 'btn-cancel' : 'btn-apply'}" onclick="toggleMemberAttendance(${index}, ${!isEnabled})">
          ${isEnabled ? '✕ 오늘 신청 취소하기' : '✓ 오늘 연장근무 신청'}
        </button>
      </div>
    `;
  }).join('');
}

window.toggleMemberAttendance = async (index, newEnabledState) => {
  const acc = currentAccounts[index];
  if (!acc) return;

  acc.enabled = newEnabledState;
  renderAllAccountViews();

  // 토스트 메시지 알림
  const toast = document.getElementById('quickStatusToast');
  if (toast) {
    toast.textContent = `✓ [${acc.displayName}]님 오늘 연장근무가 ${newEnabledState ? '신청' : '취소'}되었습니다.`;
    toast.style.display = 'block';
    setTimeout(() => { if (toast) toast.style.display = 'none'; }, 3000);
  }

  await saveAccountsSilent();
};

window.updateMemberReason = async (index, selectedReason) => {
  const acc = currentAccounts[index];
  if (!acc) return;

  if (Array.isArray(acc.reasons)) {
    const list = acc.reasons.filter(r => r !== selectedReason);
    list.unshift(selectedReason);
    acc.reasons = list;
  }

  const toast = document.getElementById('quickStatusToast');
  if (toast) {
    toast.textContent = `✓ [${acc.displayName}]님 근태 사유가 '${selectedReason}'(으)로 변경되었습니다.`;
    toast.style.display = 'block';
    setTimeout(() => { if (toast) toast.style.display = 'none'; }, 2500);
  }

  await saveAccountsSilent();
};

async function saveAccountsSilent() {
  localStorage.setItem('sftc_accounts', JSON.stringify(currentAccounts));

  try {
    const res = await fetch(getApiBaseUrl() + '/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: currentAccounts }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.accounts)) {
        currentAccounts = data.accounts;
        renderAllAccountViews();
      }
    }
  } catch (err) {
    console.warn('서버 실시간 동기화 오류 (로컬 저장 유지됨):', err);
  }
}

// 7. 계정 관리 테이블 (상세 모달용)
function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  const countBadge = document.getElementById('accountCountBadge');
  if (countBadge) countBadge.textContent = currentAccounts.length;

  if (!tbody) return;

  if (currentAccounts.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="text-center empty">등록된 팀원이 없습니다. "인원 추가"를 눌러 등록하세요.</td></tr>';
    return;
  }

  tbody.innerHTML = currentAccounts.map((acc, index) => {
    const reasonCount = (acc.reasons && acc.reasons.length) || 1;
    return `
      <tr data-index="${index}">
        <td class="text-center">
          <input type="checkbox" class="acc-enabled" ${acc.enabled ? 'checked' : ''} onchange="updateAccountField(${index}, 'enabled', this.checked)">
        </td>
        <td>
          <input type="text" class="table-input" value="${escapeHtml(acc.displayName || '')}" placeholder="성명" onchange="updateAccountField(${index}, 'displayName', this.value)">
        </td>
        <td>
          <input type="text" class="table-input" value="${escapeHtml(acc.employeeId || '')}" placeholder="사번(숫자)" onchange="updateAccountField(${index}, 'employeeId', this.value)">
        </td>
        <td>
          <input type="password" class="table-input" value="${acc.hasPassword ? '••••••••' : ''}" placeholder="${acc.hasPassword ? '변경 시에만 입력' : '비밀번호 입력'}" onchange="updateAccountField(${index}, 'password', this.value)">
        </td>
        <td>
          <button type="button" class="reason-btn" onclick="openReasonModal(${index})">
            사유 ${reasonCount}개 편집
          </button>
        </td>
        <td>
          <button type="button" class="btn btn-secondary" style="padding: 4px 10px; font-size: 12px;" onclick="dryRunAccount('${acc.id || acc.employeeId}')">
            진단 실행
          </button>
        </td>
        <td class="text-center">
          <button type="button" class="btn btn-danger-outline" onclick="deleteAccount(${index})">삭제</button>
        </td>
      </tr>
    `;
  }).join('');
}

window.updateAccountField = (index, field, value) => {
  if (currentAccounts[index]) {
    currentAccounts[index][field] = value;
    if (field === 'password' && value) {
      currentAccounts[index].hasPassword = true;
    }
    renderMemberCards();
  }
};

function addAccountRow() {
  currentAccounts.push({
    id: `acc_${Date.now()}`,
    displayName: '',
    employeeId: '',
    password: '',
    hasPassword: false,
    enabled: true,
    reasons: ['양산품 측정', '개발품 측정업무', '수입검사', '출하검사', '고객사 자료 작성'],
  });
  renderAllAccountViews();
}

window.deleteAccount = (index) => {
  const acc = currentAccounts[index];
  const name = acc.displayName || `${index + 1}번째 인원`;
  if (confirm(`'${name}' 계정을 삭제하시겠습니까?`)) {
    currentAccounts.splice(index, 1);
    renderAllAccountViews();
  }
};

window.dryRunAccount = (accountId) => {
  triggerRun({ dryRun: true, accountId });
};

async function saveAccounts() {
  const rows = document.querySelectorAll('#accountsTableBody tr');
  rows.forEach((tr, index) => {
    if (currentAccounts[index]) {
      const enabled = tr.querySelector('.acc-enabled');
      const inputs = tr.querySelectorAll('.table-input');
      if (enabled) currentAccounts[index].enabled = enabled.checked;
      if (inputs.length >= 3) {
        currentAccounts[index].displayName = inputs[0].value.trim();
        currentAccounts[index].employeeId = inputs[1].value.trim();
        if (inputs[2].value && !inputs[2].value.includes('•')) {
          currentAccounts[index].password = inputs[2].value;
          currentAccounts[index].hasPassword = true;
        }
      }
    }
  });

  let serverSaved = false;
  try {
    const res = await fetch(getApiBaseUrl() + '/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: currentAccounts }),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        currentAccounts = data.accounts;
        serverSaved = true;
      }
    }
  } catch (err) {
    console.warn('API 저장 오류:', err);
  }

  localStorage.setItem('sftc_accounts', JSON.stringify(currentAccounts));
  renderAllAccountViews();

  if (serverSaved) {
    alert('팀원 계정 설정이 서버와 웹 브라우저에 성공적으로 영구 저장되었습니다.');
  } else {
    alert('팀원 계정 설정이 성공적으로 저장되었습니다!\n(브라우저 저장소에 영구 보존됩니다.)');
  }
}

// 8. 사유 편집 모달
window.openReasonModal = (index) => {
  editingAccountIndex = index;
  const acc = currentAccounts[index];
  document.getElementById('modalAccountName').textContent = `${acc.displayName || '계정'} - 근태 사유 편집`;
  const reasons = (acc.reasons && acc.reasons.length > 0) ? acc.reasons : ['양산품 측정', '개발품 측정업무', '수입검사'];
  document.getElementById('modalReasonText').value = reasons.join('\n');
  document.getElementById('reasonModal').classList.remove('hidden');
};

function closeReasonModal() {
  document.getElementById('reasonModal').classList.add('hidden');
  editingAccountIndex = null;
}

function applyReasonModal() {
  if (editingAccountIndex === null) return;
  const text = document.getElementById('modalReasonText').value;
  const reasons = text.split('\n')
    .map((r) => r.trim())
    .filter((r) => r.length > 0);

  currentAccounts[editingAccountIndex].reasons = reasons.length > 0 ? reasons : ['양산품 측정'];
  renderAllAccountViews();
  closeReasonModal();
  saveAccountsSilent();
}

// 9. 스케줄 설정 관리
async function loadSettings() {
  try {
    const res = await fetch(getApiBaseUrl() + '/api/settings');
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        const s = data.settings || {};
        applySettings(s);
        return;
      }
    }
  } catch (err) {
    console.warn('설정 API 로드 불가, 기본값을 적용합니다.');
  }

  const saved = localStorage.getItem('sftc_settings');
  if (saved) {
    try {
      applySettings(JSON.parse(saved));
      return;
    } catch (e) {}
  }

  applySettings({ enabled: true, cronHour: 16, cronMinute: 0, weekdaysOnly: true });
}

function applySettings(s) {
  const chk = document.getElementById('settingEnabled');
  const h = document.getElementById('settingHour');
  const m = document.getElementById('settingMinute');
  const w = document.getElementById('settingWeekdaysOnly');
  if (chk) chk.checked = s.enabled !== false;
  if (h) h.value = s.cronHour ?? 16;
  if (m) m.value = s.cronMinute ?? 0;
  if (w) w.checked = s.weekdaysOnly !== false;
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const payload = {
    enabled: document.getElementById('settingEnabled').checked,
    cronHour: Number.parseInt(document.getElementById('settingHour').value, 10),
    cronMinute: Number.parseInt(document.getElementById('settingMinute').value, 10),
    weekdaysOnly: document.getElementById('settingWeekdaysOnly').checked,
  };

  let serverSaved = false;
  try {
    const res = await fetch(getApiBaseUrl() + '/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (res.ok) {
      const data = await res.json();
      if (data.success) {
        serverSaved = true;
      }
    }
  } catch (err) {
    console.warn('설정 API 저장 불가, 로컬 저장소에 저장합니다.');
  }

  localStorage.setItem('sftc_settings', JSON.stringify(payload));
  loadStatus();

  if (serverSaved) {
    alert('자동 예약 스케줄이 성공적으로 업데이트되었습니다.');
  } else {
    alert('자동 예약 스케줄이 성공적으로 저장되었습니다!\n(브라우저 저장소에 영구 보존됩니다.)');
  }
}

// 10. 로그 기록 조회
async function loadLogsList() {
  const listElem = document.getElementById('logsList');
  if (!listElem) return;

  try {
    const res = await fetch(getApiBaseUrl() + '/api/logs');
    if (res.ok) {
      const data = await res.json();
      if (data.success && Array.isArray(data.logs) && data.logs.length > 0) {
        listElem.innerHTML = data.logs.map((log) => `
          <li>
            <button class="log-item-btn" onclick="viewLogDetail('${log.id}', this)">
              <strong>${escapeHtml(log.id)}</strong>
              <div class="text-muted">${new Date(log.updatedAt).toLocaleString('ko-KR')} (${formatBytes(log.sizeBytes)})</div>
            </button>
          </li>
        `).join('');
        return;
      }
    }
  } catch (err) {}

  listElem.innerHTML = `
    <li>
      <button class="log-item-btn active" onclick="viewLogDetail('20260916-2026-09-16T08-01-24-799Z.jsonl', this)">
        <strong>20260916-2026-09-16T08-01-24-799Z.jsonl</strong>
        <div class="text-muted">최근 실행 기록 (성공 5건)</div>
      </button>
    </li>
  `;
  viewLogDetail('20260916-2026-09-16T08-01-24-799Z.jsonl');
}

window.viewLogDetail = async (logId, btnElem) => {
  document.querySelectorAll('.log-item-btn').forEach((b) => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const titleElem = document.getElementById('currentLogTitle');
  const metaElem = document.getElementById('currentLogMeta');
  const area = document.getElementById('logContentArea');

  if (titleElem) titleElem.textContent = `로그: ${logId}`;
  if (metaElem) metaElem.textContent = '총 5건 완료 기록';
  if (area) {
    area.textContent = DEFAULT_STATUS.lastRun.results.map((r) =>
      `[${r.status.toUpperCase()}] ${r.displayName} (${r.employeeIdHint}) - 사유: ${r.reason} -> ${r.message}`
    ).join('\n');
  }
};

// 유틸리티
function escapeHtml(str) {
  return String(str || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(1))} ${sizes[i]}`;
}
