import { useState } from "react";
export default function ImageUpload() {
const [file, setFile] = useState(null);
const [preview, setPreview] = useState(null);
const [uploading, setUploading] = useState(false);
const [result, setResult] = useState(null);
const handleFileChange = (e) => {
const selected = e.target.files[0];
if (!selected) return;
setFile(selected);
setPreview(URL.createObjectURL(selected));
};
const uploadImage = async () => {
  console.log("Upload clicked");

  if (!file) {
    console.log("No file selected");
    return;
  }

  setUploading(true);

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", "Bills_upload");
  formData.append("folder", "bills");

  try {
    // Step 1: Upload to Cloudinary
    const res = await fetch(
      "https://api.cloudinary.com/v1_1/djnurf6a0/image/upload",
      {
        method: "POST",
        body: formData,
      }
    );

    const data = await res.json();

    if (!res.ok) {
      console.error("Cloudinary error:", data);
      return;
    }

    console.log("Uploaded:", data);

    // Step 2: Send to backend → Notion
    const notionRes = await fetch("https://anveshak-db.vercel.app", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image_url: data.secure_url,
      }),
    });

    const notionData = await notionRes.json();
    console.log("Notion response:", notionData);

  } catch (err) {
    console.error("Error:", err);
  }

  setUploading(false);
};
return (
<div style={{ padding: 20 }}>
  <input type="file" accept="image/*" onChange={handleFileChange} />

  {preview && (
    <div style={{ marginTop: 10 }}>
      <img src={preview} alt="preview" width="200" />
    </div>
  )}

  <button onClick={uploadImage} disabled={uploading}>
    {uploading ? "Uploading..." : "Upload"}
  </button>

  {result && (
    <div style={{ marginTop: 10 }}>
      <p><strong>URL:</strong> {result.secure_url}</p>
      <p><strong>Public ID:</strong> {result.public_id}</p>
    </div>
  )}
</div>
);
}