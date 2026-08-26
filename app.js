// RAIL-BLOCK AI Dashboard Simulator Logic

// Stations Definition
const STATIONS = [
    { name: "KSR Bengaluru (SBC)", code: "SBC", y: 50 },
    { name: "Cantonment (BNC)", code: "BNC", y: 130 },
    { name: "Krishnarajapuram (KJM)", code: "KJM", y: 210 },
    { name: "Whitefield (WFD)", code: "WFD", y: 290 },
    { name: "Malur (MLO)", code: "MLO", y: 370 },
    { name: "Bangarapet (BWT)", code: "BWT", y: 450 }
];

// Time Mapping Helpers (08:00 - 20:00)
const START_HOUR = 8;
const END_HOUR = 20;
const TOTAL_MINUTES = (END_HOUR - START_HOUR) * 60;
const CHART_WIDTH = 900; // SVG coordinates
const CHART_HEIGHT = 500;
const PADDING_LEFT = 180;
const PADDING_RIGHT = 40;
const PLOT_WIDTH = CHART_WIDTH - PADDING_LEFT - PADDING_RIGHT;

function timeToMinutes(timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    return (h - START_HOUR) * 60 + m;
}

function minutesToTimeStr(totalMins) {
    const hrs = Math.floor(totalMins / 60) + START_HOUR;
    const mins = totalMins % 60;
    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}`;
}

function timeToX(timeStr) {
    const mins = timeToMinutes(timeStr);
    return PADDING_LEFT + (mins / TOTAL_MINUTES) * PLOT_WIDTH;
}

function xToTimeStr(x) {
    const relativeX = x - PADDING_LEFT;
    const fraction = relativeX / PLOT_WIDTH;
    const mins = Math.round(fraction * TOTAL_MINUTES);
    return minutesToTimeStr(Math.max(0, Math.min(TOTAL_MINUTES, mins)));
}

// Initial State Setup (Unoptimized)
let appState = {
    optimized: false,
    kpis: {
        totalDelay: 165, // in minutes
        efficiency: 58,  // in %
        availability: 94.2, // in %
        activeBlocks: 3
    },
    // Blocks List
    blocks: [
        {
            id: "BLK-001",
            dept: "engg",
            deptName: "Engineering",
            workType: "Track Tamping (CSM)",
            section: "KJM - WFD",
            stationStartY: STATIONS.find(s => s.code === "KJM").y,
            stationEndY: STATIONS.find(s => s.code === "WFD").y,
            start: "10:00",
            end: "13:00",
            optStart: "11:45",
            optEnd: "14:45",
            machine: "Tamping Machine CSM-49"
        },
        {
            id: "BLK-002",
            dept: "ohe",
            deptName: "Electrical (TRD)",
            workType: "OHE Wire Replacement",
            section: "KJM - WFD",
            stationStartY: STATIONS.find(s => s.code === "KJM").y,
            stationEndY: STATIONS.find(s => s.code === "WFD").y,
            start: "11:30",
            end: "13:30",
            optStart: "11:45",
            optEnd: "13:45",
            machine: "OHE Wiring Car #8"
        },
        {
            id: "BLK-003",
            dept: "st",
            deptName: "Signalling & Telecom",
            workType: "Point Machine Testing",
            section: "WFD Station Yard",
            stationStartY: STATIONS.find(s => s.code === "WFD").y - 20,
            stationEndY: STATIONS.find(s => s.code === "WFD").y + 20,
            start: "15:00",
            end: "16:30",
            optStart: "16:45",
            optEnd: "18:15",
            machine: "Digital Interlocking Tester"
        }
    ],
    // Train Paths List
    trains: [
        {
            id: "T-12628",
            number: "12628",
            name: "Karnataka Express (Up)",
            type: "passenger-sf",
            stops: [
                { code: "SBC", time: "08:30" },
                { code: "BNC", time: "08:42" },
                { code: "KJM", time: "09:05" },
                { code: "WFD", time: "09:22" },
                { code: "MLO", time: "09:45" },
                { code: "BWT", time: "10:10" }
            ],
            // Delay states: unoptimized vs optimized
            delays: { unopt: [0, 0, 0, 0, 0, 0], opt: [0, 0, 0, 0, 0, 0] }
        },
        {
            id: "T-16521",
            number: "16521",
            name: "SBC-BWT Passenger (Up)",
            type: "passenger-exp",
            stops: [
                { code: "SBC", time: "09:30" },
                { code: "BNC", time: "09:48" },
                { code: "KJM", time: "10:20" },
                { code: "WFD", time: "10:45" },
                { code: "MLO", time: "11:15" },
                { code: "BWT", time: "11:50" }
            ],
            // Clashes directly with track block (10:00-13:00) on KJM-WFD.
            // In unoptimized, it gets regulated at KJM for 75 mins!
            delays: { 
                unopt: [0, 0, 0, 75, 75, 75], // regulated at KJM, arrives BWT delayed by 75 mins
                opt: [0, 0, 0, 10, 10, 10]    // optimized: shifted block lets it pass with just 10 mins delay
            }
        },
        {
            id: "T-22691",
            number: "22691",
            name: "Rajdhani Express (Down)",
            type: "vande-bharat", // styled premium
            stops: [
                { code: "BWT", time: "11:55" },
                { code: "MLO", time: "12:15" },
                { code: "WFD", time: "12:35" },
                { code: "KJM", time: "12:50" },
                { code: "BNC", time: "13:08" },
                { code: "SBC", time: "13:20" }
            ],
            // Down train. Clashes with OHE block at 12:35 on WFD-KJM.
            // Unoptimized: delayed by 30 mins. Optimized: 0 delay.
            delays: {
                unopt: [0, 0, 30, 30, 30, 30],
                opt: [0, 0, 0, 0, 0, 0]
            }
        },
        {
            id: "T-401",
            number: "FG-401",
            name: "Freight Cargo (Up)",
            type: "freight",
            stops: [
                { code: "SBC", time: "13:30" },
                { code: "BNC", time: "13:55" },
                { code: "KJM", time: "14:30" },
                { code: "WFD", time: "15:10" },
                { code: "MLO", time: "15:50" },
                { code: "BWT", time: "16:30" }
            ],
            // Up train. Clashes with S&T Block at WFD yard at 15:10.
            // Unopt: delayed by 60 mins. Opt: 5 mins.
            delays: {
                unopt: [0, 0, 0, 60, 60, 60],
                opt: [0, 0, 0, 5, 5, 5]
            }
        },
        {
            id: "T-12627",
            number: "12627",
            name: "Karnataka Express (Down)",
            type: "passenger-sf",
            stops: [
                { code: "BWT", time: "14:40" },
                { code: "MLO", time: "15:05" },
                { code: "WFD", time: "15:30" },
                { code: "KJM", time: "15:52" },
                { code: "BNC", time: "16:15" },
                { code: "SBC", time: "16:30" }
            ],
            // Clashes with S&T block at WFD (15:30).
            // Unopt: delayed 35 mins. Opt: 0 mins.
            delays: {
                unopt: [0, 0, 35, 35, 35, 35],
                opt: [0, 0, 0, 0, 0, 0]
            }
        }
    ],
    alerts: [
        { id: "A1", type: "clash", msg: "Train 16521 (Passenger) blocked at KJM section. Delay: 75 mins.", time: "10:20", resolved: false },
        { id: "A2", type: "clash", msg: "Train 22691 (Rajdhani) delayed by 30 mins due to OHE block.", time: "12:35", resolved: false },
        { id: "A3", type: "efficiency", msg: "Silo Maintenance: Overlapping blocks on KJM-WFD scheduled separately.", time: "11:30", resolved: false },
        { id: "A4", type: "clash", msg: "Freight Cargo FG-401 delayed by 60 mins at WFD Interlocking block.", time: "15:10", resolved: false }
    ]
};

// UI Elements
const svgEl = document.getElementById("timeSpaceChart");
const logTerminal = document.getElementById("terminalLog");
const alertList = document.getElementById("alertList");
const optButton = document.getElementById("optButton");
const solverOverlay = document.getElementById("solverOverlay");
const infoPopup = document.getElementById("infoPopup");

// KPI Counters
const kpiDelayVal = document.getElementById("kpiDelayVal");
const kpiDelayChg = document.getElementById("kpiDelayChg");
const kpiEffVal = document.getElementById("kpiEffVal");
const kpiEffChg = document.getElementById("kpiEffChg");
const kpiAvailVal = document.getElementById("kpiAvailVal");
const kpiAvailChg = document.getElementById("kpiAvailChg");
const kpiBlocksVal = document.getElementById("kpiBlocksVal");

// Initialize Terminal Logs
function addLog(text, type = "system") {
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const line = document.createElement("div");
    line.className = `terminal-line ${type}`;
    line.innerHTML = `[${time}] ${text}`;
    logTerminal.appendChild(line);
    logTerminal.scrollTop = logTerminal.scrollHeight;
}

// Draw the Time Space Grid
function drawGrid() {
    svgEl.innerHTML = ''; // Clear SVG
    
    // Add background rect
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width", "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill", "#0e1320");
    svgEl.appendChild(bg);

    // Draw Stations Grid Lines (Horizontal)
    STATIONS.forEach(station => {
        // Station line
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", PADDING_LEFT);
        line.setAttribute("y1", station.y);
        line.setAttribute("x2", CHART_WIDTH - PADDING_RIGHT);
        line.setAttribute("y2", station.y);
        line.className.baseVal = "station-line";
        svgEl.appendChild(line);

        // Station Label
        const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        txt.setAttribute("x", 20);
        txt.setAttribute("y", station.y + 4);
        txt.className.baseVal = "station-label";
        txt.textContent = station.name;
        svgEl.appendChild(txt);
        
        // Station Code
        const codeTxt = document.createElementNS("http://www.w3.org/2000/svg", "text");
        codeTxt.setAttribute("x", PADDING_LEFT - 25);
        codeTxt.setAttribute("y", station.y + 4);
        codeTxt.className.baseVal = "axis-text";
        codeTxt.setAttribute("text-anchor", "end");
        codeTxt.textContent = station.code;
        svgEl.appendChild(codeTxt);
    });

    // Draw Time Grid Lines (Vertical, every hour)
    for (let hr = START_HOUR; hr <= END_HOUR; hr++) {
        const timeStr = `${String(hr).padStart(2, '0')}:00`;
        const x = timeToX(timeStr);

        // Vertical line
        const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
        line.setAttribute("x1", x);
        line.setAttribute("y1", 30);
        line.setAttribute("x2", x,);
        line.setAttribute("y2", CHART_HEIGHT - 30);
        line.className.baseVal = "grid-line";
        svgEl.appendChild(line);

        // Time label Top
        const labelTop = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelTop.setAttribute("x", x);
        labelTop.setAttribute("y", 20);
        labelTop.setAttribute("text-anchor", "middle");
        labelTop.className.baseVal = "axis-text";
        labelTop.textContent = timeStr;
        svgEl.appendChild(labelTop);

        // Time label Bottom
        const labelBottom = document.createElementNS("http://www.w3.org/2000/svg", "text");
        labelBottom.setAttribute("x", x);
        labelBottom.setAttribute("y", CHART_HEIGHT - 10);
        labelBottom.setAttribute("text-anchor", "middle");
        labelBottom.className.baseVal = "axis-text";
        labelBottom.textContent = timeStr;
        svgEl.appendChild(labelBottom);
    }
}

// Draw Maintenance Blocks
function drawBlocks() {
    appState.blocks.forEach(block => {
        const startStr = appState.optimized ? block.optStart : block.start;
        const endStr = appState.optimized ? block.optEnd : block.end;
        const xStart = timeToX(startStr);
        const xEnd = timeToX(endStr);
        const width = xEnd - xStart;
        
        const yStart = Math.min(block.stationStartY, block.stationEndY);
        const yEnd = Math.max(block.stationStartY, block.stationEndY);
        const height = Math.abs(yEnd - yStart);

        // Create group container
        const g = document.createElementNS("http://www.w3.org/2000/svg", "g");

        // The Block Rect
        const rect = document.createElementNS("http://www.w3.org/2000/svg", "rect");
        rect.setAttribute("x", xStart);
        rect.setAttribute("y", yStart);
        rect.setAttribute("width", width);
        rect.setAttribute("height", height);
        rect.className.baseVal = `block-zone ${block.dept}`;
        
        // Dynamic interaction
        rect.addEventListener("mouseenter", (e) => showBlockTooltip(e, block));
        rect.addEventListener("mouseleave", hideTooltip);
        
        g.appendChild(rect);

        // Text inside block (only if block has some size)
        if (width > 60) {
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", xStart + 8);
            txt.setAttribute("y", yStart + height/2 + 4);
            txt.className.baseVal = "block-zone-text";
            txt.textContent = block.id;
            g.appendChild(txt);
        }

        svgEl.appendChild(g);
    });
}

// Draw Train Paths
function drawTrainPaths() {
    appState.trains.forEach(train => {
        let points = [];
        
        train.stops.forEach((stop, index) => {
            const station = STATIONS.find(s => s.code === stop.code);
            if (!station) return;
            
            // Calculate delay at this stop
            const delayMin = appState.optimized ? train.delays.opt[index] : train.delays.unopt[index];
            const baseTimeMins = timeToMinutes(stop.time);
            const actualTimeMins = baseTimeMins + delayMin;
            
            const x = PADDING_LEFT + (actualTimeMins / TOTAL_MINUTES) * PLOT_WIDTH;
            const y = station.y;
            points.push(`${x},${y}`);
        });

        const pathStr = `M ${points.join(' L ')}`;

        // Draw path line
        const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
        path.setAttribute("d", pathStr);
        path.className.baseVal = `train-path ${train.type}`;
        
        // Interactions
        path.addEventListener("mouseenter", (e) => showTrainTooltip(e, train));
        path.addEventListener("mouseleave", hideTooltip);

        svgEl.appendChild(path);

        // Add Train Number label at start of path
        if (points.length > 0) {
            const firstPt = points[0].split(',');
            const txt = document.createElementNS("http://www.w3.org/2000/svg", "text");
            txt.setAttribute("x", parseFloat(firstPt[0]) - 8);
            txt.setAttribute("y", parseFloat(firstPt[1]) - 4);
            txt.setAttribute("text-anchor", "end");
            txt.className.baseVal = "axis-text";
            txt.setAttribute("fill", "#60a5fa");
            txt.textContent = train.number;
            svgEl.appendChild(txt);
        }
    });
}

// Tooltip Management
function showBlockTooltip(e, block) {
    const start = appState.optimized ? block.optStart : block.start;
    const end = appState.optimized ? block.optEnd : block.end;
    infoPopup.style.display = "block";
    infoPopup.style.left = `${e.pageX + 15}px`;
    infoPopup.style.top = `${e.pageY + 10}px`;
    infoPopup.innerHTML = `
        <h4 style="color: ${getBlockColor(block.dept)}">${block.id}: ${block.deptName}</h4>
        <p><strong>Work:</strong> <span>${block.workType}</span></p>
        <p><strong>Section:</strong> <span>${block.section}</span></p>
        <p><strong>Window:</strong> <span>${start} - ${end}</span></p>
        <p><strong>Resource:</strong> <span>${block.machine}</span></p>
        ${appState.optimized && block.id !== "BLK-003" ? '<p style="color: #34d399; font-weight:600">Consolidated Integrated Block</p>' : ''}
    `;
}

function showTrainTooltip(e, train) {
    const delaysArr = appState.optimized ? train.delays.opt : train.delays.unopt;
    const maxDelay = Math.max(...delaysArr);
    infoPopup.style.display = "block";
    infoPopup.style.left = `${e.pageX + 15}px`;
    infoPopup.style.top = `${e.pageY + 10}px`;
    infoPopup.innerHTML = `
        <h4 style="color: #38bdf8">${train.number}: ${train.name}</h4>
        <p><strong>Type:</strong> <span>${train.type.replace('-', ' ').toUpperCase()}</span></p>
        <p><strong>Origin:</strong> <span>${train.stops[0].code} (${train.stops[0].time})</span></p>
        <p><strong>Terminus:</strong> <span>${train.stops[train.stops.length - 1].code}</span></p>
        <p><strong>Current Delay:</strong> <span style="color: ${maxDelay > 0 ? '#f87171' : '#34d399'}">${maxDelay} mins</span></p>
    `;
}

function hideTooltip() {
    infoPopup.style.display = "none";
}

function getBlockColor(dept) {
    if (dept === "engg") return "#c084fc";
    if (dept === "ohe") return "#fb7185";
    return "#fbbf24";
}

// Render Alerts List
function renderAlerts() {
    alertList.innerHTML = '';
    appState.alerts.forEach(alert => {
        const item = document.createElement("div");
        item.className = `alert-item ${alert.resolved ? 'resolved' : ''}`;
        
        let icon = '⚠️';
        if (alert.resolved) icon = '✅';
        else if (alert.type === 'efficiency') icon = '🔄';

        item.innerHTML = `
            <div class="alert-icon">${icon}</div>
            <div class="alert-message">${alert.msg}</div>
            <div class="alert-time">${alert.time}</div>
        `;
        alertList.appendChild(item);
    });
}

// Update KPI Display
function updateKPIs() {
    if (appState.optimized) {
        // Optimised Values
        kpiDelayVal.textContent = "15m";
        kpiDelayChg.textContent = "-90.9%";
        kpiDelayChg.className = "metric-change positive";
        
        kpiEffVal.textContent = "92.5%";
        kpiEffChg.textContent = "+34.5%";
        kpiEffChg.className = "metric-change positive";
        
        kpiAvailVal.textContent = "98.4%";
        kpiAvailChg.textContent = "+4.2%";
        kpiAvailChg.className = "metric-change positive";

        kpiBlocksVal.textContent = "2 Integrated";
    } else {
        // Initial Values
        kpiDelayVal.textContent = "165m";
        kpiDelayChg.textContent = "Base";
        kpiDelayChg.className = "metric-change";
        
        kpiEffVal.textContent = "58.0%";
        kpiEffChg.textContent = "Base";
        kpiEffChg.className = "metric-change";
        
        kpiAvailVal.textContent = "94.2%";
        kpiAvailChg.textContent = "Base";
        kpiAvailChg.className = "metric-change";

        kpiBlocksVal.textContent = "3 Siloed";
    }
}

// Ingest Initial Log Feed
function runInitialLogFeed() {
    addLog("RAIL-BLOCK AI Application Gateway Online", "system");
    setTimeout(() => addLog("Fetching Live Working Time Table (WTT) schedules...", "info"), 600);
    setTimeout(() => addLog("Established WebSockets tunnel to Central Office Application (COA).", "success"), 1200);
    setTimeout(() => addLog("Ingested 3 pending block requests from BDMS database.", "info"), 1800);
    setTimeout(() => {
        addLog("CRITICAL: Detected 3 Train Path Conflicts and 1 Silo Scheduling Overlap.", "warning");
        renderChart();
    }, 2400);
}

// Render Complete Chart
function renderChart() {
    drawGrid();
    drawBlocks();
    drawTrainPaths();
    renderAlerts();
    updateKPIs();
}

// Trigger AI Optimizer Backend / Simulation
async function triggerOptimization() {
    if (appState.optimized) {
        // Reset to original state
        appState.optimized = false;
        appState.alerts = [
            { id: "A1", type: "clash", msg: "Train 16521 (Passenger) blocked at KJM section. Delay: 75 mins.", time: "10:20", resolved: false },
            { id: "A2", type: "clash", msg: "Train 22691 (Rajdhani) delayed by 30 mins due to OHE block.", time: "12:35", resolved: false },
            { id: "A3", type: "efficiency", msg: "Silo Maintenance: Overlapping blocks on KJM-WFD scheduled separately.", time: "11:30", resolved: false },
            { id: "A4", type: "clash", msg: "Freight Cargo FG-401 delayed by 60 mins at WFD Interlocking block.", time: "15:10", resolved: false }
        ];
        optButton.innerHTML = `<span>⚡</span> Run AI Optimization Engine`;
        optButton.style.background = '';
        addLog("System reset to manual/siloed schedule.", "system");
        renderChart();
        return;
    }

    // Activate loading overlay
    solverOverlay.classList.add("active");
    addLog("Triggering AI/ML Optimization Engine...", "system");

    try {
        // Try calling the Python FastAPI server
        addLog("Connecting to FastAPI backend (localhost:8000)...", "info");
        const response = await fetch("http://localhost:8000/api/optimize", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                requests: appState.blocks,
                trains: appState.trains
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        addLog("FastAPI response received. Running live updates...", "success");

        // Set state from backend output
        appState.optimized = true;
        
        // Map backend optimized blocks back
        data.blocks.forEach(optBlock => {
            const block = appState.blocks.find(b => b.id === optBlock.id);
            if (block) {
                block.optStart = optBlock.optStart;
                block.optEnd = optBlock.optEnd;
            }
        });

        // Map backend delays back to trains
        appState.trains.forEach(train => {
            if (data.delays[train.id]) {
                train.delays.opt = data.delays[train.id];
            }
        });

        // Set warnings resolved
        appState.alerts = [
            { id: "A1", type: "clash", msg: `RESOLVED: Train 16521 regulation minimised. Delay reduced to ${Math.max(...appState.trains.find(t=>t.id==="T-16521").delays.opt)} mins.`, time: "10:20", resolved: true },
            { id: "A2", type: "clash", msg: `RESOLVED: Train 22691 (Rajdhani) delay eliminated (${Math.max(...appState.trains.find(t=>t.id==="T-22691").delays.opt)} mins).`, time: "12:35", resolved: true },
            { id: "A3", type: "efficiency", msg: "OPTIMIZED: Consolidated Civil and OHE work on KJM-WFD saving 2hr track closure.", time: "11:30", resolved: true },
            { id: "A4", type: "clash", msg: `RESOLVED: Freight Cargo FG-401 delay reduced to ${Math.max(...appState.trains.find(t=>t.id==="T-401").delays.opt)} mins.`, time: "15:10", resolved: true }
        ];

        // Print Python logs
        data.logs.forEach((log, index) => {
            setTimeout(() => {
                addLog(`[Python API] ${log}`, "success");
            }, index * 200);
        });

        setTimeout(() => {
            solverOverlay.classList.remove("active");
            optButton.innerHTML = `<span>🔄</span> Reset to Siloed State`;
            optButton.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';
            renderChart();
        }, data.logs.length * 200 + 300);

    } catch (error) {
        // Fallback to local simulation if python backend is offline
        addLog("FastAPI backend offline. Falling back to frontend mock simulation.", "warning");
        
        let step = 0;
        const interval = setInterval(() => {
            step++;
            if (step === 1) {
                addLog("[Simulated] Executing Mixed-Integer Linear Programming (MILP) Optimizer (Google OR-Tools)...", "info");
            } else if (step === 2) {
                addLog("[Simulated] Running DBSCAN clustering algorithm for Integrated Block Coordination...", "info");
            } else if (step === 3) {
                addLog("[Simulated] SUCCESS: Combined BLK-001 (Civil) & BLK-002 (OHE) into a single 3-hour Integrated Block.", "success");
            } else if (step === 4) {
                addLog("[Simulated] Running Graph Neural Network (GNN) delay propagation simulator...", "info");
            } else if (step === 5) {
                addLog("[Simulated] Conflict Solved: Shifted Block BLK-001/002 to 11:45-14:45. Shadow window found.", "success");
                addLog("[Simulated] Conflict Solved: Shifted BLK-003 to 16:45. Let's Freight FG-401 and Karnataka Exp bypass.", "success");
            } else if (step === 6) {
                addLog("[Simulated] Resolving loop capacity constraints. Regulating Train 16521 at Krishnarajapuram.", "info");
            } else if (step === 7) {
                addLog("[Simulated] Solver terminated. Optimization target reached. Objective function Z = 15.", "success");
                
                appState.optimized = true;
                appState.alerts = [
                    { id: "A1", type: "clash", msg: "RESOLVED: Train 16521 regulation minimised. Delay reduced to 10 mins.", time: "10:20", resolved: true },
                    { id: "A2", type: "clash", msg: "RESOLVED: Train 22691 (Rajdhani) delay eliminated (0 mins).", time: "12:35", resolved: true },
                    { id: "A3", type: "efficiency", msg: "OPTIMIZED: Consolidated Civil and OHE work on KJM-WFD saving 2hr track closure.", time: "11:30", resolved: true },
                    { id: "A4", type: "clash", msg: "RESOLVED: Freight Cargo FG-401 delay reduced to 5 mins.", time: "15:10", resolved: true }
                ];

                solverOverlay.classList.remove("active");
                clearInterval(interval);

                optButton.innerHTML = `<span>🔄</span> Reset to Siloed State`;
                optButton.style.background = 'linear-gradient(135deg, var(--danger), #dc2626)';

                renderChart();
            }
        }, 450);
    }
}

// Bind Events
optButton.addEventListener("click", triggerOptimization);

// Run initial execution
drawGrid();
renderAlerts();
updateKPIs();
runInitialLogFeed();
