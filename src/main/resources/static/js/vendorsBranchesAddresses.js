const API_BASE = 'http://localhost:8080';
const PAGE_SIZE = 5;

let currentRows = [];
let currentPage = 0;
let totalPages = 0;
let totalElements = 0;
let activeFilters = { city: '', state: '', country: '' };

let cachedRows = []; // ⚠️ for multi-filter refinement

/* ================= FETCH ================= */

async function fetchPage(page, filters) {
  let base = `${API_BASE}/vendorBranches`;
  let params = `page=${page}&size=${PAGE_SIZE}`;

  if (filters.city) {
    base = `${API_BASE}/vendorBranches/search/findByAddressCity`;
    params += `&city=${filters.city}`;
  } else if (filters.state) {
    base = `${API_BASE}/vendorBranches/search/findByAddressState`;
    params += `&state=${filters.state}`;
  } else if (filters.country) {
    base = `${API_BASE}/vendorBranches/search/findByAddressCountry`;
    params += `&country=${filters.country}`;
  }

  const res = await fetch(`${base}?${params}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  return res.json();
}

/* ================= LOAD PAGE ================= */

async function loadPage(page) {
  document.getElementById('branchTableBody').innerHTML = `
    <tr><td colspan="8" class="table-loading">
      <div class="loader"></div>Loading…
    </td></tr>`;

  try {
    const data = await fetchPage(page, activeFilters);

    let rows = data._embedded?.vendorBranches || [];

    // 🔥 MULTI FILTER (frontend refinement)
    rows = rows.filter(r => {
      return (
        (!activeFilters.city || r.city === activeFilters.city) &&
        (!activeFilters.state || r.state === activeFilters.state) &&
        (!activeFilters.country || r.country === activeFilters.country)
      );
    });

    cachedRows = rows; // store full filtered result

    totalElements = rows.length;
    totalPages = Math.ceil(totalElements / PAGE_SIZE);
    currentPage = page;

    // slice for pagination
    currentRows = rows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

    renderTable();
    renderPagination();
    updateSummary();
    updateCount();

  } catch (err) {
    console.error(err);
    document.getElementById('branchTableBody').innerHTML = `
      <tr><td colspan="8" class="table-empty">
        ⚠ Cannot connect to server.
      </td></tr>`;
  }
}

/* ================= PAGINATION ================= */

function goToPage(page) {
  if (page < 0 || page >= totalPages) return;

  currentPage = page;
  currentRows = cachedRows.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  renderTable();
  renderPagination();
}

/* ================= FILTER ================= */

function applyFilters() {
  activeFilters = {
    city: document.getElementById('cityFilter').value,
    state: document.getElementById('stateFilter').value,
    country: document.getElementById('countryFilter').value,
  };

  loadPage(0);
}

function resetFilters() {
  ['cityFilter', 'stateFilter', 'countryFilter'].forEach(id => {
    document.getElementById(id).value = '';
  });

  activeFilters = { city: '', state: '', country: '' };
  loadPage(0);
}

/* ================= FILTER DROPDOWN ================= */

async function populateFilters() {
  try {
    const res = await fetch(`${API_BASE}/vendorBranches?page=0&size=1000`);
    const data = await res.json();

    const rows = data._embedded?.vendorBranches || [];

    const cities = new Set(), states = new Set(), countries = new Set();

    rows.forEach(r => {
      if (r.city) cities.add(r.city);
      if (r.state) states.add(r.state);
      if (r.country) countries.add(r.country);
    });

    fillSelect('cityFilter', [...cities].sort());
    fillSelect('stateFilter', [...states].sort());
    fillSelect('countryFilter', [...countries].sort());

  } catch (e) {
    console.error(e);
  }
}

/* ================= INIT ================= */

async function init() {
  document.getElementById('branchTableBody').innerHTML = `
    <tr><td colspan="8" class="table-loading">
      <div class="loader"></div>Loading…
    </td></tr>`;

  await populateFilters();
  await loadPage(0);
}

document.addEventListener('DOMContentLoaded', init);