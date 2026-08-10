(() => {
  "use strict";

  const $ = (id) => document.getElementById(id);

  // ---- Tab navigation ----
  const tabsContainer = $("tabs-container");
  const hamburger = $("hamburger");
  const tabButtons = Array.from(tabsContainer.querySelectorAll(".tab-button"));
  const panels = {
    bills: $("tab-bills"),
    pocs: $("tab-pocs"),
    about: $("tab-about"),
  };

  // ---- Bill form ----
  const form = $("bill-form");
  const successBanner = $("success-banner");
  const successMessage = $("success-message");
  const submitBtn = $("submit-btn");

  const fileInput = $("file-input");
  const dropZone = $("drop-zone");
  const filePreviewContainer = $("file-preview-container");
  const filePreview = $("file-preview");
  const removeFileBtn = $("remove-file-btn");
  const fileError = $("file-error");

  const invoiceNumberInput = $("invoice-number");
  const billDateInput = $("bill-date");
  const totalAmountInput = $("total-amount");
  const descriptionInput = $("description");
  const gstInput = $("gst");

  const errorInvoice = $("error-invoice");
  const errorDate = $("error-date");
  const errorAmount = $("error-amount");
  const errorContributors = $("error-contributors");
  const errorSubmit = $("error-submit");

  const contributorsList = $("contributors-list");
  const addContributorBtn = $("add-contributor-btn");
  const remainingBox = $("remaining-box");

  const confirmModal = $("confirm-modal");
  const modalSummary = $("modal-summary");
  const modalCancel = $("modal-cancel");
  const modalConfirm = $("modal-confirm");

  // ---- Date picker ----
  const datePicker = $("date-picker");
  const calendarToggle = $("calendar-toggle");
  const calendarPopup = $("calendar-popup");
  const calMonth = $("cal-month");
  const calGrid = $("cal-grid");
  const calPrev = $("cal-prev");
  const calNext = $("cal-next");

  // ---- State ----
  let file = null;
  let preview = null;
  let uploading = false;
  let invoiceNumber = "";
  let date = "";
  let totalAmount = "";
  let description = "";
  let gst = false;
  let contributors = [{ name: "", amount: "" }];
  let members = [];

  let calOpen = false;
  let viewYear = new Date().getFullYear();
  let viewMonth = new Date().getMonth();
  const todayStr = getTodayStr();

  // ---- Helpers ----
  function getTodayStr() {
    const now = new Date();
    const mm = String(now.getMonth() + 1).padStart(2, "0");
    const dd = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${mm}-${dd}`;
  }

  function getInitialView(val) {
    const d = val ? new Date(`${val}T00:00:00`) : new Date();
    if (isNaN(d.getTime())) {
      const now = new Date();
      return [now.getFullYear(), now.getMonth()];
    }
    return [d.getFullYear(), d.getMonth()];
  }

  function escapeHtml(str) {
    return String(str).replace(/[&<>"']/g, (ch) => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    }[ch]));
  }

  // ---- Tabs ----
  function switchTab(tabId) {
    Object.keys(panels).forEach((id) => {
      panels[id].classList.toggle("hidden", id !== tabId);
    });
    tabButtons.forEach((btn) => {
      btn.classList.toggle("active", btn.dataset.tab === tabId);
    });
    tabsContainer.classList.remove("open");
    hamburger.classList.remove("open");
    hamburger.setAttribute("aria-expanded", "false");
  }

  tabButtons.forEach((btn) => {
    btn.addEventListener("click", () => switchTab(btn.dataset.tab));
  });

  hamburger.addEventListener("click", () => {
    const open = tabsContainer.classList.toggle("open");
    hamburger.classList.toggle("open", open);
    hamburger.setAttribute("aria-expanded", String(open));
  });

  // ---- Members ----
  async function fetchMembers() {
    try {
      const res = await fetch("/api/members");
      const data = await res.json();
      members = data;
      renderContributorOptions();
    } catch (err) {
      console.error("Failed to fetch members:", err);
    }
  }

  // ---- Contributors ----
  function contributorsSum() {
    return contributors.reduce((acc, c) => acc + (parseFloat(c.amount) || 0), 0);
  }

  function hasValidContributors() {
    return contributors.some((c) => c.name && parseFloat(c.amount) > 0);
  }

  function liveMismatch() {
    return (
      hasValidContributors() &&
      totalAmount &&
      Math.abs(contributorsSum() - parseFloat(totalAmount)) > 0.01
    );
  }

  function renderContributorOptions() {
    const names = contributors.map((c) => c.name);
    contributorsList.querySelectorAll(".contributor-row").forEach((row, i) => {
      const select = row.querySelector(".contributor-select");
      const current = contributors[i].name;
      const opts = members
        .filter((m) => !names.includes(m.name) || m.name === current)
        .map((m) => `<option value="${escapeHtml(m.name)}">${escapeHtml(m.name)}</option>`)
        .join("");
      select.innerHTML = `<option value="">Select Member</option>${opts}`;
      select.value = current;
    });
  }

  function createContributorRow(index) {
    const row = document.createElement("div");
    row.className = "contributor-row";

    const inputs = document.createElement("div");
    inputs.className = "contributor-inputs";

    const select = document.createElement("select");
    select.className = "contributor-select";
    select.setAttribute("aria-label", "Contributor member");
    select.addEventListener("change", (e) => {
      contributors[index].name = e.target.value;
      renderContributorOptions();
      updateContributorSummary();
    });

    const amount = document.createElement("input");
    amount.type = "number";
    amount.className = "contributor-amount";
    amount.placeholder = "Amount (₹)";
    amount.step = "0.01";
    amount.min = "0.01";
    amount.value = contributors[index].amount || "";
    amount.addEventListener("input", (e) => {
      contributors[index].amount = e.target.value;
      updateContributorSummary();
    });

    inputs.appendChild(select);
    inputs.appendChild(amount);
    row.appendChild(inputs);

    if (contributors.length > 1) {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "remove-contributor-btn";
      btn.title = "Remove contributor";
      btn.textContent = "✕";
      btn.addEventListener("click", () => removeContributor(index));
      row.appendChild(btn);
    }

    return row;
  }

  function renderContributorsList() {
    contributorsList.innerHTML = "";
    contributors.forEach((c, i) => {
      contributorsList.appendChild(createContributorRow(i));
    });
    renderContributorOptions();
  }

  function addContributor() {
    contributors.push({ name: "", amount: "" });
    renderContributorsList();
    updateContributorSummary();
  }

  function removeContributor(index) {
    if (contributors.length === 1) return;
    contributors.splice(index, 1);
    renderContributorsList();
    updateContributorSummary();
  }

  function updateContributorSummary() {
    const sum = contributorsSum();
    const total = parseFloat(totalAmount);
    const hasTotal = totalAmount !== "" && !isNaN(total);

    const remaining = hasTotal ? total - sum : null;

    if (remaining !== null) {
      remainingBox.classList.remove("hidden");
      remainingBox.classList.toggle("over", remaining < -0.01);
      remainingBox.classList.toggle("done", remaining >= -0.01 && remaining <= 0.01);
      if (remaining > 0.01) {
        remainingBox.innerHTML = `Remaining: <strong>₹${remaining.toFixed(2)}</strong>`;
      } else if (remaining >= -0.01 && remaining <= 0.01) {
        remainingBox.textContent = "All covered ✓";
      } else {
        remainingBox.innerHTML = `Over by <strong>₹${Math.abs(remaining).toFixed(2)}</strong>`;
      }
    } else {
      remainingBox.classList.add("hidden");
      remainingBox.classList.remove("over", "done");
      remainingBox.innerHTML = "";
    }

    const invalidAmount = contributors.some((c) => c.name && parseFloat(c.amount) <= 0);

    if (invalidAmount) {
      errorContributors.textContent = "⚠️ Contributor amounts must be greater than 0";
      errorContributors.classList.remove("hidden");
    } else if (hasTotal && sum > 0 && Math.abs(sum - total) > 0.01) {
      errorContributors.textContent =
        `⚠️ Contributors sum (₹${sum.toFixed(2)}) doesn't match total amount (₹${total.toFixed(2)})`;
      errorContributors.classList.remove("hidden");
    } else {
      errorContributors.classList.add("hidden");
    }

    updateSubmitState();
  }

  function updateSubmitState() {
    submitBtn.disabled =
      uploading ||
      !file ||
      !invoiceNumber.trim() ||
      !date ||
      !totalAmount ||
      parseFloat(totalAmount) <= 0 ||
      !hasValidContributors() ||
      contributors.some((c) => c.name && parseFloat(c.amount) <= 0) ||
      liveMismatch();
    submitBtn.textContent = uploading ? "Uploading..." : "Submit Bill";
  }

  addContributorBtn.addEventListener("click", addContributor);

  // ---- File drop zone ----
  const ACCEPTED_TYPES = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
  const MAX_SIZE = 3 * 1024 * 1024;

  function validateFile(selected) {
    fileError.classList.add("hidden");
    if (!ACCEPTED_TYPES.includes(selected.type)) {
      fileError.textContent = "⚠️ File must be PDF, JPG, or PNG";
      fileError.classList.remove("hidden");
      return false;
    }
    if (selected.size > MAX_SIZE) {
      fileError.textContent = "⚠️ File must be under 3MB";
      fileError.classList.remove("hidden");
      return false;
    }
    return true;
  }

  function showFilePreview(show) {
    dropZone.classList.toggle("hidden", show);
    filePreviewContainer.classList.toggle("hidden", !show);
    filePreview.innerHTML = "";
    if (!show) return;

    if (preview.type === "image") {
      const img = document.createElement("img");
      img.src = preview.url;
      img.alt = "Preview";
      img.className = "preview-image";
      filePreview.appendChild(img);
    } else {
      const wrap = document.createElement("div");
      wrap.className = "pdf-preview";
      const name = document.createElement("div");
      name.className = "pdf-name";
      name.textContent = preview.name;
      const iframe = document.createElement("iframe");
      iframe.src = preview.url;
      iframe.title = "PDF Preview";
      iframe.className = "preview-pdf";
      wrap.appendChild(name);
      wrap.appendChild(iframe);
      filePreview.appendChild(wrap);
    }
  }

  function handleFile(selected) {
    if (!selected) return;
    if (!validateFile(selected)) {
      file = null;
      preview = null;
      showFilePreview(false);
      updateSubmitState();
      return;
    }
    file = selected;
    if (selected.type === "application/pdf") {
      preview = { type: "pdf", name: selected.name, url: URL.createObjectURL(selected) };
    } else {
      preview = { type: "image", url: URL.createObjectURL(selected) };
    }
    showFilePreview(true);
    updateSubmitState();
  }

  ["dragenter", "dragover"].forEach((type) => {
    dropZone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.add("drag-active");
    });
  });

  ["dragleave", "drop"].forEach((type) => {
    dropZone.addEventListener(type, (e) => {
      e.preventDefault();
      e.stopPropagation();
      dropZone.classList.remove("drag-active");
    });
  });

  dropZone.addEventListener("drop", (e) => {
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0]);
      fileInput.value = "";
    }
  });

  dropZone.addEventListener("click", () => fileInput.click());

  fileInput.addEventListener("change", (e) => {
    if (e.target.files && e.target.files[0]) handleFile(e.target.files[0]);
  });

  removeFileBtn.addEventListener("click", () => {
    file = null;
    preview = null;
    fileInput.value = "";
    fileError.classList.add("hidden");
    showFilePreview(false);
    updateSubmitState();
  });

  // ---- Date picker ----
  function renderCalendar() {
    calMonth.textContent =
      `${new Date(viewYear || 0, viewMonth || 0, 1).toLocaleString("en-US", { month: "long" })} ${viewYear}`;

    const WEEKDAYS = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
    const firstDay = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    let html = WEEKDAYS.map((wd) => `<div class="calendar-weekday">${wd}</div>`).join("");

    for (let i = 0; i < firstDay; i++) html += `<div class="calendar-day empty"></div>`;
    for (let d = 1; d <= daysInMonth; d++) {
      const dateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
      const isFuture = dateStr > todayStr;
      const cls = [
        "calendar-day",
        isToday(d) ? "today" : "",
        isSameDate(d) ? "selected" : "",
        isFuture ? "disabled" : "",
      ]
        .filter(Boolean)
        .join(" ");
      html += `<button type="button" class="${cls}" data-day="${d}" ${isFuture ? "disabled" : ""}>${d}</button>`;
    }
    calGrid.innerHTML = html;
  }

  function isSameDate(day) {
    if (!date) return false;
    const d = new Date(`${date}T00:00:00`);
    return d.getFullYear() === viewYear && d.getMonth() === viewMonth && d.getDate() === day;
  }

  function isToday(day) {
    const now = new Date();
    return now.getFullYear() === viewYear && now.getMonth() === viewMonth && now.getDate() === day;
  }

  function selectDate(day) {
    const mm = String(viewMonth + 1).padStart(2, "0");
    const dd = String(day).padStart(2, "0");
    setDate(`${viewYear}-${mm}-${dd}`);
    closeCalendar();
  }

  function setDate(val) {
    date = val;
    billDateInput.value = val;
    const [y, m] = getInitialView(val);
    viewYear = y;
    viewMonth = m;
  }

  function openCalendar() {
    calOpen = true;
    const [y, m] = getInitialView(date);
    viewYear = y;
    viewMonth = m;
    calendarPopup.classList.remove("hidden");
    renderCalendar();
  }

  function closeCalendar() {
    calOpen = false;
    calendarPopup.classList.add("hidden");
  }

  calendarToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    if (calOpen) closeCalendar();
    else openCalendar();
  });

  document.addEventListener("mousedown", (e) => {
    if (calOpen && !datePicker.contains(e.target)) closeCalendar();
  });

  calPrev.addEventListener("click", () => {
    let y = viewYear;
    let m = viewMonth - 1;
    if (m < 0) {
      m = 11;
      y -= 1;
    }
    viewMonth = m;
    viewYear = y;
    renderCalendar();
  });

  calNext.addEventListener("click", () => {
    let y = viewYear;
    let m = viewMonth + 1;
    if (m > 11) {
      m = 0;
      y += 1;
    }
    viewMonth = m;
    viewYear = y;
    renderCalendar();
  });

  calGrid.addEventListener("click", (e) => {
    const btn = e.target.closest(".calendar-day:not(.empty)");
    if (!btn) return;
    selectDate(parseInt(btn.dataset.day, 10));
  });

  billDateInput.max = todayStr;
  billDateInput.addEventListener("input", (e) => {
    if (e.target.value && e.target.value > todayStr) {
      billDateInput.value = date;
      return;
    }
    setDate(e.target.value);
    updateSubmitState();
  });

  // ---- Bill details ----
  invoiceNumberInput.addEventListener("input", (e) => {
    invoiceNumber = e.target.value;
    updateSubmitState();
  });

  totalAmountInput.addEventListener("input", (e) => {
    totalAmount = e.target.value;
    updateContributorSummary();
  });

  descriptionInput.addEventListener("input", (e) => {
    description = e.target.value;
  });

  gstInput.addEventListener("change", (e) => {
    gst = e.target.checked;
  });

  // ---- Validation & submit ----
  function hideError(el) {
    el.classList.add("hidden");
  }

  function validateForm() {
    let valid = true;
    hideError(errorInvoice);
    hideError(errorDate);
    hideError(errorAmount);
    hideError(errorSubmit);

    if (!file) {
      fileError.textContent = "⚠️ Please upload a bill file";
      fileError.classList.remove("hidden");
      valid = false;
    }

    if (!invoiceNumber.trim()) {
      errorInvoice.textContent = "⚠️ Invoice number is required";
      errorInvoice.classList.remove("hidden");
      valid = false;
    }

    if (!date) {
      errorDate.textContent = "⚠️ Date is required";
      errorDate.classList.remove("hidden");
      valid = false;
    } else {
      const [y, m, d] = date.split("-").map(Number);
      const selectedDate = new Date(y, m - 1, d);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (selectedDate > today) {
        errorDate.textContent = "⚠️ Date cannot be in the future";
        errorDate.classList.remove("hidden");
        valid = false;
      }
    }

    if (!totalAmount || parseFloat(totalAmount) <= 0) {
      errorAmount.textContent = "⚠️ Total amount must be positive";
      errorAmount.classList.remove("hidden");
      valid = false;
    }

    if (!hasValidContributors()) {
      errorContributors.textContent = "⚠️ Add at least one contributor with a name and amount";
      errorContributors.classList.remove("hidden");
      valid = false;
    } else {
      if (contributors.some((c) => c.name && parseFloat(c.amount) <= 0)) {
        errorContributors.textContent = "⚠️ Contributor amounts must be greater than 0";
        errorContributors.classList.remove("hidden");
        valid = false;
      } else if (
        totalAmount &&
        Math.abs(contributorsSum() - parseFloat(totalAmount)) > 0.01
      ) {
        errorContributors.textContent = "⚠️ Contributors sum doesn't match total amount";
        errorContributors.classList.remove("hidden");
        valid = false;
      }
    }

    return valid;
  }

  function resetForm() {
    file = null;
    preview = null;
    fileInput.value = "";
    fileError.classList.add("hidden");
    showFilePreview(false);

    invoiceNumber = "";
    date = "";
    totalAmount = "";
    description = "";
    gst = false;

    invoiceNumberInput.value = "";
    billDateInput.value = "";
    totalAmountInput.value = "";
    descriptionInput.value = "";
    gstInput.checked = false;

    contributors = [{ name: "", amount: "" }];
    renderContributorsList();

    hideError(errorInvoice);
    hideError(errorDate);
    hideError(errorAmount);
    hideError(errorContributors);
    hideError(errorSubmit);
    updateContributorSummary();
  }

  async function handleSubmit() {
    successBanner.classList.add("hidden");
    errorSubmit.classList.add("hidden");
    if (!validateForm()) return;

    uploading = true;
    updateSubmitState();

    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", "Bills_upload");
    formData.append("folder", "bills");

    try {
      const res = await fetch("https://api.cloudinary.com/v1_1/djnurf6a0/image/upload", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        console.error(data);
        errorSubmit.textContent = "⚠️ Failed to upload file to Cloudinary";
        errorSubmit.classList.remove("hidden");
        uploading = false;
        updateSubmitState();
        return;
      }

      const notionRes = await fetch("/api/create-bill", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image_url: data.secure_url,
          invoice_number: invoiceNumber,
          date: date,
          total_amount: Number(totalAmount),
          description: description,
          gst: gst,
        }),
      });

      const notionData = await notionRes.json();
      if (!notionRes.ok) {
        console.error("Failed to create bill:", notionData);
        errorSubmit.textContent = `⚠️ Failed to create the bill. Bill was not published: ${
          notionData.error || notionData.details || "unknown error"
        }`;
        errorSubmit.classList.remove("hidden");
        uploading = false;
        updateSubmitState();
        return;
      }

      const contributorsRes = await fetch("/api/add-contributors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          invoice_number: invoiceNumber,
          contributors: contributors
            .filter((c) => c.name && parseFloat(c.amount) > 0)
            .map((c) => ({ name: c.name, amount: Number(c.amount) })),
        }),
      });

      const contributorsData = await contributorsRes.json();
      const contributorErrors = contributorsData.errors || [];

      if (!contributorsRes.ok || contributorErrors.length > 0) {
        console.error("Failed to add contributors:", contributorsData);
        try {
          await fetch(`/api/bills/${notionData.billId}`, { method: "DELETE" });
        } catch (rollbackErr) {
          console.error("Rollback failed:", rollbackErr);
        }
        const reason =
          (contributorErrors.length > 0
            ? contributorErrors
                .map((e) => `${e.name || "?"}: ${e.reason}`)
                .join("; ")
            : contributorsData.error) || "unknown error";
        errorSubmit.textContent = `⚠️ Failed to add contributors. Bill was not published: ${reason}`;
        errorSubmit.classList.remove("hidden");
        uploading = false;
        updateSubmitState();
        return;
      }

      resetForm();
      successMessage.textContent =
        "Bill submitted successfully! Your bill has been uploaded and processed.";
      successBanner.classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
      console.log("Bill created:", notionData);
    } catch (err) {
      console.error(err);
      errorSubmit.textContent = "⚠️ An error occurred during submission";
      errorSubmit.classList.remove("hidden");
    }

    uploading = false;
    updateSubmitState();
  }

  form.addEventListener("submit", (e) => {
    e.preventDefault();
    if (!validateForm()) return;
    openConfirmModal();
  });

  form.addEventListener("keydown", (e) => {
    if (
      e.key === "Enter" &&
      (e.target instanceof HTMLInputElement || e.target instanceof HTMLSelectElement)
    ) {
      e.preventDefault();
    }
  });

  // ---- Confirmation modal ----
  function buildModalSummary() {
    modalSummary.innerHTML = "";

    const rows = [
      ["Bill File", file ? `${file.name} (${(file.size / 1024 / 1024).toFixed(2)} MB)` : "None"],
      ["Invoice Number", invoiceNumber],
      ["Date", date],
      ["Total Amount", `₹${Number(totalAmount).toFixed(2)}`],
      ["Description", description || "—"],
      ["GST Included", gst ? "Yes" : "No"],
    ];

    rows.forEach(([label, value]) => {
      const row = document.createElement("div");
      row.className = "modal-row";
      const lbl = document.createElement("span");
      lbl.className = "modal-row-label";
      lbl.textContent = label;
      const val = document.createElement("span");
      val.className = "modal-row-value";
      val.textContent = value;
      row.appendChild(lbl);
      row.appendChild(val);
      modalSummary.appendChild(row);
    });

    const heading = document.createElement("div");
    heading.className = "modal-row modal-row-heading";
    heading.textContent = "Contributors";
    modalSummary.appendChild(heading);

    contributors
      .filter((c) => c.name && parseFloat(c.amount) > 0)
      .forEach((c) => {
        const row = document.createElement("div");
        row.className = "modal-row modal-contributor";
        const lbl = document.createElement("span");
        lbl.className = "modal-row-label";
        lbl.textContent = c.name;
        const val = document.createElement("span");
        val.className = "modal-row-value";
        val.textContent = `₹${Number(c.amount).toFixed(2)}`;
        row.appendChild(lbl);
        row.appendChild(val);
        modalSummary.appendChild(row);
      });

    const sum = contributorsSum();
    const total = Number(totalAmount) || 0;
    const remaining = total - sum;

    const remRow = document.createElement("div");
    remRow.className = "modal-row modal-remaining";
    remRow.textContent =
      remaining > 0.01
        ? `Remaining: ₹${remaining.toFixed(2)}`
        : remaining < -0.01
          ? `Over by ₹${Math.abs(remaining).toFixed(2)}`
          : "All covered ✓";
    modalSummary.appendChild(remRow);
  }

  function openConfirmModal() {
    buildModalSummary();
    confirmModal.classList.remove("hidden");
  }

  function closeConfirmModal() {
    confirmModal.classList.add("hidden");
  }

  modalCancel.addEventListener("click", closeConfirmModal);

  confirmModal.addEventListener("click", (e) => {
    if (e.target === confirmModal) closeConfirmModal();
  });

  modalConfirm.addEventListener("click", () => {
    closeConfirmModal();
    handleSubmit();
  });

  // ---- Disable wheel-stepping on number inputs ----
  document.addEventListener(
    "wheel",
    (e) => {
      const t = e.target;
      if (t instanceof HTMLInputElement && t.type === "number" && document.activeElement === t) {
        e.preventDefault();
      }
    },
    { passive: false }
  );

  // ---- Init ----
  renderContributorsList();
  fetchMembers();
  updateSubmitState();
})();
