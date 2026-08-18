"""Route-contract tests for the retired PDF-answer worker."""

from main import app


def test_health_routes_are_exposed():
    paths = {route.path for route in app.routes}
    assert "/" in paths
    assert "/health" in paths


def test_answer_and_pdf_scanners_are_not_exposed():
    paths = {route.path for route in app.routes}
    assert "/extract-answers" not in paths
    assert "/extract-bank-questions" not in paths
    assert "/parse-pdf" not in paths
    assert "/parse-text" not in paths
