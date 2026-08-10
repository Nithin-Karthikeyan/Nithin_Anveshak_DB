# Anveshak DB

A bill management web app. Upload a bill image, record invoice details, and split contributions among team members. Data is stored in Notion.

## Stack

- **Frontend:** Plain HTML, CSS, JavaScript (vanilla, no build step)
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

## Docker

```bash
docker compose up --build
```

## Project structure

```
main.py                 FastAPI app: API routes + static file serving
static/
  index.html            Frontend markup (mirrors the rendered UI)
  app.css               Plain CSS (theme tokens + component styles)
  app.js                Vanilla JS: tabs, bill form, date picker, contributors
  assets/               Favicon + logo images
tests/                  pytest API tests (TestClient + mocked Notion)
.github/workflows/ci.yml  Lint, format-check, run pytest, build Docker image
```
