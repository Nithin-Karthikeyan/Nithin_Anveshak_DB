import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import apiRoutes from "./members.js"; 

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST"],
}));

app.use(express.json());

app.use("/api", apiRoutes);

app.post("/api/create-bill", async (req, res) => {
  const {
    image_url,
    invoice_number,
    date,
    total_amount,
    description,
    gst,
  } = req.body;

  // Build the properties dynamically so we don't send malformed null/empty fields
  const properties = {
    "Invoice No.": {
      title: [
        {
          text: { content: invoice_number ? String(invoice_number) : "B-UNKNOWN" },
        },
      ],
    },
    GST: {
      checkbox: Boolean(gst),
    },
  };

  // Only add these properties if they actually have data
  if (image_url) {
    properties["Link"] = { url: image_url };
  }
  if (date) {
    properties["Date"] = { date: { start: date } };
  }
  if (total_amount !== undefined && total_amount !== null) {
    properties["Total Amount"] = { number: Number(total_amount) };
  }
  if (description) {
    properties["Description"] = {
      rich_text: [{ text: { content: description } }],
    };
  }

  try {
    const notionRes = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          database_id: process.env.NOTION_DB_BILLS_ID,
        },
        properties: properties,
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    res.json({
      billId: notionRes.data.id,
      ...notionRes.data
    });
    
  } catch (err) {
    // Advanced logging: This prints the exact reason Notion sent a 500 error
    if (err.response && err.response.data) {
      console.error("Notion API Error Details:", JSON.stringify(err.response.data, null, 2));
    } else {
      console.error("Server Error:", err.message);
    }
    res.status(500).json({ error: "Failed to create bill", details: err.response?.data?.message || err.message });
  }
});

export default app;