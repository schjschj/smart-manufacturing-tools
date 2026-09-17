
// =========================================================================

// MODULE: state.js

// =========================================================================

// FMS Data Analysis Dashboard - State & Statistical Analysis Engine

const state = {
    // Raw parsed data
    rawData: [],
    fileMeta: {
        name: "",
        size: 0,
        rows: 0
    },
    
    // Column mappings selected by user
    columnMapping: {
        qrcode: "",
        timeFirst: "",
        timeLast: "",
        judgement: "",
        machineFactor: "" // Mapped Slot No or Pallet No
    },
    
    // Processed clean data
    mappedData: [],
    
    // Global filters
    filters: {
        slot: "",
        pallet: ""
    },
    
    // Detected measurement parameters (Value, LSL, USL triplets)
    measurementGroups: [],
    selectedParameter: "",
    zScoreThreshold: 3.0,
    
    // Analysis results
    kpis: {
        total: 0,
        ok: 0,
        ng: 0,
        ngRate: 0,
        avgCycleTime: 0,
        anomalyCount: 0
    },
    
    anomalies: [], // List of detected anomalies (SPC out of bounds or Cycle time delay)
    
    reset() {
        this.rawData = [];
        this.mappedData = [];
        this.measurementGroups = [];
        this.selectedParameter = "";
        this.anomalies = [];
        this.fileMeta = { name: "", size: 0, rows: 0 };
        this.columnMapping = { qrcode: "", timeFirst: "", timeLast: "", judgement: "", machineFactor: "" };
        this.filters = { slot: "", pallet: "" };
        this.kpis = { total: 0, ok: 0, ng: 0, ngRate: 0, avgCycleTime: 0, anomalyCount: 0 };
    }
};

// FMS Standard Parameter SPEC Rules Dictionary
// Handles known US/Global/Korean FMS measurement items, exact names, and fixed specifications
const FMS_KNOWN_SPECS = [
    // 1. Tilt inspection group (AT~AW, AZ~BC)
    { match: ['A(+)_RT_UU_Tilt', 'A(+)_LT_LU_Tilt', 'C(-)_RT_UU_Tilt', 'C(-)_LT_LU_Tilt'], lslColName: 'Up_Tilt_UL', uslColName: 'Up_Tilt_UU', defaultLsl: 2.670, defaultUsl: 3.670 },
    { match: ['A(+)_RT_UL_Tilt', 'A(+)_LT_LL_Tilt', 'C(-)_RT_UL_Tilt', 'C(-)_LT_LL_Tilt'], lslColName: 'Lo_Tilt_LL', uslColName: 'Lo_Tilt_LU', defaultLsl: 3.670, defaultUsl: 4.670 },
    
    // 2. Weld length inspection group (BF, BG)
    { match: ['A(+)_Weld_Len', 'A(-)_Weld_Len', 'Weld_Len'], lslColName: 'Weld_Len_LCL', uslColName: 'Weld_Len_UCL', defaultLsl: 29.300, defaultUsl: 30.300 },
    
    // 3. Short & Resistance inspection group (BR, BU, BX, CA, CD)
    { match: ['C(-)_Short_Val', 'CATHODE_SHORT_VALUE', 'Short_Val'], lslColName: 'CATHODE_SHORT_MINIMUM_VALUE', uslColName: 'CATHODE_SHORT_MAXIMUM_VALUE', defaultLsl: 0.000, defaultUsl: 0.100 },
    { match: ['A(+)_T-Resi', 'ANODE_TERMINAL_RESISTANCE'], lslColName: 'ANODE_RESISTNACE_MINIMUM_VALUE', uslColName: 'ANODE_RESISTNACE_MAXIMUM_VALUE', defaultLsl: 0.000, defaultUsl: 0.090 },
    { match: ['C(-)_T-Resi', 'CATHODE_TERMINAL_RESISTANCE'], lslColName: 'CATHODE_RESISTNACE_MINIMUM_VALUE', uslColName: 'CATHODE_RESISTNACE_MAXIMUM_VALUE', defaultLsl: 0.000, defaultUsl: 0.080 },
    { match: ['RPT_RESISTNACE_TEST_VALUE', 'RPT_Resi_Val'], lslColName: 'RPT_RESISTNACE_MINIMUM_VALUE', uslColName: 'RPT_RESISTNACE_MAXIMUM_VALUE', defaultLsl: 0.000, defaultUsl: 120000.000 },
    { match: ['RPT_Curr_Val', 'RPT_CURRENT_TEST_VALUE'], lslColName: 'RPT_CURRENT_MINIMUM_VALUE', uslColName: 'RPT_CURRENT_MAXIMUM_VALUE', defaultLsl: 3.000, defaultUsl: 20.000 },
    
    // 4. CO ~ DD Inspection Group (User Fixed SPECs)
    // CO, CP: Max 0.3
    { match: ['C(-)_TP_Side_Para', 'A(+)_TP_Side_Para'], defaultLsl: 0, defaultUsl: 0.3 },
    // CQ ~ CX: 3.7 ± 0.15 (3.55 ~ 3.85)
    { match: [
        'C(-)_TP_H1', 'C(-)_TP_H2', 'C(-)_TP_H3', 'C(-)_TP_H4',
        'A(+)_TP_H1', 'A(+)_TP_H2', 'A(+)_TP_H3', 'A(+)_TP_H4'
    ], defaultLsl: 3.55, defaultUsl: 3.85 },
    // CY, CZ: TP Para (general measurement)
    { match: ['C(-)_TP_Para', 'A(+)_TP_Para'], defaultLsl: null, defaultUsl: null },
    // DA, DB: MAX 0.1
    { match: ['C(-)_TP_Flat', 'A(+)_TP_Flat'], defaultLsl: 0, defaultUsl: 0.1 },
    // DC: MAX 0.25
    { match: ['CP_Flat_Max'], defaultLsl: 0, defaultUsl: 0.25 },
    // DD: MIN -0.1
    { match: ['CP_Flat_Min'], defaultLsl: -0.1, defaultUsl: null },
    
    // 5. SP Flatness, Distance, GAP inspection group (DN~DP, DV~DX, EH, EI, EO, EP)
    { match: ['C(-)_SP_Flat', 'A(+)_SP_Flat'], defaultLsl: null, defaultUsl: null },
    { match: ['C(-)_LT_SP_Dist', 'C(-)_RT_SP_Dist', 'A(+)_LT_SP_Dist', 'A(+)_RT_SP_Dist'], defaultLsl: null, defaultUsl: null },
    { match: ['C(-)_SP_GAP_1', 'C(-)_SP_GAP_2', 'A(+)_SP_GAP_1', 'A(+)_SP_GAP_2'], defaultLsl: null, defaultUsl: null }
];

// Helper to clean and normalize header strings for matching (preserves + and - for Anode/Cathode)
function normalizeHeader(str) {
    if (!str) return '';
    return str.replace(/[\s_\(\)]/g, '')
              .replace(/\+/g, 'PLUS')
              .replace(/\-/g, 'MINUS')
              .toUpperCase();
}

// Helper to determine if a column is a SPEC limit, Assessment, or System column (NOT a measurement value)
function isSpecOrSystemHeader(header) {
    if (!header) return true;
    const u = header.toUpperCase().trim();
    
    // 1. Strict SPEC limit keywords/suffixes (Must never appear as measurement items)
    const specKeywords = [
        '_UL', '_UU', '_LL', '_LU', '_LCL', '_UCL', '_LSL', '_USL',
        'MINIMUM_VALUE', 'MAXIMUM_VALUE', 'MIN_VALUE', 'MAX_VALUE',
        '하한', '상한', 'LSL', 'USL', 'LCL', 'UCL', '하한값', '상한값'
    ];
    for (let kw of specKeywords) {
        if (u.endsWith(kw) || u.includes('_' + kw) || u.includes(kw + '_') || u === kw) {
            return true;
        }
    }

    // 2. Assessment, Count, Status, and System columns
    const systemKeywords = [
        '_CNT', '_COUNT', 'COUNT', 'ASSESSMENT', 'JUDGE', 'JUDGEMENT', 'STATUS',
        'QR', 'TIME', 'DATE', 'DATETIME', 'SLOT', 'PALLET', 'PLT', 'NO.', 'NUM',
        'SETTING', 'SPEED', 'CONDITION', 'POWER', 'PV', 'SV', 'FREQUENCY', 'AMOUNT'
    ];
    for (let kw of systemKeywords) {
        if (u.includes(kw)) {
            return true;
        }
    }
    return false;
}

// Auto-detect measurement columns in CSV
function detectMeasurementGroups(headers, rawData = []) {
    const groups = [];
    const matchedCols = new Set();
    const cleanSpaces = str => (str || '').replace(/\s+/g, '');
    
    // 1. Check Known Specification Rule Dictionary first (highest priority)
    FMS_KNOWN_SPECS.forEach(rule => {
        rule.match.forEach(targetName => {
            const cleanTarget = normalizeHeader(targetName);
            // Find column in headers
            const foundHeader = headers.find(h => normalizeHeader(h) === cleanTarget || h === targetName);
            
            if (foundHeader && !matchedCols.has(foundHeader) && !isSpecOrSystemHeader(foundHeader)) {
                let lslCol = null;
                let uslCol = null;
                
                if (rule.lslColName) {
                    const cleanLsl = normalizeHeader(rule.lslColName);
                    lslCol = headers.find(h => normalizeHeader(h) === cleanLsl || h === rule.lslColName) || null;
                    if (lslCol) matchedCols.add(lslCol); // Mark spec col as used so it won't become a measurement
                }
                if (rule.uslColName) {
                    const cleanUsl = normalizeHeader(rule.uslColName);
                    uslCol = headers.find(h => normalizeHeader(h) === cleanUsl || h === rule.uslColName) || null;
                    if (uslCol) matchedCols.add(uslCol); // Mark spec col as used so it won't become a measurement
                }
                
                groups.push({
                    name: foundHeader,
                    valueCol: foundHeader,
                    lslCol: lslCol,
                    uslCol: uslCol,
                    defaultLsl: rule.defaultLsl !== undefined ? rule.defaultLsl : null,
                    defaultUsl: rule.defaultUsl !== undefined ? rule.defaultUsl : null
                });
                matchedCols.add(foundHeader);
            }
        });
    });

    // 2. Extract Generic LSL/LCL/MIN and USL/UCL/MAX column names
    const lslKeywords = ['하한', 'LSL', 'LCL', 'MINIMUM_VALUE', '_MIN', 'MIN_VALUE', '_LL', '_UL'];
    const uslKeywords = ['상한', 'USL', 'UCL', 'MAXIMUM_VALUE', '_MAX', 'MAX_VALUE', '_LU', '_UU'];
    
    const lslCols = headers.filter(h => lslKeywords.some(kw => h.toUpperCase().includes(kw)) && !matchedCols.has(h));
    const uslCols = headers.filter(h => uslKeywords.some(kw => h.toUpperCase().includes(kw)) && !matchedCols.has(h));
    
    // 3. Align generic LSL/USL pairs and find corresponding measurement value columns
    lslCols.forEach(lslCol => {
        let lslBaseClean = lslCol;
        lslKeywords.forEach(kw => { lslBaseClean = lslBaseClean.replace(new RegExp(kw, 'gi'), ''); });
        const cleanLslBase = cleanSpaces(lslBaseClean);
        
        let uslCol = uslCols.find(h => {
            let uslBaseClean = h;
            uslKeywords.forEach(kw => { uslBaseClean = uslBaseClean.replace(new RegExp(kw, 'gi'), ''); });
            return cleanLslBase && cleanLslBase === cleanSpaces(uslBaseClean);
        });
        
        if (uslCol) {
            const matchingValCols = headers.filter(h => {
                if (h === lslCol || h === uslCol || matchedCols.has(h) || isSpecOrSystemHeader(h)) return false;
                
                const hClean = cleanSpaces(h);
                const hCleanNoMeasure = hClean.replace(/측정|내경|값|Value|Val/gi, '');
                return hClean === cleanLslBase || hCleanNoMeasure === cleanLslBase || hClean.includes(cleanLslBase);
            });
            
            matchingValCols.forEach(valCol => {
                if (matchedCols.has(valCol)) return;
                
                groups.push({
                    name: valCol,
                    valueCol: valCol,
                    lslCol: lslCol,
                    uslCol: uslCol,
                    defaultLsl: null,
                    defaultUsl: null
                });
                matchedCols.add(valCol);
                matchedCols.add(lslCol);
                matchedCols.add(uslCol);
            });
        }
    });
    
    // 4. Detect and match leftover columns with '측정', '내경' (Strictly skipping all spec and system headers)
    const measureKeywords = ['측정', '내경', 'TILT', 'WELD_LEN', 'RESI', 'GAP', 'FLAT', 'DIST', 'SHORT_VAL', 'CURR_VAL'];
    headers.forEach(header => {
        if (matchedCols.has(header)) return;
        if (isSpecOrSystemHeader(header)) return; // Strictly ignore all SPEC and system headers
        
        const isMeasureCandidate = measureKeywords.some(kw => header.toUpperCase().includes(kw.toUpperCase()));
        if (isMeasureCandidate) {
            groups.push({
                name: header,
                valueCol: header,
                lslCol: null,
                uslCol: null,
                defaultLsl: null,
                defaultUsl: null
            });
            matchedCols.add(header);
        }
    });

    // 5. Backward compatibility for traditional suffix formats
    const lowerSuffixes = ['_하한', ' 하한', '하한', '하한값', '_하한값', '_LSL', ' LSL', 'LSL'];
    const upperSuffixes = ['_상한', ' 상한', '상한', '상한값', '_상한값', '_USL', ' USL', 'USL'];
    
    headers.forEach(header => {
        if (matchedCols.has(header)) return;
        if (isSpecOrSystemHeader(header)) return;
        
        let lslCol = null;
        let uslCol = null;
        
        for (let s of lowerSuffixes) {
            const testLsl = header + s;
            if (headers.includes(testLsl)) {
                lslCol = testLsl;
                break;
            }
        }
        
        for (let s of upperSuffixes) {
            const testUsl = header + s;
            if (headers.includes(testUsl)) {
                uslCol = testUsl;
                break;
            }
        }
        
        if (lslCol && uslCol) {
            groups.push({
                name: header,
                valueCol: header,
                lslCol: lslCol,
                uslCol: uslCol,
                defaultLsl: null,
                defaultUsl: null
            });
            matchedCols.add(header);
            matchedCols.add(lslCol);
            matchedCols.add(uslCol);
        }
    });
    
    return groups;
}

// Convert Raw CSV Rows into Clean Mapped JSON Data
function processRawData() {
    if (state.rawData.length === 0) return;
    
    const mapping = state.columnMapping;
    const cleanList = [];
    
    // Sort rawData by Last In DateTime (completion time)
    const timeLastHeader = mapping.timeLast;
    let dataToSort = [...state.rawData];
    
    if (timeLastHeader) {
        dataToSort.sort((a, b) => {
            const tA = new Date(a[timeLastHeader]);
            const tB = new Date(b[timeLastHeader]);
            if (isNaN(tA) || isNaN(tB)) return 0;
            return tA - tB;
        });
    }

    // Auto-detect columns for Slot and Pallet
    const headers = Object.keys(state.rawData[0] || {});
    const slotHeader = headers.find(h => h.toLowerCase().includes('slot') || h.includes('수대') || h.includes('슬롯')) || mapping.machineFactor;
    const palletHeader = headers.find(h => h.toLowerCase().includes('plt') || h.toLowerCase().includes('pallet') || h.includes('파렛트') || h.includes('팔레트')) || mapping.machineFactor;

    // Pre-calculate column constant specs if present in data
    const colConstantSpecs = {};
    if (state.rawData.length > 0) {
        const sampleRows = state.rawData.slice(0, 10);
        headers.forEach(h => {
            const sampleVals = sampleRows.map(r => parseFloat(r[h])).filter(v => !isNaN(v));
            if (sampleVals.length > 0 && sampleVals.every(v => Math.abs(v - sampleVals[0]) < 1e-6)) {
                colConstantSpecs[h] = sampleVals[0];
            }
        });
    }

    // Keep track of completion time of the previous product on the same slot/pallet to compute Tact Time
    const lastCompletedTimeByFactor = {};

    dataToSort.forEach((row, idx) => {
        const qr = row[mapping.qrcode] || `UNKNOWN-${idx}`;
        const timeFirstStr = row[mapping.timeFirst];
        const timeLastStr = row[mapping.timeLast];
        const judge = (row[mapping.judgement] || 'OK').trim().toUpperCase();
        
        // Extract both slot and pallet dynamically
        const slotVal = slotHeader ? String(row[slotHeader]).trim() : '1';
        const palletVal = palletHeader ? String(row[palletHeader]).trim() : '1';
        
        const timeFirst = timeFirstStr ? new Date(timeFirstStr) : null;
        const timeLast = timeLastStr ? new Date(timeLastStr) : null;
        
        // Unique channel key for Tact Time
        const channelKey = `${slotVal}_${palletVal}`;
        
        // Calculate Cycle Time
        let cycleTime = 0;
        if (timeFirst && timeLast && !isNaN(timeFirst) && !isNaN(timeLast)) {
            cycleTime = (timeLast - timeFirst) / 1000;
        }
        
        // If cycleTime is 0 or invalid (e.g. CSA file), calculate Tact Time
        if (cycleTime <= 0 && timeLast && !isNaN(timeLast)) {
            if (lastCompletedTimeByFactor[channelKey]) {
                cycleTime = (timeLast - lastCompletedTimeByFactor[channelKey]) / 1000;
            } else {
                cycleTime = 0;
            }
            lastCompletedTimeByFactor[channelKey] = timeLast;
        } else if (timeLast && !isNaN(timeLast)) {
            lastCompletedTimeByFactor[channelKey] = timeLast;
        }

        // Mapped measurements
        const measurements = {};
        state.measurementGroups.forEach(g => {
            const rawVal = parseFloat(row[g.valueCol]);
            
            // Determine LSL (from row -> from constant spec -> from defaultLsl)
            let lslVal = NaN;
            if (g.lslCol && row[g.lslCol] !== undefined) {
                lslVal = parseFloat(row[g.lslCol]);
            }
            if (isNaN(lslVal) && g.lslCol && colConstantSpecs[g.lslCol] !== undefined) {
                lslVal = colConstantSpecs[g.lslCol];
            }
            if (isNaN(lslVal) && g.defaultLsl !== undefined && g.defaultLsl !== null) {
                lslVal = g.defaultLsl;
            }

            // Determine USL (from row -> from constant spec -> from defaultUsl)
            let uslVal = NaN;
            if (g.uslCol && row[g.uslCol] !== undefined) {
                uslVal = parseFloat(row[g.uslCol]);
            }
            if (isNaN(uslVal) && g.uslCol && colConstantSpecs[g.uslCol] !== undefined) {
                uslVal = colConstantSpecs[g.uslCol];
            }
            if (isNaN(uslVal) && g.defaultUsl !== undefined && g.defaultUsl !== null) {
                uslVal = g.defaultUsl;
            }
            
            measurements[g.name] = {
                val: isNaN(rawVal) ? null : rawVal,
                lsl: isNaN(lslVal) ? null : lslVal,
                usl: isNaN(uslVal) ? null : uslVal
            };
        });

        cleanList.push({
            no: parseInt(row['No.']) || idx + 1,
            qrcode: qr,
            timeFirst: timeFirst,
            timeLast: timeLast,
            cycleTime: cycleTime >= 0 ? cycleTime : 0,
            judgement: judge.includes('OK') || judge === 'PASS' || judge === '1' ? 'OK' : 'NG',
            machineFactor: row[mapping.machineFactor] || slotVal,
            slot: slotVal,
            pallet: palletVal,
            model: '단일제품', // Ignore models since single production
            measurements: measurements,
            originalRow: row
        });
    });

    // Post-processing fill first sequence zeroes
    const nonZeroCycleTimes = cleanList.filter(d => d.cycleTime > 0).map(d => d.cycleTime);
    const avgNonZero = nonZeroCycleTimes.length > 0 ? (nonZeroCycleTimes.reduce((a,b)=>a+b, 0) / nonZeroCycleTimes.length) : 10;
    cleanList.forEach(d => {
        if (d.cycleTime === 0) d.cycleTime = avgNonZero;
    });

    state.mappedData = cleanList;
    calculateGlobalKpis();
}

// Calculate Global KPIs (with filters if applied)
function calculateGlobalKpis() {
    const data = state.mappedData;
    if (data.length === 0) {
        state.kpis = { total: 0, ok: 0, ng: 0, ngRate: 0, avgCycleTime: 0, anomalyCount: 0 };
        return;
    }
    
    const total = data.length;
    const ng = data.filter(d => d.judgement === 'NG').length;
    const ok = total - ng;
    const ngRate = (ng / total) * 100;
    
    const sumCycleTime = data.reduce((sum, d) => sum + d.cycleTime, 0);
    const avgCycleTime = sumCycleTime / total;
    
    state.kpis = {
        total,
        ok,
        ng,
        ngRate: ngRate.toFixed(2) + '%',
        avgCycleTime: avgCycleTime.toFixed(1) + '초',
        anomalyCount: 0
    };
}

