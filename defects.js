let defectsData = [];

async function loadDefects() {
    const container = document.getElementById('defects-tbody');
    container.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px;">Fetching defect logs from backend...</td></tr>';
    try {
        const resp = await fetch("http://localhost:8000/api/defects");
        if (resp.ok) {
            const data = await resp.json();
            defectsData = data.items || data;
            renderDefectsTable();
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        container.innerHTML = `<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--danger);">Error connecting to backend: ${e.message}</td></tr>`;
    }
}

function renderDefectsTable() {
    const tbody = document.getElementById('defects-tbody');
    const searchFilter = document.getElementById('defectSearch')?.value.toLowerCase() || "";

    const filtered = defectsData.filter(defect => {
        return defect.defect_id.toLowerCase().includes(searchFilter) || 
               defect.defect_type.toLowerCase().includes(searchFilter) ||
               (defect.description || "").toLowerCase().includes(searchFilter);
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align: center; padding: 20px; color: var(--text-muted);">No defects found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(defect => {
        let severityBadge = "badge-low";
        if (defect.severity > 8) severityBadge = "badge-critical";
        else if (defect.severity > 5) severityBadge = "badge-high";
        else if (defect.severity > 3) severityBadge = "badge-medium";

        let statusBadge = defect.status === "open" ? "badge-warning" : "badge-success";
        let dateStr = new Date(defect.date_reported).toLocaleDateString();

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500;">${defect.defect_id}</td>
                <td>
                    <div style="font-weight: 500;">${defect.defect_type}</div>
                    <div style="font-size: 0.75rem; color: var(--text-muted);">${defect.description || 'No description'}</div>
                </td>
                <td style="color: var(--text-muted);">Corridor ${defect.corridor_id}</td>
                <td><span class="badge ${severityBadge}">Level ${parseFloat(defect.severity).toFixed(1)}</span></td>
                <td><span class="badge ${statusBadge}">${defect.status.toUpperCase()}</span></td>
                <td style="color: var(--text-dim);">${dateStr}</td>
                <td>
                    <div style="display: flex; gap: 8px;">
                        <button class="action-btn" onclick="scheduleDefect(${defect.id})" title="Schedule Fix">📅</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Bind search 
document.getElementById('defectSearch')?.addEventListener('input', renderDefectsTable);

function openDefectModal() {
    alert("New Defect Report UI logic goes here.");
}
function scheduleDefect(id) {
    alert("Scheduling defect " + id + " into a maintenance block...");
}
