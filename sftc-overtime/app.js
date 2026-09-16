'use strict';

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
  document.getElementById('btnDryRunAll').addEventListener('click', () => triggerRun({ dryRun: true }));
  document.getElementById('btnRunLive').addEventListener('click', () => {
    if (confirm('오늘자 연장근무를 실제로 사이트에 등록하시겠습니까?\n(등록된 인원은 즉시 최종 제출됩니다.)')) {
      triggerRun({ dryRun: false });
    }
  });

  // 콘솔 지우기
  document.getElementById('btnClearLogs').addEventListener('click', () => {
    document.getElementById('terminalOutput').innerHTML = '';
  });

  // 계정 관리 버튼들
  document.getElementById('btnAddAccount').addEventListener('click', addAccountRow);
  document.getElementById('btnSaveAccounts').addEventListener('click', saveAccounts);

  // 사유 모달
  document.getElementById('btnModalClose').addEventListener('click', closeReasonModal);
  document.getElementById('btnModalCancel').addEventListener('click', closeReasonModal);
  document.getElementById('btnModalApply').addEventListener('click', applyReasonModal);

  // 스케줄 설정 폼
  document.getElementById('settingsForm').addEventListener('submit', handleSettingsSubmit);
}

// 3. SSE 실시간 스트림 연결
function initSSE() {
  if (eventSource) {
    eventSource.close();
  }

  eventSource = new EventSource('/api/run/events');

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
}

function handleSSEMessage(payload) {
  const runnerBadge = document.getElementById('runnerBadge');
  const runnerBadgeText = document.getElementById('runnerBadgeText');

  if (payload.type === 'status') {
    if (payload.data.running) {
      runnerBadge.classList.remove('hidden');
      runnerBadgeText.textContent = `자동화 실행 중 (${payload.data.currentRunId || ''})`;
    } else {
      runnerBadge.classList.add('hidden');
    }
  } else if (payload.type === 'log') {
    appendTerminalLog(payload.data);
  } else if (payload.type === 'progress') {
    runnerBadge.classList.remove('hidden');
    runnerBadgeText.textContent = `${payload.data.account} 처리 중... (시도 ${payload.data.attempt})`;
  } else if (payload.type === 'finished') {
    runnerBadge.classList.add('hidden');
    appendTerminalLog({
      level: 'success',
      event: '작업 완료',
      timestamp: new Date().toISOString(),
      counts: payload.data.counts,
    });
    loadStatus(); // 최신 결과 새로고침
  }
}

function appendTerminalLog(entry) {
  const terminal = document.getElementById('terminalOutput');
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
    const res = await fetch('/api/status');
    const data = await res.json();
    if (!data.success) return;

    // 스케줄러 상태 갱신
    const indicator = document.getElementById('schedulerIndicator');
    const text = document.getElementById('schedulerText');
    if (data.scheduler && data.scheduler.enabled) {
      indicator.classList.add('active');
      const timeStr = `${String(data.scheduler.cronHour).padStart(2, '0')}:${String(data.scheduler.cronMinute).padStart(2, '0')}`;
      text.textContent = `매일 ${timeStr} 예약 활성 (${data.scheduler.weekdaysOnly ? '평일' : '매일'})`;
    } else {
      indicator.classList.remove('active');
      text.textContent = '정기 예약 비활성화됨';
    }

    // 최근 실행 결과 갱신
    renderLastRun(data.lastRun);
  } catch (err) {
    console.error('상태 로드 실패:', err);
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
    statSuccess.textContent = '0';
    statSkipped.textContent = '0';
    statDryRun.textContent = '0';
    statFailed.textContent = '0';
    timeElem.textContent = '-';
    tbody.innerHTML = '<tr><td colspan="6" class="text-center empty">최근 실행 기록이 없습니다.</td></tr>';
    return;
  }

  statSuccess.textContent = lastRun.counts.success || 0;
  statSkipped.textContent = lastRun.counts.skipped || 0;
  statDryRun.textContent = lastRun.counts['dry-run'] || 0;
  statFailed.textContent = lastRun.counts.failed || 0;

  const modeText = lastRun.mode === 'dry-run' ? '진단 모드' : '실제 등록';
  timeElem.textContent = `${lastRun.finishedAt ? new Date(lastRun.finishedAt).toLocaleString('ko-KR') : ''} (${modeText})`;

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
    const res = await fetch('/api/run', {
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

// 6. 계정 관리
async function loadAccounts() {
  try {
    const res = await fetch('/api/accounts');
    const data = await res.json();
    if (!data.success) return;

    currentAccounts = data.accounts || [];
    renderAccountsTable();
  } catch (err) {
    console.error('계정 로드 실패:', err);
  }
}

function renderAccountsTable() {
  const tbody = document.getElementById('accountsTableBody');
  const countBadge = document.getElementById('accountCountBadge');
  countBadge.textContent = currentAccounts.length;

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
    reasons: ['품질팀 양산품, 개발품 측정업무'],
  });
  renderAccountsTable();
}

