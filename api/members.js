import express from "express";
import { Client } from "@notionhq/client";

const router = express.Router();

// Initialize Notion Client
const notion = new Client({
  auth: process.env.NOTION_API_KEY,
});

// ========================
// ROUTE: GET MEMBERS
// ========================
router.get("/members", async (req, res) => {
  try {
    const response = await notion.databases.query({
      database_id: process.env.MEMBERS_DB_ID,
      sorts: [
        {
          property: "Name",
          direction: "ascending",
        },
      ],
    });

    const members = response.results.map((page) => ({
      id: page.id,
      name: page.properties.Name.title[0]?.text?.content || "Unnamed",
    }));

    res.json(members);
  } catch (error) {
    console.error("Error fetching members:", error);
    res.status(500).json({ error: "Failed to fetch members" });
  }
});

// ========================
// ROUTE: CREATE BILL
// ========================
router.post("/create-bill", async (req, res) => {
  const {
    image_url,
    invoice_number,
    date,
    total_amount,
    description,
    gst,
  } = req.body;

  try {
    const response = await notion.pages.create({
      parent: {
        database_id: process.env.NOTION_DB_BILLS_ID,
      },
      properties: {
        "Invoice Number": {
          number: invoice_number ? Number(invoice_number) : null,
        },
        "Date": {
          date: date ? { start: date } : null,
        },
        "Total Amount": {
          number: total_amount ?? null,
        },
        "Description": {
          rich_text: [
            {
              text: {
                content: description || "",
              },
            },
          ],
        },
        "GST": {
          checkbox: gst || false,
        },
        "Image": {
          url: image_url || null,
        },
      },
    });

    res.json({
      billId: response.id,
      ...response
    });
  } catch (error) {
    console.error("Error creating bill:", error);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

// ========================
// ROUTE: ADD CONTRIBUTORS
// ========================
router.post("/add-contributors", async (req, res) => {
  const { billId, contributors } = req.body;

  try {
    for (const c of contributors) {
      await notion.pages.create({
        parent: {
          database_id: process.env.CONTRIBUTIONS_DB_ID,
        },
        properties: {
          "Bill": {
            relation: [{ id: billId }],
          },
          "Member": {
            relation: [{ id: c.memberId }],
          },
          "Amount": {
            number: c.amount,
          },
        },
      });
    }

    res.json({ success: true });
  } catch (error) {
    console.error("Error adding contributors:", error);
    res.status(500).json({ error: "Failed to add contributors" });
  }
});

export default router;