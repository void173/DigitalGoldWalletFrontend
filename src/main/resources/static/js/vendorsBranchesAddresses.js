const API_BASE = 'http://localhost:8080';

let allRows           = [];   // all data fetched once
let filteredRows      = [];   // after filters applied
let currentPage       = 1;
const PAGE_SIZE       = 5;    // rows per page — change as needed

let activeUpdateIndex  = null;
let activeTransferIndex= null;

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const fmtQty  = q  => parseFloat(q || 0).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const fmtDate = dt => dt
  ? new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
  : '—';
const padId   = n  => String(n).padStart(3, '0');

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3500);
}

/* ═══════════════════════════════════════════
   FETCH — all rows in one shot
═══════════════════════════════════════════ */
async function fetchBranches() {
  // Try projection first (inline vendor + address in one request)
  try {
    const res = await fetch(
      `${API_BASE}/vendorBranches?projection=vendorBranchView&size=1000&sort=branchId,asc`
    );
    if (res.ok) {
      const data = await res.json();
      const raw = data._embedded?.vendorBranches || [];
      if (raw.length) return raw;
    }
  } catch (_) {}

  // Fallback — plain list, then fetch vendor + address per row via _links
  const res = await fetch(`${API_BASE}/vendorBranches?size=1000&sort=branchId,asc`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const branches = data._embedded?.vendorBranches || [];

  return Promise.all(branches.map(async b => {
    let vendorName = '—', address = {};
    try {
      const vRes = await fetch(b._links.vendors.href);
      if (vRes.ok) { const v = await vRes.json(); vendorName = v.vendorName; }
    } catch (_) {}
    try {
      const aRes = await fetch(b._links.address.href);
      if (aRes.ok) address = await aRes.json();
    } catch (_) {}
    return { ...b, vendors: { vendorName }, address };
  }));
}

/* ═══════════════════════════════════════════
   SUMMARY
═══════════════════════════════════════════ */
function updateSummary(rows) {
  const vendorName = rows[0]?.vendors?.vendorName ?? '—';
  const total      = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);

  document.getElementById('summaryVendorName').textContent  = vendorName;
  document.getElementById('summaryBranchCount').textContent = allRows.length;
  document.getElementById('summaryTotalQty').textContent    = fmtQty(total) + ' g';
  document.getElementById('pageSubtitle').textContent       = `Manage locations for ${vendorName}`;
}

/* ═══════════════════════════════════════════
   PAGINATION HELPERS
═══════════════════════════════════════════ */
function totalPages() {
  return Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
}

function pageRows() {
  const start = (currentPage - 1) * PAGE_SIZE;
  return filteredRows.slice(start, start + PAGE_SIZE);
}

/* ═══════════════════════════════════════════
   RENDER TABLE + PAGINATION
═══════════════════════════════════════════ */
function render() {
  renderTable();
  renderPagination();
  updateCount();
}

