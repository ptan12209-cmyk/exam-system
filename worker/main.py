"""Minimal health service.

AI/PDF answer extraction endpoints were intentionally removed. Exam answers are
now imported and validated as JSON inside the Next.js application.
"""

from fastapi import FastAPI


app = FastAPI(
    title="ExamHub Worker",
    description="Health endpoint for the retired PDF-answer worker deployment",
    version="2.0.0",
)


@app.get("/")
def root():
    """Root endpoint for hosting health checks."""
    return {
        "service": "examhub-worker",
        "version": "2.0.0",
        "status": "ok",
        "answer_import": "json-only",
    }


@app.get("/health")
def health_check():
    """Liveness endpoint."""
    return {"status": "ok", "service": "examhub-worker"}


if __name__ == "__main__":
    import uvicorn

    uvicorn.run(app, host="0.0.0.0", port=8000)
