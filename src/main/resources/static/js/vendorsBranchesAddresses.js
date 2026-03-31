const API_BASE = 'http://localhost:8080';
let allRows      = [];
let filteredRows = [];
let activeUpdateIndex = null;
let activeTransferIndex = null;

/* ═══════════════════════════════════════════
   HELPERS
═══════════════════════════════════════════ */
const fmtQty  = q  => parseFloat(q || 0).toFixed(2);
const fmtDate = dt => dt ? new Date(dt).toLocaleDateString('en-IN', { day:'2-digit', month:'short', year:'numeric' }) : '—';

/* ═══════════════════════════════════════════
   TOAST
═══════════════════════════════════════════ */
function showToast(msg, isError = false) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => { t.className = 'toast'; }, 3200);
}

/* ═══════════════════════════════════════════
   FETCH
═══════════════════════════════════════════ */
async function fetchBranches() {
  const res = await fetch(`${API_BASE}/vendorBranches?projection=vendorBranchView`);
  if (!res.ok) throw new Error('API failed');
  const data = await res.json();
  return data._embedded?.vendorBranches || [];
}

/* ═══════════════════════════════════════════
   RENDER
═══════════════════════════════════════════ */
function renderTable(rows) {
  const tbody = document.getElementById('branchTableBody');

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="state-cell">No branches found matching your filters.</td></tr>`;
    updateCount(0);
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr style="animation-delay:${i * 0.04}s">
      <td class="td-id">${String(i + 1).padStart(2, '0')}</td>
      <td class="td-city">${r.address?.city  || '—'}</td>
      <td class="td-state">${r.address?.state || '—'}</td>
      <td class="td-country">${r.address?.country || '—'}</td>
      <td class="td-address" title="${r.address?.street || ''}">${r.address?.street || '—'}</td>
      <td class="td-qty">${fmtQty(r.quantity)} g</td>
      <td class="td-date">${fmtDate(r.createdAt)}</td>
      <td class="td-actions">
        <div class="actions-wrap">
          <button class="action-btn btn-edit" onclick="openUpdate(${i})">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M8.5 1.5l2 2-7 7H1.5v-2l7-7z" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Edit
          </button>
          <button class="action-btn btn-transfer" onclick="openTransfer(${i})">
            <svg width="12" height="12" viewBox="0 0 12 12" fill="none"><path d="M2 6h8M7 3l3 3-3 3" stroke="currentColor" stroke-width="1.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
            Transfer
          </button>
        </div>
      </td>
    </tr>
  `).join('');

  updateCount(rows.length);
}

/* ═══════════════════════════════════════════
   SUMMARY & COUNT
═══════════════════════════════════════════ */
function updateSummary(rows) {
  const total = rows.reduce((s, r) => s + (parseFloat(r.quantity) || 0), 0);
  document.getElementById('summaryBranchCount').textContent = rows.length;
  document.getElementById('summaryTotalQty').textContent    = `${fmtQty(total)} g`;
}

function updateCount(n) {
  document.getElementById('countBadge').textContent = `${n} ${n === 1 ? 'branch' : 'branches'}`;
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
  renderTable(filteredRows);
  updateSummary(filteredRows);
}

function resetFilters() {
  ['cityFilter','stateFilter','countryFilter'].forEach(id => document.getElementById(id).value = '');
  filteredRows = [...allRows];
  renderTable(filteredRows);
  updateSummary(filteredRows);
}

/* ═══════════════════════════════════════════
   MODALS
═══════════════════════════════════════════ */
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// close on backdrop click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});
// close on Escape
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') document.querySelectorAll('.modal-overlay.open').forEach(m => m.classList.remove('open'));
});

function openUpdate(index) {
  activeUpdateIndex = index;
  const r = filteredRows[index];
  document.getElementById('updateBranchId').value = r.id || '';
  document.getElementById('updateStreet').value   = r.address?.street     || '';
  document.getElementById('updateCity').value     = r.address?.city       || '';
  document.getElementById('updateState').value    = r.address?.state      || '';
  document.getElementById('updatePostal').value   = r.address?.postalCode || '';
  document.getElementById('updateCountry').value  = r.address?.country    || '';
  document.getElementById('updateQty').value      = r.quantity             || 0;
  openModal('updateModal');
}

function openTransfer(index) {
  activeTransferIndex = index;
  const r = filteredRows[index];
  document.getElementById('transferFromName').textContent    = r.address?.city || '—';
  document.getElementById('transferAvailable').textContent   = fmtQty(r.quantity);
  document.getElementById('transferAmount').value            = '';

  const sel = document.getElementById('transferToBranch');
  sel.innerHTML = '<option value="">Select destination branch</option>';
  allRows.forEach((row, i) => {
    if (row !== r) {
      const o = document.createElement('option');
      o.value = i;
      o.textContent = `${row.address?.city || 'Branch ' + (i+1)} — ${fmtQty(row.quantity)} g`;
      sel.appendChild(o);
    }
  });
  openModal('transferModal');
}

/* ═══════════════════════════════════════════
   SUBMIT HANDLERS (stub — wire to real API)
═══════════════════════════════════════════ */
async function submitUpdate() {
  const id     = document.getElementById('updateBranchId').value;
  const payload = {
    address: {
      street:     document.getElementById('updateStreet').value,
      city:       document.getElementById('updateCity').value,
      state:      document.getElementById('updateState').value,
      postalCode: document.getElementById('updatePostal').value,
      country:    document.getElementById('updateCountry').value,
    },
    quantity: parseFloat(document.getElementById('updateQty').value) || 0,
  };

  try {
    // const res = await fetch(`${API_BASE}/vendorBranches/${id}`, { method:'PATCH', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    // if (!res.ok) throw new Error();
    showToast('Branch updated successfully.');
    closeModal('updateModal');
    // await init(); // refresh
  } catch {
    showToast('Failed to update branch.', true);
  }
}

async function submitTransfer() {
  const amount = parseFloat(document.getElementById('transferAmount').value);
  const toIdx  = document.getElementById('transferToBranch').value;

  if (!toIdx || !amount || amount <= 0) {
    showToast('Please select a destination and enter a valid amount.', true);
    return;
  }

  const from = filteredRows[activeTransferIndex];
  if (amount > parseFloat(from.quantity || 0)) {
    showToast('Transfer amount exceeds available gold.', true);
    return;
  }

  try {
    // wire to real API here
    showToast(`Transferred ${fmtQty(amount)} g successfully.`);
    closeModal('transferModal');
  } catch {
    showToast('Transfer failed. Please try again.', true);
  }
}

/* ═══════════════════════════════════════════
   INIT
═══════════════════════════════════════════ */
async function init() {
  document.getElementById('branchTableBody').innerHTML =
    `<tr><td colspan="8" class="state-cell"><span class="loader"></span>Loading branches…</td></tr>`;
  try {
    allRows      = await fetchBranches();
    filteredRows = [...allRows];
    populateFilters();
    renderTable(filteredRows);
    updateSummary(filteredRows);
  } catch (err) {
    console.error(err);
    document.getElementById('branchTableBody').innerHTML =
      `<tr><td colspan="8" class="state-cell">Failed to load data. Make sure the backend is running on port 8080.</td></tr>`;
  }
}

document.addEventListener('DOMContentLoaded', init);