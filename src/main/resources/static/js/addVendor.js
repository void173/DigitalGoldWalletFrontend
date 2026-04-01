const BASE_URL = "http://localhost:8080";

function validateForm() {

    let isValid = true;

    const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    const phonePattern = /^[0-9]{10}$/;

    let fields = [
        "vendorName",
        "totalGoldQuantity",
        "currentGoldPrice",
        "contactPersonName",
        "contactEmail",
        "contactPhone"
    ];

    // remove old errors
    fields.forEach(id => {
        document.getElementById(id).classList.remove("error");
    });

    // required fields
    fields.forEach(id => {
        let value = document.getElementById(id).value.trim();
        if (!value) {
            document.getElementById(id).classList.add("error");
            isValid = false;
        }
    });

    // email validation
    let email = document.getElementById("contactEmail").value;
    if (!emailPattern.test(email)) {
        document.getElementById("contactEmail").classList.add("error");
        alert("Invalid email format");
        isValid = false;
    }

    // phone validation
    let phone = document.getElementById("contactPhone").value;
    if (!phonePattern.test(phone)) {
        document.getElementById("contactPhone").classList.add("error");
        alert("Phone must be 10 digits");
        isValid = false;
    }

    return isValid;
}

function saveVendor() {

    if (!validateForm()) return;
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

    fetch(BASE_URL + "/vendors", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vendor)
    })
    .then(res => {
        if (!res.ok) throw new Error("Failed to save vendor");
        return res.json();
    })
    .then(() => {
        alert("Vendor added successfully!");
        window.location.href = "/templates/Member2Page1.1.html";
    })
    .catch(err => {
        console.error(err);
        alert("Error saving vendor");
    });
}