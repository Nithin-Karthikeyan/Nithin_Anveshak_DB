import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();
const notion = new Client({ auth: process.env.NOTION_API_KEY });

app.use(cors({ origin: process.env.FRONTEND_URL, methods: ["GET", "POST"] }));
app.use(express.json());

if (!process.env.NOTION_API_KEY || !process.env.MEMBERS_DB_ID) {
  console.error("Missing critical Notion environment variables.");
}

// GET /api/members
app.get("/api/members", async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.MEMBERS_DB_ID,
      sorts: [{ property: "Name", direction: "ascending" }],
    });
    
    const members = response.results.map((page) => ({
      id: page.id,
      name: page.properties.Name.title[0]?.text?.content || "Unnamed",
    }));
    res.json(members);
  } catch (error) {
    console.log(notion);
    console.error("Error fetching members:", error);
    //res.status(500).json({ error: "Failed to fetch members" });
    res.status(500).json({ 
    error: error.message, 
    code: error.code, // e.g., "object_not_found" or "validation_error"
    status: error.status 
  });
  }
});

// POST /api/create-bill
app.post("/api/create-bill", async (req, res) => {
  const { image_url, invoice_number, date, total_amount, description, gst } = req.body;

  const properties = {
    "Invoice No.": {
      title: [{ text: { content: invoice_number ? String(invoice_number) : "B-UNKNOWN" } }],
    },
    GST: { checkbox: Boolean(gst) },
  };

  if (image_url) properties["Link"] = { url: image_url };
  if (date) properties["Date"] = { date: { start: date } };
  if (total_amount != null) properties["Total Amount"] = { number: Number(total_amount) };
  if (description) properties["Description"] = { rich_text: [{ text: { content: description } }] };

  try {
    const response = await notion.pages.create({
      parent: { database_id: process.env.NOTION_DB_BILLS_ID },
      properties,
    });
    res.json({ billId: response.id });
  } catch (error) {
    console.error("Notion error:", error.body || error.message);
    res.status(500).json({ error: "Failed to create bill", details: error.body });
  }
});

export default app;