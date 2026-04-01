const BACKEND_URL = "http://localhost:8080/vendors?projection=vendorDetails";
let currentVendorId = null;

// ====================== LOAD VENDORS ======================
async function loadVendors() {
    const statusEl = document.getElementById('status');
    const tbody = document.querySelector('#vendorsTable tbody');

    try {
        const response = await fetch(BACKEND_URL, {
            headers: { 'Accept': 'application/hal+json' }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const data = await response.json();
        const vendors = data._embedded?.vendors || [];

        tbody.innerHTML = '';

        if (vendors.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;color:#888;">No vendors found</td></tr>`;
            statusEl.textContent = "No vendors found";
            return;
        }

        vendors.forEach((vendor, index) => {
            let vendorId = vendor.vendorId || vendor.id || '';

            if (!vendorId && vendor._links && vendor._links.self && vendor._links.self.href) {
                const selfHref = vendor._links.self.href;
                const match = selfHref.match(/\/vendors\/(\d+)$/);
                if (match) vendorId = match[1];
            }

            console.log(`Vendor ${index + 1} → Extracted ID: "${vendorId}"`, vendor);

            const row = document.createElement('tr');

            row.innerHTML = `
                <td>${vendor.vendorName || '-'}</td>
                <td>${vendor.description || '-'}</td>
                <td>${vendor.contactPersonName || '-'}</td>
                <td>${vendor.contactEmail || '-'}</td>
                <td>${vendor.contactPhone || '-'}</td>
                <td>${vendor.totalGoldQuantity ? Number(vendor.totalGoldQuantity).toLocaleString() : '-'}</td>
                <td>₹${vendor.currentGoldPrice ? Number(vendor.currentGoldPrice).toLocaleString() : '-'}</td>
                <td>
                    <button class="action-btn physical-btn" data-id="${vendorId}" data-type="physical">
                        Show Physical Gold Trans
                    </button>
                    <button class="action-btn virtual-btn" data-id="${vendorId}" data-type="virtual">
                        Show Virtual Gold Holding
                    </button>
                </td>
                <td>
                    <button class="action-btn create-branch-btn" data-id="${vendorId}">
                        + Create Branch
                    </button>
                    <button class="action-btn update-price-btn" data-id="${vendorId}">
                        Update Price
                    </button>
                </td>
            `;

            // Button Click Handler
            row.querySelectorAll('.action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;

                    if (btn.classList.contains('create-branch-btn')) {
                        currentVendorId = id;
                        showCreateBranchModal();
                    }
                    else if (btn.classList.contains('update-price-btn')) {
                        currentVendorId = id;
                        showUpdatePriceModal();
                    }
                    else if (btn.dataset.type === "physical" || btn.dataset.type === "virtual") {
                        if (id && id !== "") {
                            window.location.href = `Member4Page2.html?id=${id}&type=${btn.dataset.type}`;
                        }
                    }
                });
            });

            tbody.appendChild(row);
        });

    } catch (error) {
        console.error(error);
        const statusEl = document.getElementById('status');
        statusEl.innerHTML = `Error loading vendors.<br>Make sure backend is running.`;
        statusEl.style.color = 'red';
    }
}

