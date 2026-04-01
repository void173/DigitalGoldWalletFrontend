let currentPage = 0;
let totalPages = 0;
const pageSize = 20;
const BASE_URL = "http://localhost:8080";

function loadVendors() {

    let table = document.querySelector("#vendorTable tbody");
    table.innerHTML = "<tr><td colspan='9'>Loading...</td></tr>";

    fetch(`${BASE_URL}/vendors?page=${currentPage}&size=${pageSize}&projection=vendorDetails`)
        .then(res => {
            if (!res.ok) {
                throw new Error("Failed to fetch vendors");
            }
            return res.json();
        })
        .then(data => {

            let vendors = data._embedded?.vendors || [];
            table.innerHTML = "";

            vendors.forEach(v => {

                let id = getId(v._links.self.href);

                let row = `
                    <tr>
                        <td>${v.vendorName || ""}</td>
                        <td>${v.contactPersonName || ""}</td>
                        <td>${v.contactEmail || ""}</td>
                        <td>${v.contactPhone || ""}</td>
                        <td>${v.totalGoldQuantity || ""}</td>
                        <td>${v.currentGoldPrice || ""}</td>
                        <td>${v.websiteUrl || ""}</td>
                        <td>${v.description || ""}</td>

                        <td>
                            <button onclick="viewBranches(${id})">View Branches</button>
                            <button onclick="editVendor(${id})">Update</button>
                        </td>
                    </tr>
                `;

                table.innerHTML += row;
            });

            if (vendors.length === 0) {
                table.innerHTML = "<tr><td colspan='7'>No vendors found</td></tr>";
            }

            totalPages = data.page.totalPages;
            renderPagination();

        })
        .catch(err => {
            table.innerHTML = "<tr><td colspan='9>Error loading data</td></tr>";
            console.error(err);
        });
}

function renderPagination() {

    let container = document.getElementById("pagination");
    container.innerHTML = "";

    // LEFT ARROW
    let prevBtn = document.createElement("button");
    prevBtn.innerHTML = "&larr;";
    prevBtn.disabled = currentPage === 0;
    prevBtn.onclick = () => {
        currentPage--;
        loadVendors();
    };
    container.appendChild(prevBtn);

    // PAGE NUMBERS
    for (let i = 0; i < totalPages; i++) {

        let btn = document.createElement("button");
        btn.innerText = i + 1;

        if (i === currentPage) {
            btn.style.fontWeight = "bold";
        }

        btn.onclick = () => {
            currentPage = i;
            loadVendors();
        };

        container.appendChild(btn);
    }

    // RIGHT ARROW
    let nextBtn = document.createElement("button");
    nextBtn.innerHTML = "&rarr;";
    nextBtn.disabled = currentPage === totalPages - 1;
    nextBtn.onclick = () => {
        currentPage++;
        loadVendors();
    };
    container.appendChild(nextBtn);
}

function viewBranches(vendorId) {
    window.location.href = "/templates/Member2Page2.html?vendorId=" + vendorId;
}
function addVendor() {
    window.location.href = "/templates/Member2Page1.1.html";
}
function editVendor(vendorId) {
    window.location.href = "/templates/Member2Page1.2.html?vendorId=" + vendorId;
}
function getId(url) {
    return url.split("/").pop();
}