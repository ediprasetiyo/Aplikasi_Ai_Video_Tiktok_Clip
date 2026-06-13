import structlog

from src.celery_app import celery_app

log = structlog.get_logger()


@celery_app.task(name="process_video", bind=True, max_retries=2)
def process_video(self, job_id: str, config: dict) -> dict:  # type: ignore[no-untyped-def]
    """Stub task. Real pipeline implemented in Milestone 4.

    Steps (planned):
      1. download / fetch from R2
      2. faster-whisper transcribe (word timestamps)
      3. chunk transcript -> Groq scoring -> top-N selection
      4. ffmpeg cut + mediapipe face-track crop 9:16
      5. ass subtitle generate + burn-in
      6. upload clips + thumbnails to R2
      7. POST progress updates back to NestJS API
    """
    log.info("process_video_received", job_id=job_id, config=config, attempt=self.request.retries)
    return {"job_id": job_id, "status": "stub_completed"}