// Statistical Functions
function getStats(values) {
    const n = values.length;
    if (n === 0) return { mean: 0, stdDev: 0 };
    
    const mean = values.reduce((sum, v) => sum + v, 0) / n;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / (n > 1 ? n - 1 : 1);
    const stdDev = Math.sqrt(variance);
    
    return { mean, stdDev };
}

// Get filtered data subset based on current state filters
function getFilteredData() {
    let list = state.mappedData;
    if (state.filters.slot) {
        list = list.filter(d => d.slot === state.filters.slot);
    }
    if (state.filters.pallet) {
        list = list.filter(d => d.pallet === state.filters.pallet);
    }
    return list;
}

// Compute SPC control limits and Process Capability Indexes (Cp, Cpk)
function analyzeParameter(parameterName, ignoreFilters = false) {
    if (!parameterName || state.mappedData.length === 0) return null;
    
    const data = ignoreFilters ? state.mappedData : getFilteredData();
    const validPoints = [];
    
    let sumLsl = 0;
    let sumUsl = 0;
    let limitCount = 0;
    
    data.forEach(d => {
        const m = d.measurements[parameterName];
        if (m && m.val !== null && !isNaN(m.val)) {
            validPoints.push({
                index: d.no,
                qrcode: d.qrcode,
                time: d.timeLast,
                val: m.val,
                lsl: m.lsl,
                usl: m.usl,
                machineFactor: d.machineFactor,
                slot: d.slot,
                pallet: d.pallet,
                judgement: d.judgement
            });
            if (m.lsl !== null) {
                sumLsl += m.lsl;
                sumUsl += m.usl;
                limitCount++;
            }
        }
    });
    
    if (validPoints.length === 0) return null;
    
    const values = validPoints.map(p => p.val);
    const { mean, stdDev } = getStats(values);
    
    // Use data spec limits; fall back to manually entered custom values
    let lsl = limitCount > 0 ? (sumLsl / limitCount) : (customLslMap[parameterName] !== undefined ? customLslMap[parameterName] : null);
    let usl = limitCount > 0 ? (sumUsl / limitCount) : (customUslMap[parameterName] !== undefined ? customUslMap[parameterName] : null);
    
    const cl = mean;
    const ucl = mean + 3 * stdDev;
    const lcl = mean - 3 * stdDev;
    
    let cp = null;
    let cpk = null;
    
    const capabilityEligible = values.length >= 30 && stdDev > 0;
    if (lsl !== null && usl !== null && capabilityEligible) {
        cp = (usl - lsl) / (6 * stdDev);
        const cpu = (usl - mean) / (3 * stdDev);
        const cpl = (mean - lsl) / (3 * stdDev);
        cpk = Math.min(cpu, cpl);
    } else if (lsl !== null && capabilityEligible) {
        cpk = (mean - lsl) / (3 * stdDev);
    } else if (usl !== null && capabilityEligible) {
        cpk = (usl - mean) / (3 * stdDev);
    }
    
    const paramAnomalies = [];
    validPoints.forEach(p => {
        let isAnomaly = false;
        let anomalyType = "";
        let desc = "";
        
        if (lsl !== null && p.val < lsl) {
            isAnomaly = true;
            anomalyType = "규격 하한 이탈 (LSL 초과)";
            desc = `LSL 규격(${lsl.toFixed(3)}) 미달: 측정값 ${p.val.toFixed(3)}`;
        } else if (usl !== null && p.val > usl) {
            isAnomaly = true;
            anomalyType = "규격 상한 이탈 (USL 초과)";
            desc = `USL 규격(${usl.toFixed(3)}) 초과: 측정값 ${p.val.toFixed(3)}`;
        } else if (p.val > ucl) {
            isAnomaly = true;
            anomalyType = "관리 상한 이탈 (UCL 초과)";
            desc = `UCL 관리선(${ucl.toFixed(3)}) 초과 (이상 징후): 측정값 ${p.val.toFixed(3)}`;
        } else if (p.val < lcl) {
            isAnomaly = true;
            anomalyType = "관리 하한 이탈 (LCL 초과)";
            desc = `LCL 관리선(${lcl.toFixed(3)}) 미달 (이상 징후): 측정값 ${p.val.toFixed(3)}`;
        }
        
        if (isAnomaly) {
            paramAnomalies.push({
                no: p.index,
                qrcode: p.qrcode,
                time: p.time,
                parameter: parameterName,
                val: p.val,
                limits: `${lsl !== null ? lsl.toFixed(3) : '-'} ~ ${usl !== null ? usl.toFixed(3) : '-'}`,
                type: anomalyType,
                desc: `${desc} [수대: ${p.slot}, 파렛트: ${p.pallet}]`
            });
        }
    });

    return {
        points: validPoints,
        mean,
        stdDev,
        lsl,
        usl,
        cl,
        ucl,
        lcl,
        cp,
        cpk,
        capabilityEligible,
        capabilityNote: capabilityEligible ? '표본수/표준편차 조건 충족' : 'Cpk 미표시: 유효 표본 30개 이상과 0보다 큰 표준편차가 필요합니다.',
        anomalies: paramAnomalies
    };
}

// Detect Cycle Time Delays
function analyzeCycleTimeDelays() {
    const data = getFilteredData();
    if (data.length === 0) return [];
    
    const times = data.map(d => d.cycleTime);
    const { mean, stdDev } = getStats(times);
    const threshold = state.zScoreThreshold;
    const limit = mean + threshold * stdDev;
    
    const delays = [];
    data.forEach(d => {
        if (d.cycleTime > limit) {
            delays.push({
                no: d.no,
                qrcode: d.qrcode,
                time: d.timeLast,
                parameter: "가공 사이클타임",
                val: d.cycleTime,
                limits: `정상 한계: < ${limit.toFixed(1)}초`,
                type: "사이클 지연 (Downtime/지연)",
                desc: `가공 지연 발생: 소요 시간 ${d.cycleTime.toFixed(1)}초 (수대: ${d.slot}, 파렛트: ${d.pallet})`
            });
        }
    });
    
    return delays;
}

// Aggregate All Anomalies
function updateAnomaliesList() {
    let list = [];
    
    if (state.selectedParameter) {
        const spcResults = analyzeParameter(state.selectedParameter);
        if (spcResults) {
            list = list.concat(spcResults.anomalies);
        }
    }
    
    // Cycle time delay analysis is no longer needed per user request
    // const cTimeDelays = analyzeCycleTimeDelays();
    // list = list.concat(cTimeDelays);
    
    list.sort((a, b) => b.no - a.no);
    
    state.anomalies = list;
    state.kpis.anomalyCount = list.length;
}

// Compile a process-wide quality summary report for all measurement parameters
function getSpcSummary() {
    const summary = [];
    state.measurementGroups.forEach(g => {
        const analysis = analyzeParameter(g.name, true); // ignore filters for global analysis
        if (analysis) {
            let status = 'none';
            if (analysis.cpk !== null && !isNaN(analysis.cpk)) {
                if (analysis.cpk < 1.0) status = 'bad';
                else if (analysis.cpk < 1.33) status = 'warn';
                else status = 'good';
            }
            
            // Count Spec errors and Control warnings
            const ngCount = analysis.anomalies.filter(a => a.type.includes('규격')).length;
            const warnCount = analysis.anomalies.filter(a => a.type.includes('관리')).length;
            
            summary.push({
                name: g.name,
                mean: analysis.mean,
                stdDev: analysis.stdDev,
                lsl: analysis.lsl,
                usl: analysis.usl,
                cpk: analysis.cpk,
                ngCount,
                warnCount,
                status
            });
        }
    });
    return summary;
}


// =========================================================================

// MODULE: components/mockGen.js

// =========================================================================

// FMS Data Analysis Dashboard - Simulation Data Generator

function generateMockFMSData() {
    const data = [];
    const recordCount = 1000;
    
    // Start date: 24 hours ago
    let currentTime = new Date(Date.now() - 24 * 60 * 60 * 1000);
    
    // Parameters configuration
    // Torque (토크)
    const torqueNominal = 2.40;
    const torqueLsl = 2.00;
    const torqueUsl = 2.80;
    
    // Temperature (온도)
    const tempNominal = 22.0;
    const tempLsl = 18.0;
    const tempUsl = 28.0;

    // Retainer height (리테이너 높이)
    const retNominal = 0.150;
    const retLsl = -0.100;
    const retUsl = 0.400;

    // Models list
    const models = ['A11F2S', 'B22R4X', 'C33T9Y'];
    
    for (let i = 1; i <= recordCount; i++) {
        // Increment time: roughly 10 seconds interval, with some variations
        const timeGap = 8000 + Math.random() * 4000; // 8-12 seconds
        currentTime = new Date(currentTime.getTime() + timeGap);
        
        // Slot and Pallet
        const slot = (i % 6) + 1; // Slot 1 to 6
        const plt = (Math.floor(i / 6) % 30) + 1; // Pallet 1 to 30
        
        // Random model based on index
        const modelPrefix = models[i % models.length];
        const qrCode = `${modelPrefix}${266032000 + i}`;
        
        // Base cycle time: nominal 30 seconds
        let cycleNoise = (Math.random() - 0.5) * 2.0; // -1s to +1s
        let cycleTime = 25.0 + cycleNoise;
        
        // ANOMALY 1: Slide Friction on Slot 3
        // Slot 3 gradually slows down after index 400
        if (slot === 3 && i > 400) {
            const degradationFactor = (i - 400) / 600; // up to 1.0
            cycleTime += degradationFactor * 18.0; // adds up to 18 seconds delay
        }
        
        // Measurement value calculations with noise
        let torque = torqueNominal + (Math.random() - 0.5) * 0.15;
        let temp = tempNominal + (Math.random() - 0.5) * 1.5;
        let retainer = retNominal + (Math.random() - 0.5) * 0.08;
        
        // ANOMALY 2: Temperature Sensor Drift (Bearing Wear Simulation)
        // Temperature starts drifting upwards after index 600 on all slots, especially Slot 5
        if (i > 600) {
            const driftFactor = (i - 600) / 400; // up to 1.0
            temp += driftFactor * 5.0; // drifts up by up to 5 degrees
            if (slot === 5) {
                temp += driftFactor * 2.5; // Slot 5 drifts even more
            }
        }
        
        // ANOMALY 3: Jig misalignment
        // Model A11F2S processed on Slot 6 has a high chance of high retainer height
        if (modelPrefix === 'A11F2S' && slot === 6) {
            retainer += 0.220; // pushes it close to/exceeding USL
        }

        // Check if out of spec limits
        const isTorqueNg = torque < torqueLsl || torque > torqueUsl;
        const isTempNg = temp < tempLsl || temp > tempUsl;
        const isRetainerNg = retainer < retLsl || retainer > retUsl;
        
        // Quality Judgement
        let judgement = 'OK';
        if (isTorqueNg || isTempNg || isRetainerNg) {
            judgement = 'NG';
        } else {
            // Random minor defect chance (0.3%)
            judgement = Math.random() < 0.003 ? 'NG' : 'OK';
        }
        
        // Format DateTime string: YYYY-MM-DD HH:mm:ss.ff
        const formatFmsDate = (d) => {
            const pad = (n) => n.toString().padStart(2, '0');
            const dateStr = `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
            const timeStr = `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
            const ms = Math.floor(d.getMilliseconds() / 10).toString().padStart(2, '0');
            return `${dateStr} ${timeStr}.${ms}`;
        };
        
        const lastInTime = new Date(currentTime);
        const firstInTime = new Date(lastInTime.getTime() - cycleTime * 1000);
        
        // Append CSV fields compatible with the mapped FMS structure
        data.push({
            'No.': i.toString(),
            'QRCODE': qrCode,
            'SLOT_NO': slot.toString(),
            'MAIN PLT NO': plt.toString(),
            'INPUT_DATETIME': formatFmsDate(new Date(firstInTime.getTime() - 2000)), // input slightly earlier
            '종합판정': judgement,
            '토크측정': torque.toFixed(3),
            '토크측정_하한': torqueLsl.toFixed(3),
            '토크측정_상한': torqueUsl.toFixed(3),
            '온도측정': temp.toFixed(2),
            '온도측정_하한': tempLsl.toFixed(2),
            '온도측정_상한': tempUsl.toFixed(2),
            '리테이너측정': retainer.toFixed(4),
            '리테이너측정_하한': retLsl.toFixed(4),
            '리테이너측정_상한': retUsl.toFixed(4),
            'FIRST_IN_DATETIME': formatFmsDate(firstInTime),
            'LAST_IN_DATETIME': formatFmsDate(lastInTime)
        });
    }
    
    return data;
}


// =========================================================================

// MODULE: components/importer.js

// =========================================================================

// FMS Data Analysis Dashboard - File Importer Component


function initImporter({ onFileParsed, showToast }) {
    const dropzone = document.getElementById('upload-dropzone');
    const fileInput = document.getElementById('file-input');
    const btnBrowse = document.getElementById('btn-browse-file');
    
    // File picker trigger
    btnBrowse.addEventListener('click', () => {
        fileInput.click();
    });

    fileInput.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (file) handleFile(file);
    });

    // Drag and Drop events
    dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        dropzone.classList.add('dragover');
    });

    dropzone.addEventListener('dragleave', () => {
        dropzone.classList.remove('dragover');
    });

    dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        dropzone.classList.remove('dragover');
        const file = e.dataTransfer.files[0];
        if (file) handleFile(file);
    });

    // Handle incoming file
    function handleFile(file) {
        const ext = file.name.split('.').pop().toLowerCase();
        if (ext !== 'csv' && ext !== 'xlsx' && ext !== 'xls') {
            showToast('지원되지 않는 파일 형식입니다. CSV 또는 Excel 파일을 선택해주세요.', 'error');
            return;
        }
        if (file.size > 100 * 1024 * 1024) {
            showToast('파일이 100MB를 초과합니다. 작업을 나누어 주세요.', 'error');
            return;
        }

        // Set file meta state
        state.reset();
        state.fileMeta.name = file.name;
        state.fileMeta.size = formatBytes(file.size);
        
        showToast(`파일 읽는 중: ${file.name}`, 'info');

        const reader = new FileReader();

        if (ext === 'csv') {
            // For CSV, read as ArrayBuffer to auto-detect encoding (UTF-8 vs EUC-KR)
            reader.readAsArrayBuffer(file);
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                const text = decodeBuffer(arrayBuffer);
                parseCsvText(text);
            };
        } else {
            // For Excel, read as ArrayBuffer for SheetJS
            reader.readAsArrayBuffer(file);
            reader.onload = function(e) {
                const arrayBuffer = e.target.result;
                parseExcelBuffer(arrayBuffer);
            };
        }
    }

    // Auto-detect and decode ArrayBuffer to string (UTF-8 or EUC-KR)
    function decodeBuffer(buffer) {
        // Test UTF-8 decoding on first 10KB. If it fails, fall back to EUC-KR.
        const chunk = buffer.slice(0, Math.min(buffer.byteLength, 10000));
        const utf8Decoder = new TextDecoder('utf-8', { fatal: true });
        
        try {
            utf8Decoder.decode(chunk);
            // If no error, decode full buffer as UTF-8
            const fullDecoder = new TextDecoder('utf-8');
            return fullDecoder.decode(buffer);
        } catch (e) {
            // Decoding failed, assume EUC-KR (CP949)
            const fullDecoder = new TextDecoder('euc-kr');
            return fullDecoder.decode(buffer);
        }
    }

    // Parse CSV Text via PapaParse
    function parseCsvText(text) {
        Papa.parse(text, {
            header: true,
            skipEmptyLines: true,
            complete: function(results) {
                if (results.errors.length > 0 && results.data.length === 0) {
                    showToast('CSV 파싱 오류가 발생했습니다.', 'error');
                    console.error(results.errors);
                    return;
                }
                
                if (results.data.length > 200000) {
                    showToast('데이터가 200,000행을 초과합니다. 파일을 분할해 주세요.', 'error');
                    return;
                }
                state.rawData = results.data;
                state.fileMeta.rows = results.data.length;
                
                onFileParsed();
            },
            error: function(err) {
                showToast('파일 파싱 실패: ' + err.message, 'error');
            }
        });
    }

    // Parse Excel ArrayBuffer via SheetJS
    function parseExcelBuffer(buffer) {
        try {
            const data = new Uint8Array(buffer);
            const workbook = XLSX.read(data, { type: 'array' });
            
            // Read first sheet
            const firstSheetName = workbook.SheetNames[0];
            const worksheet = workbook.Sheets[firstSheetName];
            
            // Convert to JSON
            const jsonData = XLSX.utils.sheet_to_json(worksheet, { defval: "" });
            
            if (jsonData.length === 0) {
                showToast('Excel 시트에 데이터가 존재하지 않습니다.', 'error');
                return;
            }
            
            if (jsonData.length > 200000) {
                showToast('데이터가 200,000행을 초과합니다. 파일을 분할해 주세요.', 'error');
                return;
            }
            state.rawData = jsonData;
            state.fileMeta.rows = jsonData.length;
            
            onFileParsed();
        } catch (e) {
            showToast('Excel 파싱 실패: ' + e.message, 'error');
            console.error(e);
        }
    }

    // Format bytes to human readable string
    function formatBytes(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    }
}


// =========================================================================

// MODULE: components/mapper.js

// =========================================================================

// FMS Data Analysis Dashboard - Column Mapper Component


function initMapper({ onMappingApplied, showToast }) {
    const qrcodeSelect = document.getElementById('map-qrcode');
    const timeFirstSelect = document.getElementById('map-time-first');
    const timeLastSelect = document.getElementById('map-time-last');
    const judgeSelect = document.getElementById('map-judgement');
    const machineSelect = document.getElementById('map-machine-factor');
    const applyBtn = document.getElementById('btn-apply-mapping');
    
    // UI Cards
    const fileMetaCard = document.getElementById('file-meta-card');
    const mapperCard = document.getElementById('column-mapper-card');
    const previewCard = document.getElementById('data-preview-card');
    
    // Elements for file metadata
    const metaFileName = document.getElementById('meta-file-name');
    const metaFileSize = document.getElementById('meta-file-size');
    const metaFileRows = document.getElementById('meta-file-rows');
    
    // Table preview
    const previewTable = document.getElementById('table-preview');

    // Display mapping panel
    function renderMapping() {
        if (state.rawData.length === 0) return;
        
        const firstRow = state.rawData[0];
        const headers = Object.keys(firstRow);
        
        // Show cards
        fileMetaCard.style.display = 'block';
        mapperCard.style.display = 'block';
        previewCard.style.display = 'block';
        
        // Fill metadata
        metaFileName.textContent = state.fileMeta.name;
        metaFileSize.textContent = state.fileMeta.size;
        metaFileRows.textContent = state.fileMeta.rows.toLocaleString() + ' 행';
        
        // Fill active file card in sidebar
        document.getElementById('loaded-file-name').textContent = state.fileMeta.name;
        document.getElementById('loaded-file-rows').textContent = state.fileMeta.rows.toLocaleString() + ' rows';
        
        // Populate dropdowns and auto-detect
        populateSelect(qrcodeSelect, headers, ['qrcode', 'qr', 'barcode', 'qr코드', '바코드', '일련번호']);
        populateSelect(timeFirstSelect, headers, ['first_in_datetime', 'first_in', 'first', '시작', '투입시각', '투입시간', '시작시각', '시작시간', 'input_datetime']);
        populateSelect(timeLastSelect, headers, ['last_in_datetime', 'last_in', 'last', '종료', '완료시각', '완료시간', '종료시각', '종료시간', 'date_time']);
        populateSelect(judgeSelect, headers, ['judgement', 'judgement_spi', '종합판정', '양극판정', '음극판정', '판정', '판정값', '결과', 'judge', 'result', 'status']);
        populateSelect(machineSelect, headers, ['slot_no', 'main plt no', 'main_plt_no', 'slot', 'plt', 'pallet', '슬롯', '팔레트', '호기', 'robot zig no']);
        
        // Render preview table (top 5 rows)
        renderPreviewTable(headers, state.rawData.slice(0, 5));
    }

    // Populate dropdown with options and auto-detect selection
    function populateSelect(selectEl, headers, keywords) {
        selectEl.innerHTML = '';
        
        // Add empty option
        const emptyOpt = document.createElement('option');
        emptyOpt.value = '';
        emptyOpt.textContent = '-- 선택 --';
        selectEl.appendChild(emptyOpt);
        
        let selectedIndex = 0; // default to -- 선택 --
        
        headers.forEach((header, index) => {
            const opt = document.createElement('option');
            opt.value = header;
            opt.textContent = header;
            selectEl.appendChild(opt);
            
            // Auto detect: check if header name contains keyword
            const lowerHeader = header.toLowerCase().replace(/[\s_\-]/g, '');
            const isMatch = keywords.some(keyword => {
                const cleanKeyword = keyword.toLowerCase().replace(/[\s_\-]/g, '');
                return lowerHeader.includes(cleanKeyword) || cleanKeyword.includes(lowerHeader);
            });
            
            if (isMatch && selectedIndex === 0) {
                selectedIndex = index + 1; // +1 to account for empty option
            }
        });
        
        selectEl.selectedIndex = selectedIndex;
    }

    // Render Preview HTML Table
    function renderPreviewTable(headers, rows) {
        const thead = previewTable.querySelector('thead');
        const tbody = previewTable.querySelector('tbody');
        
        thead.innerHTML = '';
        tbody.innerHTML = '';
        
        // Header row
        const trHead = document.createElement('tr');
        headers.forEach(h => {
            const th = document.createElement('th');
            th.textContent = h;
            trHead.appendChild(th);
        });
        thead.appendChild(trHead);
        
        // Data rows
        rows.forEach(row => {
            const trBody = document.createElement('tr');
            headers.forEach(h => {
                const td = document.createElement('td');
                td.textContent = row[h];
                trBody.appendChild(td);
            });
            tbody.appendChild(trBody);
        });
    }

    // Bind Apply Button click
    applyBtn.addEventListener('click', () => {
        const qrcode = qrcodeSelect.value;
        const timeFirst = timeFirstSelect.value;
        const timeLast = timeLastSelect.value;
        const judgement = judgeSelect.value;
        const machineFactor = machineSelect.value;
        
        if (!qrcode || !timeLast || !judgement) {
            showToast('필수 필드(QR코드, 완료시간, 종합판정)를 매핑해 주세요.', 'warn');
            return;
        }
        
        // Save mappings
        state.columnMapping = { qrcode, timeFirst, timeLast, judgement, machineFactor };
        
        // Detect measurement groups
        const firstRow = state.rawData[0];
        const headers = Object.keys(firstRow);
        state.measurementGroups = detectMeasurementGroups(headers, state.rawData);
        
        // Set default parameter if groups exist
        if (state.measurementGroups.length > 0) {
            state.selectedParameter = state.measurementGroups[0].name;
        }
        
        showToast('컬럼 매핑이 완료되었습니다. 분석 데이터를 가공합니다.', 'info');
        
        // Process data
        setTimeout(() => {
            try {
                processRawData();
                updateAnomaliesList();
                showToast(`데이터 가공 완료: ${state.mappedData.length}건 로드됨`, 'success');
                onMappingApplied();
            } catch (err) {
                showToast('데이터 처리 오류: ' + err.message, 'error');
                console.error(err);
            }
        }, 100);
    });

    return {
        renderMapping
    };
}


