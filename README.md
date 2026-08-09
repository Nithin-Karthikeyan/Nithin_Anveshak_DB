# Anveshak DB

A bill management web app. Upload a bill image, record invoice details, and split contributions among team members. Data is stored in Notion.

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript with [Tailwind CSS v4](https://tailwindcss.com) (standalone CLI, no Node needed)
- **Backend:** [FastAPI](https://fastapi.dev) + [uvicorn](https://www.uvicorn.org) (Python)
- **Data:** [Notion API](https://developers.notion.com/) via the official `notion-client` SDK
- **Image hosting:** [Cloudinary](https://cloudinary.com) (uploaded directly from the browser)
- **Tooling:** [uv](https://docs.astral.sh/uv/) for package management, [ruff](https://docs.astral.sh/ruff/) for linting & formatting, [Docker](https://www.docker.com) + Docker Compose, GitHub Actions CI

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

3. Build the frontend CSS (downloads the Tailwind standalone binary into `.tools/`):

   ```bash
   bash scripts/build-css.sh
   ```

4. Run the app:

   ```bash
   uv run python main.py
   ```

   Open http://localhost:3000. Interactive API docs are at http://localhost:3000/docs.

### Development

- Watch CSS changes: `bash scripts/build-css.sh --watch`
- Hot-reload the API: `uv run uvicorn main:app --port 3000 --reload`

## Linting & formatting

```bash
uv run ruff check .     # lint
uv run ruff format .    # format (use --check to verify only)
```

## Docker

```bash
docker compose up --build
```

## Project structure

```
main.py                 FastAPI app: API routes + static file serving
static/
  index.html            Frontend markup (mirrors the rendered UI)
  css/input.css         Tailwind source (theme tokens + component styles)
  css/app.css           Generated CSS (build output, not committed)
  js/app.js             Vanilla JS: tabs, bill form, date picker, contributors
scripts/build-css.sh    Builds the Tailwind CSS bundle
.github/workflows/ci.yml  Lint, format-check, build CSS, build Docker image
```
