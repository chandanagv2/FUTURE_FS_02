const express = require("express");
const cors = require("cors");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());
// Temporary lead storage
let leads = [];
let nextId = 1;

// Test the server
app.get("/", (req, res) => {
  res.send("LeadFlow CRM backend is running!");
});

// Get all leads
app.get("/api/leads", (req, res) => {
  res.json(leads);
});

// Add a new lead
app.post("/api/leads", (req, res) => {
  const { name, email, source, status, followUp, notes } = req.body;

  if (!name || !email) {
    return res.status(400).json({
      message: "Name and email are required."
    });
  }

  const lead = {
    id: nextId++,
    name,
    email,
    source: source || "Website",
    status: status || "New",
    followUp: followUp || "",
    notes: notes || ""
  };

  leads.push(lead);
  res.status(201).json(lead);
});

// Update a lead
app.put("/api/leads/:id", (req, res) => {
  const id = Number(req.params.id);
  const index = leads.findIndex(lead => lead.id === id);

  if (index === -1) {
    return res.status(404).json({
      message: "Lead not found."
    });
  }

  leads[index] = {
    ...leads[index],
    ...req.body,
    id
  };

  res.json(leads[index]);
});

// Delete a lead
app.delete("/api/leads/:id", (req, res) => {
  const id = Number(req.params.id);
  const exists = leads.some(lead => lead.id === id);

  if (!exists) {
    return res.status(404).json({
      message: "Lead not found."
    });
  }

  leads = leads.filter(lead => lead.id !== id);
  res.json({ message: "Lead deleted successfully." });
});

app.listen(PORT, () => {
  console.log(`LeadFlow CRM server running at http://localhost:${PORT}`);
});