from fastapi.testclient import TestClient
from app.database import Base, engine
from app.main import app

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


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


def test_application_lifespan_starts_and_reports_database():
    with TestClient(app) as lifespan_client:
        response = lifespan_client.get("/api/health")
        assert response.status_code == 200
        assert response.json()["database"]["schema_ready"] is True


def test_list_recent_projects_endpoint():
    response = client.get("/api/projects?limit=5")
    assert response.status_code == 200
    data = response.json()
    assert "total" in data
    assert "projects" in data
    assert isinstance(data["projects"], list)