// =========================================================================

// MODULE: components/overview.js

// =========================================================================

// FMS Data Analysis Dashboard - Overview View Component


let trendChart = null;
let machineChart = null;
let rankChart = null;

function initOverview() {
    // Resize charts on window resize
    window.addEventListener('resize', resizeOverviewCharts);
}

function resizeOverviewCharts() {
    if (trendChart) trendChart.resize();
    if (machineChart) machineChart.resize();
    if (rankChart) rankChart.resize();
}

function updateOverviewDashboard() {
    const data = state.mappedData;
    if (data.length === 0) return;

    // 1. Update KPIs
    document.getElementById('kpi-total').textContent = state.kpis.total.toLocaleString();
    document.getElementById('kpi-ok').textContent = state.kpis.ok.toLocaleString();
    document.getElementById('kpi-ng').textContent = state.kpis.ng.toLocaleString();
    
    const ngRateEl = document.getElementById('kpi-ng-rate');
    ngRateEl.textContent = state.kpis.ngRate;
    if (parseFloat(state.kpis.ngRate) > 1.5) {
        ngRateEl.className = 'kpi-value text-red';
    } else {
        ngRateEl.className = 'kpi-value';
    }
    
    document.getElementById('kpi-avg-time').textContent = state.kpis.avgCycleTime;

    // 2. Render Charts
    renderTrendChart(data);
    renderSlotDefectChart(data); 
    renderDefectRankChart(data);
    renderSummaryList(data);
    renderSpcSummaryTable();
    renderOverviewOpinion(data);
}

// Chart 1: Production and NG Rate Trend (Hourly/Daily)
function renderTrendChart(data) {
    const chartDom = document.getElementById('chart-production-trend');
    if (!chartDom) return;
    
    if (trendChart) trendChart.dispose();
    trendChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const times = data.filter(d => d.timeLast).map(d => d.timeLast.getTime());
    if (times.length === 0) return;
    
    const minTime = times.reduce((min, t) => t < min ? t : min, times[0]);
    const maxTime = times.reduce((max, t) => t > max ? t : max, times[0]);
    const hourSpan = (maxTime - minTime) / (1000 * 60 * 60);
    const isDaily = hourSpan > 72;

    const groups = {};
    data.forEach(d => {
        if (!d.timeLast) return;
        const date = d.timeLast;
        const key = isDaily 
            ? `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`
            : `${date.getFullYear()}-${(date.getMonth()+1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')} ${date.getHours().toString().padStart(2, '0')}:00`;
        
        if (!groups[key]) groups[key] = { total: 0, ng: 0 };
        groups[key].total++;
        if (d.judgement === 'NG') groups[key].ng++;
    });

    const categories = Object.keys(groups).sort();
    const totalData = categories.map(cat => groups[cat].total);
    const ngRateData = categories.map(cat => {
        const g = groups[cat];
        return parseFloat(((g.ng / g.total) * 100).toFixed(2));
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            axisPointer: { type: 'cross', crossStyle: { color: '#999' } }
        },
        grid: { top: '15%', left: '5%', right: '5%', bottom: '10%', containLabel: true },
        xAxis: [
            {
                type: 'category',
                data: categories,
                axisPointer: { type: 'shadow' },
                axisLabel: { color: '#9ca3af' },
                axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
            }
        ],
        yAxis: [
            {
                type: 'value',
                name: '생산량 (EA)',
                nameTextStyle: { color: '#9ca3af' },
                axisLabel: { color: '#9ca3af' },
                splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
            },
            {
                type: 'value',
                name: '불량률 (%)',
                nameTextStyle: { color: '#9ca3af' },
                axisLabel: { formatter: '{value} %', color: '#9ca3af' },
                splitLine: { show: false }
            }
        ],
        series: [
            {
                name: '생산량',
                type: 'bar',
                data: totalData,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#3b82f6' },
                        { offset: 1, color: '#06b6d4' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                }
            },
            {
                name: '불량률',
                type: 'line',
                yAxisIndex: 1,
                data: ngRateData,
                smooth: true,
                symbol: 'circle',
                symbolSize: 6,
                itemStyle: { color: '#ef4444' },
                lineStyle: { width: 3, shadowBlur: 10, shadowColor: 'rgba(239, 68, 68, 0.3)' }
            }
        ]
    };

    trendChart.setOption(option, true);
}

// Chart 2: Slot Defect Rate Comparison
function renderSlotDefectChart(data) {
    const chartDom = document.getElementById('chart-machine-distribution');
    if (!chartDom) return;
    
    if (machineChart) machineChart.dispose();
    machineChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const slotStats = {};
    for (let s = 1; s <= 6; s++) {
        slotStats[String(s)] = { total: 0, ng: 0 };
    }
    
    data.forEach(d => {
        const slot = d.slot;
        if (!slotStats[slot]) slotStats[slot] = { total: 0, ng: 0 };
        slotStats[slot].total++;
        if (d.judgement === 'NG') slotStats[slot].ng++;
    });

    const slots = Object.keys(slotStats).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
    const defectRates = slots.map(s => {
        const stats = slotStats[s];
        return stats.total > 0 ? parseFloat(((stats.ng / stats.total) * 100).toFixed(2)) : 0;
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: '{b}번 수대<br/>불량률: <b>{c}%</b>'
        },
        grid: { top: '15%', left: '8%', right: '5%', bottom: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: slots.map(s => `${s}번 수대`),
            axisLabel: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        yAxis: {
            type: 'value',
            name: '불량률 (%)',
            nameTextStyle: { color: '#9ca3af' },
            axisLabel: { color: '#9ca3af', formatter: '{value}%' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        series: [
            {
                name: '불량률',
                type: 'bar',
                data: defectRates,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#f59e0b' },
                        { offset: 1, color: '#ef4444' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}%',
                    color: '#f3f4f6',
                    fontSize: 10
                }
            }
        ]
    };

    machineChart.setOption(option, true);
}

// Chart 3: Defect Rank Chart (Top 10 Pallets with highest defect rates)
function renderDefectRankChart(data) {
    const chartDom = document.getElementById('chart-defect-ranking');
    if (!chartDom) return;
    
    if (rankChart) rankChart.dispose();
    rankChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const stats = {};
    data.forEach(d => {
        const p = `PLT ${d.pallet}`;
        if (!stats[p]) stats[p] = { total: 0, ng: 0 };
        stats[p].total++;
        if (d.judgement === 'NG') stats[p].ng++;
    });

    const pallets = Object.keys(stats);
    const rates = pallets.map(p => {
        const s = stats[p];
        return {
            name: p,
            rate: parseFloat(((s.ng / s.total) * 100).toFixed(2)),
            total: s.total,
            ng: s.ng
        };
    });

    rates.sort((a, b) => b.rate - a.rate);
    const topRates = rates.filter(r => r.ng > 0).slice(0, 10).reverse(); 

    const option = {
        tooltip: { trigger: 'axis', formatter: '{b}<br/>불량률: {c}% ({data.ng}/{data.total} EA)' },
        grid: { left: '3%', right: '8%', bottom: '3%', top: '5%', containLabel: true },
        xAxis: {
            type: 'value',
            name: '불량률 (%)',
            nameTextStyle: { color: '#9ca3af' },
            axisLabel: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        yAxis: {
            type: 'category',
            data: topRates.map(r => r.name),
            axisLabel: { color: '#f3f4f6' },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        series: [
            {
                type: 'bar',
                data: topRates.map(r => ({
                    value: r.rate,
                    ng: r.ng,
                    total: r.total
                })),
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                        { offset: 0, color: '#ea580c' },
                        { offset: 1, color: '#f43f5e' }
                    ]),
                    borderRadius: [0, 4, 4, 0]
                },
                label: {
                    show: true,
                    position: 'right',
                    formatter: '{c}%',
                    color: '#f3f4f6',
                    fontWeight: 'bold',
                    fontSize: 10
                }
            }
        ]
    };

    rankChart.setOption(option, true);
}

// Summary statistics list
function renderSummaryList(data) {
    const listDom = document.getElementById('overview-summary-list');
    if (!listDom) return;
    
    const times = data.filter(d => d.timeLast).map(d => d.timeLast);
    if (times.length === 0) return;
    
    const timeMs = times.map(t => t.getTime());
    const minTime = new Date(timeMs.reduce((min, t) => t < min ? t : min, timeMs[0]));
    const maxTime = new Date(timeMs.reduce((max, t) => t > max ? t : max, timeMs[0]));
    
    const pad = (n) => n.toString().padStart(2, '0');
    const fmtDate = (d) => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;

    const distinctSlots = new Set(data.map(d => d.slot)).size;
    const distinctPallets = new Set(data.map(d => d.pallet)).size;

    listDom.innerHTML = `
        <div class="summary-item">
            <span class="summary-item-label">분석 시작 시간</span>
            <span class="summary-item-val">${fmtDate(minTime)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">분석 완료 시간</span>
            <span class="summary-item-val">${fmtDate(maxTime)}</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">분석 검사항목 수</span>
            <span class="summary-item-val">${state.measurementGroups.length} 개</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">가동 중인 수대 수 (Slots)</span>
            <span class="summary-item-val">${distinctSlots} 개</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">가동 중인 LMS 파렛트 수 (PLT)</span>
            <span class="summary-item-val">${distinctPallets} 개</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">매핑된 QR코드 열</span>
            <span class="summary-item-val badge badge-info">${state.columnMapping.qrcode}</span>
        </div>
        <div class="summary-item">
            <span class="summary-item-label">매핑된 판정 열</span>
            <span class="summary-item-val badge badge-info">${state.columnMapping.judgement}</span>
        </div>
    `;
}

// Render All Parameter SPC Summary table
function renderSpcSummaryTable() {
    const tbody = document.querySelector('#table-spc-summary tbody');
    if (!tbody) return;

    tbody.innerHTML = '';
    
    const summary = getSpcSummary();
    if (summary.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">검출된 측정 파라미터가 없습니다.</td></tr>`;
        return;
    }

    summary.forEach(s => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-success';
        let badgeText = '우수';
        if (s.status === 'bad') {
            badgeClass = 'badge-danger';
            badgeText = '부족';
        } else if (s.status === 'warn') {
            badgeClass = 'badge-warning';
            badgeText = '보통';
        }

        const lslFmt = s.lsl !== null ? s.lsl.toFixed(3) : '-';
        const uslFmt = s.usl !== null ? s.usl.toFixed(3) : '-';
        const cpkFmt = s.cpk !== null && !isNaN(s.cpk) ? s.cpk.toFixed(2) : 'N/A';

        tr.innerHTML = `
            <td class="font-bold">${s.name}</td>
            <td>${s.mean.toFixed(4)}</td>
            <td>${s.stdDev.toFixed(5)}</td>
            <td>${lslFmt} ~ ${uslFmt}</td>
            <td class="font-bold">${cpkFmt}</td>
            <td class="${s.ngCount > 0 ? 'text-red font-bold' : ''}">${s.ngCount} EA</td>
            <td>${s.warnCount} EA</td>
            <td><span class="badge ${badgeClass}">${badgeText}</span></td>
        `;
        tbody.appendChild(tr);
    });
}

function renderOverviewOpinion(data) {
    const container = document.getElementById('overview-insight-opinion');
    const cardWrapper = document.getElementById('overview-insight-card');
    if (!container || !cardWrapper) return;

    // Show the card wrapper since we have data
    cardWrapper.style.display = 'block';

    const total = state.kpis.total;
    const ok = state.kpis.ok;
    const ng = state.kpis.ng;
    const ngRateVal = total > 0 ? (ng / total) * 100 : 0;
    const okRateVal = 100 - ngRateVal;

    // 1. Overall Yield Opinion
    let yieldType = 'success';
    let yieldTitle = '종합 생산 품질 우수';
    let yieldDesc = `총 <b>${total.toLocaleString()}건</b>의 가공품 중 양품 <b>${ok.toLocaleString()}건</b>(양품률: <b>${okRateVal.toFixed(2)}%</b>), 불량 <b>${ng.toLocaleString()}건</b>이 발생했습니다. 현재 공정은 관리 기준인 불량률 1.5% 이하로 매우 안정적인 품질을 유지하고 있습니다. 단일 제품 대량 가동 환경에서 우수한 공정 안정을 보이고 있습니다.`;
    
    if (ngRateVal > 1.5) {
        yieldType = 'danger';
        yieldTitle = '종합 생산 품질 개선 요구';
        yieldDesc = `종합 불량률이 <b>${ngRateVal.toFixed(2)}%</b>로 관리 기준(1.5%)을 초과하였습니다. 단일 제품 가동 라인에서 불량이 지속적으로 누적되고 있으므로 아래의 특정 설비 구성요소(수대/파렛트) 오차 진단 항목을 확인하여 하드웨어 보정을 실행해 주십시오.`;
    }

    // 2. Slot & Pallet Diagnostic
    // Slot Stats
    const slotStats = {};
    for (let s = 1; s <= 6; s++) {
        slotStats[String(s)] = { total: 0, ng: 0 };
    }
    // Pallet Stats
    const palletStats = {};

    data.forEach(d => {
        const slot = d.slot;
        const pallet = d.pallet;
        
        if (slotStats[slot]) {
            slotStats[slot].total++;
            if (d.judgement === 'NG') slotStats[slot].ng++;
        }
        
        if (pallet) {
            if (!palletStats[pallet]) palletStats[pallet] = { total: 0, ng: 0 };
            palletStats[pallet].total++;
            if (d.judgement === 'NG') palletStats[pallet].ng++;
        }
    });

    let worstSlot = null;
    let worstSlotRate = -1;
    let worstSlotNg = 0;
    Object.keys(slotStats).forEach(s => {
        const stat = slotStats[s];
        const rate = stat.total > 0 ? (stat.ng / stat.total) * 100 : 0;
        if (rate > worstSlotRate && stat.ng > 0) {
            worstSlotRate = rate;
            worstSlot = s;
            worstSlotNg = stat.ng;
        }
    });

    let worstPallet = null;
    let worstPalletRate = -1;
    let worstPalletNg = 0;
    Object.keys(palletStats).forEach(p => {
        const stat = palletStats[p];
        const rate = stat.total > 0 ? (stat.ng / stat.total) * 100 : 0;
        if (rate > worstPalletRate && stat.ng > 0) {
            worstPalletRate = rate;
            worstPallet = p;
            worstPalletNg = stat.ng;
        }
    });

    let slotPalletDesc = '';
    let slotPalletType = 'info';
    let slotPalletTitle = '설비 구성요소 상태 양호';

    if (worstSlot || worstPallet) {
        slotPalletType = 'warning';
        slotPalletTitle = '특정 설비 요소 집중 불량 감지';
        
        const slotPart = worstSlot ? `<b>${worstSlot}번 수대</b>(불량률 <b>${worstSlotRate.toFixed(2)}%</b>, ${worstSlotNg}건)` : '특이 수대 없음';
        const palletPart = worstPallet ? `<b>PLT ${worstPallet}번 파렛트</b>(불량률 <b>${worstPalletRate.toFixed(2)}%</b>, ${worstPalletNg}건)` : '특이 파렛트 없음';
        
        slotPalletDesc = `6개 수대 중 ${slotPart}에서 불량이 상대적으로 가장 집중되었고, 30개 파렛트 중 ${palletPart}에서 불량 기여도가 높습니다. 특정 조합 안착 시 핀 마모나 지그 변형, 휨 오차가 의심됩니다.`;
    } else {
        slotPalletDesc = `수대별(1~6) 및 파렛트별(1~30) 불량 분포가 균일하여 특정 기계 기구적 오차나 결함 부품으로 인한 집중 불량 패턴은 검출되지 않았습니다.`;
    }

    // 3. Parameter Capability Diagnostic
    const summary = getSpcSummary();
    let worstParam = null;
    let worstCpk = 999;
    let badParamCount = 0;

    summary.forEach(s => {
        if (s.cpk !== null && !isNaN(s.cpk)) {
            if (s.cpk < worstCpk) {
                worstCpk = s.cpk;
                worstParam = s.name;
            }
            if (s.cpk < 1.0) {
                badParamCount++;
            }
        }
    });

    let cpkType = 'success';
    let cpkTitle = '공정 능력 지수 최적 상태';
    let cpkDesc = `모든 검사 치수 항목의 공정능력지수(Cpk)가 1.33 이상으로 매우 우수합니다. 공차 관리 한계 내에서 변동 오차가 최소화되어 균일한 품질이 보장되고 있습니다.`;

    if (worstParam && worstCpk < 1.33) {
        if (worstCpk < 1.0) {
            cpkType = 'danger';
            cpkTitle = `치수 공정 능력 현저히 부족 (불안정)`;
            cpkDesc = `검사 항목 중 <b>[${worstParam}]</b> 항목의 Cpk가 <b>${worstCpk.toFixed(2)}</b>로 불량 수준인 1.0 미만입니다. (기준 미달 <b>${badParamCount}개</b> 항목). 절삭 공구의 마모 및 마이크로 치수 보정(오프셋 조정)이 즉시 수행되어야 합니다.`;
        } else {
            cpkType = 'warning';
            cpkTitle = `공정 능력 경계선 근접 (주의)`;
            cpkDesc = `가장 불안정한 치수 검사 항목은 <b>[${worstParam}]</b> (Cpk: <b>${worstCpk.toFixed(2)}</b>) 입니다. 품질 규격 한계선에는 들어오나 미세한 치수 치우침 변동이 커지고 있으므로 주기적 모니터링이 필요합니다.`;
        }
    }

    container.innerHTML = `
        <div class="insight-card ${yieldType}">
            <div class="insight-icon"><i data-lucide="${yieldType === 'success' ? 'check-circle-2' : 'alert-octagon'}"></i></div>
            <div class="insight-body">
                <div class="insight-title">${yieldTitle}</div>
                <div class="insight-desc">${yieldDesc}</div>
            </div>
        </div>
        <div class="insight-card ${slotPalletType}">
            <div class="insight-icon"><i data-lucide="${slotPalletType === 'warning' ? 'alert-triangle' : 'info'}"></i></div>
            <div class="insight-body">
                <div class="insight-title">${slotPalletTitle}</div>
                <div class="insight-desc">${slotPalletDesc}</div>
            </div>
        </div>
        <div class="insight-card ${cpkType}">
            <div class="insight-icon"><i data-lucide="${cpkType === 'success' ? 'check-circle-2' : (cpkType === 'warning' ? 'alert-triangle' : 'alert-octagon')}"></i></div>
            <div class="insight-body">
                <div class="insight-title">${cpkTitle}</div>
                <div class="insight-desc">${cpkDesc}</div>
            </div>
        </div>
    `;

    lucide.createIcons();
}


// =========================================================================

// MODULE: components/spc.js

// =========================================================================

// FMS Data Analysis Dashboard - SPC & Anomaly Detection View Component


