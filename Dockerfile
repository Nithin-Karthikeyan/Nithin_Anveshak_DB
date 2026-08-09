# Build the Tailwind CSS bundle with the standalone CLI (no Node needed).
FROM debian:bookworm-slim AS css
ARG TAILWIND_VERSION=v4.3.3
WORKDIR /build
RUN apt-get update && apt-get install -y --no-install-recommends wget ca-certificates \
    && rm -rf /var/lib/apt/lists/*
RUN wget -q -O tailwindcss \
    "https://github.com/tailwindlabs/tailwindcss/releases/download/${TAILWIND_VERSION}/tailwindcss-linux-x64" \
    && chmod +x tailwindcss
COPY static/ ./static/
RUN ./tailwindcss -i static/css/input.css -o static/css/app.css --minify

# Runtime image: FastAPI + uvicorn via uv.
FROM python:3.10-slim
COPY --from=ghcr.io/astral-sh/uv:latest /uv /uvx /bin/
ENV UV_COMPILE_BYTECODE=1 \
    UV_LINK_MODE=copy
WORKDIR /app
COPY pyproject.toml uv.lock ./
RUN uv sync --frozen --no-dev
COPY main.py ./
COPY --from=css /build/static ./static
EXPOSE 3000
ENV PORT=3000
CMD ["uv", "run", "uvicorn", "main:app", "--host", "0.0.0.0", "--port", "3000"]
