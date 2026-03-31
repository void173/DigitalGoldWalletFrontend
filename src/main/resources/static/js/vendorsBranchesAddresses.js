// ── API BASE ──
const API_BASE = 'http://localhost:8080';

// ── HELPERS ──
function formatDate(dt) {
  if (!dt) return '—';
  return new Date(dt).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function formatQty(q) {
  if (q == null) return '0.00';
  return parseFloat(q).toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function padId(id) { return String(id).padStart(3, '0'); }
function extractId(url) {
  if (!url) return null;
  return url.split('/').filter(Boolean).pop();
}

// ══════════════════════════════════════
// FETCH DATA
// ══════════════════════════════════════

async function fetchBranches() {
  // Try projection first (needs VendorBranchView interface in Spring Boot)
  try {
    const res = await fetch(`${API_BASE}/vendorBranches?projection=vendorBranchView&size=100&sort=branchId,asc`);
    if (res.ok) {
      const data = await res.json();
      const raw = data._embedded?.vendorBranches || [];
      if (raw.length) {
        return raw.map(b => ({
          branchId:   b.branchId ?? extractId(b._links?.self?.href),
          selfUrl:    b._links?.self?.href,
          addressUrl: b._links?.address?.href,
          quantity:   b.quantity,
          createdAt:  b.createdAt,
          vendorName: b.vendors?.vendorName ?? '—',
          city:       b.address?.city       ?? '—',
          state:      b.address?.state      ?? '—',
          country:    b.address?.country    ?? '—',
          street:     b.address?.street     ?? '—',
          postalCode: b.address?.postalCode ?? '—',
        }));
      }
    }
  } catch (_) {}

  // Fallback: fetch branches then related via _links
  const res = await fetch(`${API_BASE}/vendorBranches?size=100&sort=branchId,asc`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  const branches = data._embedded?.vendorBranches || [];

  return Promise.all(branches.map(async b => {
    const branchId = extractId(b._links?.self?.href);
    let vendorName = '—', city = '—', state = '—', country = '—', street = '—', postalCode = '—';

    try {
      const vRes = await fetch(b._links.vendors.href);
      if (vRes.ok) { const v = await vRes.json(); vendorName = v.vendorName ?? '—'; }
    } catch (_) {}

    try {
      const aRes = await fetch(b._links.address.href);
      if (aRes.ok) {
        const a = await aRes.json();
        city = a.city ?? '—'; state = a.state ?? '—'; country = a.country ?? '—';
        street = a.street ?? '—'; postalCode = a.postalCode ?? '—';
      }
    } catch (_) {}

    return {
      branchId, selfUrl: b._links?.self?.href, addressUrl: b._links?.address?.href,
      quantity: b.quantity, createdAt: b.createdAt,
      vendorName, city, state, country, street, postalCode
    };
  }));
}

// ══════════════════════════════════════
// CACHE + STATE
// ══════════════════════════════════════
let allRows = [];

// ══════════════════════════════════════
// RENDER TABLE
// ══════════════════════════════════════
function renderTable(rows) {
  const tbody = document.getElementById('branchTableBody');
  document.getElementById('countBadge').textContent =
    `${rows.length} branch${rows.length !== 1 ? 'es' : ''}`;

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No branches match the filters.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map((r, i) => `
    <tr style="animation-delay:${i * 0.03}s">
      <td class="td-id"      data-label="Branch ID">#${padId(r.branchId)}</td>
      <td class="td-city"    data-label="City">${r.city}</td>
      <td class="td-state"   data-label="State">${r.state}</td>
      <td                    data-label="Country">${r.country}</td>
      <td class="td-address" data-label="Address"
          title="${r.street}, ${r.city} — ${r.postalCode}">
        ${r.street}, ${r.city} — ${r.postalCode}
      </td>
      <td class="td-qty"     data-label="Gold Qty (g)">${formatQty(r.quantity)}</td>
      <td class="td-date"    data-label="Created At">${formatDate(r.createdAt)}</td>
      <td class="td-actions" data-label="Actions">
        <button class="action-btn btn-update"
                onclick="openUpdateModal('${r.branchId}')">
          ✎ Update
        </button>
        <button class="action-btn btn-transfer"
                onclick="openTransferModal('${r.branchId}')">
          ⇄ Transfer Gold
        </button>
      </td>
    </tr>
  `).join('');
}

// ══════════════════════════════════════
// SUMMARY
// ══════════════════════════════════════
function updateSummary(filtered) {
  const vendorName = allRows[0]?.vendorName ?? '—';
  const totalQty   = filtered.reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
  document.getElementById('summaryVendorName').textContent  = vendorName;
  document.getElementById('summaryBranchCount').textContent = filtered.length;
  document.getElementById('summaryTotalQty').textContent    = formatQty(totalQty) + ' g';
  document.getElementById('pageSubtitle').textContent       = `Manage locations for ${vendorName}`;
}

// ══════════════════════════════════════
// FILTERS
// ══════════════════════════════════════
function populateFilters() {
  const unique = key => [...new Set(allRows.map(r => r[key]).filter(v => v && v !== '—'))].sort();
  fillSelect('cityFilter',    unique('city'));
  fillSelect('stateFilter',   unique('state'));
  fillSelect('countryFilter', unique('country'));
}

function fillSelect(id, values) {
  const sel = document.getElementById(id);
  while (sel.options.length > 1) sel.remove(1);
  values.forEach(v => {
    const opt = document.createElement('option');
    opt.value = v; opt.textContent = v;
    sel.appendChild(opt);
  });
}

function applyFilters() {
  const city    = document.getElementById('cityFilter').value;
  const state   = document.getElementById('stateFilter').value;
  const country = document.getElementById('countryFilter').value;
  const filtered = allRows.filter(r =>
    (!city    || r.city    === city)   &&
    (!state   || r.state   === state)  &&
    (!country || r.country === country)
  );
  renderTable(filtered);
  updateSummary(filtered);
}

function resetFilters() {
  ['cityFilter', 'stateFilter', 'countryFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });
  applyFilters();
}

// ══════════════════════════════════════
// MODAL HELPERS
// ══════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.add('open'); }
function closeModal(id) { document.getElementById(id).classList.remove('open'); }

// Close on overlay click
document.addEventListener('click', e => {
  if (e.target.classList.contains('modal-overlay')) {
    e.target.classList.remove('open');
  }
});

// ══════════════════════════════════════
// UPDATE BRANCH MODAL
// ══════════════════════════════════════
function openUpdateModal(branchId) {
  const row = allRows.find(r => String(r.branchId) === String(branchId));
  if (!row) return;

  document.getElementById('updateBranchId').value = branchId;
  document.getElementById('updateStreet').value   = row.street     !== '—' ? row.street     : '';
  document.getElementById('updateCity').value     = row.city       !== '—' ? row.city       : '';
  document.getElementById('updateState').value    = row.state      !== '—' ? row.state      : '';
  document.getElementById('updatePostal').value   = row.postalCode !== '—' ? row.postalCode : '';
  document.getElementById('updateCountry').value  = row.country    !== '—' ? row.country    : '';
  document.getElementById('updateQty').value      = row.quantity   ?? '';

  openModal('updateModal');
}

async function submitUpdate() {
  const branchId  = document.getElementById('updateBranchId').value;
  const row       = allRows.find(r => String(r.branchId) === String(branchId));
  if (!row) return;

  const newQty    = document.getElementById('updateQty').value;
  const newStreet = document.getElementById('updateStreet').value.trim();
  const newCity   = document.getElementById('updateCity').value.trim();
  const newState  = document.getElementById('updateState').value.trim();
  const newPostal = document.getElementById('updatePostal').value.trim();
  const newCountry= document.getElementById('updateCountry').value.trim();

  if (!newQty || !newStreet || !newCity) {
    showToast('Please fill in at least Street, City and Gold Quantity.', true);
    return;
  }

  try {
    // PATCH branch quantity
    // PUT/PATCH /vendorBranches/{id}
    const branchRes = await fetch(`${API_BASE}/vendorBranches/${branchId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ quantity: parseFloat(newQty) })
    });

    // PATCH address via the address link
    if (row.addressUrl) {
      const addressId = extractId(row.addressUrl);
      await fetch(`${API_BASE}/addresses/${addressId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          street: newStreet, city: newCity, state: newState,
          postalCode: newPostal, country: newCountry
        })
      });
    }

    if (branchRes.ok) {
      // update local cache
      row.quantity   = parseFloat(newQty);
      row.street     = newStreet;
      row.city       = newCity;
      row.state      = newState;
      row.postalCode = newPostal;
      row.country    = newCountry;

      closeModal('updateModal');
      applyFilters();
      populateFilters();
      showToast(`Branch #${padId(branchId)} updated successfully.`);
    } else {
      showToast('Update failed. Check server response.', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Network error. Make sure Spring Boot is running.', true);
  }
}

// ══════════════════════════════════════
// TRANSFER GOLD MODAL
// ══════════════════════════════════════
function openTransferModal(branchId) {
  const row = allRows.find(r => String(r.branchId) === String(branchId));
  if (!row) return;

  document.getElementById('transferFromId').value      = branchId;
  document.getElementById('transferFromName').textContent =
    `${row.city} — Branch #${padId(branchId)}`;
  document.getElementById('transferAvailable').textContent = formatQty(row.quantity);
  document.getElementById('transferAmount').value      = '';

  // Populate destination dropdown (exclude self)
  const sel = document.getElementById('transferToBranch');
  sel.innerHTML = '<option value="">Select destination branch</option>';
  allRows
    .filter(r => String(r.branchId) !== String(branchId))
    .forEach(r => {
      const opt = document.createElement('option');
      opt.value = r.branchId;
      opt.textContent = `#${padId(r.branchId)} — ${r.city} (${formatQty(r.quantity)} g)`;
      sel.appendChild(opt);
    });

  openModal('transferModal');
}

async function submitTransfer() {
  const fromId   = document.getElementById('transferFromId').value;
  const toId     = document.getElementById('transferToBranch').value;
  const amount   = parseFloat(document.getElementById('transferAmount').value);

  if (!toId) { showToast('Please select a destination branch.', true); return; }
  if (!amount || amount <= 0) { showToast('Enter a valid transfer amount.', true); return; }

  const fromRow = allRows.find(r => String(r.branchId) === String(fromId));
  const toRow   = allRows.find(r => String(r.branchId) === String(toId));
  if (!fromRow || !toRow) return;

  if (amount > parseFloat(fromRow.quantity)) {
    showToast(`Insufficient gold. Available: ${formatQty(fromRow.quantity)} g`, true);
    return;
  }

  const newFromQty = parseFloat(fromRow.quantity) - amount;
  const newToQty   = parseFloat(toRow.quantity)   + amount;

  try {
    const [r1, r2] = await Promise.all([
      fetch(`${API_BASE}/vendorBranches/${fromId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newFromQty })
      }),
      fetch(`${API_BASE}/vendorBranches/${toId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ quantity: newToQty })
      })
    ]);

    if (r1.ok && r2.ok) {
      // update local cache
      fromRow.quantity = newFromQty;
      toRow.quantity   = newToQty;

      closeModal('transferModal');
      applyFilters();
      showToast(`Transferred ${formatQty(amount)} g from Branch #${padId(fromId)} to Branch #${padId(toId)}.`);
    } else {
      showToast('Transfer failed. Check server response.', true);
    }
  } catch (err) {
    console.error(err);
    showToast('Network error. Make sure Spring Boot is running.', true);
  }
}

// ══════════════════════════════════════
// TOAST
// ══════════════════════════════════════
let toastTimer;
function showToast(msg, isError = false) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.className = 'toast show' + (isError ? ' error' : '');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toast.className = 'toast'; }, 3500);
}

