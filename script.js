const API_URL = "http://localhost:3000/api/leads";

const form = document.getElementById("leadForm");
const dialog = document.getElementById("leadDialog");
const table = document.getElementById("leadsTable");
const searchInput = document.getElementById("searchInput");

let leads = [];
let editingId = null;
let currentStatusFilter = "All";

// Communicate with the backend
async function apiRequest(url = API_URL, options = {}) {
  const response = await fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...options.headers
    }
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || "Something went wrong.");
  }

  return response.json();
}

// Load leads from MongoDB through the backend
async function loadLeads() {
  try {
    leads = await apiRequest();
    updateDashboard();
    renderLeads();
  } catch (error) {
    console.error(error);
    alert(
      "Could not connect to the backend. Make sure your server is running."
    );
  }
}

// Update dashboard numbers and conversion rate
function updateDashboard() {
  const total = leads.length;

  const newCount = leads.filter(
    lead => lead.status === "New"
  ).length;

  const contactedCount = leads.filter(
    lead => lead.status === "Contacted"
  ).length;

  const convertedCount = leads.filter(
    lead => lead.status === "Converted"
  ).length;

  document.getElementById("totalLeads").textContent = total;
  document.getElementById("newLeads").textContent = newCount;
  document.getElementById("contactedLeads").textContent = contactedCount;
  document.getElementById("convertedLeads").textContent = convertedCount;

  // Conversion Rate = Converted Leads / Total Leads × 100
  const conversionRate = total === 0
    ? 0
    : (convertedCount / total) * 100;

  const rateElement = document.getElementById("conversionRate");

  if (rateElement) {
    rateElement.textContent = conversionRate.toFixed(1) + "%";
  }
}

// Filter leads by status
window.filterLeads = function(status) {
  currentStatusFilter = status;
  renderLeads();

  const heading = document.getElementById("leadsHeading");
  const description = document.getElementById("filterDescription");

  if (heading) {
    heading.textContent =
      status === "All" ? "Client Leads" : status + " Leads";
  }

  if (description) {
    description.textContent =
      status === "All"
        ? "View and manage your potential customers."
        : "Showing leads with status: " + status;
  }
};

// Make dashboard cards clickable
function setupDashboardFilters() {
  const cards = [
    { id: "totalLeads", status: "All" },
    { id: "newLeads", status: "New" },
    { id: "contactedLeads", status: "Contacted" },
    { id: "convertedLeads", status: "Converted" }
  ];

  cards.forEach(({ id, status }) => {
    const countElement = document.getElementById(id);
    if (!countElement) return;

    const card = countElement.closest(
      ".stat-card, .dashboard-card, .stat-box, .summary-card, .card"
    ) || countElement.parentElement;

    if (!card || card.dataset.filterReady === "true") return;

    card.dataset.filterReady = "true";
    card.style.cursor = "pointer";
    card.title = `Click to show ${
      status === "All" ? "all leads" : status + " leads"
    }`;

    card.addEventListener("click", event => {
      if (event.target.closest("button, a, input, select")) return;
      filterLeads(status);
    });
  });
}

// Display leads with search and status filtering
function renderLeads() {
  const query = searchInput.value.toLowerCase();

  const filtered = leads.filter(lead => {
    const matchesSearch =
      `${lead.name} ${lead.email} ${lead.source}`
        .toLowerCase()
        .includes(query);

    const matchesStatus =
      currentStatusFilter === "All" ||
      lead.status === currentStatusFilter;

    return matchesSearch && matchesStatus;
  });

  table.replaceChildren();

  const emptyMessage = document.getElementById("emptyMessage");

  if (emptyMessage) {
    emptyMessage.hidden = filtered.length > 0;
  }

  filtered.forEach(lead => {
    const tr = document.createElement("tr");

    function cell(value) {
      const td = document.createElement("td");
      td.textContent = value || "—";
      return td;
    }

    tr.appendChild(cell(lead.name));
    tr.appendChild(cell(lead.email));
    tr.appendChild(cell(lead.source));

    // Status dropdown
    const statusCell = document.createElement("td");
    const select = document.createElement("select");

    ["New", "Contacted", "Converted"].forEach(status => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      option.selected = lead.status === status;
      select.appendChild(option);
    });

    select.addEventListener("change", async () => {
      const previousStatus = lead.status;

      try {
        await apiRequest(`${API_URL}/${lead.id}`, {
          method: "PUT",
          body: JSON.stringify({ status: select.value })
        });

        await loadLeads();
      } catch (error) {
        alert(error.message);
        select.value = previousStatus;
      }
    });

    statusCell.appendChild(select);
    tr.appendChild(statusCell);
    tr.appendChild(cell(lead.followUp));

    // Notes, Edit, and Delete buttons
    const actions = document.createElement("td");

    const notesBtn = document.createElement("button");
    notesBtn.textContent = "Notes";
    notesBtn.className = "action-btn";

    notesBtn.addEventListener("click", () => {
      alert(lead.notes || "No notes added yet.");
    });

    const editBtn = document.createElement("button");
    editBtn.textContent = "Edit";
    editBtn.className = "action-btn";

    editBtn.addEventListener("click", () => {
      openEdit(lead.id);
    });

    const deleteBtn = document.createElement("button");
    deleteBtn.textContent = "Delete";
    deleteBtn.className = "action-btn delete-btn";

    deleteBtn.addEventListener("click", async () => {
      if (!confirm(`Delete ${lead.name}?`)) return;

      try {
        await apiRequest(`${API_URL}/${lead.id}`, {
          method: "DELETE"
        });

        await loadLeads();
      } catch (error) {
        alert(error.message);
      }
    });

    actions.append(notesBtn, editBtn, deleteBtn);
    tr.appendChild(actions);
    table.appendChild(tr);
  });
}

// Edit an existing lead
function openEdit(id) {
  const lead = leads.find(lead => lead.id === id);
  if (!lead) return;

  editingId = id;

  form.elements.name.value = lead.name;
  form.elements.email.value = lead.email;
  form.elements.source.value = lead.source;
  form.elements.status.value = lead.status;
  form.elements.followUp.value = lead.followUp || "";
  form.elements.notes.value = lead.notes || "";

  document.getElementById("formTitle").textContent = "Edit Lead";
  dialog.showModal();
}

// Open the Add Lead dialog
document.getElementById("addLeadBtn").addEventListener("click", () => {
  editingId = null;
  form.reset();
  document.getElementById("formTitle").textContent = "Add New Lead";
  dialog.showModal();
});

// Cancel adding or editing
document.getElementById("cancelBtn").addEventListener("click", () => {
  dialog.close();
});

// Save a new lead or edited lead
form.addEventListener("submit", async event => {
  event.preventDefault();

  const lead = {
    name: form.elements.name.value.trim(),
    email: form.elements.email.value.trim(),
    source: form.elements.source.value,
    status: form.elements.status.value,
    followUp: form.elements.followUp.value,
    notes: form.elements.notes.value.trim()
  };

  try {
    if (editingId !== null) {
      await apiRequest(`${API_URL}/${editingId}`, {
        method: "PUT",
        body: JSON.stringify(lead)
      });
    } else {
      await apiRequest(API_URL, {
        method: "POST",
        body: JSON.stringify(lead)
      });
    }

    dialog.close();
    form.reset();
    editingId = null;

    await loadLeads();
  } catch (error) {
    alert(error.message);
  }
});

// Search leads
searchInput.addEventListener("input", renderLeads);

// Set up clickable dashboard filters
setupDashboardFilters();

// Start the CRM
loadLeads();