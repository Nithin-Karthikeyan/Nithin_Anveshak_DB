import { useState } from "react";

export default function ImageUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // NEW STATES
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gst, setGst] = useState(false);

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
      const notionRes = await fetch(
        "https://anveshak-db.vercel.app/api/create-bill",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            image_url: data.secure_url,
            invoice_number: Number(invoiceNumber),
            date: date,
            total_amount: Number(totalAmount),
            description: description,
            gst: gst,
          }),
        }
      );

      const notionData = await notionRes.json();
      console.log("Notion response:", notionData);

      setResult(data);
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

      {/* NEW INPUT FIELDS */}
      <div style={{ marginTop: 10 }}>
        <input
          type="number"
          placeholder="Invoice Number"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="date"
          value={date}
          onChange={(e) => setDate(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="number"
          placeholder="Total Amount"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <input
          type="text"
          placeholder="Description"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
        />
      </div>

      <div style={{ marginTop: 10 }}>
        <label>
          <input
            type="checkbox"
            checked={gst}
            onChange={(e) => setGst(e.target.checked)}
          />
          GST Included
        </label>
      </div>

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