// ====================== PERFORM CREATE BRANCH (with quantity update) ======================
async function performCreateBranch(vendorId, branchName, quantity, street, city, state) {
    try {
        // Step 1: Create Address
        const addressPayload = {
            street: street.trim(),
            city: city.trim(),
            state: state.trim(),
            country: "India",
            postalCode: "411001"
        };

        const addressResponse = await fetch('http://localhost:8080/addresses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/hal+json' },
            body: JSON.stringify(addressPayload)
        });

        if (!addressResponse.ok) throw new Error("Failed to create address");

        const addressData = await addressResponse.json();
        let addressId = addressData.addressId || addressData.id;
        if (!addressId && addressData._links?.self?.href) {
            const match = addressData._links.self.href.match(/\/addresses\/(\d+)$/);
            if (match) addressId = match[1];
        }
        if (!addressId) throw new Error("Could not extract address ID");

        const addressUri = `http://localhost:8080/addresses/${addressId}`;

        // Step 2: Create Branch
        const now = new Date().toISOString().slice(0, 19);
        const branchPayload = {
            quantity: quantity,
            vendors: `http://localhost:8080/vendors/${vendorId}`,
            address: addressUri,
            createdAt: now
        };

        const branchResponse = await fetch('http://localhost:8080/vendorBranches', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Accept': 'application/hal+json' },
            body: JSON.stringify(branchPayload)
        });

        if (!branchResponse.ok) throw new Error("Failed to create branch");

        // Step 3: Update Vendor Total Gold Quantity
        const updatePayload = {
            quantity: quantity,
            vendors: { vendorId: parseInt(vendorId) }
        };

        const updateResponse = await fetch('http://localhost:8080/branches/updateQuantity', {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatePayload)
        });

        if (updateResponse.ok) {
            alert(`✅ Branch "${branchName}" created successfully!\n${quantity}g added to vendor total.`);
        } else {
            alert(`✅ Branch created, but failed to update vendor total quantity.`);
        }

        location.reload();

    } catch (error) {
        console.error(error);
        alert("❌ Error creating branch: " + error.message);
    }
}

