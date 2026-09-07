# Anveshak DB

A bill management web app. Upload a bill image, record invoice details, and split contributions among team members. Data is stored in Notion.

## Features

- **Bill Upload:** Direct browser upload to Cloudinary with image preview
- **Invoice Management:** Record invoice number, date, total amount, description, and GST status
- **Contributor Tracking:** Split bills among team members with individual contribution amounts
- **Member Selection:** Auto-populated member list from Notion Members database
- **Validation:** Client and server-side validation for required fields and amounts
- **Error Handling:** Automatic rollback if contributor assignment fails
- **Real-time Feedback:** Success/error notifications during submission

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript (vanilla, no build step)
- **Backend:** [FastAPI](https://fastapi.dev) + [uvicorn](https://www.uvicorn.org) (Python)
- **Data:** [Notion API](https://developers.notion.com/) via the official `notion-client` SDK
- **Image hosting:** [Cloudinary](https://cloudinary.com) (uploaded directly from the browser)
- **Tooling:** [uv](https://docs.astral.sh/uv/) for package management, [ruff](https://docs.astral.sh/ruff/) for linting & formatting

## Setup

1. Copy `.env.example` to `.env` and fill in the values:

   ```bash
   cp .env.example .env
   ```

   Get an API key from [Notion integrations](https://developers.notion.com/) and share the relevant databases (Members, Bills, Contributions) with the integration. Set the 32-char database IDs from their URLs.

2. Install dependencies (creates `.venv` and `uv.lock`):

   ```bash
   uv sync
   ```

3. Run the app:

   ```bash
   uv run python main.py
   ```

   Open http://localhost:3000. Interactive API docs are at http://localhost:3000/docs.

### Development

- Hot-reload the API: `uv run uvicorn main:app --port 3000 --reload`

## Linting & formatting

```bash
uv run ruff check .     # lint
uv run ruff format .    # format (use --check to verify only)
```

## Tests

API-level tests use FastAPI's `TestClient` with the Notion client mocked, so no
real keys or network access are needed. They replay the exact requests the
frontend makes (members, create-bill, add-contributors, rollback), including
error paths.

```bash
uv run pytest
```

> If your shell has ROS sourced (a `PYTHONPATH` with pytest plugins), run
> `PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run pytest` instead.


## Project structure

```
main.py                 FastAPI app: API routes + static file serving
notion_columns.py       Notion database column name constants (Bills, Contributors, Members)
static/
  index.html            Frontend markup (mirrors the rendered UI)
  app.css               Plain CSS (theme tokens + component styles)
  app.js                Vanilla JS: tabs, bill form, date picker, contributors
  assets/               Favicon + logo images
tests/                  pytest API tests (TestClient + mocked Notion)
  conftest.py           Test fixtures and fake Notion client
  test_api.py           API endpoint tests (members, bills, contributors, rollback)
.github/workflows/ci.yml  Lint, format-check, run pytest
```

## Architecture

### Database Schema (Notion)

**Bills Database:**
- Invoice No. (title) - Unique identifier for each bill
- Link (url) - Cloudinary image URL
- Date (date) - Bill date
- Total Amount (number) - Full bill amount
- Description (rich_text) - Optional description
- GST (checkbox) - GST status flag

**Contributors Database:**
- Serial No. (title) - Contributor name (for display)
- Bill (relation) - Links to Bills database
- Contributor (relation) - Links to Members database
- Amount (number) - Individual contribution amount

**Members Database:**
- Name (title) - Member name

### API Endpoints

- `GET /api/members` - Fetch all members from Notion
- `POST /api/create-bill` - Create a new bill entry
- `POST /api/add-contributors` - Assign contributors to a bill
- `DELETE /api/bills/{bill_id}` - Archive a bill (used for rollback)

### Column Constants

The `notion_columns.py` file centralizes all Notion property names:
- **BillsColumns:** INVOICE_NO, LINK, DATE, TOTAL_AMOUNT, DESCRIPTION, GST
- **ContributorsColumns:** BILL, CONTRIBUTOR, AMOUNT, SERIAL_NO
- **MembersColumns:** NAME

This provides a single source of truth, prevents typos, and simplifies refactoring if the Notion schema changes.