let spcChart = null;
let spcHistogramChart = null;
let cpkChart = null;
let allCpkChart = null;
let currentSpcViewMode = 'slot-scatter'; // 'slot-scatter' (default) or 'spc-line'

// Y-Axis Custom Configuration State (Excel-style Axis Settings)
let yAxisConfig = {
    custom: false,
    min: null,
    max: null,
    interval: null
};

// Manual USL/LSL Override State (when data has no spec limits)
let customUslMap = {}; // { paramName: value }
let customLslMap = {}; // { paramName: value }

// Anomaly Navigator State
let currentAnomalyList = [];
let currentAnomalyNavIndex = -1;

function initSpc({ showToast }) {
    const paramSelect = document.getElementById('select-spc-parameter');
    const slotFilter = document.getElementById('filter-spc-slot');
    const palletFilter = document.getElementById('filter-spc-pallet');
    const zThresholdInput = document.getElementById('input-z-threshold');
    const recalculateBtn = document.getElementById('btn-recalculate-spc');
    const exportAnomaliesBtn = document.getElementById('btn-export-anomalies');

    // Chart Mode Toggle Buttons
    const btnSlotScatter = document.getElementById('btn-mode-slot-scatter');
    const btnSpcLine = document.getElementById('btn-mode-spc-line');

    if (btnSlotScatter && btnSpcLine) {
        btnSlotScatter.addEventListener('click', () => {
            currentSpcViewMode = 'slot-scatter';
            btnSlotScatter.classList.add('active');
            btnSpcLine.classList.remove('active');
            renderSpcControlChart();
            showToast('수대별 분포 산점도 모드로 전환되었습니다.', 'info');
        });
        btnSpcLine.addEventListener('click', () => {
            currentSpcViewMode = 'spc-line';
            btnSpcLine.classList.add('active');
            btnSlotScatter.classList.remove('active');
            renderSpcControlChart();
            showToast('SPC 통계적 관리도 모드로 전환되었습니다.', 'info');
        });
    }

    // Y-Axis Custom Popover & Controls
    const btnToggleYaxis = document.getElementById('btn-toggle-yaxis-panel');
    const yaxisPopover = document.getElementById('yaxis-popover');
    const inputYmin = document.getElementById('input-yaxis-min');
    const inputYmax = document.getElementById('input-yaxis-max');
    const inputYstep = document.getElementById('input-yaxis-step');
    const btnApplyYaxis = document.getElementById('btn-apply-yaxis');
    const btnResetYaxis = document.getElementById('btn-reset-yaxis');

    if (btnToggleYaxis && yaxisPopover) {
        btnToggleYaxis.addEventListener('click', (e) => {
            e.stopPropagation();
            const isOpen = yaxisPopover.style.display === 'block';
            if (isOpen) {
                yaxisPopover.style.display = 'none';
                return;
            }
            // Move to body level (portal pattern) to escape overflow:hidden
            if (yaxisPopover.parentElement !== document.body) {
                document.body.appendChild(yaxisPopover);
            }
            const rect = btnToggleYaxis.getBoundingClientRect();
            yaxisPopover.style.position = 'fixed';
            yaxisPopover.style.top = (rect.bottom + 8) + 'px';
            yaxisPopover.style.left = rect.left + 'px';
            yaxisPopover.style.right = 'auto';
            yaxisPopover.style.zIndex = '99999';
            yaxisPopover.style.display = 'block';
        });

        document.addEventListener('click', (e) => {
            if (!yaxisPopover.contains(e.target) && e.target !== btnToggleYaxis) {
                yaxisPopover.style.display = 'none';
            }
        });

        btnApplyYaxis.addEventListener('click', () => {
            const minVal = inputYmin.value !== '' ? parseFloat(inputYmin.value) : null;
            const maxVal = inputYmax.value !== '' ? parseFloat(inputYmax.value) : null;
            const stepVal = inputYstep.value !== '' ? parseFloat(inputYstep.value) : null;

            if (minVal !== null && maxVal !== null && minVal >= maxVal) {
                showToast('Y축 최소값은 최대값보다 작아야 합니다.', 'warn');
                return;
            }

            yAxisConfig.custom = (minVal !== null || maxVal !== null || stepVal !== null);
            yAxisConfig.min = minVal;
            yAxisConfig.max = maxVal;
            yAxisConfig.interval = stepVal;

            yaxisPopover.style.display = 'none';
            renderSpcControlChart();
            renderSpcHistogramChart();
            showToast('Y축 서식 설정이 적용되었습니다.', 'success');
        });

        btnResetYaxis.addEventListener('click', () => {
            inputYmin.value = '';
            inputYmax.value = '';
            inputYstep.value = '';
            yAxisConfig.custom = false;
            yAxisConfig.min = null;
            yAxisConfig.max = null;
            yAxisConfig.interval = null;

            yaxisPopover.style.display = 'none';
            renderSpcControlChart();
            renderSpcHistogramChart();
            showToast('Y축 범위가 자동(Auto)으로 초기화되었습니다.', 'info');
        });
    }

    // Anomaly Navigator Previous / Next Buttons
    const btnAnomalyPrev = document.getElementById('btn-anomaly-prev');
    const btnAnomalyNext = document.getElementById('btn-anomaly-next');

    if (btnAnomalyPrev && btnAnomalyNext) {
        btnAnomalyPrev.addEventListener('click', () => {
            if (currentAnomalyList.length === 0) return;
            currentAnomalyNavIndex = (currentAnomalyNavIndex - 1 + currentAnomalyList.length) % currentAnomalyList.length;
            jumpToAnomaly(currentAnomalyNavIndex);
        });
        btnAnomalyNext.addEventListener('click', () => {
            if (currentAnomalyList.length === 0) return;
            currentAnomalyNavIndex = (currentAnomalyNavIndex + 1) % currentAnomalyList.length;
            jumpToAnomaly(currentAnomalyNavIndex);
        });
    }

    // Parameter selection change
    paramSelect.addEventListener('change', (e) => {
        state.selectedParameter = e.target.value;
        currentAnomalyNavIndex = -1;
        updateSpcView();
    });

    // Slot Filter change
    slotFilter.addEventListener('change', (e) => {
        state.filters.slot = e.target.value;
        currentAnomalyNavIndex = -1;
        updateSpcView();
        showToast(`${e.target.value ? e.target.value + '번 수대 필터 적용' : '수대 필터 해제'}`, 'info');
    });

    // Pallet Filter change
    palletFilter.addEventListener('change', (e) => {
        state.filters.pallet = e.target.value;
        currentAnomalyNavIndex = -1;
        updateSpcView();
        showToast(`${e.target.value ? e.target.value + '번 파렛트 필터 적용' : '파렛트 필터 해제'}`, 'info');
    });

    // Recalculate button click
    recalculateBtn.addEventListener('click', () => {
        const zVal = parseFloat(zThresholdInput.value);
        if (isNaN(zVal) || zVal < 1.0 || zVal > 6.0) {
            showToast('Z-Score 임계값은 1.0에서 6.0 사이의 숫자여야 합니다.', 'warn');
            return;
        }
        
        state.zScoreThreshold = zVal;
        showToast('이상치 분석 설정을 재적용합니다.', 'info');
        
        updateAnomaliesList();
        updateSpcCharts();
        renderAnomaliesTable();
    });

    // Export anomalies to CSV
    exportAnomaliesBtn.addEventListener('click', () => {
        if (state.anomalies.length === 0) {
            showToast('내보낼 이상 이력이 존재하지 않습니다.', 'warn');
            return;
        }
        exportAnomaliesToCsv();
    });

    // Resize charts
    window.addEventListener('resize', resizeSpcCharts);
}

function resizeSpcCharts() {
    if (spcChart) spcChart.resize();
    if (spcHistogramChart) spcHistogramChart.resize();
    if (cpkChart) cpkChart.resize();
    if (allCpkChart) allCpkChart.resize();
}

// Anomaly Navigator Jump Function
function jumpToAnomaly(navIndex) {
    if (!spcChart || currentAnomalyList.length === 0 || navIndex < 0 || navIndex >= currentAnomalyList.length) return;
    
    const anomaly = currentAnomalyList[navIndex];
    const totalPoints = state.mappedData.length || 1;
    const targetIdx = anomaly.pointIdx; // 1-based index
    
    // Calculate zoom window (display approx 100 points centered on anomaly)
    const windowSize = Math.max(50, Math.floor(totalPoints * 0.05));
    const startIdx = Math.max(1, targetIdx - Math.floor(windowSize / 2));
    const endIdx = Math.min(totalPoints, startIdx + windowSize);
    
    const startPct = ((startIdx - 1) / totalPoints) * 100;
    const endPct = (endIdx / totalPoints) * 100;
    
    spcChart.dispatchAction({
        type: 'dataZoom',
        start: startPct,
        end: endPct
    });

    updateAnomalyCounterUI();
}

function updateAnomalyCounterUI() {
    const counterText = document.getElementById('anomaly-counter-text');
    if (!counterText) return;
    
    if (currentAnomalyList.length === 0) {
        counterText.textContent = '0 / 0';
    } else {
        const currentDisplay = currentAnomalyNavIndex >= 0 ? (currentAnomalyNavIndex + 1) : 1;
        counterText.textContent = `${currentDisplay} / ${currentAnomalyList.length}`;
    }
}

// Populate parameter and filter select dropdowns
function populateSpcParameters() {
    const paramSelect = document.getElementById('select-spc-parameter');
    const palletFilter = document.getElementById('filter-spc-pallet');
    
    if (!paramSelect) return;
    
    // 1. Populate parameters dropdown
    paramSelect.innerHTML = '';
    
    if (state.measurementGroups.length === 0) {
        const opt = document.createElement('option');
        opt.value = '';
        opt.textContent = '검출된 측정 항목 없음';
        paramSelect.appendChild(opt);
    } else {
        state.measurementGroups.forEach(g => {
            const opt = document.createElement('option');
            opt.value = g.name;
            opt.textContent = g.name;
            paramSelect.appendChild(opt);
        });

        if (state.selectedParameter) {
            paramSelect.value = state.selectedParameter;
        } else {
            state.selectedParameter = state.measurementGroups[0].name;
            paramSelect.value = state.selectedParameter;
        }
    }

    // 2. Populate Pallet Filter dropdown dynamically
    if (palletFilter) {
        palletFilter.innerHTML = '';
        const defaultOpt = document.createElement('option');
        defaultOpt.value = '';
        defaultOpt.textContent = '전체 파렛트';
        palletFilter.appendChild(defaultOpt);

        const distinctPallets = Array.from(new Set(state.mappedData.map(d => d.pallet)))
            .filter(p => p !== undefined && p !== '')
            .sort((a, b) => String(a).localeCompare(String(b), undefined, { numeric: true }));

        distinctPallets.forEach(plt => {
            const opt = document.createElement('option');
            opt.value = plt;
            opt.textContent = `${plt}번 파렛트 (PLT ${plt})`;
            palletFilter.appendChild(opt);
        });

        palletFilter.value = state.filters.pallet;
    }

    const slotFilter = document.getElementById('filter-spc-slot');
    if (slotFilter) {
        slotFilter.value = state.filters.slot;
    }
}

// Main update trigger
function updateSpcView() {
    updateAnomaliesList();
    updateSpcMetaGrid();
    updateSpcCharts();
    renderAnomaliesTable();
}

// Update KPI Meta parameters
function updateSpcMetaGrid() {
    const metaGrid = document.getElementById('spc-meta-grid');
    if (!metaGrid) return;

    if (!state.selectedParameter) {
        metaGrid.style.display = 'none';
        return;
    }

    metaGrid.style.display = 'grid';
    const analysis = analyzeParameter(state.selectedParameter);
    
    if (!analysis) {
        document.getElementById('spc-meta-mean').textContent = '-';
        document.getElementById('spc-meta-std').textContent = '-';
        updateSpecLimitCard('usl', null);
        updateSpecLimitCard('lsl', null);
        document.getElementById('spc-meta-cp').textContent = '-';
        document.getElementById('spc-meta-cpk').textContent = '-';
        return;
    }

    document.getElementById('spc-meta-mean').textContent = analysis.mean.toFixed(3);
    document.getElementById('spc-meta-std').textContent = analysis.stdDev.toFixed(4);
    updateSpecLimitCard('usl', analysis.usl);
    updateSpecLimitCard('lsl', analysis.lsl);
    
    const cpVal = analysis.cp;
    const cpCard = document.getElementById('spc-cp-card');
    if (cpVal !== null && !isNaN(cpVal)) {
        document.getElementById('spc-meta-cp').textContent = cpVal.toFixed(2);
        cpCard.className = `meta-card highlight ${getCpClass(cpVal)}`;
    } else {
        document.getElementById('spc-meta-cp').textContent = 'N/A';
        cpCard.className = 'meta-card highlight';
    }

    const cpkVal = analysis.cpk;
    const cpkCard = document.getElementById('spc-cpk-card');
    if (cpkVal !== null && !isNaN(cpkVal)) {
        document.getElementById('spc-meta-cpk').textContent = cpkVal.toFixed(2);
        cpkCard.className = `meta-card highlight ${getCpClass(cpkVal)}`;
    } else {
        document.getElementById('spc-meta-cpk').textContent = 'N/A';
        cpkCard.className = 'meta-card highlight';
    }
}

// Helper: update USL or LSL card display; if null, show edit hint and attach click-to-edit
function updateSpecLimitCard(type, value) {
    const valEl = document.getElementById(`spc-meta-${type}`);
    const hintEl = document.getElementById(`${type}-edit-hint`);
    const cardEl = document.getElementById(`spc-${type}-card`);
    if (!valEl || !cardEl) return;

    if (value !== null && value !== undefined) {
        valEl.textContent = value.toFixed(3);
        if (hintEl) hintEl.style.display = 'none';
        cardEl.style.cursor = 'default';
        cardEl.onclick = null;
    } else {
        // Check if user has manually entered a value
        const mapKey = type === 'usl' ? customUslMap : customLslMap;
        const manualVal = mapKey[state.selectedParameter];
        if (manualVal !== undefined) {
            valEl.textContent = `${manualVal.toFixed(3)} ✎`;
            if (hintEl) hintEl.style.display = 'none';
        } else {
            valEl.textContent = '없음 (클릭 입력)';
            if (hintEl) hintEl.style.display = 'inline';
        }
        cardEl.style.cursor = 'pointer';
        // Remove existing listener before adding new one to avoid duplicates
        const newCard = cardEl.cloneNode(true);
        cardEl.parentNode.replaceChild(newCard, cardEl);
        newCard.onclick = () => openSpecLimitInput(type);
    }
}

// Open inline input popup to manually enter USL or LSL
function openSpecLimitInput(type) {
    const label = type === 'usl' ? '규격 상한선 (USL)' : '규격 하한선 (LSL)';
    const existingMap = type === 'usl' ? customUslMap : customLslMap;
    const existingVal = existingMap[state.selectedParameter];

    const popup = document.createElement('div');
    popup.style.cssText = `
        position: fixed; top: 50%; left: 50%; transform: translate(-50%, -50%);
        z-index: 99999; background: #151d30; border: 1px solid rgba(59,130,246,0.5);
        border-radius: 10px; padding: 20px 24px; min-width: 300px;
        box-shadow: 0 20px 60px rgba(0,0,0,0.8); font-family: inherit;
    `;
    popup.innerHTML = `
        <div style="font-size:13px;font-weight:700;color:#e2e8f0;margin-bottom:14px;">
            📐 ${label} 직접 입력 <span style="font-size:10px;color:#64748b;font-weight:400;">(항목: ${state.selectedParameter})</span>
        </div>
        <input type="number" id="spec-limit-input-field" step="any" value="${existingVal !== undefined ? existingVal : ''}"
            placeholder="규격값 입력 (예: 20.000)"
            style="width:100%;box-sizing:border-box;background:rgba(255,255,255,0.06);border:1px solid rgba(59,130,246,0.4);
                   color:#e2e8f0;border-radius:6px;padding:9px 12px;font-size:13px;outline:none;margin-bottom:12px;">
        <div style="display:flex;gap:8px;justify-content:flex-end;">
            <button id="spec-limit-clear" style="padding:7px 14px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);
                background:rgba(255,255,255,0.05);color:#94a3b8;cursor:pointer;font-size:11.5px;">초기화</button>
            <button id="spec-limit-cancel" style="padding:7px 14px;border-radius:5px;border:1px solid rgba(255,255,255,0.15);
                background:rgba(255,255,255,0.05);color:#94a3b8;cursor:pointer;font-size:11.5px;">취소</button>
            <button id="spec-limit-apply" style="padding:7px 16px;border-radius:5px;border:none;
                background:linear-gradient(135deg,#2563eb,#7c3aed);color:#fff;cursor:pointer;font-size:11.5px;font-weight:600;">적용</button>
        </div>
    `;

    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;inset:0;z-index:99998;background:rgba(0,0,0,0.5);';

    document.body.appendChild(overlay);
    document.body.appendChild(popup);

    const input = popup.querySelector('#spec-limit-input-field');
    input.focus();
    input.select();

    const close = () => { popup.remove(); overlay.remove(); };

    popup.querySelector('#spec-limit-cancel').onclick = close;
    overlay.onclick = close;

    popup.querySelector('#spec-limit-clear').onclick = () => {
        if (type === 'usl') delete customUslMap[state.selectedParameter];
        else delete customLslMap[state.selectedParameter];
        close();
        updateSpcMetaGrid();
        updateSpcCharts();
    };

    popup.querySelector('#spec-limit-apply').onclick = () => {
        const val = parseFloat(input.value);
        if (isNaN(val)) { input.style.borderColor = '#ef4444'; return; }
        if (type === 'usl') customUslMap[state.selectedParameter] = val;
        else customLslMap[state.selectedParameter] = val;
        close();
        updateSpcMetaGrid();
        updateSpcCharts();
    };

    input.onkeydown = (e) => {
        if (e.key === 'Enter') popup.querySelector('#spec-limit-apply').click();
        if (e.key === 'Escape') close();
    };
}

function getCpClass(val) {
    if (val >= 1.33) return 'good';
    if (val >= 1.0) return 'warn';
    return 'bad';
}

// Update charts
function updateSpcCharts() {
    renderSpcControlChart();
    renderSpcHistogramChart();
    renderSlotCpkComparisonChart();
    renderAllCpkComparisonChart();
}

