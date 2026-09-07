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

## Quick Start

```bash
cp .env.example .env    # Configure environment variables
uv sync                  # Install dependencies
uv run python main.py    # Run the app at http://localhost:3000
```

See [Contributing](#contributing) for detailed setup and development workflow.


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

## Contributing

We welcome contributions! Whether you're fixing bugs, adding features, or improving documentation, your help is appreciated.

### Getting Started

1. **Fork and clone the repository**

   ```bash
   git clone https://github.com/yourusername/Nithin_Anveshak_DB.git
   cd Nithin_Anveshak_DB
   ```

2. **Set up your environment**

   ```bash
   cp .env.example .env
   ```

   Fill in the `.env` file:
   - Get a Notion API key from [Notion integrations](https://developers.notion.com/)
   - Create or use existing Notion databases (Members, Bills, Contributions)
   - Share these databases with your integration
   - Copy the 32-character database IDs from their URLs into `.env`
   - Add your Cloudinary credentials for image uploads

3. **Install dependencies**

   ```bash
   uv sync
   ```

   This creates a `.venv` virtual environment and installs all dependencies listed in `pyproject.toml`.

4. **Run the development server**

   ```bash
   uv run uvicorn main:app --port 3000 --reload
   ```

   The `--reload` flag enables hot-reloading when you edit code.
   
   - Frontend: http://localhost:3000
   - API docs: http://localhost:3000/docs

### Development Workflow

1. **Create a feature branch**

   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**

   - Follow existing code style and patterns
   - Update `notion_columns.py` if adding new Notion properties
   - Add tests for new functionality in `tests/test_api.py`
   - Keep commits focused and write clear commit messages

3. **Run tests**

   ```bash
   uv run pytest
   ```

   Or if you have ROS sourced:
   ```bash
   PYTEST_DISABLE_PLUGIN_AUTOLOAD=1 uv run pytest
   ```

4. **Lint and format**

   ```bash
   uv run ruff check .      # Check for issues
   uv run ruff format .     # Auto-format code
   ```

5. **Commit and push**

   ```bash
   git add .
   git commit -m "Add feature: your feature description"
   git push origin feature/your-feature-name
   ```

6. **Open a Pull Request**

   Go to the repository on GitHub and open a PR from your branch. Describe:
   - What changes you made
   - Why you made them
   - How to test them

### Code Guidelines

- **Backend (Python):** Follow PEP 8, use type hints, keep functions focused
- **Frontend (JS):** Vanilla JavaScript, no frameworks, maintain existing patterns
- **CSS:** Use existing design tokens in `:root`, avoid inline styles
- **Tests:** Mock external services, test both success and error paths
- **Commits:** Use conventional commits format (e.g., `feat:`, `fix:`, `docs:`)

### Testing Notes

- Tests use a mocked Notion client (`FakeNotion` in `conftest.py`)
- No real API keys or network access needed for tests
- Add test cases for new endpoints or validation logic
- Verify tests pass in CI before merging

### Need Help?

- Check existing issues or open a new one
- Ask questions in pull request comments
- Review the codebase structure in the [Project structure](#project-structure) section

## License

This project is open source and available under the MIT License.

**Copyright © 2024-2026 Anveshak, IIT Madras**

While the code is open source, the "Anveshak" name and branding are property of Team Anveshak, IIT Madras. If you fork or modify this project for your own use, please replace the branding and team references accordingly.
