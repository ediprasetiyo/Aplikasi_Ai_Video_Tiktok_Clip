from celery import Celery

from src.settings import settings

celery_app = Celery(
    "tiktok_clip_worker",
    broker=settings.redis_url,
    backend=settings.redis_url,
    include=["src.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_acks_late=True,
    task_reject_on_worker_lost=True,
    worker_prefetch_multiplier=1,
    task_time_limit=60 * 60,  # 1 hour hard limit
    task_soft_time_limit=55 * 60,
)