// Chart 1: Main Measurement Chart (Slot Scatter or SPC Control Line Chart with Magnet Snapping)
function renderSpcControlChart() {
    const chartDom = document.getElementById('chart-spc-control');
    if (!chartDom) return;
    
    if (spcChart) spcChart.dispose();
    if (!state.selectedParameter) return;

    spcChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const analysis = analyzeParameter(state.selectedParameter);
    if (!analysis || analysis.points.length === 0) return;

    const points = analysis.points;
    const cl = analysis.cl;
    const ucl = analysis.ucl;
    const lcl = analysis.lcl;
    const usl = analysis.usl;
    const lsl = analysis.lsl;

    // Build Anomaly Index & Map for Magnet Tracking
    currentAnomalyList = [];
    const anomalyMap = new Map();

    points.forEach((p, idx) => {
        const pointIdx = idx + 1;
        const isSpecOut = (usl !== null && p.val > usl) || (lsl !== null && p.val < lsl);
        const isControlOut = (p.val > ucl || p.val < lcl);

        if (isSpecOut || isControlOut) {
            const info = {
                pointIdx: pointIdx,
                point: p,
                isSpecOut: isSpecOut,
                isControlOut: isControlOut,
                type: isSpecOut ? '규격 이탈 (NG)' : '관리한계 이탈 (Warning)',
                color: isSpecOut ? '#ef4444' : '#f59e0b'
            };
            currentAnomalyList.push(info);
            anomalyMap.set(pointIdx, info);
        }
    });

    updateAnomalyCounterUI();

    const markLines = [];
    if (cl !== null && !isNaN(cl)) {
        markLines.push({ yAxis: cl, name: 'CL (평균)', lineStyle: { color: '#10b981', type: 'solid', width: 1.5 } });
    }
    if (ucl !== null && !isNaN(ucl)) {
        markLines.push({ yAxis: ucl, name: 'UCL', lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 } });
    }
    if (lcl !== null && !isNaN(lcl)) {
        markLines.push({ yAxis: lcl, name: 'LCL', lineStyle: { color: '#f59e0b', type: 'dashed', width: 1 } });
    }
    if (usl !== null) {
        markLines.push({ yAxis: usl, name: 'USL (규격상한)', lineStyle: { color: '#ef4444', type: 'solid', width: 1.5 } });
    }
    if (lsl !== null) {
        markLines.push({ yAxis: lsl, name: 'LSL (규격하한)', lineStyle: { color: '#ef4444', type: 'solid', width: 1.5 } });
    }

    // Configure Y-Axis with Excel-like custom Min/Max/Interval support
    const yAxisConfigObj = {
        type: 'value',
        name: '측정치',
        nameTextStyle: { color: '#9ca3af' },
        scale: yAxisConfig.custom ? false : true,
        splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
    };

    if (yAxisConfig.custom) {
        if (yAxisConfig.min !== null && !isNaN(yAxisConfig.min)) yAxisConfigObj.min = yAxisConfig.min;
        if (yAxisConfig.max !== null && !isNaN(yAxisConfig.max)) yAxisConfigObj.max = yAxisConfig.max;
        if (yAxisConfig.interval !== null && !isNaN(yAxisConfig.interval) && yAxisConfig.interval > 0) {
            yAxisConfigObj.interval = yAxisConfig.interval;
        }
    }

    // Helper: Magnet Snapping Tooltip Formatter
    function formatMagnetTooltip(currentIdx, directPointInfo = null) {
        let targetPoint = directPointInfo;
        let isMagnetSnapped = false;
        let snappedAnomaly = null;

        // Check if there is an anomaly nearby (Magnet Snap window: ±80 points)
        if (currentAnomalyList.length > 0) {
            let closestAnomaly = null;
            let minDistance = 999999;

            for (let an of currentAnomalyList) {
                const dist = Math.abs(an.pointIdx - currentIdx);
                if (dist < minDistance && dist <= 80) {
                    minDistance = dist;
                    closestAnomaly = an;
                }
            }

            if (closestAnomaly && minDistance <= 30) {
                isMagnetSnapped = true;
                snappedAnomaly = closestAnomaly;
                targetPoint = closestAnomaly.point;
            }
        }

        if (!targetPoint) {
            const p = points[currentIdx - 1];
            if (!p) return '';
            targetPoint = p;
        }

        const specRange = (usl !== null && lsl !== null) ? `(${lsl.toFixed(3)} ~ ${usl.toFixed(3)})` : '';
        const isNG = (usl !== null && targetPoint.val > usl) || (lsl !== null && targetPoint.val < lsl);
        const isWarn = (targetPoint.val > ucl || targetPoint.val < lcl);

        let headerBadge = '';
        if (isMagnetSnapped && snappedAnomaly) {
            headerBadge = `<div style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; background:${snappedAnomaly.color}; color:#fff; margin-bottom:6px;">⚡ ${snappedAnomaly.type} 마그넷 흡착</div><br/>`;
        } else if (isNG) {
            headerBadge = `<div style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; background:#ef4444; color:#fff; margin-bottom:6px;">⚠️ 규격 이탈 (NG)</div><br/>`;
        } else if (isWarn) {
            headerBadge = `<div style="display:inline-block; padding:2px 8px; border-radius:4px; font-size:11px; font-weight:bold; background:#f59e0b; color:#fff; margin-bottom:6px;">⚠️ 관리한계선 이탈 (Warning)</div><br/>`;
        }

        return `${headerBadge}` +
               `<b>[${targetPoint.slot}번 수대]</b> 검사 No. <b>${targetPoint.index}</b><br/>` +
               `QRCODE: <span style="font-family:monospace; color:#38bdf8;">${targetPoint.qrcode}</span><br/>` +
               `측정치: <b style="font-size:13px; color:${isNG ? '#ef4444' : '#10b981'};">${targetPoint.val.toFixed(4)}</b> <span style="color:#9ca3af; font-size:11px;">${specRange}</span><br/>` +
               `파렛트: PLT ${targetPoint.pallet}번 | 판정: <b style="color:${targetPoint.judgement === 'OK' ? '#10b981' : '#ef4444'}">${targetPoint.judgement}</b>`;
    }

    let option = {};

    if (currentSpcViewMode === 'slot-scatter') {
        // MODE 1: Slot-based Scatter Plot
        const slotColors = {
            '1': '#3b82f6',
            '2': '#ef4444',
            '3': '#f59e0b',
            '4': '#10b981',
            '5': '#8b5cf6',
            '6': '#06b6d4'
        };

        const seriesList = [];
        const slots = ['1', '2', '3', '4', '5', '6'];

        slots.forEach((s, idx) => {
            const slotData = [];
            points.forEach((p, pIdx) => {
                if (String(p.slot) === s) {
                    slotData.push({
                        value: [pIdx + 1, p.val],
                        pointInfo: p
                    });
                }
            });

            seriesList.push({
                name: `${s}번 수대`,
                type: 'scatter',
                data: slotData,
                symbolSize: 6.5,
                z: 2 + idx,
                large: true,
                largeThreshold: 3000,
                itemStyle: {
                    color: slotColors[s] || '#ffffff',
                    opacity: 0.52,
                    borderColor: 'rgba(255, 255, 255, 0.3)',
                    borderWidth: 0.5
                },
                emphasis: {
                    focus: 'series',
                    blurScope: 'coordinateSystem',
                    itemStyle: {
                        opacity: 1.0,
                        symbolSize: 10,
                        shadowBlur: 12,
                        shadowColor: slotColors[s] || '#ffffff'
                    }
                }
            });
        });

        // Add markLine to the first series
        if (seriesList.length > 0) {
            seriesList[0].markLine = {
                symbol: 'none',
                label: { position: 'end', formatter: '{b}: {c}', color: '#9ca3af', fontSize: 10 },
                data: markLines
            };
        }

        option = {
            tooltip: {
                trigger: 'item',
                formatter: function(params) {
                    const info = params.data ? params.data.pointInfo : null;
                    const curIdx = params.data && params.data.value ? params.data.value[0] : 1;
                    return formatMagnetTooltip(curIdx, info);
                }
            },
            legend: {
                show: true,
                top: '1%',
                right: '2%',
                itemGap: 14,
                textStyle: { color: '#f3f4f6', fontSize: 11.5, fontWeight: 'bold' },
                data: slots.map(s => `${s}번 수대`)
            },
            grid: { top: '12%', left: '4%', right: '6%', bottom: '12%', containLabel: true },
            dataZoom: [
                { type: 'slider', show: true, start: 0, end: 25, bottom: '2%' },
                { type: 'inside', start: 0, end: 25 }
            ],
            xAxis: {
                type: 'value',
                name: '검사 순서 (QRCODE Index)',
                nameTextStyle: { color: '#9ca3af' },
                splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.03)' } }
            },
            yAxis: yAxisConfigObj,
            series: seriesList
        };

    } else {
        // MODE 2: Traditional Line SPC Control Chart with Magnet Snapping
        const controlWarnSeries = [];
        const specErrorSeries = [];

        points.forEach((p, idx) => {
            const item = [idx + 1, p.val];
            const isSpecOut = (usl !== null && p.val > usl) || (lsl !== null && p.val < lsl);
            const isControlOut = p.val > ucl || p.val < lcl;

            if (isSpecOut) {
                specErrorSeries.push(item);
            } else if (isControlOut) {
                controlWarnSeries.push(item);
            }
        });

        option = {
            tooltip: {
                trigger: 'axis',
                formatter: function(params) {
                    if (!params || params.length === 0) return '';
                    const curIdx = params[0].value[0];
                    return formatMagnetTooltip(curIdx);
                }
            },
            grid: { top: '14%', left: '4%', right: '6%', bottom: '14%', containLabel: true },
            dataZoom: [
                { type: 'slider', show: true, start: 0, end: 25, bottom: '3%' },
                { type: 'inside', start: 0, end: 25 }
            ],
            xAxis: {
                type: 'value',
                name: '검사 순서',
                nameTextStyle: { color: '#9ca3af' },
                splitLine: { show: false }
            },
            yAxis: yAxisConfigObj,
            series: [
                {
                    name: '측정 데이터',
                    type: 'line',
                    data: points.map((p, idx) => [idx + 1, p.val]),
                    symbol: 'none',
                    sampling: 'lttb',
                    lineStyle: { color: '#3b82f6', width: 1.5 },
                    markLine: {
                        symbol: 'none',
                        label: { position: 'end', formatter: '{b}: {c}', color: '#9ca3af', fontSize: 10 },
                        data: markLines
                    }
                },
                {
                    name: '관리선 이탈',
                    type: 'scatter',
                    data: controlWarnSeries,
                    symbolSize: 9,
                    z: 10,
                    large: false,
                    itemStyle: { color: '#f59e0b', borderColor: '#ffffff', borderWidth: 1.5 },
                    emphasis: { itemStyle: { symbolSize: 13, shadowBlur: 15, shadowColor: '#f59e0b' } }
                },
                {
                    name: '규격 이탈 (불량)',
                    type: 'scatter',
                    data: specErrorSeries,
                    symbolSize: 10,
                    z: 11,
                    large: false,
                    itemStyle: { color: '#ef4444', borderColor: '#ffffff', borderWidth: 1.5 },
                    emphasis: { itemStyle: { symbolSize: 14, shadowBlur: 15, shadowColor: '#ef4444' } }
                }
            ]
        };
    }

    spcChart.setOption(option, true);
}

// Chart 1-B: Cpk Capability & Measurement Distribution Histogram Chart (NEW)
function renderSpcHistogramChart() {
    const chartDom = document.getElementById('chart-spc-histogram');
    if (!chartDom) return;

    if (spcHistogramChart) spcHistogramChart.dispose();
    if (!state.selectedParameter) return;

    spcHistogramChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const analysis = analyzeParameter(state.selectedParameter);
    if (!analysis || analysis.points.length === 0) return;

    const values = analysis.points.map(p => p.val);
    const mean = analysis.mean;
    const stdDev = analysis.stdDev;
    const usl = analysis.usl;
    const lsl = analysis.lsl;
    const cpk = analysis.cpk;

    const minVal = Math.min(...values);
    const maxVal = Math.max(...values);

    // Calculate histogram Bins (30 bins)
    const numBins = 30;
    const margin = (maxVal - minVal) * 0.05 || 0.01;
    const startX = minVal - margin;
    const endX = maxVal + margin;
    const binWidth = (endX - startX) / numBins;

    const binCounts = new Array(numBins).fill(0);
    const binCenters = [];

    for (let i = 0; i < numBins; i++) {
        binCenters.push(parseFloat((startX + (i + 0.5) * binWidth).toFixed(4)));
    }

    values.forEach(v => {
        let binIdx = Math.floor((v - startX) / binWidth);
        if (binIdx < 0) binIdx = 0;
        if (binIdx >= numBins) binIdx = numBins - 1;
        binCounts[binIdx]++;
    });

    // Gaussian Bell Curve points (scaled to match histogram frequency counts)
    const normalCurveData = [];
    const N = values.length;
    const scaleFactor = N * binWidth; // Total area scale for frequency curve

    if (stdDev > 0) {
        const step = (endX - startX) / 100;
        for (let x = startX; x <= endX; x += step) {
            const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * Math.pow((x - mean) / stdDev, 2));
            const freq = pdf * scaleFactor;
            normalCurveData.push([parseFloat(x.toFixed(4)), parseFloat(freq.toFixed(2))]);
        }
    }

    const histogramBarData = binCenters.map((center, i) => [center, binCounts[i]]);

    // Mark lines for USL, LSL, Mean
    const markLines = [];
    markLines.push({ yAxis: undefined, xAxis: mean, name: `Mean (${mean.toFixed(3)})`, lineStyle: { color: '#10b981', type: 'solid', width: 2 } });

    if (usl !== null) {
        markLines.push({ yAxis: undefined, xAxis: usl, name: `USL (${usl.toFixed(3)})`, lineStyle: { color: '#ef4444', type: 'solid', width: 2 } });
    }
    if (lsl !== null) {
        markLines.push({ yAxis: undefined, xAxis: lsl, name: `LSL (${lsl.toFixed(3)})`, lineStyle: { color: '#ef4444', type: 'solid', width: 2 } });
    }

    const cpkText = (cpk !== null && !isNaN(cpk)) ? cpk.toFixed(2) : 'N/A';

    const option = {
        title: {
            text: `공정 능력 Cpk = ${cpkText} (평균: ${mean.toFixed(4)}, 표준편차: ${stdDev.toFixed(5)})`,
            left: 'center',
            textStyle: { color: '#f3f4f6', fontSize: 13, fontWeight: 'normal' }
        },
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                if (!params || params.length === 0) return '';
                let res = `측정치 구간: <b>${params[0].value[0]}</b><br/>`;
                params.forEach(item => {
                    if (item.seriesName === '측정치 분포') {
                        res += `빈도 수량: <b>${item.value[1]} 건</b><br/>`;
                    } else if (item.seriesName === '정규분포 곡선') {
                        res += `정규분포 이론값: <b>${item.value[1]}</b><br/>`;
                    }
                });
                return res;
            }
        },
        grid: { top: '18%', left: '5%', right: '6%', bottom: '12%', containLabel: true },
        xAxis: {
            type: 'value',
            name: '측정 치수값',
            nameTextStyle: { color: '#9ca3af' },
            scale: true,
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        yAxis: {
            type: 'value',
            name: '데이터 빈도 수 (Frequency)',
            nameTextStyle: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        series: [
            {
                name: '측정치 분포',
                type: 'bar',
                data: histogramBarData,
                barCategoryGap: '2%',
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: 'rgba(59, 130, 246, 0.85)' },
                        { offset: 1, color: 'rgba(6, 182, 212, 0.4)' }
                    ]),
                    borderColor: 'rgba(59, 130, 246, 0.6)',
                    borderWidth: 1,
                    borderRadius: [2, 2, 0, 0]
                },
                markLine: {
                    symbol: 'none',
                    label: { position: 'end', formatter: '{b}', color: '#9ca3af', fontSize: 10 },
                    data: markLines
                }
            },
            {
                name: '정규분포 곡선',
                type: 'line',
                data: normalCurveData,
                smooth: true,
                symbol: 'none',
                lineStyle: { color: '#10b981', width: 2.5, shadowBlur: 8, shadowColor: 'rgba(16, 185, 129, 0.4)' }
            }
        ]
    };

    spcHistogramChart.setOption(option, true);
}

// Chart 2: Slot Cpk Comparison Chart (New feature)
function renderSlotCpkComparisonChart() {
    const chartDom = document.getElementById('chart-spc-cpk-comparison');
    if (!chartDom) return;

    if (cpkChart) cpkChart.dispose();
    if (!state.selectedParameter) return;

    cpkChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    // Temp save filter to calculate each slot independently
    const originalSlotFilter = state.filters.slot;
    const slotCpks = [];

    for (let s = 1; s <= 6; s++) {
        state.filters.slot = String(s);
        const analysis = analyzeParameter(state.selectedParameter);
        const cpk = (analysis && analysis.cpk !== null && !isNaN(analysis.cpk)) ? parseFloat(analysis.cpk.toFixed(2)) : 0;
        slotCpks.push({ slot: `${s}번 수대`, value: cpk });
    }

    // Restore original filter
    state.filters.slot = originalSlotFilter;

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: '{b}<br/>공정능력지수(Cpk): <b>{c}</b>'
        },
        grid: { top: '15%', left: '5%', right: '5%', bottom: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: slotCpks.map(item => item.slot),
            axisLabel: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        yAxis: {
            type: 'value',
            name: 'Cpk 지수',
            nameTextStyle: { color: '#9ca3af' },
            axisLabel: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        series: [
            {
                name: 'Cpk 지수',
                type: 'bar',
                data: slotCpks.map(item => item.value),
                itemStyle: {
                    color: function(params) {
                        const val = params.value;
                        if (val >= 1.33) return '#10b981'; // Green
                        if (val >= 1.0) return '#f59e0b';  // Orange
                        return '#ef4444';                  // Red
                    },
                    borderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    color: '#f3f4f6',
                    fontWeight: 'bold'
                }
            }
        ]
    };

    // Add markLine to show threshold for good (1.33) and poor (1.0)
    option.series[0].markLine = {
        symbol: 'none',
        label: { position: 'end', color: '#9ca3af', fontSize: 10 },
        data: [
            { yAxis: 1.33, name: '우수 한계 (1.33)', lineStyle: { color: '#10b981', type: 'dashed' } },
            { yAxis: 1.0, name: '불량 경계 (1.0)', lineStyle: { color: '#ef4444', type: 'dashed' } }
        ]
    };

    cpkChart.setOption(option, true);
}

// Chart 3: All Parameter Cpk Comparison Chart
function renderAllCpkComparisonChart() {
    const chartDom = document.getElementById('chart-spc-all-cpk');
    if (!chartDom) return;

    if (allCpkChart) allCpkChart.dispose();
    if (state.measurementGroups.length === 0) return;

    allCpkChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    // Calculate Cpk for all measurement parameters
    const paramCpks = [];
    state.measurementGroups.forEach(g => {
        const analysis = analyzeParameter(g.name, true); // ignoreFilters = true to see overall Cpk
        const cpk = (analysis && analysis.cpk !== null && !isNaN(analysis.cpk)) ? parseFloat(analysis.cpk.toFixed(2)) : 0;
        paramCpks.push({ name: g.name, value: cpk });
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: '{b}<br/>공정능력지수(Cpk): <b>{c}</b>'
        },
        grid: { top: '15%', left: '5%', right: '5%', bottom: '20%', containLabel: true },
        xAxis: {
            type: 'category',
            data: paramCpks.map(item => item.name),
            axisLabel: { 
                color: '#9ca3af',
                interval: 0,
                rotate: 20, // Rotate labels to prevent overlapping
                fontSize: 9
            },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        yAxis: {
            type: 'value',
            name: 'Cpk 지수',
            nameTextStyle: { color: '#9ca3af' },
            axisLabel: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        series: [
            {
                name: 'Cpk 지수',
                type: 'bar',
                data: paramCpks.map(item => item.value),
                itemStyle: {
                    color: function(params) {
                        const val = params.value;
                        if (val >= 1.33) return '#10b981'; // Green
                        if (val >= 1.0) return '#f59e0b';  // Orange
                        return '#ef4444';                  // Red
                    },
                    borderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: true,
                    position: 'top',
                    formatter: '{c}',
                    color: '#f3f4f6',
                    fontWeight: 'bold'
                }
            }
        ]
    };

    // Add markLine to show threshold for good (1.33) and poor (1.0)
    option.series[0].markLine = {
        symbol: 'none',
        label: { position: 'end', color: '#9ca3af', fontSize: 10 },
        data: [
            { yAxis: 1.33, name: '우수 한계 (1.33)', lineStyle: { color: '#10b981', type: 'dashed' } },
            { yAxis: 1.0, name: '불량 경계 (1.0)', lineStyle: { color: '#ef4444', type: 'dashed' } }
        ]
    };

    allCpkChart.setOption(option, true);
}

// Render Anomalies Table
function renderAnomaliesTable() {
    const tbody = document.querySelector('#table-anomalies tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (state.anomalies.length === 0) {
        tbody.innerHTML = `<tr><td colspan="8" class="text-center text-muted py-4">감지된 규격 이탈 또는 가공 지연 이상이 없습니다.</td></tr>`;
        return;
    }

    const pad = (n) => n.toString().padStart(2, '0');
    const fmtTime = (d) => d ? `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '-';

    state.anomalies.forEach((anom, idx) => {
        const tr = document.createElement('tr');
        
        let badgeClass = 'badge-info';
        if (anom.type.includes('규격')) {
            badgeClass = 'badge-danger';
        } else if (anom.type.includes('관리')) {
            badgeClass = 'badge-warning';
        } else if (anom.type.includes('지연')) {
            badgeClass = 'badge-warning';
        }

        tr.innerHTML = `
            <td>${anom.no}</td>
            <td>${anom.qrcode}</td>
            <td>${fmtTime(anom.time)}</td>
            <td>${anom.parameter}</td>
            <td class="font-bold">${anom.val.toFixed(3)}</td>
            <td>${anom.limits}</td>
            <td><span class="badge ${badgeClass}">${anom.type}</span></td>
            <td class="text-muted">${anom.desc}</td>
        `;
        tbody.appendChild(tr);
    });
}

// Export Anomalies to CSV
function exportAnomaliesToCsv() {
    const headers = ['검사No.', 'QR코드', '발생시각', '측정항목', '측정값', '스펙규격(하한~상한)', '이상유형', '상세설명'];
    const pad = (n) => n.toString().padStart(2, '0');
    const fmtDate = (d) => d ? `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}` : '';

    const rows = state.anomalies.map(anom => [
        anom.no,
        anom.qrcode,
        fmtDate(anom.time),
        anom.parameter,
        anom.val.toFixed(4),
        anom.limits,
        anom.type,
        anom.desc
    ]);

    const csvContent = [headers].concat(rows)
        .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(","))
        .join("\n");
        
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `FMS_이상탐지_리포트_${new Date().toISOString().slice(0,10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}


// =========================================================================

// MODULE: components/quality.js

// =========================================================================

// FMS Data Analysis Dashboard - Quality & Factor Analysis Component (Slot & Pallet Focus)


let deviationChart = null;
let heatmapChart = null;
let selectedQualityParameter = '';

function initQuality() {
    window.addEventListener('resize', resizeQualityCharts);
    
    // Parameter selector change listener
    const paramSelect = document.getElementById('select-quality-parameter');
    if (paramSelect) {
        paramSelect.addEventListener('change', (e) => {
            selectedQualityParameter = e.target.value;
            const data = state.mappedData;
            if (data.length > 0) {
                renderSlotDeviationChart(data);
                renderSlotPalletHeatmap(data);
            }
        });
    }

    // Mode selector change listener
    const modeSelect = document.getElementById('select-quality-heatmap-mode');
    if (modeSelect) {
        modeSelect.addEventListener('change', () => {
            const data = state.mappedData;
            if (data.length > 0) {
                renderSlotPalletHeatmap(data);
            }
        });
    }
}

function resizeQualityCharts() {
    if (deviationChart) deviationChart.resize();
    if (heatmapChart) heatmapChart.resize();
}

function updateQualityDashboard() {
    const data = state.mappedData;
    if (data.length === 0) return;

    // Force update drop down options from measurement parameters because data changed
    populateQualityParameters(true);

    renderSlotDeviationChart(data);
    renderSlotPalletHeatmap(data); 
    generateQualityInsights(data);
}

function populateQualityParameters(force = false) {
    const paramSelect = document.getElementById('select-quality-parameter');
    if (!paramSelect) return;

    // Clean and rebuild dropdown options when force-updated, or empty
    if (force || paramSelect.options.length <= 1 || paramSelect.options[0]?.value === "") {
        paramSelect.innerHTML = '';
        state.measurementGroups.forEach(group => {
            const opt = document.createElement('option');
            opt.value = group.name;
            opt.textContent = group.name;
            paramSelect.appendChild(opt);
        });

        // Set default local parameter or check if current one still exists
        const hasCurrentParam = state.measurementGroups.some(group => group.name === selectedQualityParameter);
        if (!selectedQualityParameter || !hasCurrentParam) {
            selectedQualityParameter = state.measurementGroups.length > 0 ? state.measurementGroups[0].name : '';
        }
        paramSelect.value = selectedQualityParameter;
    }
}

// Chart 1: Slot Deviation Chart (Average measured value by slot)
function renderSlotDeviationChart(data) {
    const chartDom = document.getElementById('chart-quality-pareto');
    if (!chartDom) return;
    
    if (deviationChart) deviationChart.dispose();
    if (!selectedQualityParameter) return;

    deviationChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const slotValues = {};
    for (let s = 1; s <= 6; s++) {
        slotValues[String(s)] = [];
    }

    let usl = null;
    let lsl = null;

    data.forEach(d => {
        const slot = d.slot;
        const m = d.measurements[selectedQualityParameter];
        if (m && m.val !== null && !isNaN(m.val)) {
            if (!slotValues[slot]) slotValues[slot] = [];
            slotValues[slot].push(m.val);
            if (usl === null && m.usl !== null) usl = m.usl;
            if (lsl === null && m.lsl !== null) lsl = m.lsl;
        }
    });

    const slots = Object.keys(slotValues).sort((a,b)=>a.localeCompare(b, undefined, {numeric:true}));
    
    const averages = [];
    const minValues = [];
    const maxValues = [];

    slots.forEach(s => {
        const vals = slotValues[s];
        if (vals.length > 0) {
            const { mean } = getStats(vals);
            averages.push(parseFloat(mean.toFixed(4)));
            minValues.push(parseFloat(vals.reduce((min, v) => v < min ? v : min, vals[0]).toFixed(4)));
            maxValues.push(parseFloat(vals.reduce((max, v) => v > max ? v : max, vals[0]).toFixed(4)));
        } else {
            averages.push(0);
            minValues.push(0);
            maxValues.push(0);
        }
    });

    const option = {
        tooltip: {
            trigger: 'axis',
            formatter: function(params) {
                const idx = params[0].dataIndex;
                const slot = slots[idx];
                return `${slot}번 수대 평균치<br/>` +
                       `평균값: <b>${averages[idx]}</b><br/>` +
                       `최댓값: ${maxValues[idx]}<br/>` +
                       `최솟값: ${minValues[idx]}`;
            }
        },
        grid: { top: '15%', left: '8%', right: '5%', bottom: '10%', containLabel: true },
        xAxis: {
            type: 'category',
            data: slots.map(s => `${s}번 수대`),
            axisLabel: { color: '#9ca3af' },
            axisLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.1)' } }
        },
        yAxis: {
            type: 'value',
            name: '측정치 평균',
            nameTextStyle: { color: '#9ca3af' },
            scale: true,
            axisLabel: { color: '#9ca3af' },
            splitLine: { lineStyle: { color: 'rgba(255, 255, 255, 0.05)' } }
        },
        series: [
            {
                name: '평균 측정값',
                type: 'bar',
                data: averages,
                itemStyle: {
                    color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                        { offset: 0, color: '#06b6d4' },
                        { offset: 1, color: '#3b82f6' }
                    ]),
                    borderRadius: [4, 4, 0, 0]
                },
                label: {
                    show: true,
                    position: 'top',
                    color: '#f3f4f6',
                    fontSize: 10
                }
            }
        ]
    };

    const markLines = [];
    if (usl !== null) markLines.push({ yAxis: usl, name: 'USL 규격상한', lineStyle: { color: '#ef4444', type: 'solid' } });
    if (lsl !== null) markLines.push({ yAxis: lsl, name: 'LSL 규격하한', lineStyle: { color: '#ef4444', type: 'solid' } });
    
    if (markLines.length > 0) {
        option.series[0].markLine = {
            symbol: 'none',
            label: { position: 'end', color: '#9ca3af', fontSize: 10 },
            data: markLines
        };
    }

    deviationChart.setOption(option, true);
    document.getElementById('quality-deviation-title').textContent = `수대(Slot)별 [${selectedQualityParameter}] 측정치 평균 비교`;
}

