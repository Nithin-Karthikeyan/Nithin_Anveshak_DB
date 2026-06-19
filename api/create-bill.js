import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";
import apiRoutes from "./members.js"; // Imported the router from your second file

dotenv.config();

const app = express();

app.use(cors({
  origin: process.env.FRONTEND_URL,
  methods: ["GET", "POST"],
}));

app.use(express.json());

// Mount the router from members.js onto your application
app.use(apiRoutes);

app.post("/api/create-bill", async (req, res) => {
  const {
    image_url,
    invoice_number,
    date,
    total_amount,
    description,
    gst,
  } = req.body;

  try {
    const notionRes = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          database_id: process.env.NOTION_DB_BILLS_ID,
        },
        properties: {
          // Title is REQUIRED in Notion DB
          // Name: {
          //   title: [
          //     {
          //       text: {
          //         content: `Bill ${invoice_number || ""}`,
          //       },
          //     },
          //   ],
          // },

          Link: {
            url: image_url || null,
          },

          "Invoice No.": {
            title: [
              {
                text: { content: String(invoice_number ?? "") },
              },
            ],
          },

          Date: {
            date: date
              ? {
                  start: date,
                }
              : null,
          },

          "Total Amount": {
            number: total_amount ?? null,
          },

          Description: {
            rich_text: description
              ? [
                  {
                    text: {
                      content: description,
                    },
                  },
                ]
              : [],
          },

          GST: {
            checkbox: gst || false,
          },
        },
      },
      {
        headers: {
          Authorization: `Bearer ${process.env.NOTION_API_KEY}`,
          "Notion-Version": "2022-06-28",
          "Content-Type": "application/json",
        },
      }
    );

    // Modified to return the billId explicitly alongside the Notion payload
    res.json({
      billId: notionRes.data.id,
      ...notionRes.data
    });
    
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

//app.listen(3001, () => console.log("Server running on port 3001"));
export default app;