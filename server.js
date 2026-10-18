require("dotenv").config();

const express = require("express");
const cors = require("cors");
const { MongoClient, ObjectId } = require("mongodb");

const app = express();
const PORT = 3000;

app.use(cors());
app.use(express.json());

const client = new MongoClient(process.env.MONGODB_URI);

let leadsCollection;

async function startServer() {
  try {
    await client.connect();

    const database = client.db("leadflowCRM");
    leadsCollection = database.collection("leads");

    console.log("Connected to MongoDB Atlas!");

    app.get("/", (req, res) => {
      res.send("LeadFlow CRM backend is running!");
    });

    app.get("/api/leads", async (req, res) => {
      try {
        const leads = await leadsCollection.find({}).toArray();
        res.json(
          leads.map(({ _id, ...lead }) => ({
            ...lead,
            id: _id.toString()
          }))
        );
      } catch (error) {
        res.status(500).json({ message: "Could not load leads." });
      }
    });

    app.post("/api/leads", async (req, res) => {
      try {
        const { name, email, source, status, followUp, notes } = req.body;

        if (!name || !email) {
          return res.status(400).json({
            message: "Name and email are required."
          });
        }

        const lead = {
          name,
          email,
          source: source || "Website",
          status: status || "New",
          followUp: followUp || "",
          notes: notes || ""
        };

        const result = await leadsCollection.insertOne(lead);

        res.status(201).json({
          ...lead,
          id: result.insertedId.toString()
        });
      } catch (error) {
        res.status(500).json({ message: "Could not add lead." });
      }
    });

    app.put("/api/leads/:id", async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: "Invalid lead ID." });
        }

        const { id, _id, ...updates } = req.body;

        const result = await leadsCollection.findOneAndUpdate(
          { _id: new ObjectId(req.params.id) },
          { $set: updates },
          { returnDocument: "after" }
        );

        if (!result) {
          return res.status(404).json({ message: "Lead not found." });
        }

        const lead = result;
        res.json({ ...lead, id: lead._id.toString(), _id: undefined });
      } catch (error) {
        res.status(500).json({ message: "Could not update lead." });
      }
    });

    app.delete("/api/leads/:id", async (req, res) => {
      try {
        if (!ObjectId.isValid(req.params.id)) {
          return res.status(400).json({ message: "Invalid lead ID." });
        }

        const result = await leadsCollection.deleteOne({
          _id: new ObjectId(req.params.id)
        });

        if (result.deletedCount === 0) {
          return res.status(404).json({ message: "Lead not found." });
        }

        res.json({ message: "Lead deleted successfully." });
      } catch (error) {
        res.status(500).json({ message: "Could not delete lead." });
      }
    });

    app.listen(PORT, () => {
      console.log(`LeadFlow CRM server running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Could not connect to MongoDB:", error.message);
    process.exit(1);
  }
}

startServer();