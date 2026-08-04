import { useState, useEffect } from "react";
import FileDropZone from "./FileDropZone";
import ContributorsForm from "./ContributorsForm";
import DatePicker from "./DatePicker";
import "./BillsTab.css";

export default function BillsTab() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [date, setDate] = useState("");
  const [totalAmount, setTotalAmount] = useState("");
  const [description, setDescription] = useState("");
  const [gst, setGst] = useState(false);

  const [contributors, setContributors] = useState([{ name: "", amount: "" }]);
  const [members, setMembers] = useState([]);

  const [errors, setErrors] = useState({});

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const res = await fetch("https://anveshak-db.vercel.app/api/members");
        const data = await res.json();
        setMembers(data);
      } catch (err) {
        console.error("Failed to fetch members:", err);
      }
    };
    fetchMembers();
  }, []);

  const validateForm = () => {
    const newErrors = {};

    if (!file) {
      newErrors.file = "Please upload a bill file";
    }

    if (!invoiceNumber.trim()) {
      newErrors.invoiceNumber = "Invoice number is required";
    }

    if (!date) {
      newErrors.date = "Date is required";
    } else {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        newErrors.date = "Date cannot be in the future";
      }
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      newErrors.totalAmount = "Total amount must be positive";
    }

    const contributorsSum = contributors.reduce((acc, c) => {
      const amount = parseFloat(c.amount) || 0;
      return acc + amount;
    }, 0);

    const hasContributors = contributors.some(c => c.name && c.amount);
    if (hasContributors && totalAmount && Math.abs(contributorsSum - parseFloat(totalAmount)) > 0.01) {
      newErrors.contributors = "Contributors sum must match total amount";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async () => {
    if (!validateForm()) {
      return;
    }

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
        setErrors({ submit: "Failed to upload file to Cloudinary" });
        setUploading(false);
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
            invoice_number: invoiceNumber,
            date: date,
            total_amount: Number(totalAmount),
            description: description,
            gst: gst,
          }),
        }
      );

      const notionData = await notionRes.json();

      const hasValidContributors = contributors.some(c => c.name && c.amount);
      if (hasValidContributors) {
        const contributorsRes = await fetch(
          "https://anveshak-db.vercel.app/api/add-contributors",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              invoice_number: invoiceNumber,
              contributors: contributors
                .filter(c => c.name && c.amount)
                .map((c) => ({
                  name: c.name,
                  amount: Number(c.amount),
                })),
            }),
          }
        );

        if (!contributorsRes.ok) {
          console.error("Failed to add contributors");
        }
      }

      setSubmitted(true);
      console.log("Bill created:", notionData);
    } catch (err) {
      console.error(err);
      setErrors({ submit: "An error occurred during submission" });
    }

    setUploading(false);
  };

  const resetForm = () => {
    setFile(null);
    setPreview(null);
    setInvoiceNumber("");
    setDate("");
    setTotalAmount("");
    setDescription("");
    setGst(false);
    setContributors([{ name: "", amount: "" }]);
    setSubmitted(false);
    setErrors({});
  };

  if (submitted) {
    return (
      <div className="bills-tab">
        <div className="success-container">
          <div className="success-icon">✓</div>
          <h2>Bill Submitted Successfully!</h2>
          <p className="success-message">Your bill has been uploaded and processed.</p>
          <button onClick={resetForm} className="new-bill-btn">
            Upload Another Bill
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bills-tab">
      <h2>Upload Bill</h2>
      <p className="tab-description">Fill in the details and upload your bill</p>

      <form onSubmit={(e) => { e.preventDefault(); handleSubmit(); }}>
        <div className="bill-upload-section">
          <h3>Upload Bill</h3>
          <FileDropZone
            file={file}
            setFile={setFile}
            preview={preview}
            setPreview={setPreview}
          />
          {errors.file && <div className="error-message">⚠️ {errors.file}</div>}
        </div>

        <div className="bill-details-section">
          <h3>Bill Details</h3>

          <div className="form-group">
            <label className="form-label">Invoice Number *</label>
            <input
              type="text"
              placeholder="INV-2024-001"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
            />
            {errors.invoiceNumber && <div className="error-message">⚠️ {errors.invoiceNumber}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Date *</label>
            <DatePicker value={date} onChange={setDate} />
            <p className="hint-text">Put date as given in the invoice</p>
            {errors.date && <div className="error-message">⚠️ {errors.date}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Total Amount (₹) *</label>
            <input
              type="number"
              placeholder="1500.00"
              value={totalAmount}
              onChange={(e) => setTotalAmount(e.target.value)}
              step="0.01"
              min="0"
            />
            {errors.totalAmount && <div className="error-message">⚠️ {errors.totalAmount}</div>}
          </div>

          <div className="form-group">
            <label className="form-label">Description</label>
            <input
              type="text"
              placeholder="CAC26 Elec Comps - Robu"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>

          <div className="form-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={gst}
                onChange={(e) => setGst(e.target.checked)}
              />
              <span className="checkbox-label">GST Included</span>
            </label>
          </div>
        </div>

        <ContributorsForm
          contributors={contributors}
          setContributors={setContributors}
          members={members}
          totalAmount={totalAmount}
        />
        {errors.contributors && <div className="error-message">⚠️ {errors.contributors}</div>}

        {errors.submit && <div className="error-message">⚠️ {errors.submit}</div>}

        <button 
          type="submit" 
          disabled={uploading || !!errors.contributors} 
          className="submit-btn"
        >
          {uploading ? "Uploading..." : "Submit Bill"}
        </button>
      </form>
    </div>
  );
}