window.deleteAccount = (index) => {
  const acc = currentAccounts[index];
  const name = acc.displayName || `${index + 1}번째 인원`;
  if (confirm(`'${name}' 계정을 삭제하시겠습니까?`)) {
    currentAccounts.splice(index, 1);
    renderAccountsTable();
  }
};

window.dryRunAccount = (accountId) => {
  triggerRun({ dryRun: true, accountId });
};

async function saveAccounts() {
  try {
    const res = await fetch('/api/accounts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ accounts: currentAccounts }),
    });
    const data = await res.json();
    if (!data.success) {
      alert(`저장 실패: ${data.error}`);
      return;
    }
    currentAccounts = data.accounts;
    renderAccountsTable();
    alert('팀원 계정 설정이 성공적으로 저장되었습니다.');
  } catch (err) {
    alert(`저장 오류: ${err.message}`);
  }
}

// 7. 사유 편집 모달
window.openReasonModal = (index) => {
  editingAccountIndex = index;
  const acc = currentAccounts[index];
  document.getElementById('modalAccountName').textContent = `${acc.displayName || '계정'} - 근태 사유 편집`;
  const reasons = (acc.reasons && acc.reasons.length > 0) ? acc.reasons : ['품질팀 양산품, 개발품 측정업무'];
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

  currentAccounts[editingAccountIndex].reasons = reasons.length > 0 ? reasons : ['품질팀 양산품, 개발품 측정업무'];
  renderAccountsTable();
  closeReasonModal();
}

// 8. 스케줄 설정 관리
async function loadSettings() {
  try {
    const res = await fetch('/api/settings');
    const data = await res.json();
    if (!data.success) return;

    const s = data.settings || {};
    document.getElementById('settingEnabled').checked = s.enabled !== false;
    document.getElementById('settingHour').value = s.cronHour ?? 16;
    document.getElementById('settingMinute').value = s.cronMinute ?? 0;
    document.getElementById('settingWeekdaysOnly').checked = s.weekdaysOnly !== false;
  } catch (err) {
    console.error('설정 로드 실패:', err);
  }
}

async function handleSettingsSubmit(e) {
  e.preventDefault();
  const payload = {
    enabled: document.getElementById('settingEnabled').checked,
    cronHour: Number.parseInt(document.getElementById('settingHour').value, 10),
    cronMinute: Number.parseInt(document.getElementById('settingMinute').value, 10),
    weekdaysOnly: document.getElementById('settingWeekdaysOnly').checked,
  };

  try {
    const res = await fetch('/api/settings', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    const data = await res.json();
    if (!data.success) {
      alert(`설정 저장 실패: ${data.error}`);
      return;
    }
    loadStatus();
    alert('자동 예약 스케줄이 성공적으로 업데이트되었습니다.');
  } catch (err) {
    alert(`오류: ${err.message}`);
  }
}

// 9. 로그 기록 조회
async function loadLogsList() {
  const listElem = document.getElementById('logsList');
  try {
    const res = await fetch('/api/logs');
    const data = await res.json();
    if (!data.success || !Array.isArray(data.logs) || data.logs.length === 0) {
      listElem.innerHTML = '<li class="empty">저장된 로그 파일이 없습니다.</li>';
      return;
    }

    listElem.innerHTML = data.logs.map((log) => `
      <li>
        <button class="log-item-btn" onclick="viewLogDetail('${log.id}', this)">
          <strong>${escapeHtml(log.id)}</strong>
          <div class="text-muted">${new Date(log.updatedAt).toLocaleString('ko-KR')} (${formatBytes(log.sizeBytes)})</div>
        </button>
      </li>
    `).join('');
  } catch (err) {
    listElem.innerHTML = `<li class="empty">로그 목록 로드 오류: ${err.message}</li>`;
  }
}

window.viewLogDetail = async (logId, btnElem) => {
  document.querySelectorAll('.log-item-btn').forEach((b) => b.classList.remove('active'));
  if (btnElem) btnElem.classList.add('active');

  const titleElem = document.getElementById('currentLogTitle');
  const metaElem = document.getElementById('currentLogMeta');
  const area = document.getElementById('logContentArea');

  titleElem.textContent = `로그: ${logId}`;
  metaElem.textContent = '불러오는 중...';
  area.textContent = '로딩 중...';

  try {
    const res = await fetch(`/api/logs/${logId}`);
    const data = await res.json();
    if (!data.success) {
      area.textContent = `로그 로드 실패: ${data.error}`;
      return;
    }

    metaElem.textContent = `총 ${data.entries.length}줄의 이벤트`;
    area.textContent = data.entries.map((entry) => JSON.stringify(entry, null, 2)).join('\n\n');
  } catch (err) {
    area.textContent = `오류: ${err.message}`;
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