// ══════════════════════════════════════
// LOADING / ERROR
// ══════════════════════════════════════
function showLoading() {
  document.getElementById('branchTableBody').innerHTML = `
    <tr><td colspan="8" class="table-loading">
      <div class="loader"></div>Loading branches from database…
    </td></tr>`;
}
function showError(msg) {
  document.getElementById('branchTableBody').innerHTML =
    `<tr><td colspan="8" class="table-empty">⚠ ${msg}</td></tr>`;
  document.getElementById('countBadge').textContent = '0 branches';
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  showLoading();
  try {
    const rows = await fetchBranches();
    if (!rows.length) {
      showError('No branches found in database.');
      return;
    }
    allRows = rows;// ── API BASE ──
                   const API_BASE = 'http://localhost:8080';

                   // ── HELPERS ──
                   function formatDate(dt) {
                     if (!dt) return '—';
                     return new Date(dt).toLocaleDateString('en-IN', {
                       day: '2-digit', month: 'short', year: 'numeric'
                     });
                   }
                   function formatQty(q) {
                     if (q == null) return '0.00';
                     return parseFloat(q).toLocaleString('en-IN', {
                       minimumFractionDigits: 2, maximumFractionDigits: 2
                     });
                   }
                   function padId(id) { return String(id).padStart(3, '0'); }
                   function extractId(url) {
                     if (!url) return null;
                     return url.split('/').filter(Boolean).pop();
                   }

                   // ══════════════════════════════════════
                   // FETCH BRANCHES
                   // Uses projection if available, else falls back to _links
                   // ══════════════════════════════════════
                   async function fetchBranches() {
                     // Strategy 1 — projection (needs VendorBranchView interface)
                     try {
                       const res = await fetch(
                         `${API_BASE}/vendorBranches?projection=vendorBranchView&size=100&sort=branchId,asc`
                       );
                       if (res.ok) {
                         const data = await res.json();
                         const raw = data._embedded?.vendorBranches || [];
                         if (raw.length) {
                           return raw.map(b => ({
                             branchId:   b.branchId   ?? extractId(b._links?.self?.href),
                             selfUrl:    b._links?.self?.href,
                             addressUrl: b._links?.address?.href,
                             quantity:   b.quantity,
                             createdAt:  b.createdAt,
                             vendorName: b.vendors?.vendorName ?? '—',
                             city:       b.address?.city       ?? '—',
                             state:      b.address?.state      ?? '—',
                             country:    b.address?.country    ?? '—',
                             street:     b.address?.street     ?? '—',
                             postalCode: b.address?.postalCode ?? '—',
                           }));
                         }
                       }
                     } catch (_) {}

                     // Strategy 2 — plain fetch + individual _links
                     const res = await fetch(`${API_BASE}/vendorBranches?size=100&sort=branchId,asc`);
                     if (!res.ok) throw new Error(`HTTP ${res.status}`);
                     const data = await res.json();
                     const branches = data._embedded?.vendorBranches || [];

                     return Promise.all(branches.map(async b => {
                       const branchId = extractId(b._links?.self?.href);
                       let vendorName = '—', city = '—', state = '—',
                           country = '—', street = '—', postalCode = '—';

                       try {
                         const vRes = await fetch(b._links.vendors.href);
                         if (vRes.ok) { const v = await vRes.json(); vendorName = v.vendorName ?? '—'; }
                       } catch (_) {}

                       try {
                         const aRes = await fetch(b._links.address.href);
                         if (aRes.ok) {
                           const a = await aRes.json();
                           city = a.city ?? '—'; state = a.state ?? '—'; country = a.country ?? '—';
                           street = a.street ?? '—'; postalCode = a.postalCode ?? '—';
                         }
                       } catch (_) {}

                       return {
                         branchId, selfUrl: b._links?.self?.href, addressUrl: b._links?.address?.href,
                         quantity: b.quantity, createdAt: b.createdAt,
                         vendorName, city, state, country, street, postalCode
                       };
                     }));
                   }

                   // ══════════════════════════════════════
                   // CACHE
                   // ══════════════════════════════════════
                   let allRows = [];

                   // ══════════════════════════════════════
                   // RENDER TABLE
                   // ══════════════════════════════════════
                   function renderTable(rows) {
                     const tbody = document.getElementById('branchTableBody');
                     document.getElementById('countBadge').textContent =
                       `${rows.length} branch${rows.length !== 1 ? 'es' : ''}`;

                     if (!rows.length) {
                       tbody.innerHTML = `<tr><td colspan="8" class="table-empty">No branches match the filters.</td></tr>`;
                       return;
                     }

                     tbody.innerHTML = rows.map((r, i) => `
                       <tr style="animation-delay:${i * 0.03}s">
                         <td class="td-id"      data-label="Branch ID">#${padId(r.branchId)}</td>
                         <td class="td-city"    data-label="City">${r.city}</td>
                         <td class="td-state"   data-label="State">${r.state}</td>
                         <td                    data-label="Country">${r.country}</td>
                         <td class="td-address" data-label="Address"
                             title="${r.street}, ${r.city} — ${r.postalCode}">
                           ${r.street}, ${r.city} — ${r.postalCode}
                         </td>
                         <td class="td-qty"     data-label="Gold Qty (g)">${formatQty(r.quantity)}</td>
                         <td class="td-date"    data-label="Created At">${formatDate(r.createdAt)}</td>
                         <td class="td-actions">
                           <div class="actions-wrap">
                             <button class="action-btn btn-update"
                                     onclick="openUpdateModal('${r.branchId}')">
                               ✎ Update
                             </button>
                             <button class="action-btn btn-transfer"
                                     onclick="openTransferModal('${r.branchId}')">
                               ⇄ Transfer Gold
                             </button>
                           </div>
                         </td>
                       </tr>
                     `).join('');
                   }

                   // ══════════════════════════════════════
                   // SUMMARY
                   // ══════════════════════════════════════
                   function updateSummary(filtered) {
                     const vendorName = allRows[0]?.vendorName ?? '—';
                     const totalQty   = filtered.reduce((s, r) => s + parseFloat(r.quantity || 0), 0);
                     document.getElementById('summaryVendorName').textContent  = vendorName;
                     document.getElementById('summaryBranchCount').textContent = filtered.length;
                     document.getElementById('summaryTotalQty').textContent    = formatQty(totalQty) + ' g';
                     document.getElementById('pageSubtitle').textContent       = `Manage locations for ${vendorName}`;
                   }

                   // ══════════════════════════════════════
                   // FILTERS
                   // ══════════════════════════════════════
                   function populateFilters() {
                     const unique = key =>
                       [...new Set(allRows.map(r => r[key]).filter(v => v && v !== '—'))].sort();
                     fillSelect('cityFilter',    unique('city'));
                     fillSelect('stateFilter',   unique('state'));
                     fillSelect('countryFilter', unique('country'));
                   }

                   function fillSelect(id, values) {
                     const sel = document.getElementById(id);
                     while (sel.options.length > 1) sel.remove(1);
                     values.forEach(v => {
                       const opt = document.createElement('option');
                       opt.value = v; opt.textContent = v;
                       sel.appendChild(opt);
                     });
                   }

                   function applyFilters() {
                     const city    = document.getElementById('cityFilter').value;
                     const state   = document.getElementById('stateFilter').value;
                     const country = document.getElementById('countryFilter').value;
                     const filtered = allRows.filter(r =>
                       (!city    || r.city    === city)   &&
                       (!state   || r.state   === state)  &&
                       (!country || r.country === country)
                     );
                     renderTable(filtered);
                     updateSummary(filtered);
                   }

                   function resetFilters() {
                     ['cityFilter', 'stateFilter', 'countryFilter'].forEach(id => {
                       document.getElementById(id).value = '';
                     });
                     applyFilters();
                   }

                   // ══════════════════════════════════════
                   // MODAL HELPERS
                   // ══════════════════════════════════════
                   function openModal(id)  { document.getElementById(id).classList.add('open'); }
                   function closeModal(id) { document.getElementById(id).classList.remove('open'); }

                   document.addEventListener('click', e => {
                     if (e.target.classList.contains('modal-overlay')) {
                       e.target.classList.remove('open');
                     }
                   });

                   // ══════════════════════════════════════
                   // UPDATE BRANCH MODAL
                   // PATCH /vendorBranches/{id}  — quantity
                   // PATCH /addresses/{id}       — address fields
                   // ══════════════════════════════════════
                   function openUpdateModal(branchId) {
                     const row = allRows.find(r => String(r.branchId) === String(branchId));
                     if (!row) return;

                     document.getElementById('updateBranchId').value = branchId;
                     document.getElementById('updateStreet').value   = row.street     !== '—' ? row.street     : '';
                     document.getElementById('updateCity').value     = row.city       !== '—' ? row.city       : '';
                     document.getElementById('updateState').value    = row.state      !== '—' ? row.state      : '';
                     document.getElementById('updatePostal').value   = row.postalCode !== '—' ? row.postalCode : '';
                     document.getElementById('updateCountry').value  = row.country    !== '—' ? row.country    : '';
                     document.getElementById('updateQty').value      = row.quantity ?? '';

                     openModal('updateModal');
                   }

                   async function submitUpdate() {
                     const branchId   = document.getElementById('updateBranchId').value;
                     const row        = allRows.find(r => String(r.branchId) === String(branchId));
                     if (!row) return;

                     const newQty     = document.getElementById('updateQty').value;
                     const newStreet  = document.getElementById('updateStreet').value.trim();
                     const newCity    = document.getElementById('updateCity').value.trim();
                     const newState   = document.getElementById('updateState').value.trim();
                     const newPostal  = document.getElementById('updatePostal').value.trim();
                     const newCountry = document.getElementById('updateCountry').value.trim();

                     if (!newQty || !newCity) {
                       showToast('City and Gold Quantity are required.', true);
                       return;
                     }

                     try {
                       // PATCH branch quantity
                       const branchRes = await fetch(`${API_BASE}/vendorBranches/${branchId}`, {
                         method: 'PATCH',
                         headers: { 'Content-Type': 'application/json' },
                         body: JSON.stringify({ quantity: parseFloat(newQty) })
                       });

                       // PATCH address
                       if (row.addressUrl) {
                         const addressId = extractId(row.addressUrl);
                         await fetch(`${API_BASE}/addresses/${addressId}`, {
                           method: 'PATCH',
                           headers: { 'Content-Type': 'application/json' },
                           body: JSON.stringify({
                             street: newStreet, city: newCity, state: newState,
                             postalCode: newPostal, country: newCountry
                           })
                         });
                       }

                       if (branchRes.ok) {
                         // Update local cache
                         row.quantity   = parseFloat(newQty);
                         row.street     = newStreet  || row.street;
                         row.city       = newCity    || row.city;
                         row.state      = newState   || row.state;
                         row.postalCode = newPostal  || row.postalCode;
                         row.country    = newCountry || row.country;

                         closeModal('updateModal');
                         applyFilters();
                         populateFilters();
                         showToast(`Branch #${padId(branchId)} updated successfully.`);
                       } else {
                         const err = await branchRes.text();
                         showToast(`Update failed: ${err}`, true);
                       }
                     } catch (err) {
                       console.error(err);
                       showToast('Network error. Make sure Spring Boot is running.', true);
                     }
                   }

                   // ══════════════════════════════════════
                   // TRANSFER GOLD MODAL
                   // Uses your endpoint:
                   //   POST /transfer?fromBranchId=&toBranchId=&quantity=
                   // Server handles:
                   //   - same-vendor check
                   //   - insufficient gold check
                   //   - subtract from source, add to destination
                   // ══════════════════════════════════════
                   function openTransferModal(branchId) {
                     const row = allRows.find(r => String(r.branchId) === String(branchId));
                     if (!row) return;

                     document.getElementById('transferFromId').value          = branchId;
                     document.getElementById('transferFromName').textContent  =
                       `${row.city} — Branch #${padId(branchId)}`;
                     document.getElementById('transferAvailable').textContent = formatQty(row.quantity);
                     document.getElementById('transferAmount').value          = '';

                     // Populate destination dropdown — exclude self
                     const sel = document.getElementById('transferToBranch');
                     sel.innerHTML = '<option value="">Select destination branch</option>';
                     allRows
                       .filter(r => String(r.branchId) !== String(branchId))
                       .forEach(r => {
                         const opt = document.createElement('option');
                         opt.value       = r.branchId;
                         opt.textContent = `#${padId(r.branchId)} — ${r.city} (${formatQty(r.quantity)} g available)`;
                         sel.appendChild(opt);
                       });

                     openModal('transferModal');
                   }

                   async function submitTransfer() {
                     const fromId = document.getElementById('transferFromId').value;
                     const toId   = document.getElementById('transferToBranch').value;
                     const amount = parseFloat(document.getElementById('transferAmount').value);

                     if (!toId)              { showToast('Please select a destination branch.', true); return; }
                     if (!amount || amount <= 0) { showToast('Enter a valid transfer amount.', true); return; }

                     const fromRow = allRows.find(r => String(r.branchId) === String(fromId));
                     const toRow   = allRows.find(r => String(r.branchId) === String(toId));
                     if (!fromRow || !toRow) return;

                     // Client-side pre-check (server will also validate)
                     if (amount > parseFloat(fromRow.quantity)) {
                       showToast(`Not enough gold. Available: ${formatQty(fromRow.quantity)} g`, true);
                       return;
                     }

                     try {
                       // ── POST /transfer?fromBranchId=X&toBranchId=Y&quantity=Z ──
                       const url = `${API_BASE}/transfer?fromBranchId=${fromId}&toBranchId=${toId}&quantity=${amount}`;
                       const res = await fetch(url, { method: 'POST' });

                       if (res.ok) {
                         // Update local cache to reflect new quantities
                         fromRow.quantity = (parseFloat(fromRow.quantity) - amount).toFixed(2);
                         toRow.quantity   = (parseFloat(toRow.quantity)   + amount).toFixed(2);

                         closeModal('transferModal');
                         applyFilters();
                         showToast(
                           `Transferred ${formatQty(amount)} g from Branch #${padId(fromId)} → Branch #${padId(toId)}.`
                         );
                       } else {
                         // Server returns error message (e.g. VendorMismatch, InsufficientGold)
                         const errText = await res.text();
                         showToast(`Transfer failed: ${errText}`, true);
                       }
                     } catch (err) {
                       console.error(err);
                       showToast('Network error. Make sure Spring Boot is running.', true);
                     }
                   }

                   // ══════════════════════════════════════
                   // TOAST
                   // ══════════════════════════════════════
                   let toastTimer;
                   function showToast(msg, isError = false) {
                     const toast = document.getElementById('toast');
                     toast.textContent = msg;
                     toast.className = 'toast show' + (isError ? ' error' : '');
                     clearTimeout(toastTimer);
                     toastTimer = setTimeout(() => { toast.className = 'toast'; }, 4000);
                   }

                   // ══════════════════════════════════════
                   // LOADING / ERROR
                   // ══════════════════════════════════════
                   function showLoading() {
                     document.getElementById('branchTableBody').innerHTML = `
                       <tr><td colspan="8" class="table-loading">
                         <div class="loader"></div>Loading branches from database…
                       </td></tr>`;
                   }
                   function showError(msg) {
                     document.getElementById('branchTableBody').innerHTML =
                       `<tr><td colspan="8" class="table-empty">⚠ ${msg}</td></tr>`;
                     document.getElementById('countBadge').textContent = '0 branches';
                   }

                   // ══════════════════════════════════════
                   // INIT
                   // ══════════════════════════════════════
                   document.addEventListener('DOMContentLoaded', async () => {
                     showLoading();
                     try {
                       const rows = await fetchBranches();
                       if (!rows.length) {
                         showError('No branches found in database.');
                         return;
                       }
                       allRows = rows;
                       populateFilters();
                       applyFilters();
                     } catch (err) {
                       console.error(err);
                       showError('Cannot connect to server on port 8080. Start your Spring Boot application first.');
                     }
                   });
    populateFilters();
    applyFilters();
  } catch (err) {
    console.error(err);
    showError('Cannot connect to server on port 8080. Start your Spring Boot application first.');
  }
});