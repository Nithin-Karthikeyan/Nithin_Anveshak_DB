import express from "express";
import axios from "axios";
import dotenv from "dotenv";
import cors from "cors";

dotenv.config();

const app = express();

app.use(cors({
  origin: "http://localhost:5173",
  methods: ["GET", "POST"],
}));

app.use(express.json());

app.post("/create-bill", async (req, res) => {
  const { image_url } = req.body;

  try {
    const notionRes = await axios.post(
      "https://api.notion.com/v1/pages",
      {
        parent: {
          database_id: process.env.NOTION_DB_BILLS_ID,
        },
        properties: {
        //   Name: {
        //     title: [
        //       {
        //         text: { content: "New Bill" },
        //       },
        //     ],
        //   },
          "Link": {
            url: image_url,
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

    res.json(notionRes.data);
  } catch (err) {
    console.error(err.response?.data || err.message);
    res.status(500).json({ error: "Failed to create bill" });
  }
});

//app.listen(3001, () => console.log("Server running on port 3001"));
export default app;