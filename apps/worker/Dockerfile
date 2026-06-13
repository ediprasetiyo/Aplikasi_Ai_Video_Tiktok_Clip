FROM python:3.12-slim AS base

ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    UV_LINK_MODE=copy

RUN apt-get update && apt-get install -y --no-install-recommends \
        ffmpeg \
        ca-certificates \
        curl \
    && rm -rf /var/lib/apt/lists/* \
    && pip install --no-cache-dir uv

RUN useradd --create-home --uid 1000 worker
USER worker
WORKDIR /app

COPY --chown=worker pyproject.toml ./
RUN uv sync --no-dev

COPY --chown=worker src/ ./src/

ENV PATH="/app/.venv/bin:${PATH}"

# Default: FastAPI server. Celery worker started separately by docker-compose / k8s.
CMD ["uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000"]
