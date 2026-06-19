import { useState, useEffect } from "react";

export default function ImageUpload() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);

  // Bill fields
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gst, setGst] = useState(false);

  // Contributors
  const [billId, setBillId] = useState(null);
  const [contributors, setContributors] = useState([
    { name: "", amount: "" } // Changed memberId to name
  ]);

  // Members list
  const [members, setMembers] = useState([]);

  // ========================
  // FETCH MEMBERS
  // ========================
  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch(
          "https://anveshak-db.vercel.app/api/members"
        );
        const data = await res.json();
        setMembers(data);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      }
    };

    fetchMembers();
  }, []);

  // ========================
  // FILE HANDLING
  // ========================
  const handleFileChange = (e) => {
    const selected = e.target.files[0];
    if (!selected) return;
    setFile(selected);
    setPreview(URL.createObjectURL(selected));
  };

  // ========================
  // STEP 1: UPLOAD BILL
  // ========================
  const uploadImage = async () => {
    if (!file) return;

    setUploading(true);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Bills_upload");
    formData.append("folder", "bills");

    try {
      const res = await fetch(
        "https://api.cloudinary.com/v1_1/djnurf6a0/image/upload",
        {
          method: "POST",
          body: formData,
        }
      );

      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        return;
      }

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

      // store billId
      setBillId(notionData.billId);

      setResult(data);
      console.log("Bill created:", notionData);
    } catch (err) {
      console.error(err);
    }

    setUploading(false);
  };

  // ========================
  // CONTRIBUTORS HANDLING
  // ========================
  const addContributor = () => {
    setContributors([...contributors, { name: "", amount: "" }]);
  };

  const updateContributor = (index, field, value) => {
    const updated = [...contributors];
    updated[index][field] = value;
    setContributors(updated);
  };

  // ========================
  // STEP 2: SEND CONTRIBUTORS
  // ========================
  const submitContributors = async () => {
    if (!billId) {
      console.log("No billId yet");
      return;
    }

    try {
      const res = await fetch(
        "https://anveshak-db.vercel.app/api/add-contributors",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            billId,
            contributors: contributors.map((c) => ({
              name: c.name, // Sends name instead of memberId
              amount: Number(c.amount),
            })),
          }),
        }
      );

      const data = await res.json();
      console.log("Contributors added:", data);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div style={{ padding: 20 }}>
      {/* FILE INPUT */}
      <input type="file" accept="image/*" onChange={handleFileChange} />

      {preview && (
        <div style={{ marginTop: 10 }}>
          <img src={preview} alt="preview" width="200" />
        </div>
      )}

      {/* BILL INPUTS */}
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

      {/* UPLOAD BUTTON */}
      <button onClick={uploadImage} disabled={uploading}>
        {uploading ? "Uploading..." : "Upload Bill"}
      </button>

      {/* RESULT */}
      {result && (
        <div style={{ marginTop: 10 }}>
          <p><strong>URL:</strong> {result.secure_url}</p>
          <p><strong>Public ID:</strong> {result.public_id}</p>
        </div>
      )}

      {/* CONTRIBUTORS SECTION */}
      {billId && (
        <div style={{ marginTop: 30 }}>
          <h3>Add Contributors</h3>

          {contributors.map((c, i) => {
            // Track selected names instead of IDs
            const selectedNames = contributors.map(c => c.name);

            return (
              <div key={i} style={{ marginBottom: 10 }}>
                <select
                  value={c.name}
                  onChange={(e) =>
                    updateContributor(i, "name", e.target.value)
                  }
                >
                  <option value="">Select Member</option>

                  {members
                    .filter(
                      (m) =>
                        !selectedNames.includes(m.name) ||
                        m.name === c.name
                    )
                    .map((m) => (
                      <option key={m.name} value={m.name}>
                        {m.name}
                      </option>
                    ))}
                </select>

                <input
                  type="number"
                  placeholder="Amount"
                  value={c.amount}
                  onChange={(e) =>
                    updateContributor(i, "amount", e.target.value)
                  }
                />
              </div>
            );
          })}

          <button onClick={addContributor}>+ Add More</button>

          <br /><br />

          <button onClick={submitContributors}>
            Submit Contributors
          </button>
        </div>
      )}
    </div>
  );
}