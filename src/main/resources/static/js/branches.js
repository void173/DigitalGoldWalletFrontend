const BASE_URL = "http://localhost:8080";

let allBranches = [];
let vendorId;

function init() {
    vendorId = new URLSearchParams(window.location.search).get("vendorId");

    if (!vendorId) {
        alert("Vendor ID missing");
        return;
    }

    loadVendor();
    loadBranches();
}

function loadVendor() {
    fetch(`${BASE_URL}/vendors/${vendorId}?projection=vendorDetails`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load vendor");
            return res.json();
        })
        .then(v => {

            document.getElementById("vendorName").innerText = v.vendorName || "-";
            document.getElementById("goldPrice").innerText = v.currentGoldPrice || "-";
            document.getElementById("totalQty").innerText = v.totalGoldQuantity || "-";

            document.getElementById("pageSubtitle").innerText =
                `Overview of ${v.vendorName}'s active branches`;

        })
        .catch(err => console.error(err));
}
function loadBranches() {

    let table = document.querySelector("#branchTable tbody");
    table.innerHTML = "<tr><td colspan='6'>Loading...</td></tr>";

    fetch(`${BASE_URL}/vendorBranches/search/findByVendorsVendorId?vendorId=${vendorId}&projection=branchDetails`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to load branches");
            return res.json();
        })
        .then(data => {

            allBranches = data._embedded?.vendorBranches || [];

            populateFilters();
            renderTable(allBranches);
        })
        .catch(err => {
            table.innerHTML = "<tr><td colspan='6'>Error loading branches</td></tr>";
            console.error(err);
        });
}

function populateFilters() {

    let cities = new Set();
    let states = new Set();
    let countries = new Set();

    allBranches.forEach(b => {
        if (b.address) {
            cities.add(b.address.city);
            states.add(b.address.state);
            countries.add(b.address.country);
        }
    });

    fillDropdown("city", cities);
    fillDropdown("state", states);
    fillDropdown("country", countries);
}

function fillDropdown(id, values) {
    let select = document.getElementById(id);
    select.innerHTML = `<option value="">All</option>`;

    values.forEach(v => {
        if (v) {
            select.innerHTML += `<option value="${v}">${v}</option>`;
        }
    });
}

function applyFilters() {

    let city = document.getElementById("city").value;
    let state = document.getElementById("state").value;
    let country = document.getElementById("country").value;

    let filtered = allBranches.filter(b => {

        let match = true;

        if (city) match = match && b.address.city === city;
        if (state) match = match && b.address.state === state;
        if (country) match = match && b.address.country === country;

        return match;
    });

    renderTable(filtered);
}

function resetFilters() {
    document.getElementById("city").value = "";
    document.getElementById("state").value = "";
    document.getElementById("country").value = "";

    renderTable(allBranches);
}

function renderTable(branches) {

    let table = document.querySelector("#branchTable tbody");
    table.innerHTML = "";

    if (branches.length === 0) {
        table.innerHTML = "<tr><td colspan='6'>No branches found</td></tr>";
        return;
    }

    branches.forEach(b => {

        table.innerHTML += `
            <tr>
                <td>${b.address?.street || ""}</td>
                <td>${b.address?.city || ""}</td>
                <td>${b.address?.state || ""}</td>
                <td>${b.address?.country || ""}</td>
                <td>${b.address?.postalCode || ""}</td>
                <td>${b.quantity || ""}</td>
            </tr>
        `;
    });
}