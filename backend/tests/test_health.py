from fastapi.testclient import TestClient

from app.main import app

client = TestClient(app)


def test_health_endpoint():
    response = client.get("/api/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ok"
    assert data["app_name"] == "CodeOracle"
    assert data["version"] == "0.1.0"
    assert "environment" in data
    assert "database" in data
    assert data["database"]["reachable"] is True
    assert data["database"]["backend"] in ("sqlite", "postgresql")