// Chart 2: Slot vs Pallet Heatmap (6 Slots x 30 Pallets Grid)
function renderSlotPalletHeatmap(data) {
    const chartDom = document.getElementById('chart-quality-heatmap');
    if (!chartDom) return;
    
    if (heatmapChart) heatmapChart.dispose();
    heatmapChart = echarts.init(chartDom, 'dark', { backgroundColor: 'transparent' });

    const modeSelect = document.getElementById('select-quality-heatmap-mode');
    const mode = modeSelect ? modeSelect.value : 'ng';

    const pallets = Array.from(new Set(data.map(d => d.pallet)))
        .filter(p => p !== undefined && p !== '')
        .sort((a,b) => String(a).localeCompare(String(b), undefined, {numeric: true}));
    
    const slots = ['1', '2', '3', '4', '5', '6'];

    // Grouping cell data
    const cellStats = {};
    data.forEach(d => {
        const key = `${d.slot}||${d.pallet}`;
        if (!cellStats[key]) cellStats[key] = { total: 0, ng: 0, measurements: [] };
        cellStats[key].total++;
        if (d.judgement === 'NG') cellStats[key].ng++;
        
        // Add measurement value if parameter selected
        if (selectedQualityParameter) {
            const m = d.measurements[selectedQualityParameter];
            if (m && m.val !== null && !isNaN(m.val)) {
                cellStats[key].measurements.push(m.val);
            }
        }
    });

    // Calculate global stats for deviation mode
    let globalMean = 0;
    let globalStd = 0.1;
    if (mode === 'measure' && selectedQualityParameter) {
        const globalVals = data.map(d => d.measurements[selectedQualityParameter]?.val).filter(v => v !== null && !isNaN(v));
        const globalStats = getStats(globalVals);
        globalMean = globalStats.mean;
        globalStd = globalStats.stdDev || 0.1;
    }

    const heatmapData = [];
    pallets.forEach((pallet, pIdx) => {
        slots.forEach((slot, sIdx) => {
            const key = `${slot}||${pallet}`;
            const stat = cellStats[key];
            
            if (mode === 'ng') {
                const ngCount = stat ? stat.ng : 0;
                const totalCount = stat ? stat.total : 0;
                heatmapData.push([pIdx, sIdx, ngCount, totalCount]);
            } else {
                // Measure Deviation Mode: value is (cellMean - globalMean) normalized in Z-score
                let zScore = 0;
                let offset = 0;
                let totalCount = 0;
                
                if (stat && stat.measurements.length > 0) {
                    const { mean } = getStats(stat.measurements);
                    offset = mean - globalMean;
                    zScore = offset / globalStd;
                    totalCount = stat.total;
                }
                
                // Truncate zScore between -3.0 and +3.0
                const zClipped = Math.max(-3, Math.min(3, zScore));
                
                // Format: [xIdx, yIdx, zClipped, offset, totalCount, rawZScore]
                heatmapData.push([pIdx, sIdx, parseFloat(zClipped.toFixed(2)), offset, totalCount, zScore]);
            }
        });
    });

    const option = {
        grid: { top: '8%', bottom: '18%', left: '8%', right: '5%' },
        xAxis: {
            type: 'category',
            data: pallets.map(p => `PLT ${p}`),
            name: 'LMS 파렛트 번호 (MAIN PLT NO)',
            nameLocation: 'middle',
            nameGap: 30,
            nameTextStyle: { color: '#9ca3af' },
            axisLabel: { color: '#f3f4f6', rotate: 45, interval: 0, fontSize: 9 },
            splitArea: { show: true }
        },
        yAxis: {
            type: 'category',
            data: slots.map(s => `${s}번 수대`),
            axisLabel: { color: '#f3f4f6' },
            splitArea: { show: true }
        },
        series: [
            {
                name: mode === 'ng' ? '불량 수량' : '측정 편차',
                type: 'heatmap',
                data: heatmapData,
                emphasis: {
                    itemStyle: {
                        shadowBlur: 10,
                        shadowColor: 'rgba(0, 0, 0, 0.5)'
                    }
                }
            }
        ]
    };

    // Configure tooltip, visualMap, and labels based on mode
    if (mode === 'ng') {
        option.tooltip = {
            position: 'top',
            formatter: function(params) {
                const p = pallets[params.data[0]];
                const s = slots[params.data[1]];
                const ng = params.data[2];
                const total = params.data[3];
                const rate = total > 0 ? ((ng / total) * 100).toFixed(1) : '0.0';
                return `파렛트: <b>${p}번</b> | 수대: <b>${s}번</b><br/>불량 수량: <b style="color:#ef4444">${ng}건</b> (총 ${total} EA, 불량률: ${rate}%)`;
            }
        };
        const ngValues = heatmapData.map(item => item[2]);
        const maxNg = ngValues.reduce((max, val) => val > max ? val : max, 3);
        const displayMaxNg = maxNg > 3 ? maxNg : 3;

        option.visualMap = {
            min: 0,
            max: displayMaxNg,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            dimension: 2,
            text: [`불량 집중 (${displayMaxNg}건)`, '양호 (0건)'],
            textStyle: { color: '#9ca3af' },
            inRange: {
                color: ['#10b981', '#f59e0b', '#ef4444']
            }
        };
        option.series[0].label = {
            show: true,
            formatter: function(params) {
                return params.data[2] > 0 ? `${params.data[2]}` : '';
            },
            color: '#f3f4f6',
            fontSize: 10,
            fontWeight: 'bold'
        };
    } else {
        // Measurement Deviation mode (Bi-directional Blue to Red)
        option.tooltip = {
            position: 'top',
            formatter: function(params) {
                const p = pallets[params.data[0]];
                const s = slots[params.data[1]];
                const offset = params.data[3];
                const total = params.data[4];
                const z = params.data[5];
                const sign = offset >= 0 ? '+' : '';
                return `파렛트: <b>${p}번</b> | 수대: <b>${s}번</b><br/>` +
                       `평균 편차: <b style="color:${offset >= 0 ? '#ef4444' : '#3b82f6'}">${sign}${offset.toFixed(4)}</b> (전체 평균 기준)<br/>` +
                       `치우침 정도: ${sign}${z.toFixed(2)} σ (시그마)<br/>` +
                       `측정 수량: ${total} EA`;
            }
        };
        option.visualMap = {
            min: -2,
            max: 2,
            calculable: true,
            orient: 'horizontal',
            left: 'center',
            bottom: '0%',
            dimension: 2,
            text: ['상향 편차 (+)', '하향 편차 (-)'],
            textStyle: { color: '#9ca3af' },
            inRange: {
                // Blue (Negative deviation) -> Translucent (No deviation) -> Red (Positive deviation)
                color: ['#2563eb', 'rgba(255, 255, 255, 0.05)', '#dc2626']
            }
        };
        option.series[0].label = {
            show: true,
            formatter: function(params) {
                const offset = params.data[3];
                const total = params.data[4];
                if (total === 0) return '';
                const sign = offset >= 0 ? '+' : '';
                return `${sign}${offset.toFixed(3)}`;
            },
            color: '#f3f4f6',
            fontSize: 8
        };
    }

    heatmapChart.setOption(option, true);
}

// Generate Actionable Insights
function generateQualityInsights(data) {
    const container = document.getElementById('quality-insights');
    if (!container) return;

    container.innerHTML = '';
    const insights = [];

    const totalCount = data.length;
    const ngCount = data.filter(d => d.judgement === 'NG').length;
    const globalRate = totalCount > 0 ? (ngCount / totalCount) * 100 : 0;
    
    // 1. Analyze by Pallet (MAIN PLT NO)
    const palletStats = {};
    data.forEach(d => {
        const p = d.pallet;
        if (!palletStats[p]) palletStats[p] = { total: 0, ng: 0 };
        palletStats[p].total++;
        if (d.judgement === 'NG') palletStats[p].ng++;
    });

    const defectivePallets = [];
    Object.keys(palletStats).forEach(p => {
        const stat = palletStats[p];
        const rate = (stat.ng / stat.total) * 100;
        if (rate > 3.0 && stat.ng >= 2) {
            defectivePallets.push({ plt: p, rate: rate, ng: stat.ng, total: stat.total });
        }
    });

    // 2. Analyze by Slot (SLOT_NO)
    const slotStats = {};
    data.forEach(d => {
        const s = d.slot;
        if (!slotStats[s]) slotStats[s] = { total: 0, ng: 0 };
        slotStats[s].total++;
        if (d.judgement === 'NG') slotStats[s].ng++;
    });

    const defectiveSlots = [];
    Object.keys(slotStats).forEach(s => {
        const stat = slotStats[s];
        const rate = (stat.ng / stat.total) * 100;
        if (rate > 2.0 && stat.ng >= 3) {
            defectiveSlots.push({ slot: s, rate: rate, ng: stat.ng, total: stat.total });
        }
    });

    // 3. Generate Insights Cards
    if (globalRate > 1.5) {
        insights.push({
            type: 'danger',
            title: '종합 생산 수율 경고',
            desc: `종합 불량률이 <b>${globalRate.toFixed(2)}%</b>로 다소 높습니다. 아래 수대 및 파렛트 상세 진단에 기재된 하드웨어 결함 요인을 해결해 주십시오.`
        });
    } else {
        insights.push({
            type: 'success',
            title: '종합 생산 수율 양호',
            desc: `종합 불량률이 <b>${globalRate.toFixed(2)}%</b>로 관리 기준(1.5%) 이하로 안정 유지 중입니다.`
        });
    }

    defectivePallets.forEach(dp => {
        insights.push({
            type: 'danger',
            title: `[LMS 파렛트 결함 의심] PLT ${dp.plt}번 점검 필요`,
            desc: `파렛트 번호 <b>${dp.plt}번</b> 가공품에서 불량이 <b>${dp.ng}건</b>(불량률: ${dp.rate.toFixed(1)}%) 발생했습니다. 해당 파렛트 자체의 **휨, 베이스 변형, 또는 클램핑 지그 마모**를 실물 점검하고 클리닝하십시오.`
        });
    });

    defectiveSlots.forEach(ds => {
        insights.push({
            type: 'warning',
            title: `[수대 정밀도 저하] ${ds.slot}번 수대 점검 필요`,
            desc: `LMS 파렛트의 <b>${ds.slot}번 수대(Slot)</b>에서 총 <b>${ds.ng}건</b>(불량률: ${ds.rate.toFixed(1)}%)의 불량이 집중되었습니다. 해당 수대 라인의 **치수 오프셋, 기계 실린더 압력 편차, 정밀 핀 마모** 여부를 점검하십시오.`
        });
    });

    const cellIssues = [];
    data.forEach(d => {
        const key = `${d.slot}||${d.pallet}`;
        if (!cellIssues[key]) cellIssues[key] = { ng: 0, slot: d.slot, pallet: d.pallet };
        if (d.judgement === 'NG') cellIssues[key].ng++;
    });

    Object.keys(cellIssues).forEach(key => {
        const cell = cellIssues[key];
        if (cell.ng >= 2) {
            const pltRate = palletStats[cell.pallet] ? (palletStats[cell.pallet].ng / palletStats[cell.pallet].total) * 100 : 0;
            const slotRate = slotStats[cell.slot] ? (slotStats[cell.slot].ng / slotStats[cell.slot].total) * 100 : 0;
            
            if (pltRate < 5.0 && slotRate < 5.0) {
                insights.push({
                    type: 'info',
                    title: `[수대-파렛트 매칭 오정렬] Slot ${cell.slot} - PLT ${cell.pallet}`,
                    desc: `<b>${cell.slot}번 수대</b>에 <b>${cell.pallet}번 파렛트</b>가 진입할 때 불량이 <b>${cell.ng}건</b> 중첩되었습니다. 특정 수대와 파렛트 핀 간의 **안착 간섭 또는 위치 결합 편차** 조율이 필요합니다.`
                });
            }
        }
    });

    if (insights.length === 0) {
        container.innerHTML = `
            <div class="insight-card info">
                <div class="insight-icon"><i data-lucide="info"></i></div>
                <div class="insight-body">
                    <div class="insight-title">검출된 이상 요인 없음</div>
                    <div class="insight-desc">수대(1~6) 및 파렛트(1~30) 통계 분석 결과, 특이할 만한 기계적 편차나 결함 기여 패턴이 발견되지 않았습니다.</div>
                </div>
            </div>
        `;
    } else {
        insights.forEach(ins => {
            const card = document.createElement('div');
            card.className = `insight-card ${ins.type}`;
            
            let iconName = 'info';
            if (ins.type === 'danger') iconName = 'alert-octagon';
            if (ins.type === 'warning') iconName = 'alert-triangle';
            if (ins.type === 'success') iconName = 'check-circle-2';

            card.innerHTML = `
                <div class="insight-icon"><i data-lucide="${iconName}"></i></div>
                <div class="insight-body">
                    <div class="insight-title">${ins.title}</div>
                    <div class="insight-desc">${ins.desc}</div>
                </div>
            `;
            container.appendChild(card);
        });
    }

    lucide.createIcons();
}


// =========================================================================

// MODULE: app_src.js (Main controller)

// =========================================================================

// FMS Data Analysis Dashboard - Main Application Controller








