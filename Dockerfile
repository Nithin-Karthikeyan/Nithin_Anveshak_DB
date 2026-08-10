# Runtime image: FastAPI + uvicorn via uv.
FROM python:3.10-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY main.py ./
COPY static ./static
EXPOSE 3000
ENV PORT=3000
CMD uv run uvicorn main:app --host 0.0.0.0 --port "${PORT:-3000}"
