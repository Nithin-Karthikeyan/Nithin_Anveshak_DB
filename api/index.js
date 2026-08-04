import dotenv from "dotenv";
import express from "express";
import cors from "cors";
import { Client } from "@notionhq/client";

dotenv.config();

const app = express();
const notion = new Client({ auth: process.env.NOTION_API_KEY });

const allowedOrigins = [
  "https://anveshak-db.vercel.app",
  ...(process.env.FRONTEND_URL ? [process.env.FRONTEND_URL] : []),
];
app.use(
  cors({
    origin: (origin, callback) => {
      if (
        !origin ||
        allowedOrigins.includes(origin) ||
        origin.startsWith("http://localhost")
      ) {
        callback(null, true);
      } else {
        callback(new Error("Not allowed by CORS"));
      }
    },
    methods: ["GET", "POST"],
  })
);
app.use(express.json());

if (!process.env.NOTION_API_KEY || !process.env.MEMBERS_DB_ID) {
  console.error("Missing critical Notion environment variables.");
}

// GET /api/members
app.get("/api/members", async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.MEMBERS_DB_ID,
      //sorts: [{ property: "Name", direction: "ascending" }],
    });

    // console.log("Properties:", Object.keys(response.results[0]?.properties || {}));
    // res.json(response.results[0]?.properties);

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

// POST /api/add-contributors
app.post('/api/add-contributors', async (req, res) => {
  const { invoice_number, contributors } = req.body;

  if (!invoice_number || !Array.isArray(contributors) || contributors.length === 0) {
    return res.status(400).json({ error: 'invoice_number and contributors[] are required' });
  }

  try {
    // 1. Find the bill page by Invoice No.
    const billsQuery = await notion.databases.query({
      database_id: process.env.NOTION_DB_BILLS_ID,
      filter: {
        property: 'Invoice No.',
        title: { equals: invoice_number },
      },
    });

    if (billsQuery.results.length === 0) {
      return res.status(404).json({ error: `No bill found with Invoice No. "${invoice_number}"` });
    }

    const billPageId = billsQuery.results[0].id;

    // 2. For each contributor: resolve member → create Contributions row
    const created = [];
    const errors = [];

    for (const { name, amount } of contributors) {
      if (!name || amount === undefined || amount === '') {
        errors.push({ name, reason: 'Missing name or amount' });
        continue;
      }

      // Find the member page by name
      const memberQuery = await notion.databases.query({
        database_id: process.env.MEMBERS_DB_ID,
        filter: {
          property: 'Name',   // adjust if your title column has a different label
          title: { equals: name },
        },
      });

      if (memberQuery.results.length === 0) {
        errors.push({ name, reason: `Member "${name}" not found in Members DB` });
        continue;
      }

      const memberPageId = memberQuery.results[0].id;

      // Create the contribution row
      const contribution = await notion.pages.create({
        parent: { database_id: process.env.NOTION_CONTRIBUTIONS_DB_ID },
        properties: {
          'Bill': {
            relation: [{ id: billPageId }],
          },
          'Contributor': {
            relation: [{ id: memberPageId }],
          },
          'Amount': {
            number: parseFloat(amount),
          },
          'Serial No.': {
            title: [{ text: { content: name } }],
          },
        },
      });

      created.push({ name, contributionId: contribution.id });
    }

    res.json({
      success: true,
      billPageId,
      created,
      ...(errors.length > 0 && { errors }),
    });

  } catch (err) {
    console.error('add-contributors error:', err);
    res.status(500).json({ error: err.message });
  }
});

export default app;