const initApp = () => {
    // 1. Initialize Views & Components
    initOverview();
    initQuality();
    
    // Toast helper
    const showToast = (message, type = 'info') => {
        const container = document.getElementById('toast-container');
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        
        let iconName = 'info';
        if (type === 'success') iconName = 'check-circle-2';
        if (type === 'error') iconName = 'alert-octagon';
        if (type === 'warn') iconName = 'alert-triangle';

        toast.innerHTML = `
            <i data-lucide="${iconName}"></i>
            <div class="toast-content">${message}</div>
        `;
        
        container.appendChild(toast);
        lucide.createIcons();
        
        // Auto remove
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            setTimeout(() => {
                container.removeChild(toast);
            }, 300);
        }, 3000);
    };

    // Callback when file is parsed
    const onFileParsed = () => {
        mapper.renderMapping();
        // Redirect to import tab mapping area
        navigateToView('import');
        showToast('파일 가져오기 성공! 역할을 지정한 후 분석을 시작해 주세요.', 'success');
    };

    // Callback when column mapping is applied
    const onMappingApplied = () => {
        populateSpcParameters();
        
        // Refresh all views
        updateOverviewDashboard();
        updateSpcView();
        updateQualityDashboard();
        
        // Redirect to dashboard view
        navigateToView('overview');
        showToast('성공적으로 공정 데이터 분석을 가공하여 시각화했습니다.', 'success');
    };

    // Initialize Importer and Mapper
    const mapper = initMapper({ onMappingApplied, showToast });
    initImporter({ onFileParsed, showToast });
    initSpc({ showToast });

    // 2. Setup Navigation Routing
    const menuItems = {
        'overview': document.getElementById('menu-overview'),
        'spc': document.getElementById('menu-spc'),
        'quality': document.getElementById('menu-quality'),
        'import': document.getElementById('menu-import')
    };

    const views = {
        'overview': document.getElementById('view-overview'),
        'spc': document.getElementById('view-spc'),
        'quality': document.getElementById('view-quality'),
        'import': document.getElementById('view-import')
    };

    const viewMeta = {
        'overview': { title: '종합 대시보드', subtitle: 'FMS 생산 및 품질 데이터 실시간 분석 현황' },
        'spc': { title: '통계적 공정관리 (SPC) & 이상 탐지', subtitle: '3시그마 관리도 분석 및 공정능력지수(Cpk), 사이클 지연 모니터링' },
        'quality': { title: '품목 및 품질 분석', subtitle: '생산 모델별 기여도 및 특정 기계-모델 간 불량 상관 분석' },
        'import': { title: '데이터 파일 가져오기', subtitle: '설비에서 추출한 FMS CSV/Excel 데이터 파싱 및 컬럼 매핑' }
    };

    function navigateToView(viewName) {
        // Validation: Block access to dashboards if no data is loaded
        if (viewName !== 'import' && state.mappedData.length === 0) {
            showToast('분석할 FMS 데이터가 없습니다. 먼저 파일을 업로드하거나 시뮬레이션 데이터를 생성하세요.', 'warn');
            navigateToView('import');
            return;
        }

        // Update active class in sidebar menu
        Object.keys(menuItems).forEach(key => {
            if (key === viewName) {
                menuItems[key].classList.add('active');
            } else {
                menuItems[key].classList.remove('active');
            }
        });

        // Toggle visibility of views
        Object.keys(views).forEach(key => {
            if (key === viewName) {
                views[key].classList.add('active');
            } else {
                views[key].classList.remove('active');
            }
        });

        // Update Header Title & Subtitle
        document.getElementById('view-title').textContent = viewMeta[viewName].title;
        document.getElementById('view-subtitle').textContent = viewMeta[viewName].subtitle;
        
        // Lucide reload (in case elements updated)
        lucide.createIcons();

        // Call chart resize after the browser has done the layout
        setTimeout(() => {
            if (viewName === 'overview') resizeOverviewCharts();
            if (viewName === 'spc') resizeSpcCharts();
            if (viewName === 'quality') resizeQualityCharts();
        }, 50);
    }

    // Attach click listeners to menu items
    Object.keys(menuItems).forEach(key => {
        menuItems[key].addEventListener('click', (e) => {
            e.preventDefault();
            navigateToView(key);
        });
    });

    // 3. Mock Data Generation Button
    const btnMock = document.getElementById('btn-generate-mock');
    btnMock.addEventListener('click', () => {
        showToast('시뮬레이션 데이터를 생성 중입니다...', 'info');
        
        setTimeout(() => {
            try {
                const mockRows = generateMockFMSData();
                state.reset();
                state.rawData = mockRows;
                state.fileMeta = {
                    name: 'FMS_Simulation_Data_260605.csv',
                    size: '145.2 KB',
                    rows: mockRows.length
                };
                
                // Trigger file parse callback
                onFileParsed();
            } catch (err) {
                showToast('시뮬레이션 데이터 생성 실패: ' + err.message, 'error');
                console.error(err);
            }
        }, 300);
    });

    // 4. Print / PDF Export Button
    const btnPrint = document.getElementById('btn-export-report');
    btnPrint.addEventListener('click', () => {
        showToast('인쇄 대화 상자를 실행합니다. PDF로도 저장할 수 있습니다.', 'info');
        setTimeout(() => {
            window.print();
        }, 500);
    });

    // 5. Live Clock setup
    const clockEl = document.getElementById('system-time');
    const updateClock = () => {
        const now = new Date();
        const pad = (n) => n.toString().padStart(2, '0');
        clockEl.textContent = `${now.getFullYear()}-${pad(now.getMonth()+1)}-${pad(now.getDate())} ${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
    };
    setInterval(updateClock, 1000);
    updateClock();

    // 6. Sidebar toggle collapse
    const btnToggleSidebar = document.getElementById('btn-toggle-sidebar');
    const sidebar = document.querySelector('.sidebar');
    if (btnToggleSidebar && sidebar) {
        btnToggleSidebar.addEventListener('click', () => {
            sidebar.classList.toggle('collapsed');
            
            // Trigger chart resize after sidebar animation finishes (300ms)
            setTimeout(() => {
                const activeView = document.querySelector('.view-section.active').id.replace('view-', '');
                if (activeView === 'overview') resizeOverviewCharts();
                if (activeView === 'spc') resizeSpcCharts();
                if (activeView === 'quality') resizeQualityCharts();
            }, 300);
        });
    }

    // 7. Initialize Report Generation Engine
    initReportSystem({ showToast });

    // Initialize Lucide icons on boot
    lucide.createIcons();

    // Auto-navigate to Import view on boot if no data is loaded
    if (state.mappedData.length === 0) {
        navigateToView('import');
    } else {
        const hash = window.location.hash.replace('#', '');
        if (views[hash]) {
            navigateToView(hash);
        } else {
            navigateToView('overview');
        }
    }
};

// =========================================================================
// MODULE: components/report.js (A4 Landscape Report Engine)
// =========================================================================

function initReportSystem({ showToast }) {
    // Buttons & Dropdowns
    const btnToggleSpcMenu = document.getElementById('btn-toggle-spc-report-menu');
    const spcReportMenu = document.getElementById('spc-report-menu');
    const btnReportSpcSingle = document.getElementById('btn-report-spc-single');
    const btnReportSpcBatch = document.getElementById('btn-report-spc-batch');
    const btnReportQualityFactor = document.getElementById('btn-report-quality-factor');
    
    // Modal Elements
    const reportModal = document.getElementById('report-modal');
    const reportPaperContainer = document.getElementById('report-paper-container');
    const btnPrintReport = document.getElementById('btn-print-report');
    const btnCloseReportModal = document.getElementById('btn-close-report-modal');
    const reportHeading = document.getElementById('report-modal-heading');

    // Helper: show/hide a report menu popover as a body-level portal to bypass overflow:hidden ancestors
    function showReportMenuPortal(btnEl, menuEl) {
        // Close any other open report menus first
        document.querySelectorAll('.report-menu-popover').forEach(el => {
            if (el !== menuEl) el.style.display = 'none';
        });

        if (menuEl.style.display !== 'none' && menuEl.style.display !== '') {
            menuEl.style.display = 'none';
            return;
        }

        // Move to body level if not already there (portal pattern)
        if (menuEl.parentElement !== document.body) {
            document.body.appendChild(menuEl);
        }

        // Position using fixed coordinates from button
        const rect = btnEl.getBoundingClientRect();
        menuEl.style.position = 'fixed';
        menuEl.style.top = (rect.bottom + 6) + 'px';
        menuEl.style.right = (window.innerWidth - rect.right) + 'px';
        menuEl.style.left = 'auto';
        menuEl.style.zIndex = '99999';
        menuEl.style.display = 'flex';
    }

    // Toggle SPC Report Menu Popover (Portal)
    if (btnToggleSpcMenu && spcReportMenu) {
        btnToggleSpcMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            showReportMenuPortal(btnToggleSpcMenu, spcReportMenu);
        });

        document.addEventListener('click', (e) => {
            if (!spcReportMenu.contains(e.target) && e.target !== btnToggleSpcMenu) {
                spcReportMenu.style.display = 'none';
            }
        });
    }

    // Toggle Quality Report Menu Popover (Portal)
    const btnToggleQualityMenu = document.getElementById('btn-toggle-quality-report-menu');
    const qualityReportMenu = document.getElementById('quality-report-menu');
    if (btnToggleQualityMenu && qualityReportMenu) {
        btnToggleQualityMenu.addEventListener('click', (e) => {
            e.stopPropagation();
            showReportMenuPortal(btnToggleQualityMenu, qualityReportMenu);
        });

        document.addEventListener('click', (e) => {
            if (!qualityReportMenu.contains(e.target) && e.target !== btnToggleQualityMenu) {
                qualityReportMenu.style.display = 'none';
            }
        });
    }

    // Close Modal Events
    if (btnCloseReportModal && reportModal) {
        btnCloseReportModal.addEventListener('click', () => {
            reportModal.style.display = 'none';
        });

        reportModal.addEventListener('click', (e) => {
            if (e.target === reportModal) {
                reportModal.style.display = 'none';
            }
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && reportModal.style.display !== 'none') {
                reportModal.style.display = 'none';
            }
        });
    }

    // Print Button
    if (btnPrintReport) {
        btnPrintReport.addEventListener('click', () => {
            window.print();
        });
    }

    // 1. Single SPC Parameter Report (1-Page A4 Landscape) -> Instant PDF Print
    if (btnReportSpcSingle) {
        btnReportSpcSingle.addEventListener('click', () => {
            if (spcReportMenu) spcReportMenu.style.display = 'none';
            if (!state.selectedParameter) {
                showToast('분석할 측정 항목을 먼저 선택해 주세요.', 'warn');
                return;
            }
            showToast('A4 가로 리포트 생성 중... 곧 PDF 저장 창이 열립니다.', 'info');
            setTimeout(() => {
                buildSpcReport([state.selectedParameter], '단일 항목 SPC 품질 분석 보고서', true);
            }, 100);
        });
    }

    // 2. Batch All Parameters SPC Report (N-Pages A4 Landscape) -> Instant PDF Print
    if (btnReportSpcBatch) {
        btnReportSpcBatch.addEventListener('click', () => {
            if (spcReportMenu) spcReportMenu.style.display = 'none';
            if (state.measurementGroups.length === 0) {
                showToast('출력할 측정 검사 데이터가 없습니다.', 'warn');
                return;
            }
            const allParams = state.measurementGroups.map(g => g.name);
            showToast(`전공정 ${allParams.length}개 항목 일괄 리포트 생성 중... 곧 PDF 저장 창이 열립니다.`, 'info');
            setTimeout(() => {
                buildSpcReport(allParams, `전공정 일괄 품질분석 보고서 (총 ${allParams.length}페이지)`, true);
            }, 150);
        });
    }

    // 3. Single Quality Factor Report (1-Page A4 Landscape) -> Instant PDF Print
    const btnReportQualitySingle = document.getElementById('btn-report-quality-single');
    if (btnReportQualitySingle) {
        btnReportQualitySingle.addEventListener('click', () => {
            if (qualityReportMenu) qualityReportMenu.style.display = 'none';
            const currentParam = document.getElementById('select-quality-parameter') ? document.getElementById('select-quality-parameter').value : state.selectedParameter;
            if (!currentParam) {
                showToast('분석할 측정 항목을 먼저 선택해 주세요.', 'warn');
                return;
            }
            showToast('설비 요소분석 리포트 생성 중... 곧 PDF 저장 창이 열립니다.', 'info');
            setTimeout(() => {
                buildMachineFactorReport([currentParam], '단일 항목 설비 요소분석 보고서', true);
            }, 100);
        });
    }

    // 4. Batch All Parameters Quality Factor Report (N-Pages A4 Landscape) -> Instant PDF Print
    const btnReportQualityBatch = document.getElementById('btn-report-quality-batch');
    if (btnReportQualityBatch) {
        btnReportQualityBatch.addEventListener('click', () => {
            if (qualityReportMenu) qualityReportMenu.style.display = 'none';
            if (state.measurementGroups.length === 0) {
                showToast('출력할 측정 검사 데이터가 없습니다.', 'warn');
                return;
            }
            const allParams = state.measurementGroups.map(g => g.name);
            showToast(`전공정 ${allParams.length}개 항목 설비요소 일괄 리포트 생성 중... 곧 PDF 저장 창이 열립니다.`, 'info');
            setTimeout(() => {
                buildMachineFactorReport(allParams, `전공정 일괄 설비 요소분석 보고서 (총 ${allParams.length}페이지)`, true);
            }, 150);
        });
    }

    // Helper to Build SPC Reports (Single or Batch) with Instant Direct Print and Dynamic Filename
    function buildSpcReport(paramList, headingText, autoPrint = true) {
        reportPaperContainer.innerHTML = '';
        reportHeading.textContent = `📊 ${headingText} (A4 가로 규격)`;

        paramList.forEach((paramName, idx) => {
            const pageHtml = generateSpcReportPage(paramName, idx + 1, paramList.length);
            reportPaperContainer.insertAdjacentHTML('beforeend', pageHtml);
        });

        // Keep modal hidden from screen for direct seamless print
        reportModal.style.display = 'none';
        lucide.createIcons();

        if (autoPrint) {
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const originalTitle = document.title;
            
            // Set dynamic PDF default filename based on single param or batch
            if (paramList.length === 1) {
                document.title = `FMS공정_${paramList[0]}_${dateStr}`;
            } else {
                document.title = `FMS공정_전공정품질분석일괄_${dateStr}`;
            }

            setTimeout(() => {
                window.print();
                // Restore original title after print window
                setTimeout(() => {
                    document.title = originalTitle;
                }, 1500);
            }, 300);
        }
    }

    // Helper to Build Machine Factor Reports (Single or Batch) with Instant Direct Print and Dynamic Filename
    function buildMachineFactorReport(paramList, headingText, autoPrint = true) {
        reportPaperContainer.innerHTML = '';
        reportHeading.textContent = `📊 ${headingText} (A4 가로 규격)`;

        paramList.forEach((paramName, idx) => {
            const pageHtml = generateMachineFactorPage(paramName, idx + 1, paramList.length);
            reportPaperContainer.insertAdjacentHTML('beforeend', pageHtml);
        });

        // Keep modal hidden from screen for direct seamless print
        reportModal.style.display = 'none';
        lucide.createIcons();

        if (autoPrint) {
            const now = new Date();
            const dateStr = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
            const originalTitle = document.title;
            
            // Set dynamic PDF default filename based on single param or batch
            if (paramList.length === 1) {
                document.title = `FMS설비요소분석_${paramList[0]}_${dateStr}`;
            } else {
                document.title = `FMS설비요소분석_전공정일괄_${dateStr}`;
            }

            setTimeout(() => {
                window.print();
                // Restore original title after print window
                setTimeout(() => {
                    document.title = originalTitle;
                }, 1500);
            }, 300);
        }
    }

    // Generate Single A4 Page HTML for SPC Analysis (Always uses entire dataset: ignoreFilters = true)
    function generateSpcReportPage(paramName, pageNum, totalPages) {
        const analysis = analyzeParameter(paramName, true); // true = entire dataset (25,000+ rows)
        if (!analysis) return '';

        const nowStr = new Date().toLocaleString();
        const fileName = state.fileMeta.name || 'FMS_Measurement_Data.csv';
        const totalCount = analysis.points.length;

        const mean = analysis.mean;
        const stdDev = analysis.stdDev;
        const usl = analysis.usl;
        const lsl = analysis.lsl;
        const cp = analysis.cp;
        const cpk = analysis.cpk;

        const cpStr = cp !== null ? cp.toFixed(2) : 'N/A';
        const cpkStr = cpk !== null ? cpk.toFixed(2) : 'N/A';
        const cpkClass = cpk !== null ? (cpk >= 1.33 ? 'highlight-good' : (cpk >= 1.0 ? 'highlight-warn' : 'highlight-bad')) : '';
        const cpkTextClass = cpk !== null ? (cpk >= 1.33 ? 'text-good' : (cpk >= 1.0 ? 'text-warn' : 'text-bad')) : '';

        // Calculate Slot 1~6 Statistics
        const slotStats = [1, 2, 3, 4, 5, 6].map(s => {
            const slotPoints = analysis.points.filter(p => String(p.slot) === String(s));
            if (slotPoints.length === 0) return { slot: s, count: 0, mean: '-', std: '-', cpk: '-', judge: 'N/A' };
            const vals = slotPoints.map(p => p.val);
            const sMean = vals.reduce((a, b) => a + b, 0) / vals.length;
            const variance = vals.reduce((a, b) => a + Math.pow(b - sMean, 2), 0) / (vals.length > 1 ? vals.length - 1 : 1);
            const sStd = Math.sqrt(variance);

            let sCpk = null;
            if (sStd > 0 && usl !== null && lsl !== null) {
                sCpk = Math.min((usl - sMean) / (3 * sStd), (sMean - lsl) / (3 * sStd));
            }

            const judge = sCpk !== null ? (sCpk >= 1.33 ? '<b style="color:#15803d;">적합(우수)</b>' : (sCpk >= 1.0 ? '<b style="color:#b45309;">주의</b>' : '<b style="color:#b91c1c;">부적합</b>')) : '-';
            return {
                slot: s,
                count: vals.length,
                mean: sMean.toFixed(4),
                std: sStd.toFixed(4),
                cpk: sCpk !== null ? sCpk.toFixed(2) : '-',
                judge: judge
            };
        });

        // Identify Top Anomalies
        const anomalies = analysis.points.filter(p => (usl !== null && p.val > usl) || (lsl !== null && p.val < lsl)).slice(0, 4);

        // Generate Charts Images (White Theme)
        const scatterImg = generateOffscreenScatterChartImage(analysis);
        const histoImg = generateOffscreenHistoChartImage(analysis);

        return `
            <div class="report-page">
                <!-- Header Banner -->
                <div class="report-header-banner">
                    <div class="report-header-left">
                        <h2>FMS 공정 품질 & 공정능력(SPC) 분석 보고서</h2>
                        <div class="report-subtitle">측정 항목: <b style="color:#1e3a8a; font-size:13px;">${paramName}</b> | 규격: <b>${lsl !== null ? lsl.toFixed(3) : 'None'} ~ ${usl !== null ? usl.toFixed(3) : 'None'}</b></div>
                    </div>
                    <div class="report-header-right">
                        <div><b>데이터 소스:</b> ${fileName} (총 ${totalCount.toLocaleString()}건)</div>
                        <div><b>출력 일시:</b> ${nowStr} | <b>Page:</b> ${pageNum} / ${totalPages}</div>
                    </div>
                </div>

                <!-- KPI Summary Boxes -->
                <div class="report-kpi-summary">
                    <div class="report-kpi-box">
                        <div class="report-kpi-val">${mean.toFixed(4)}</div>
                        <div class="report-kpi-lbl">측정 평균 (Mean)</div>
                    </div>
                    <div class="report-kpi-box">
                        <div class="report-kpi-val">${stdDev.toFixed(4)}</div>
                        <div class="report-kpi-lbl">표준편차 (Std Dev)</div>
                    </div>
                    <div class="report-kpi-box">
                        <div class="report-kpi-val">${lsl !== null ? lsl.toFixed(3) : '없음'}</div>
                        <div class="report-kpi-lbl">규격 하한 (LSL)</div>
                    </div>
                    <div class="report-kpi-box">
                        <div class="report-kpi-val">${usl !== null ? usl.toFixed(3) : '없음'}</div>
                        <div class="report-kpi-lbl">규격 상한 (USL)</div>
                    </div>
                    <div class="report-kpi-box">
                        <div class="report-kpi-val">${cpStr}</div>
                        <div class="report-kpi-lbl">공정능력 (Cp)</div>
                    </div>
                    <div class="report-kpi-box ${cpkClass}">
                        <div class="report-kpi-val ${cpkTextClass}">${cpkStr}</div>
                        <div class="report-kpi-lbl">치우침 공정능력 (Cpk)</div>
                    </div>
                </div>

                <!-- 2-Column Charts -->
                <div class="report-charts-row">
                    <div class="report-chart-card">
                        <div class="report-chart-title">
                            <span>📈 수대별 측정값 분포 산점도 및 관리한계선</span>
                            <span style="font-size:10px; color:#64748b; font-weight:normal;">Slot 1~6 Scatter & Control Limits</span>
                        </div>
                        <img src="${scatterImg}" class="report-chart-img" alt="Scatter Chart">
                    </div>
                    <div class="report-chart-card">
                        <div class="report-chart-title">
                            <span>📊 Cpk 가우시안 정규분포 히스토그램</span>
                            <span style="font-size:10px; color:#64748b; font-weight:normal;">Normal Distribution vs SPEC</span>
                        </div>
                        <img src="${histoImg}" class="report-chart-img" alt="Histogram Chart">
                    </div>
                </div>

                <!-- Tables & Quality Diagnosis Row -->
                <div class="report-bottom-row">
                    <div class="report-table-card">
                        <div style="font-size:10.5px; font-weight:700; color:#334155; margin-bottom:5px;">📋 슬롯(수대 1~6번)별 세부 품질 통계표</div>
                        <table class="report-light-table">
                            <thead>
                                <tr>
                                    <th>수대</th>
                                    <th>검사수량</th>
                                    <th>측정평균</th>
                                    <th>표준편차</th>
                                    <th>Cpk 지수</th>
                                    <th>품질 판정</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${slotStats.map(st => `
                                    <tr>
                                        <td><b>${st.slot}번 수대</b></td>
                                        <td>${st.count.toLocaleString()}</td>
                                        <td>${st.mean}</td>
                                        <td>${st.std}</td>
                                        <td><b>${st.cpk}</b></td>
                                        <td>${st.judge}</td>
                                    </tr>
                                `).join('')}
                            </tbody>
                        </table>
                    </div>

                    <div class="report-insight-box">
                        <div class="report-insight-title">💡 종합 공정 진단 및 조치 권고사항</div>
                        <div style="margin-bottom:6px;">
                            • 본 <b>[${paramName}]</b> 항목의 종합 Cpk는 <b>${cpkStr}</b>로서 
                            ${cpk !== null && cpk >= 1.33 ? '<b>관리 기준(1.33)을 충족하는 매우 안정적인 공정 상태</b>입니다.' : (cpk !== null && cpk >= 1.0 ? '<b>기준 경계선(1.0~1.33)에 위치하여 정밀 오프셋 점검이 권장</b>됩니다.' : '<b style="color:#b91c1c;">기준 미달(1.0 미만)로 절삭 공구 마모 및 치수 보정이 즉시 필요</b>합니다.')}
                        </div>
                        <div>
                            • <b>스펙 이탈 건수:</b> 총 <b style="color:${anomalies.length > 0 ? '#b91c1c' : '#15803d'}">${anomalies.length}건</b> 발생 
                            ${anomalies.length > 0 ? `(최근 QR: <code>${anomalies[0].qrcode}</code> / 수대 ${anomalies[0].slot}번)` : '(규격 이탈 없음)'}
                        </div>
                    </div>
                </div>

                <!-- Footer -->
                <div class="report-footer">
                    <span>FMS Battery Module Intelligent Analytics System • Official Quality Verification Report</span>
                    <span>담당 엔지니어 서명: ____________________ (인)</span>
                </div>
            </div>
        `;
    }

    // Generate Single A4 Page HTML for Machine Factor Report (Always uses entire dataset: ignoreFilters = true)
    function generateMachineFactorPage(paramName, pageNum = 1, totalPages = 1) {
        const analysis = analyzeParameter(paramName, true); // true = entire dataset (25,000+ rows)
        if (!analysis) return '';

        const nowStr = new Date().toLocaleString();
        const fileName = state.fileMeta.name || 'FMS_Data.csv';

        // 1. Calculate Slot 1~6 Statistics
        const overallMean = analysis.mean;
        const slots = [1, 2, 3, 4, 5, 6];
        const slotAverages = slots.map(s => {
            const slotPoints = analysis.points.filter(p => String(p.slot) === String(s));
            if (slotPoints.length === 0) return { slot: s, count: 0, mean: 0, diff: 0, meanStr: '-' };
            const vals = slotPoints.map(p => p.val);
            const m = vals.reduce((a, b) => a + b, 0) / vals.length;
            return {
                slot: s,
                count: vals.length,
                mean: m,
                diff: m - overallMean,
                meanStr: m.toFixed(4)
            };
        });

        const validSlots = slotAverages.filter(s => s.count > 0);
        let maxSlot = validSlots[0] || { slot: 1, mean: 0 };
        let minSlot = validSlots[0] || { slot: 1, mean: 0 };
        validSlots.forEach(s => {
            if (s.mean > maxSlot.mean) maxSlot = s;
            if (s.mean < minSlot.mean) minSlot = s;
        });
        const maxDelta = Math.abs(maxSlot.mean - minSlot.mean);

        // 2. Generate Dynamic Chart Images
        const slotMeanImg = generateOffscreenSlotMeanChartImage(paramName, slotAverages, overallMean);
        const { heatmapImg, pltCount } = generateOffscreenDynamicHeatmapImage(paramName, analysis);

        return `
            <div class="report-page">
                <!-- Header Banner -->
                <div class="report-header-banner">
                    <div class="report-header-left">
                        <h2>FMS 설비 요소별(수대 / 파렛트) 산포 및 편차 분석 보고서</h2>
                        <div class="report-subtitle">측정 항목: <b style="color:#1e3a8a; font-size:13px;">${paramName}</b> | 설비 인자: 수대(Slot 1~6) 및 파렛트(PLT 1~${pltCount})</div>
                    </div>
                    <div class="report-header-right">
                        <div><b>데이터 소스:</b> ${fileName} (총 ${analysis.points.length.toLocaleString()}건)</div>
                        <div><b>출력 일시:</b> ${nowStr} | <b>Page:</b> ${pageNum} / ${totalPages}</div>
                    </div>
                </div>

                <!-- Top Row: Slot Mean Bar Chart (Left) + LMS Insights (Right) -->
                <div class="report-charts-row" style="margin-bottom: 12px;">
                    <div class="report-chart-card">
                        <div class="report-chart-title">
                            <span>📊 수대(Slot)별 [${paramName}] 측정치 평균 비교</span>
                            <span style="font-size:10px; color:#64748b;">전체 평균: <b>${overallMean.toFixed(4)}</b></span>
                        </div>
                        <img src="${slotMeanImg}" class="report-chart-img" style="height: 220px;" alt="Slot Mean Chart">
                    </div>

                    <div class="report-insight-box" style="display: flex; flex-direction: column; justify-content: space-between; padding: 12px 14px;">
                        <div>
                            <div class="report-insight-title" style="font-size: 12px; margin-bottom: 8px;">
                                💡 LMS 수대 및 파렛트 진단 인사이트
                            </div>
                            <div style="margin-bottom: 8px; line-height: 1.5;">
                                • <b>수대 간 최대 편차:</b> <b>${maxSlot.slot}번 수대</b>(평균: ${maxSlot.mean.toFixed(4)})와 <b>${minSlot.slot}번 수대</b>(평균: ${minSlot.mean.toFixed(4)}) 사이에 
                                <b style="color:#b91c1c;">${maxDelta.toFixed(4)}</b>의 치수 편차가 존재합니다.
                            </div>
                            <div style="margin-bottom: 8px; line-height: 1.5;">
                                • <b>설비 불균일 진단:</b> 
                                ${maxDelta > (analysis.stdDev * 1.5) ? '<b style="color:#b91c1c;">특정 슬롯의 지그 오차 또는 절삭 바이트 마모 편차가 발생하여 오프셋 보정이 권장됩니다.</b>' : '<b style="color:#15803d;">수대 간 편차가 표준편차 이내로 균일하게 관리되고 있습니다.</b>'}
                            </div>
                        </div>
                        <div style="font-size: 9.5px; color: #64748b; background: #ffffff; padding: 6px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">
                            ※ 하단 6x${pltCount} 히트맵을 통해 각 수대와 파렛트 번호의 결합 시 발생하는 평균 편차(+/-)를 확인할 수 있습니다.
                        </div>
                    </div>
                </div>

                <!-- Bottom Row: Full-width Dynamic Heatmap -->
                <div class="report-chart-card" style="margin-bottom: 8px;">
                    <div class="report-chart-title">
                        <span>🔥 수대(Slot_No) - 파렛트 번호(MAIN_PLT_NO) 불량/편차 분포 히트맵 (6x${pltCount} Grid)</span>
                        <span style="font-size:10px; color:#64748b;">Slot 1~6 vs PLT 1~${pltCount} Average Deviation (Δ)</span>
                    </div>
                    <img src="${heatmapImg}" class="report-chart-img" style="height: 250px;" alt="Dynamic Heatmap">
                </div>

                <!-- Footer -->
                <div class="report-footer">
                    <span>FMS Smart Factory Facility Diagnosis Report • Engineering Certification</span>
                    <span>설비보전팀 확인: ____________________ (인) &nbsp;&nbsp;&nbsp;&nbsp; 품질보증팀 확인: ____________________ (인)</span>
                </div>
            </div>
        `;
    }

    // Helper: Offscreen High-Res Slot Mean Comparison Bar Chart (White Theme)
    function generateOffscreenSlotMeanChartImage(paramName, slotAverages, overallMean) {
        const offscreenDiv = document.createElement('div');
        offscreenDiv.style.width = '640px';
        offscreenDiv.style.height = '300px';
        offscreenDiv.style.position = 'absolute';
        offscreenDiv.style.left = '-9999px';
        document.body.appendChild(offscreenDiv);

        const tempChart = echarts.init(offscreenDiv, null, { renderer: 'canvas' });
        const slotNames = ['1번 수대', '2번 수대', '3번 수대', '4번 수대', '5번 수대', '6번 수대'];
        const values = slotAverages.map(s => (s.count > 0 ? parseFloat(s.mean.toFixed(4)) : null));
        
        const validVals = values.filter(v => v !== null);
        const minVal = Math.min(...validVals);
        const maxVal = Math.max(...validVals);
        const pad = (maxVal - minVal) * 0.35 || 0.05;

        tempChart.setOption({
            backgroundColor: '#ffffff',
            animation: false,
            grid: { top: '18%', left: '10%', right: '8%', bottom: '15%' },
            xAxis: {
                type: 'category',
                data: slotNames,
                axisLabel: { fontSize: 10, color: '#334155', fontWeight: 'bold' },
                axisLine: { lineStyle: { color: '#cbd5e1' } }
            },
            yAxis: {
                type: 'value',
                min: parseFloat((minVal - pad).toFixed(4)),
                max: parseFloat((maxVal + pad).toFixed(4)),
                scale: true,
                name: '측정치 평균',
                nameTextStyle: { fontSize: 9.5, color: '#64748b' },
                axisLabel: { fontSize: 9.5, color: '#64748b' },
                splitLine: { lineStyle: { color: '#f1f5f9' } }
            },
            series: [
                {
                    type: 'bar',
                    data: values.map(v => ({
                        value: v,
                        itemStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: '#38bdf8' },
                                { offset: 1, color: '#2563eb' }
                            ]),
                            borderRadius: [4, 4, 0, 0]
                        }
                    })),
                    barWidth: '45%',
                    label: {
                        show: true,
                        position: 'top',
                        formatter: '{c}',
                        fontSize: 10.5,
                        fontWeight: 'bold',
                        color: '#0f172a'
                    },
                    markLine: {
                        symbol: 'none',
                        lineStyle: { color: '#10b981', type: 'dashed', width: 1.5 },
                        data: [{ yAxis: parseFloat(overallMean.toFixed(4)), name: '전체 평균' }],
                        label: { formatter: '전체평균: {c}', position: 'end', fontSize: 9.5, color: '#10b981' }
                    }
                }
            ]
        });

        const dataUrl = tempChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        tempChart.dispose();
        document.body.removeChild(offscreenDiv);
        return dataUrl;
    }

    // Helper: Offscreen High-Res Dynamic Heatmap Image Generator (Adapts to actual PLT count)
    function generateOffscreenDynamicHeatmapImage(paramName, analysis) {
        const offscreenDiv = document.createElement('div');
        offscreenDiv.style.width = '1020px';
        offscreenDiv.style.height = '320px';
        offscreenDiv.style.position = 'absolute';
        offscreenDiv.style.left = '-9999px';
        document.body.appendChild(offscreenDiv);

        const tempChart = echarts.init(offscreenDiv, null, { renderer: 'canvas' });

        const slots = ['1번 수대', '2번 수대', '3번 수대', '4번 수대', '5번 수대', '6번 수대'];
        
        // Extract distinct pallets from actual data and sort numerically
        const rawPalletSet = new Set(analysis.points.map(p => p.pallet).filter(p => p !== '' && p !== null && p !== undefined));
        let palletNumbers = Array.from(rawPalletSet).map(p => {
            const num = parseInt(String(p).replace(/[^0-9]/g, ''), 10);
            return isNaN(num) ? String(p) : num;
        });

        if (palletNumbers.length === 0) {
            for (let i = 1; i <= 24; i++) palletNumbers.push(i);
        }

        palletNumbers.sort((a, b) => (typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))));
        const pallets = palletNumbers.map(p => (typeof p === 'number' ? `PLT ${p}` : p));

        const overallMean = analysis.mean;
        const matrix = [];
        let maxAbsDev = 0.001;

        // Populate dynamic matrix
        for (let sIdx = 0; sIdx < 6; sIdx++) {
            const slotNum = sIdx + 1;
            for (let pIdx = 0; pIdx < pallets.length; pIdx++) {
                const pltIdentifier = palletNumbers[pIdx];
                const cellPoints = analysis.points.filter(p => {
                    if (String(p.slot) !== String(slotNum)) return false;
                    const pNum = parseInt(String(p.pallet).replace(/[^0-9]/g, ''), 10);
                    return pNum === pltIdentifier || String(p.pallet) === String(pltIdentifier) || String(p.pallet) === `PLT ${pltIdentifier}`;
                });
                
                if (cellPoints.length > 0) {
                    const avg = cellPoints.reduce((a, b) => a + b.val, 0) / cellPoints.length;
                    const dev = avg - overallMean;
                    if (Math.abs(dev) > maxAbsDev) maxAbsDev = Math.abs(dev);
                    matrix.push([pIdx, sIdx, parseFloat(dev.toFixed(4))]);
                } else {
                    matrix.push([pIdx, sIdx, 0]);
                }
            }
        }

        maxAbsDev = Math.max(0.05, maxAbsDev);

        tempChart.setOption({
            backgroundColor: '#ffffff',
            animation: false,
            grid: { top: '8%', left: '7%', right: '4%', bottom: '18%' },
            xAxis: {
                type: 'category',
                data: pallets,
                axisLabel: { interval: 0, rotate: 45, fontSize: pallets.length > 25 ? 7.5 : 8.5, color: '#475569' },
                splitArea: { show: true, areaStyle: { color: ['#ffffff', '#f8fafc'] } }
            },
            yAxis: {
                type: 'category',
                data: slots,
                axisLabel: { fontSize: 9.5, color: '#1e293b', fontWeight: 'bold' },
                splitArea: { show: true }
            },
            visualMap: {
                min: -maxAbsDev,
                max: maxAbsDev,
                calculable: false,
                orient: 'horizontal',
                left: 'center',
                bottom: '0%',
                text: ['상한 편차 (+)', '하한 편차 (-)'],
                textStyle: { fontSize: 9, color: '#475569' },
                inRange: {
                    color: ['#93c5fd', '#e2e8f0', '#fca5a5']
                }
            },
            series: [
                {
                    name: '평균 편차',
                    type: 'heatmap',
                    data: matrix,
                    label: {
                        show: true,
                        formatter: function(params) {
                            const val = params.data[2];
                            if (val === 0) return '-';
                            return (val > 0 ? '+' : '') + val.toFixed(3);
                        },
                        fontSize: pallets.length > 25 ? 6.5 : 7.5,
                        color: '#0f172a'
                    },
                    itemStyle: {
                        borderColor: '#ffffff',
                        borderWidth: 1
                    }
                }
            ]
        });

        const dataUrl = tempChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        tempChart.dispose();
        document.body.removeChild(offscreenDiv);
        return { heatmapImg: dataUrl, pltCount: pallets.length };
    }

    // Helper: Offscreen High-Res Scatter Chart Image Generator (Full Width Even Distribution for ALL 25,000+ points)
    function generateOffscreenScatterChartImage(analysis) {
        const offscreenDiv = document.createElement('div');
        offscreenDiv.style.width = '640px';
        offscreenDiv.style.height = '320px';
        offscreenDiv.style.position = 'absolute';
        offscreenDiv.style.left = '-9999px';
        offscreenDiv.style.top = '-9999px';
        document.body.appendChild(offscreenDiv);

        const tempChart = echarts.init(offscreenDiv, null, { renderer: 'canvas' });
        const slotColors = { '1': '#2563eb', '2': '#dc2626', '3': '#d97706', '4': '#16a34a', '5': '#7c3aed', '6': '#0891b2' };

        const totalPoints = analysis.points.length;
        
        // Map points with X = sequence index (1 to totalPoints)
        const seriesList = ['1', '2', '3', '4', '5', '6'].map(s => {
            const slotData = [];
            analysis.points.forEach((p, idx) => {
                if (String(p.slot) === s) {
                    slotData.push([idx + 1, p.val]);
                }
            });
            return {
                name: `${s}번 수대`,
                type: 'scatter',
                data: slotData,
                progressive: 0,
                large: false,
                symbolSize: totalPoints > 10000 ? 2.5 : 4,
                itemStyle: { color: slotColors[s], opacity: 0.65 }
            };
        });

        const markLines = [];
        if (analysis.cl !== null) markLines.push({ yAxis: analysis.cl, name: 'CL', lineStyle: { color: '#16a34a', width: 1.5 } });
        if (analysis.usl !== null) markLines.push({ yAxis: analysis.usl, name: 'USL', lineStyle: { color: '#dc2626', width: 1.5 } });
        if (analysis.lsl !== null) markLines.push({ yAxis: analysis.lsl, name: 'LSL', lineStyle: { color: '#dc2626', width: 1.5 } });

        if (seriesList.length > 0) {
            seriesList[0].markLine = { symbol: 'none', data: markLines, label: { position: 'end', fontSize: 9 } };
        }

        // Calculate Y-range based on actual points data (matching the rich, readable dashboard visualization)
        const actualVals = analysis.points.map(p => p.val).filter(v => v !== null && !isNaN(v) && v < 500);
        const dataMin = actualVals.length > 0 ? Math.min(...actualVals) : 0;
        const dataMax = actualVals.length > 0 ? Math.max(...actualVals) : 1;
        const dataRange = dataMax - dataMin || 0.01;

        // Base Y range tightly hugging the actual data points
        let minY = dataMin - dataRange * 0.18;
        let maxY = dataMax + dataRange * 0.18;

        // If USL/LSL are reasonably close to data (within 2.5x range), expand to include them; otherwise don't squish data
        if (analysis.usl !== null && analysis.usl < 500 && (analysis.usl - dataMax) <= dataRange * 2.5) {
            maxY = Math.max(maxY, analysis.usl + dataRange * 0.1);
        }
        if (analysis.lsl !== null && (dataMin - analysis.lsl) <= dataRange * 2.5) {
            minY = Math.min(minY, analysis.lsl - dataRange * 0.1);
        }

        tempChart.setOption({
            backgroundColor: '#ffffff',
            animation: false,
            progressive: 0,
            grid: { top: '15%', left: '8%', right: '8%', bottom: '15%' },
            legend: { top: '2%', right: '2%', itemGap: 8, textStyle: { fontSize: 10, color: '#334155' } },
            xAxis: {
                type: 'value',
                min: 1,
                max: totalPoints > 0 ? totalPoints : 100,
                splitNumber: 5,
                axisLabel: {
                    fontSize: 9,
                    color: '#64748b',
                    formatter: function(val) {
                        return Math.round(val).toLocaleString();
                    }
                },
                splitLine: { lineStyle: { color: '#f1f5f9' } }
            },
            yAxis: {
                type: 'value',
                scale: true,
                min: parseFloat(minY.toFixed(4)),
                max: parseFloat(maxY.toFixed(4)),
                axisLabel: { fontSize: 9, color: '#64748b' }
            },
            series: seriesList
        });

        const dataUrl = tempChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        tempChart.dispose();
        document.body.removeChild(offscreenDiv);
        return dataUrl;
    }

    // Helper: Offscreen High-Res Histogram Chart Image Generator (White Theme)
    function generateOffscreenHistoChartImage(analysis) {
        const offscreenDiv = document.createElement('div');
        offscreenDiv.style.width = '480px';
        offscreenDiv.style.height = '320px';
        offscreenDiv.style.position = 'absolute';
        offscreenDiv.style.left = '-9999px';
        document.body.appendChild(offscreenDiv);

        const tempChart = echarts.init(offscreenDiv, null, { renderer: 'canvas' });
        const values = analysis.points.map(p => p.val);
        const mean = analysis.mean;
        const stdDev = analysis.stdDev;
        const numBins = 24;
        
        const rangeVals = [...values];
        if (analysis.usl !== null) rangeVals.push(analysis.usl);
        if (analysis.lsl !== null) rangeVals.push(analysis.lsl);
        const minVal = Math.min(...rangeVals);
        const maxVal = Math.max(...rangeVals);
        const margin = (maxVal - minVal) * 0.08 || 0.01;
        const startX = minVal - margin;
        const endX = maxVal + margin;
        const binWidth = (endX - startX) / numBins;

        const binCounts = new Array(numBins).fill(0);
        const binCenters = [];
        for (let i = 0; i < numBins; i++) binCenters.push(parseFloat((startX + (i + 0.5) * binWidth).toFixed(4)));
        values.forEach(v => {
            let idx = Math.floor((v - startX) / binWidth);
            if (idx >= numBins) idx = numBins - 1;
            if (idx >= 0) binCounts[idx]++;
        });

        const normalCurve = [];
        if (stdDev > 0) {
            binCenters.forEach(x => {
                const z = (x - mean) / stdDev;
                const pdf = (1 / (stdDev * Math.sqrt(2 * Math.PI))) * Math.exp(-0.5 * z * z);
                normalCurve.push(pdf * values.length * binWidth);
            });
        }

        const markLines = [];
        if (analysis.usl !== null) markLines.push({ xAxis: analysis.usl, name: 'USL', lineStyle: { color: '#dc2626', width: 1.5 } });
        if (analysis.lsl !== null) markLines.push({ xAxis: analysis.lsl, name: 'LSL', lineStyle: { color: '#dc2626', width: 1.5 } });

        tempChart.setOption({
            backgroundColor: '#ffffff',
            animation: false,
            grid: { top: '15%', left: '10%', right: '10%', bottom: '15%' },
            xAxis: {
                type: 'value',
                scale: true,
                min: parseFloat(startX.toFixed(4)),
                max: parseFloat(endX.toFixed(4)),
                axisLabel: { fontSize: 9, color: '#64748b' }
            },
            yAxis: { type: 'value', axisLabel: { fontSize: 9, color: '#64748b' } },
            series: [
                {
                    name: '분포 빈도',
                    type: 'bar',
                    data: binCenters.map((x, i) => [x, binCounts[i]]),
                    barWidth: '85%',
                    itemStyle: { color: 'rgba(37, 99, 235, 0.65)' },
                    markLine: { symbol: 'none', data: markLines, label: { fontSize: 9 } }
                },
                {
                    name: '정규분포',
                    type: 'line',
                    data: binCenters.map((x, i) => [x, normalCurve[i] || 0]),
                    smooth: true,
                    symbol: 'none',
                    lineStyle: { color: '#16a34a', width: 2 }
                }
            ]
        });

        const dataUrl = tempChart.getDataURL({ type: 'png', pixelRatio: 2, backgroundColor: '#ffffff' });
        tempChart.dispose();
        document.body.removeChild(offscreenDiv);
        return dataUrl;
    }
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
} else {
    initApp();
}