function renderTable() {
  const tbody = document.getElementById('branchTableBody');
  const rows  = pageRows();

  if (!filteredRows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No branches match your filters.</td></tr>`;
    return;
  }

  // global index = position in filteredRows (for modals)
  const startIdx = (currentPage - 1) * PAGE_SIZE;

  tbody.innerHTML = rows.map((r, i) => {
    const globalIdx = startIdx + i;
    const branchId  = r.branchId ?? extractId(r._links?.self?.href);
    const addr      = r.address  || {};
    return `
      <tr style="animation-delay:${i * 0.04}s">
        <td class="td-id"      data-label="Branch ID">#${padId(branchId)}</td>
        <td class="td-city"    data-label="City">${addr.city    || '—'}</td>
        <td class="td-state"   data-label="State">${addr.state  || '—'}</td>
        <td class="td-country" data-label="Country">${addr.country || '—'}</td>
        <td class="td-address" data-label="Address"
            title="${addr.street || ''}, ${addr.city || ''} — ${addr.postalCode || ''}">
          ${addr.street || '—'}, ${addr.city || ''} — ${addr.postalCode || ''}
        </td>
        <td class="td-qty"  data-label="Gold Qty (g)">${fmtQty(r.quantity)}</td>
        <td class="td-date" data-label="Created At">${fmtDate(r.createdAt)}</td>
        <td class="td-actions">
          <div class="actions-wrap">
            <button class="action-btn btn-update"
                    onclick="openUpdate(${globalIdx})">✎ Update</button>
            <button class="action-btn btn-transfer"
                    onclick="openTransfer(${globalIdx})">⇄ Transfer</button>
          </div>
        </td>
      </tr>`;
  }).join('');
}

/* ─── PAGINATION BAR ─── */
function renderPagination() {
  const total = totalPages();
  const pg    = document.getElementById('pagination');
  if (!pg) return;

  // no bar if only 1 page
  if (total <= 1) {
    pg.innerHTML = '';
    return;
  }

  const makeBtn = (label, page, disabled, active) => `
    <button class="pg-btn${active ? ' active' : ''}"
            ${disabled ? 'disabled' : ''}
            onclick="goToPage(${page})">
      ${label}
    </button>`;

  // build page number list with ellipsis
  const pages = [];
  pages.push(makeBtn('‹', currentPage - 1, currentPage === 1, false));

  const range = 2; // pages shown around current
  for (let p = 1; p <= total; p++) {
    if (p === 1 || p === total || (p >= currentPage - range && p <= currentPage + range)) {
      pages.push(makeBtn(p, p, false, p === currentPage));
    } else if (
      (p === currentPage - range - 1 && p > 1) ||
      (p === currentPage + range + 1 && p < total)
    ) {
      pages.push(`<span class="pg-ellipsis">…</span>`);
    }
  }

  pages.push(makeBtn('›', currentPage + 1, currentPage === total, false));

  pg.innerHTML = `
    <div class="pg-info">${filteredRows.length} result${filteredRows.length !== 1 ? 's' : ''}</div>
    <div class="pg-controls">${pages.join('')}</div>
    <div class="pg-info">Page ${currentPage} of ${total}</div>`;
}

function goToPage(p) {
  const total = totalPages();
  if (p < 1 || p > total) return;
  currentPage = p;
  render();
  // scroll table top
  document.getElementById('branchTableBody')
    ?.closest('.table-card')
    ?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
}

function updateCount() {
  const n = filteredRows.length;
  document.getElementById('countBadge').textContent =
    `${n} ${n === 1 ? 'branch' : 'branches'}`;
}

/* ═══════════════════════════════════════════
   FILTERS
═══════════════════════════════════════════ */
function populateFilters() {
  const cities = new Set(), states = new Set(), countries = new Set();
  allRows.forEach(r => {
    if (r.address?.city)    cities.add(r.address.city);
    if (r.address?.state)   states.add(r.address.state);
    if (r.address?.country) countries.add(r.address.country);
  });
  fillSelect('cityFilter',    [...cities].sort());
  fillSelect('stateFilter',   [...states].sort());
  fillSelect('countryFilter', [...countries].sort());
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  // keep first "All …" option, remove rest
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(v => {
    const o = document.createElement('option');
    o.value = o.textContent = v;
    sel.appendChild(o);
  });
}

function applyFilters() {
  const city    = document.getElementById('cityFilter').value;
  const state   = document.getElementById('stateFilter').value;
  const country = document.getElementById('countryFilter').value;

  filteredRows = allRows.filter(r =>
    (!city    || r.address?.city    === city)    &&
    (!state   || r.address?.state   === state)   &&
    (!country || r.address?.country === country)
  );

  currentPage = 1;   // reset to first page on filter change
  render();
  updateSummary(filteredRows.length ? filteredRows : allRows);
}

function resetFilters() {
  ['cityFilter', 'stateFilter', 'countryFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  filteredRows = [...allRows];
  currentPage  = 1;
  render();
  updateSummary(allRows);
}

/* ═══════════════════════════════════════════
   MODAL HELPERS
═══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay'))
    e.target.classList.remove('open');
});
document.addEventListener('keydown', e => {
  if (e.key === 'Escape')
    document.querySelectorAll('.modal-overlay.open')
      .forEach(m => m.classList.remove('open'));
});

/* ─── UPDATE MODAL ─── */
function openUpdate(globalIdx) {
  activeUpdateIndex = globalIdx;
  const r    = filteredRows[globalIdx];
  const addr = r.address || {};
  const id   = r.branchId ?? extractId(r._links?.self?.href);

  document.getElementById('updateBranchId').value = id;
  document.getElementById('updateStreet').value   = addr.street     || '';
  document.getElementById('updateCity').value     = addr.city       || '';
  document.getElementById('updateState').value    = addr.state      || '';
  document.getElementById('updatePostal').value   = addr.postalCode || '';
  document.getElementById('updateCountry').value  = addr.country    || '';
  document.getElementById('updateQty').value      = r.quantity      || 0;
  openModal('updateModal');
}

async function submitUpdate() {
  const id       = document.getElementById('updateBranchId').value;
  const newQty   = parseFloat(document.getElementById('updateQty').value);
  const newStreet = document.getElementById('updateStreet').value.trim();
  const newCity   = document.getElementById('updateCity').value.trim();
  const newState  = document.getElementById('updateState').value.trim();
  const newPostal = document.getElementById('updatePostal').value.trim();
  const newCountry= document.getElementById('updateCountry').value.trim();

  if (!newCity) { showToast('City is required.', true); return; }

  try {
    // PATCH branch quantity
    const bRes = await fetch(`${API_BASE}/vendorBranches/${id}`, {
      method:  'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body:    JSON.stringify({ quantity: newQty })
    });

    // PATCH address
    const row     = filteredRows[activeUpdateIndex];
    const addrUrl = row._links?.address?.href;
    if (addrUrl) {
      const addrId = extractId(addrUrl);
      await fetch(`${API_BASE}/addresses/${addrId}`, {
        method:  'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({
          street: newStreet, city: newCity, state: newState,
          postalCode: newPostal, country: newCountry
        })
      });
    }

    if (bRes.ok) {
      // update local cache so re-render is instant
      row.quantity         = newQty;
      row.address          = row.address || {};
      row.address.street   = newStreet;
      row.address.city     = newCity;
      row.address.state    = newState;
      row.address.postalCode = newPostal;
      row.address.country  = newCountry;

      closeModal('updateModal');
      populateFilters();
      render();
      showToast('Branch updated successfully.');
    } else {
      const err = await bRes.text();
      showToast(`Update failed: ${err}`, true);
    }
  } catch (err) {
    console.error(err);
    showToast('Network error. Is Spring Boot running?', true);
  }
}

/* ─── TRANSFER MODAL ─── */
function openTransfer(globalIdx) {
  activeTransferIndex = globalIdx;
  const r = filteredRows[globalIdx];
  const id = r.branchId ?? extractId(r._links?.self?.href);

  document.getElementById('transferFromId').value            = id;
  document.getElementById('transferFromName').textContent    =
    `${r.address?.city || '—'} — #${padId(id)}`;
  document.getElementById('transferAvailable').textContent   = fmtQty(r.quantity);
  document.getElementById('transferAmount').value            = '';

  // populate destination — ALL branches except current, with live quantities
  const sel = document.getElementById('transferToBranch');
  sel.innerHTML = '<option value="">Select destination branch</option>';
  allRows.forEach(row => {
    const rid = row.branchId ?? extractId(row._links?.self?.href);
    if (String(rid) === String(id)) return;
    const o = document.createElement('option');
    o.value = rid;
    o.textContent = `#${padId(rid)} — ${row.address?.city || 'Branch'} (${fmtQty(row.quantity)} g)`;
    sel.appendChild(o);
  });

  openModal('transferModal');
}

async function submitTransfer() {
  const fromId = document.getElementById('transferFromId').value;
  const toId   = document.getElementById('transferToBranch').value;
  const amount = parseFloat(document.getElementById('transferAmount').value);

  if (!toId)               { showToast('Select a destination branch.', true); return; }
  if (!amount || amount<=0){ showToast('Enter a valid amount.', true); return; }

  const fromRow = filteredRows[activeTransferIndex];
  if (amount > parseFloat(fromRow.quantity || 0)) {
    showToast(`Insufficient gold. Available: ${fmtQty(fromRow.quantity)} g`, true);
    return;
  }

  try {
    // POST /transfer?fromBranchId=X&toBranchId=Y&quantity=Z
    const res = await fetch(
      `${API_BASE}/transfer?fromBranchId=${fromId}&toBranchId=${toId}&quantity=${amount}`,
      { method: 'POST' }
    );

    if (res.ok) {
      // update local cache instantly
      const toRow = allRows.find(r =>
        String(r.branchId ?? extractId(r._links?.self?.href)) === String(toId)
      );
      fromRow.quantity = (parseFloat(fromRow.quantity) - amount).toFixed(2);
      if (toRow) toRow.quantity = (parseFloat(toRow.quantity) + amount).toFixed(2);

      closeModal('transferModal');
      render();
      updateSummary(filteredRows.length ? filteredRows : allRows);
      showToast(`Transferred ${fmtQty(amount)} g to Branch #${padId(toId)}.`);
    } else {
      const err = await res.text();
      showToast(`Transfer failed: ${err}`, true);
    }
  } catch (err) {
    console.error(err);
    showToast('Network error. Is Spring Boot running?', true);
  }
}

/* ═══════════════════════════════════════════
   UTILITY
═══════════════════════════════════════════ */
function extractId(url) {
  if (!url) return '—';
  return url.split('/').filter(Boolean).pop();
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
  document.getElementById('branchTableBody').innerHTML = `
    <tr><td colspan="8" class="table-loading">
      <div class="loader"></div>Loading branches from database…
    </td></tr>`;

  try {
    allRows      = await fetchBranches();
    filteredRows = [...allRows];

    if (!allRows.length) {
      document.getElementById('branchTableBody').innerHTML =
        `<tr><td colspan="8" class="table-empty">No branches found in the database.</td></tr>`;
      document.getElementById('countBadge').textContent = '0 branches';
      return;
    }

    populateFilters();
    render();
    updateSummary(allRows);

  } catch (err) {
    console.error(err);
    document.getElementById('branchTableBody').innerHTML = `
      <tr><td colspan="8" class="table-empty">
        ⚠ Cannot connect to server. Make sure Spring Boot is running on port 8080.
      </td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', init);