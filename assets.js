let assetsData = [];

async function loadAssets() {
    const container = document.getElementById('assets-tbody');
    container.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px;">Fetching asset inventory from backend...</td></tr>';
    try {
        const resp = await fetch("http://localhost:8000/api/assets");
        if (resp.ok) {
            const data = await resp.json();
            assetsData = data.items || data;
            renderAssetsTable();
        } else {
            throw new Error(`HTTP ${resp.status}`);
        }
    } catch (e) {
        container.innerHTML = `<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--danger);">Error connecting to backend: ${e.message}</td></tr>`;
    }
}

function renderAssetsTable() {
    const tbody = document.getElementById('assets-tbody');
    const searchFilter = document.getElementById('assetSearch')?.value.toLowerCase() || "";
    const typeFilter = document.getElementById('assetTypeFilter')?.value || "all";

    const filtered = assetsData.filter(asset => {
        const matchesSearch = asset.asset_id.toLowerCase().includes(searchFilter) || 
                              asset.asset_type.toLowerCase().includes(searchFilter);
        const matchesType = typeFilter === "all" || asset.asset_type === typeFilter;
        return matchesSearch && matchesType;
    });

    if (filtered.length === 0) {
        tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; padding: 20px; color: var(--text-muted);">No assets found.</td></tr>';
        return;
    }

    tbody.innerHTML = filtered.map(asset => {
        let healthColor = "var(--success)";
        if (asset.health_score < 50) healthColor = "var(--danger)";
        else if (asset.health_score < 75) healthColor = "var(--st-color)";

        let dateStr = "Never";
        if (asset.last_maintenance) {
            dateStr = new Date(asset.last_maintenance).toLocaleDateString();
        }

        let typeBadge = "badge-default";
        if (asset.asset_type === "Track Section") typeBadge = "badge-engg";
        if (asset.asset_type === "OHE") typeBadge = "badge-ohe";
        if (asset.asset_type === "Signal Point") typeBadge = "badge-st";

        return `
            <tr>
                <td style="font-family: var(--font-mono); font-size: 0.85rem; font-weight: 500;">${asset.asset_id}</td>
                <td><span class="badge ${typeBadge}">${asset.asset_type.toUpperCase()}</span></td>
                <td style="color: var(--text-muted);">Corridor ${asset.corridor_id}</td>
                <td>
                    <div style="display: flex; align-items: center; gap: 8px;">
                        <span style="font-weight: 600; color: ${healthColor};">${parseFloat(asset.health_score).toFixed(1)}%</span>
                        <div style="width: 60px; height: 6px; background: rgba(255,255,255,0.1); border-radius: 3px; overflow: hidden;">
                            <div style="width: ${asset.health_score}%; height: 100%; background: ${healthColor};"></div>
                        </div>
                    </div>
                </td>
                <td style="color: var(--text-dim);">${dateStr}</td>
            </tr>
        `;
    }).join('');
}

// Bind search and filter
document.getElementById('assetSearch')?.addEventListener('input', renderAssetsTable);
document.getElementById('assetTypeFilter')?.addEventListener('change', renderAssetsTable);