// ====================== UPDATE GOLD PRICE ======================
async function updateGoldPrice(vendorId, newPrice) {
    try {
        const response = await fetch(`http://localhost:8080/vendors/${vendorId}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ currentGoldPrice: newPrice })
        });

        if (response.ok) {
            alert(`✅ Current Gold Price updated to ₹${newPrice.toLocaleString()} successfully!`);
            location.reload();
        } else {
            alert("❌ Failed to update price.");
        }
    } catch (err) {
        console.error(err);
        alert("❌ Error connecting to backend.");
    }
}

// ====================== MODAL FUNCTIONS ======================
function showCreateBranchModal() {
    document.getElementById('createBranchModal').style.display = 'flex';
}

function closeCreateModal() {
    document.getElementById('createBranchModal').style.display = 'none';
}

function showUpdatePriceModal() {
    document.getElementById('updatePriceModal').style.display = 'flex';
}

function closePriceModal() {
    document.getElementById('updatePriceModal').style.display = 'none';
}

// ====================== SUBMIT HANDLERS ======================
async function submitCreateBranch() {
    const branchName = document.getElementById('branchName').value.trim();
    const quantity = parseFloat(document.getElementById('branchQuantity').value);
    const street = document.getElementById('branchStreet').value.trim();
    const city = document.getElementById('branchCity').value.trim();
    const state = document.getElementById('branchState').value.trim();

    if (!branchName || isNaN(quantity) || quantity <= 0 || !street || !city || !state) {
        alert("Please fill all fields correctly.");
        return;
    }

    closeCreateModal();
    await performCreateBranch(currentVendorId, branchName, quantity, street, city, state);
}

async function submitUpdatePrice() {
    const newPrice = parseFloat(document.getElementById('newGoldPrice').value);

    if (isNaN(newPrice) || newPrice <= 0) {
        alert("Please enter a valid price greater than 0.");
        return;
    }

    closePriceModal();
    await updateGoldPrice(currentVendorId, newPrice);
}
// ====================== SEARCH FUNCTIONALITY (Added - No old code changed) ======================

let allVendorsData = [];   // Store vendors globally

// Store vendors after loading
const originalLoadVendors = loadVendors;   // Keep reference to your old function

loadVendors = async function() {
    await originalLoadVendors();   // Call your original function

    // After your original loadVendors finishes, store the data
    const data = await (await fetch(BACKEND_URL, {
        headers: { 'Accept': 'application/hal+json' }
    })).json();

    allVendorsData = data._embedded?.vendors || [];
};

// Real-time Search
document.addEventListener('DOMContentLoaded', function() {
    // Your original DOMContentLoaded will still run

    const searchInput = document.getElementById('searchInput');

    searchInput.addEventListener('input', function() {
        const searchTerm = this.value.toLowerCase().trim();
        const tbody = document.querySelector('#vendorsTable tbody');

        if (!searchTerm) {
            // If search is empty, reload original table
            loadVendors();
            return;
        }

        // Filter vendors by name
        const filtered = allVendorsData.filter(vendor =>
            vendor.vendorName && vendor.vendorName.toLowerCase().includes(searchTerm)
        );

        // Re-render only filtered rows (without touching your old row creation logic)
        tbody.innerHTML = '';

        if (filtered.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#888;">No vendors found matching "${searchTerm}"</td></tr>`;
            return;
        }

        filtered.forEach((vendor) => {
            let vendorId = vendor.vendorId || vendor.id || '';

            if (!vendorId && vendor._links && vendor._links.self && vendor._links.self.href) {
                const match = vendor._links.self.href.match(/\/vendors\/(\d+)$/);
                if (match) vendorId = match[1];
            }

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${vendor.vendorName || '-'}</td>
                <td>${vendor.description || '-'}</td>
                <td>${vendor.contactPersonName || '-'}</td>
                <td>${vendor.contactEmail || '-'}</td>
                <td>${vendor.contactPhone || '-'}</td>
                <td>${vendor.totalGoldQuantity ? Number(vendor.totalGoldQuantity).toLocaleString() : '-'}</td>
                <td>₹${vendor.currentGoldPrice ? Number(vendor.currentGoldPrice).toLocaleString() : '-'}</td>
                <td>
                    <button class="action-btn physical-btn" data-id="${vendorId}" data-type="physical">
                        Show Physical Gold Trans
                    </button>
                    <button class="action-btn virtual-btn" data-id="${vendorId}" data-type="virtual">
                        Show Virtual Gold Holding
                    </button>
                </td>
                <td>
                    <button class="action-btn create-branch-btn" data-id="${vendorId}">
                        + Create Branch
                    </button>
                    <button class="action-btn update-price-btn" data-id="${vendorId}">
                        Update Price
                    </button>
                </td>
            `;

            // Re-attach button listeners (same as your original)
            row.querySelectorAll('.action-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    e.stopPropagation();
                    const id = btn.dataset.id;

                    if (btn.classList.contains('create-branch-btn')) {
                        currentVendorId = id;
                        showCreateBranchModal();
                    }
                    else if (btn.classList.contains('update-price-btn')) {
                        currentVendorId = id;
                        showUpdatePriceModal();
                    }
                    else if (btn.dataset.type === "physical" || btn.dataset.type === "virtual") {
                        if (id && id !== "") {
                            window.location.href = `Member4Page2.html?id=${id}&type=${btn.dataset.type}`;
                        }
                    }
                });
            });

            tbody.appendChild(row);
        });
    });
});
// ====================== FILTER FUNCTIONALITY ======================
let currentFilters = {};

function showFilterModal() {
    document.getElementById('filterModal').style.display = 'flex';
}

function closeFilterModal() {
    document.getElementById('filterModal').style.display = 'none';
}

function clearFilters() {
    document.getElementById('minPrice').value = '';
    document.getElementById('maxPrice').value = '';
    document.getElementById('minQty').value = '';
    document.getElementById('maxQty').value = '';
    currentFilters = {};
    loadVendors();           // Reset to original list
    closeFilterModal();
}

async function applyFilters() {
    const minPrice = document.getElementById('minPrice').value ? parseFloat(document.getElementById('minPrice').value) : null;
    const maxPrice = document.getElementById('maxPrice').value ? parseFloat(document.getElementById('maxPrice').value) : null;
    const minQty = document.getElementById('minQty').value ? parseFloat(document.getElementById('minQty').value) : null;
    const maxQty = document.getElementById('maxQty').value ? parseFloat(document.getElementById('maxQty').value) : null;

    closeFilterModal();

    let url = BACKEND_URL;

    // Build query based on your APIs
    if (minPrice !== null && maxPrice !== null) {
        url = `http://localhost:8080/vendors/search/findByCurrentGoldPriceBetween?minPrice=${minPrice}&maxPrice=${maxPrice}`;
    }
    else if (minPrice !== null) {
        url = `http://localhost:8080/vendors/search/findByCurrentGoldPriceGreaterThanEqual?minPrice=${minPrice}`;
    }
    else if (maxPrice !== null) {
        url = `http://localhost:8080/vendors/search/findByCurrentGoldPriceLessThanEqual?maxPrice=${maxPrice}`;
    }
    else if (minQty !== null && maxQty !== null) {
        url = `http://localhost:8080/vendors/search/findByTotalGoldQuantityBetween?minQty=${minQty}&maxQty=${maxQty}`;
    }

    try {
        const response = await fetch(url, {
            headers: { 'Accept': 'application/hal+json' }
        });

        if (!response.ok) throw new Error("Filter failed");

        const data = await response.json();
        const filteredVendors = data._embedded?.vendors || [];

        // Render filtered vendors using your existing row logic
        renderFilteredVendors(filteredVendors);

    } catch (error) {
        console.error(error);
        alert("Failed to apply filters");
    }
}

// Simple render function for filtered results
function renderFilteredVendors(vendors) {
    const tbody = document.querySelector('#vendorsTable tbody');
    tbody.innerHTML = '';

    if (vendors.length === 0) {
        tbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:#888;">No vendors match the selected filters</td></tr>`;
        return;
    }

    vendors.forEach(vendor => {
        let vendorId = vendor.vendorId || vendor.id || '';
        if (!vendorId && vendor._links?.self?.href) {
            const match = vendor._links.self.href.match(/\/vendors\/(\d+)$/);
            if (match) vendorId = match[1];
        }

        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${vendor.vendorName || '-'}</td>
            <td>${vendor.description || '-'}</td>
            <td>${vendor.contactPersonName || '-'}</td>
            <td>${vendor.contactEmail || '-'}</td>
            <td>${vendor.contactPhone || '-'}</td>
            <td>${vendor.totalGoldQuantity ? Number(vendor.totalGoldQuantity).toLocaleString() : '-'}</td>
            <td>₹${vendor.currentGoldPrice ? Number(vendor.currentGoldPrice).toLocaleString() : '-'}</td>
            <td>
                <button class="action-btn physical-btn" data-id="${vendorId}" data-type="physical">Show Physical Gold Trans</button>
                <button class="action-btn virtual-btn" data-id="${vendorId}" data-type="virtual">Show Virtual Gold Holding</button>
            </td>
            <td>
                <button class="action-btn create-branch-btn" data-id="${vendorId}">+ Create Branch</button>
                <button class="action-btn update-price-btn" data-id="${vendorId}">Update Price</button>
            </td>
        `;

        // Re-attach click listeners (same as your original)
        row.querySelectorAll('.action-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const id = btn.dataset.id;

                if (btn.classList.contains('create-branch-btn')) {
                    currentVendorId = id;
                    showCreateBranchModal();
                } else if (btn.classList.contains('update-price-btn')) {
                    currentVendorId = id;
                    showUpdatePriceModal();
                } else if (btn.dataset.type) {
                    window.location.href = `Member4Page2.html?id=${id}&type=${btn.dataset.type}`;
                }
            });
        });

        tbody.appendChild(row);
    });
}

// Open Filter Modal when button clicked
document.addEventListener('DOMContentLoaded', () => {
    const filterBtn = document.getElementById('filterBtn');
    if (filterBtn) {
        filterBtn.addEventListener('click', showFilterModal);
    }
});
// Initialize
document.addEventListener('DOMContentLoaded', loadVendors);

