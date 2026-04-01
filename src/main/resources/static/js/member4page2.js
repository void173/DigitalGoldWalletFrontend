const urlParams = new URLSearchParams(window.location.search);
const vendorId = urlParams.get('id');
const type = urlParams.get('type');

async function loadData() {
    const statusEl = document.getElementById('status');
    const tbody = document.querySelector('#transactionsTable tbody');
    const titleEl = document.querySelector('h1');
    const headerEl = document.getElementById('tableHeader');

    console.log("Vendor ID:", vendorId);
    console.log("Type:", type);

    if (!vendorId) {
        statusEl.innerHTML = "❌ Vendor ID missing";
        return;
    }

    try {
        //statusEl.textContent = "Loading...";

        // =========================
        // VIRTUAL GOLD
        // =========================
        if (type === "virtual") {

            titleEl.textContent = "Virtual Gold Holdings";

            headerEl.innerHTML = `
                <th>Holding ID</th>
                <th>User</th>
                <th>Quantity (g)</th>
                <th>Created At</th>
                <th>Status</th>
            `;

            const endpoint =
                `http://localhost:8080/virtual_gold_holdings/search/findByVendor?vendorId=${vendorId}&projection=virtualGoldHolding`;

            const response = await fetch(endpoint, {
                headers: { 'Accept': 'application/hal+json' }
            });

            const data = await response.json();

            const holdings = data._embedded?.holdings || [];

            tbody.innerHTML = "";

            if (holdings.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No virtual holdings found</td></tr>`;
                statusEl.textContent = "No data found";
                return;
            }

            holdings.forEach(h => {

                holdings.forEach(h => {

                    const row = document.createElement('tr');

                    row.innerHTML = `
                        <td>${h.holdingId}</td>
                        <td>${h.user?.name || '-'}</td>
                        <td>${h.quantity} g</td>
                        <td>${h.createdAt ? new Date(h.createdAt).toLocaleString() : '-'}</td>
                        <td>${h.holdingStatus || '-'}</td>
                    `;

                    tbody.appendChild(row);
                });
            });
        }

        // =========================
        // PHYSICAL GOLD
        // =========================
        else {

            titleEl.textContent = "Physical Gold Transactions";

            headerEl.innerHTML = `
                <th>Transaction ID</th>
                <th>Quantity (g)</th>
                <th>Date</th>
                <th>User</th>
                <th>Delivery Address</th>
            `;

            const endpoint =
                `http://localhost:8080/physicalgoldtransaction/search/findByVendor?vendorId=${vendorId}&projection=physicalGoldTransaction`;

            const response = await fetch(endpoint, {
                headers: { 'Accept': 'application/hal+json' }
            });

            const data = await response.json();

            const transactions = data._embedded?.physicalGoldTransactionses || [];

            tbody.innerHTML = "";

            if (transactions.length === 0) {
                tbody.innerHTML = `<tr><td colspan="5">No physical transactions found</td></tr>`;
                statusEl.textContent = "No data found";
                return;
            }

            transactions.forEach(t => {

                const transactionId = t._links?.self?.href?.split("/").pop();
                const userName = t._embedded?.user?.name || '-';

                const addr = t._embedded?.deliveryAddress;
                const address = addr
                    ? `${addr.street || ''}, ${addr.city || ''}`
                    : '-';

                const row = document.createElement('tr');

                row.innerHTML = `
                    <td>${transactionId}</td>
                    <td>${t.quantity} g</td>
                    <td>${t.createdAt ? new Date(t.createdAt).toLocaleString() : '-'}</td>
                    <td>${userName}</td>
                    <td>${address}</td>
                `;

                tbody.appendChild(row);
            });
        }

        //statusEl.textContent = "Loaded successfully";
        statusEl.style.color = "green";

    } catch (err) {
        console.error(err);
        statusEl.textContent = "Error loading data";
        statusEl.style.color = "red";
    }
}

document.addEventListener('DOMContentLoaded', loadData);

function goBack() {
    window.location.href = "Member4Page1.html";
}