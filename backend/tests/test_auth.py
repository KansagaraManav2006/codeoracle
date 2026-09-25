import uuid
from datetime import datetime, timezone
import pytest
from fastapi.testclient import TestClient

from app.database import Base, engine, SessionLocal
from app.main import app
from app.models.db import Project, User

client = TestClient(app)


def setup_module():
    Base.metadata.create_all(bind=engine)


def test_register_and_login_flow():
    client.cookies.clear()
    test_email = f"test_{uuid.uuid4().hex[:8]}@example.com"
    test_password = "SecurePassword123!"

    # 1. Register new user
    reg_res = client.post("/api/auth/register", json={"email": test_email, "password": test_password})
    assert reg_res.status_code == 201
    reg_data = reg_res.json()
    assert reg_data["user"]["email"] == test_email
    assert "id" in reg_data["user"]
    # Should set session cookie on registration
    assert "codeoracle_session" in reg_res.cookies

    # 2. Duplicate registration should return 409
    dup_res = client.post("/api/auth/register", json={"email": test_email, "password": test_password})
    assert dup_res.status_code == 409

    # 3. /api/auth/me with session cookie
    me_res = client.get("/api/auth/me")
    assert me_res.status_code == 200
    assert me_res.json()["email"] == test_email

    # 4. /api/auth/me without session cookie
    client.cookies.clear()
    unauth_me = client.get("/api/auth/me")
    assert unauth_me.status_code == 401

    # 5. Login with invalid password
    bad_login = client.post("/api/auth/login", json={"email": test_email, "password": "wrongpassword"})
    assert bad_login.status_code == 401

    # 6. Login with correct password
    login_res = client.post("/api/auth/login", json={"email": test_email, "password": test_password})
    assert login_res.status_code == 200
    assert login_res.json()["user"]["email"] == test_email
    assert "codeoracle_session" in login_res.cookies

    # 7. Logout
    logout_res = client.post("/api/auth/logout")
    assert logout_res.status_code == 200

    # 8. Access /api/auth/me with logged out session
    after_logout_me = client.get("/api/auth/me")
    assert after_logout_me.status_code == 401


def test_project_ownership_isolation():
    client.cookies.clear()
    db = SessionLocal()
    try:
        # Create user A and user B
        user_a_email = f"user_a_{uuid.uuid4().hex[:8]}@example.com"
        user_b_email = f"user_b_{uuid.uuid4().hex[:8]}@example.com"

        res_a = client.post("/api/auth/register", json={"email": user_a_email, "password": "Password123!"})
        user_a_id = res_a.json()["user"]["id"]
        token_a = res_a.cookies.get("codeoracle_session")

        client.cookies.clear()
        res_b = client.post("/api/auth/register", json={"email": user_b_email, "password": "Password123!"})
        user_b_id = res_b.json()["user"]["id"]
        token_b = res_b.cookies.get("codeoracle_session")

        client.cookies.clear()

        # Create private project owned by user A
        proj_a_id = f"proj_priv_{uuid.uuid4().hex[:8]}"
        proj_a = Project(
            id=proj_a_id,
            user_id=user_a_id,
            is_public_demo=0,
            display_name="Private Project A",
            source_type="zip",
            total_files=1,
            total_lines=10,
            content_hash="mock_hash_a",
            workspace_id=f"ws_{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(proj_a)

        # Create public demo project
        proj_demo_id = f"proj_demo_{uuid.uuid4().hex[:8]}"
        proj_demo = Project(
            id=proj_demo_id,
            user_id=None,
            is_public_demo=1,
            display_name="Public Demo Project",
            source_type="demo_benchmark",
            total_files=2,
            total_lines=50,
            content_hash="mock_hash_demo",
            workspace_id=f"ws_{uuid.uuid4().hex[:8]}",
            created_at=datetime.now(timezone.utc),
        )
        db.add(proj_demo)
        db.commit()

        # User A can access User A's project
        client.cookies.set("codeoracle_session", token_a)
        access_a = client.get(f"/api/projects/{proj_a_id}")
        assert access_a.status_code == 200

        # User B CANNOT access User A's project (404 not found to prevent ID enumeration)
        client.cookies.set("codeoracle_session", token_b)
        access_b = client.get(f"/api/projects/{proj_a_id}")
        assert access_b.status_code == 404

        # Unauthenticated user CANNOT access User A's private project
        client.cookies.clear()
        access_anon = client.get(f"/api/projects/{proj_a_id}")
        assert access_anon.status_code == 404

        # Everyone can access public demo project
        client.cookies.set("codeoracle_session", token_a)
        assert client.get(f"/api/projects/{proj_demo_id}").status_code == 200

        client.cookies.set("codeoracle_session", token_b)
        assert client.get(f"/api/projects/{proj_demo_id}").status_code == 200

        client.cookies.clear()
        assert client.get(f"/api/projects/{proj_demo_id}").status_code == 200
    finally:
        db.close()
