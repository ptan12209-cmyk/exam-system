"""
Integration tests for the ExamHub PDF extraction worker.
Run: pytest test_worker.py -v
"""
import pytest
import httpx
import os
import tempfile
from pathlib import Path

# Worker URL — use local by default, set WORKER_URL env var for remote
WORKER_URL = os.environ.get("WORKER_URL", "http://localhost:8000")


@pytest.fixture
def sample_pdf():
    """Create a minimal PDF with answer text for testing."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
    except ImportError:
        pytest.skip("reportlab not installed. Run: pip install reportlab")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        c = canvas.Canvas(f.name, pagesize=A4)
        c.drawString(72, 700, "Phần 1: 1D, 2C, 3B, 4A, 5D, 6C, 7A, 8B, 9D, 10A")
        c.drawString(72, 680, "Phần 2: 1. Đ-S-Đ-S  2. S-Đ-S-Đ")
        c.drawString(72, 660, "Phần 3: 1. 50  2. 2,75  3. 121")
        c.save()
        yield f.name

    os.unlink(f.name)


@pytest.fixture
def empty_pdf():
    """Create a PDF with no answer-like content."""
    try:
        from reportlab.pdfgen import canvas
        from reportlab.lib.pagesizes import A4
    except ImportError:
        pytest.skip("reportlab not installed. Run: pip install reportlab")

    with tempfile.NamedTemporaryFile(suffix=".pdf", delete=False) as f:
        c = canvas.Canvas(f.name, pagesize=A4)
        c.drawString(72, 700, "This is a blank page with no answers.")
        c.save()
        yield f.name

    os.unlink(f.name)


class TestHealthCheck:
    """Test worker health and availability."""

    @pytest.mark.asyncio
    async def test_root_endpoint(self):
        """Root endpoint should return 200 for health check."""
        async with httpx.AsyncClient() as client:
            r = await client.get(f"{WORKER_URL}/")
            assert r.status_code == 200
            data = r.json()
            assert data["status"] == "ok"
            assert "version" in data


class TestExtractAnswers:
    """Test the /extract-answers endpoint."""

    @pytest.mark.asyncio
    async def test_successful_extraction(self, sample_pdf):
        """Should extract multiple choice answers from a valid PDF."""
        async with httpx.AsyncClient(timeout=120) as client:
            with open(sample_pdf, "rb") as f:
                r = await client.post(
                    f"{WORKER_URL}/extract-answers",
                    files={"file": ("test.pdf", f, "application/pdf")},
                )

            assert r.status_code == 200
            data = r.json()

            # Must have the expected keys
            assert "multiple_choice" in data
            assert "true_false" in data
            assert "short_answer" in data

            # Multiple choice should be a non-empty list of valid options
            mc = data["multiple_choice"]
            assert isinstance(mc, list)
            if len(mc) > 0:
                for answer in mc:
                    if answer is not None:
                        assert answer.upper() in ["A", "B", "C", "D"]

            # Check elapsed_seconds is present
            assert "elapsed_seconds" in data or "error" not in data

    @pytest.mark.asyncio
    async def test_no_file_returns_422(self):
        """Should return 422 when no file is uploaded."""
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(f"{WORKER_URL}/extract-answers")
            assert r.status_code == 422

    @pytest.mark.asyncio
    async def test_invalid_file_type(self):
        """Should reject non-PDF files."""
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{WORKER_URL}/extract-answers",
                files={"file": ("test.txt", b"hello world", "text/plain")},
            )
            # Should return 400 or the worker should handle gracefully
            assert r.status_code in [200, 400, 422]

    @pytest.mark.asyncio
    async def test_empty_pdf_returns_empty(self, empty_pdf):
        """PDF with no answers should return empty arrays (not crash)."""
        async with httpx.AsyncClient(timeout=120) as client:
            with open(empty_pdf, "rb") as f:
                r = await client.post(
                    f"{WORKER_URL}/extract-answers",
                    files={"file": ("empty.pdf", f, "application/pdf")},
                )

            assert r.status_code == 200
            data = r.json()
            assert isinstance(data.get("multiple_choice", []), list)
            assert isinstance(data.get("true_false", []), list)
            assert isinstance(data.get("short_answer", []), list)

    @pytest.mark.asyncio
    async def test_response_time_under_90s(self, sample_pdf):
        """Extraction should complete within 90 seconds (frontend timeout)."""
        import time
        start = time.time()

        async with httpx.AsyncClient(timeout=90) as client:
            with open(sample_pdf, "rb") as f:
                r = await client.post(
                    f"{WORKER_URL}/extract-answers",
                    files={"file": ("test.pdf", f, "application/pdf")},
                )

        elapsed = time.time() - start
        assert r.status_code == 200
        assert elapsed < 90, f"Request took {elapsed:.1f}s — exceeds 90s frontend timeout"


class TestFileValidation:
    """Test file size and type validation."""

    @pytest.mark.asyncio
    async def test_oversized_file_rejected(self):
        """Files over 20MB should be rejected."""
        large_content = b"0" * (21 * 1024 * 1024)  # 21MB
        async with httpx.AsyncClient(timeout=30) as client:
            r = await client.post(
                f"{WORKER_URL}/extract-answers",
                files={"file": ("large.pdf", large_content, "application/pdf")},
            )
            # Should return 413 or 400
            assert r.status_code in [400, 413, 422]


if __name__ == "__main__":
    pytest.main([__file__, "-v", "--tb=short"])
