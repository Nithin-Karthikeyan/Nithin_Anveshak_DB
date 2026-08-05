import { test, expect } from "@playwright/test";

const todayStr = () => {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const dd = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${mm}-${dd}`;
};

const mockApi = async (page) => {
  await page.route("**/api/members", (route) =>
    route.fulfill({
      json: [
        { id: "1", name: "Alice" },
        { id: "2", name: "Bob" },
      ],
    })
  );
  await page.route("**/api.cloudinary.com/**", (route) =>
    route.fulfill({
      json: {
        secure_url: "https://cdn.example.com/bill.png",
        public_id: "test-bill",
      },
    })
  );
  await page.route("**/api/create-bill", (route) =>
    route.fulfill({ json: { billId: "test-bill-1" } })
  );
  await page.route("**/api/add-contributors", (route) =>
    route.fulfill({ json: { success: true } })
  );
};

const fillValidForm = async (page, { date } = {}) => {
  await page.setInputFiles('input[type="file"]', "tests/fixtures/sample-bill.png");
  await page.locator('input[placeholder="INV-2024-001"]').fill("INV-TEST-001");
  await page.locator('input[type="date"]').fill(date || todayStr());
  await page.locator('input[placeholder="1500.00"]').fill("100");
};

test.describe("Bill upload form", () => {
  test("1. shows a preview when a bill file is uploaded", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', "tests/fixtures/sample-bill.png");
    await expect(page.locator(".preview-image")).toBeVisible();
  });

  test("2. shows errors when required fields are blank", async ({ page }) => {
    await page.goto("/");
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("Please upload a bill file")).toBeVisible();
    await expect(page.getByText("Invoice number is required")).toBeVisible();
    await expect(page.getByText("Date is required")).toBeVisible();
    await expect(page.getByText("Total amount must be positive")).toBeVisible();
    await expect(page.locator(".success-banner")).not.toBeVisible();
  });

  test("3a. accepts today's date (regression: not flagged as future)", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await fillValidForm(page, { date: todayStr() });
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("Date cannot be in the future")).not.toBeVisible();
    await expect(page.locator(".success-banner")).toBeVisible();
  });

  test("3b. rejects a date in the future", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await fillValidForm(page, { date: "2030-01-01" });
    await page.locator('button[type="submit"]').click();

    await expect(page.locator(".success-banner")).not.toBeVisible();
    await expect(page.locator(".error-message")).toBeVisible();
  });

  test("4. rejects a missing or zero total amount", async ({ page }) => {
    await page.goto("/");
    await page.setInputFiles('input[type="file"]', "tests/fixtures/sample-bill.png");
    await page.locator('input[placeholder="INV-2024-001"]').fill("INV-ZERO");
    await page.locator('input[type="date"]').fill(todayStr());
    await page.locator('button[type="submit"]').click();

    await expect(page.getByText("Total amount must be positive")).toBeVisible();

    await page.locator('input[placeholder="1500.00"]').fill("0");
    await page.locator('button[type="submit"]').click();
    await expect(page.getByText("Total amount must be positive")).toBeVisible();
    await expect(page.locator(".success-banner")).not.toBeVisible();
  });

  test("5. GST checkbox stays optional", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator(".success-banner")).toBeVisible();
  });

  test("6. shows remaining amount and blocks sum mismatch", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await fillValidForm(page); // total = 100

    // one contributor pays 30 → remaining 70
    const rows = page.locator(".contributor-row");
    await page.locator(".add-contributor-btn").click();
    await rows.first().locator(".contributor-select").selectOption({ label: "Alice" });
    await rows.first().locator(".contributor-amount").fill("30");

    await expect(page.getByText("Remaining:")).toBeVisible();
    await expect(page.getByText("70.00")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
    await expect(
      page.getByText(/doesn't match total amount/i)
    ).toBeVisible();

    // second contributor pays the rest → remaining 0
    await page.locator(".add-contributor-btn").click();
    await rows.nth(1).locator(".contributor-select").selectOption({ label: "Bob" });
    await rows.nth(1).locator(".contributor-amount").fill("70");

    await expect(page.getByText("All covered")).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeEnabled();

    await page.locator('button[type="submit"]').click();
    await expect(page.locator(".success-banner")).toBeVisible();
  });

  test("7. shows success on the same page and clears all fields", async ({ page }) => {
    await mockApi(page);
    await page.goto("/");
    await fillValidForm(page);
    await page.locator('button[type="submit"]').click();

    await expect(page.locator(".success-banner")).toBeVisible();
    await expect(page).toHaveURL(/localhost:3000/);

    // form is still visible (not replaced by a success screen)
    await expect(page.locator(".bill-upload-section")).toBeVisible();
    await expect(page.locator(".bill-details-section")).toBeVisible();

    // all fields cleared
    await expect(page.locator(".drop-zone")).toBeVisible();
    await expect(page.locator('input[placeholder="INV-2024-001"]')).toHaveValue("");
    await expect(page.locator('input[type="date"]')).toHaveValue("");
    await expect(page.locator('input[placeholder="1500.00"]')).toHaveValue("");
    await expect(page.locator(".contributor-row")).toHaveCount(1);
    await expect(page.locator(".contributor-select")).toHaveValue("");
    await expect(page.locator(".contributor-amount")).toHaveValue("");
  });
});
