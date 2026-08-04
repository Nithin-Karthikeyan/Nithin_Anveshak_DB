import { useState, useEffect } from "react";
import "./ContributorsForm.css";

export default function ContributorsForm({ 
  contributors, 
  setContributors, 
  members, 
  totalAmount 
}) {
  const [sumError, setSumError] = useState("");

  useEffect(() => {
    const sum = contributors.reduce((acc, c) => {
      const amount = parseFloat(c.amount) || 0;
      return acc + amount;
    }, 0);

    if (totalAmount && sum > 0 && Math.abs(sum - parseFloat(totalAmount)) > 0.01) {
      setSumError(`Contributors sum (₹${sum.toFixed(2)}) doesn't match total amount (₹${parseFloat(totalAmount).toFixed(2)})`);
    } else {
      setSumError("");
    }
  }, [contributors, totalAmount]);

  const addContributor = () => {
    setContributors([...contributors, { name: "", amount: "" }]);
  };

  const updateContributor = (index, field, value) => {
    const updated = [...contributors];
    updated[index][field] = value;
    setContributors(updated);
  };

  const removeContributor = (index) => {
    if (contributors.length === 1) return;
    const updated = contributors.filter((_, i) => i !== index);
    setContributors(updated);
  };

  const selectedNames = contributors.map((c) => c.name);

  return (
    <div className="contributors-form">
      <h3>Contributors</h3>
      <p className="hint-text">Add people who contributed to this bill (optional)</p>

      <div className="contributors-list">
        {contributors.map((c, i) => (
          <div key={i} className="contributor-row">
            <div className="contributor-inputs">
              <select
                value={c.name}
                onChange={(e) => updateContributor(i, "name", e.target.value)}
                className="contributor-select"
              >
                <option value="">Select Member</option>
                {members
                  .filter((m) => !selectedNames.includes(m.name) || m.name === c.name)
                  .map((m) => (
                    <option key={m.name} value={m.name}>
                      {m.name}
                    </option>
                  ))}
              </select>

              <input
                type="number"
                placeholder="Amount (₹)"
                value={c.amount}
                onChange={(e) => updateContributor(i, "amount", e.target.value)}
                className="contributor-amount"
                step="0.01"
                min="0"
              />
            </div>

            {contributors.length > 1 && (
              <button
                type="button"
                onClick={() => removeContributor(i)}
                className="remove-contributor-btn"
                title="Remove contributor"
              >
                ✕
              </button>
            )}
          </div>
        ))}
      </div>

      <button type="button" onClick={addContributor} className="add-contributor-btn">
        + Add Contributor
      </button>

      {sumError && <div className="error-message">⚠️ {sumError}</div>}
    </div>
  );
}
