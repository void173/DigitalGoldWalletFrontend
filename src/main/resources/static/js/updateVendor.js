const BASE_URL = "http://localhost:8080";

let vendorId;

function init() {
    vendorId = new URLSearchParams(window.location.search).get("vendorId");

    if (!vendorId) {
        alert("Vendor ID missing");
        return;
    }

    loadVendor();
}

function loadVendor() {

    fetch(`${BASE_URL}/vendors/${vendorId}?projection=vendorDetails`)
        .then(res => {
            if (!res.ok) throw new Error("Failed to fetch vendor");
            return res.json();
        })
        .then(v => {

            document.getElementById("vendorName").value = v.vendorName || "";
            document.getElementById("description").value = v.description || "";
            document.getElementById("totalGoldQuantity").value = v.totalGoldQuantity || "";
            document.getElementById("currentGoldPrice").value = v.currentGoldPrice || "";
            document.getElementById("contactPersonName").value = v.contactPersonName || "";
            document.getElementById("contactEmail").value = v.contactEmail || "";
            document.getElementById("contactPhone").value = v.contactPhone || "";
            document.getElementById("websiteUrl").value = v.websiteUrl || "";
        })
        .catch(err => console.error(err));
}

function updateVendor() {

    const vendor = {
        vendorName: document.getElementById("vendorName").value,
        description: document.getElementById("description").value,
        totalGoldQuantity: document.getElementById("totalGoldQuantity").value,
        currentGoldPrice: document.getElementById("currentGoldPrice").value,
        contactPersonName: document.getElementById("contactPersonName").value,
        contactEmail: document.getElementById("contactEmail").value,
        contactPhone: document.getElementById("contactPhone").value,
        websiteUrl: document.getElementById("websiteUrl").value
    };

    fetch(`${BASE_URL}/vendors/${vendorId}`, {
        method: "PUT",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vendor)
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to update vendor");
    })
    .then(() => {
        alert("Vendor updated successfully!");
        window.location.href = "/templates/Member2Page1.html";
    })
    .catch(err => {
        console.error(err);
        alert("Error updating vendor");
    });
}