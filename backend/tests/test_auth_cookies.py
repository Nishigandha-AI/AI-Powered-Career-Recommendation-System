"""Backend tests for cookie-based JWT auth migration."""
import os
import time
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://jobfit-ai-34.preview.emergentagent.com").rstrip("/")
API = f"{BASE_URL}/api"

EXISTING_EMAIL = "tester_1781956799@careermap.ai"
EXISTING_PWD = "TestPass123!"

NEW_EMAIL = f"tester_cookie_{int(time.time())}@careermap.ai"
NEW_PWD = "TestPass123!"


@pytest.fixture(scope="module")
def session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


# ---------- Health ----------
def test_root():
    r = requests.get(f"{API}/")
    assert r.status_code == 200
    assert r.json().get("status") == "operational"


# ---------- Signup sets cookie, no token in body ----------
def test_signup_sets_httponly_cookie(session):
    r = session.post(f"{API}/auth/signup", json={
        "email": NEW_EMAIL, "password": NEW_PWD, "full_name": "Cookie Tester"
    })
    assert r.status_code == 200, r.text
    body = r.json()
    # NO token in response body
    assert "token" not in body
    assert "access_token" not in body
    assert "user" in body
    assert body["user"]["email"] == NEW_EMAIL
    assert body["user"]["onboarding_completed"] is False
    # Cookie set
    assert "careermap_token" in session.cookies
    # Set-Cookie header should mark HttpOnly + Secure + SameSite
    set_cookie = r.headers.get("set-cookie", "").lower()
    assert "httponly" in set_cookie
    assert "secure" in set_cookie
    assert "samesite=lax" in set_cookie


def test_auth_me_uses_cookie(session):
    r = session.get(f"{API}/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == NEW_EMAIL
    assert "password" not in data
    assert "_id" not in data


def test_logout_clears_cookie(session):
    r = session.post(f"{API}/auth/logout")
    assert r.status_code == 200
    # After logout, /auth/me should be 401
    r2 = session.get(f"{API}/auth/me")
    assert r2.status_code == 401


def test_login_existing_user_sets_cookie():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PWD})
    assert r.status_code == 200, r.text
    body = r.json()
    assert "token" not in body
    assert body["user"]["email"] == EXISTING_EMAIL
    assert "careermap_token" in s.cookies
    set_cookie = r.headers.get("set-cookie", "").lower()
    assert "httponly" in set_cookie
    # protected endpoint works
    me = s.get(f"{API}/auth/me")
    assert me.status_code == 200


def test_login_invalid_credentials():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": "wrongpass"})
    assert r.status_code == 401


def test_auth_me_without_cookie_401():
    r = requests.get(f"{API}/auth/me")
    assert r.status_code == 401


def test_bearer_fallback_still_works():
    """Bearer token fallback for curl/testing must still function."""
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PWD})
    assert r.status_code == 200
    token = s.cookies.get("careermap_token")
    assert token
    # Use Bearer header on fresh session (no cookie)
    r2 = requests.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert r2.status_code == 200


# ---------- Protected endpoints reachable via cookie ----------
@pytest.fixture(scope="module")
def auth_session():
    s = requests.Session()
    r = s.post(f"{API}/auth/login", json={"email": EXISTING_EMAIL, "password": EXISTING_PWD})
    assert r.status_code == 200
    return s


def test_dashboard_endpoint(auth_session):
    r = auth_session.get(f"{API}/dashboard")
    assert r.status_code == 200
    data = r.json()
    for k in ["readiness_score", "saved_jobs", "applied_jobs", "interviews",
              "completed_milestones", "profile_completion", "skills_count"]:
        assert k in data


def test_profile_endpoint(auth_session):
    r = auth_session.get(f"{API}/profile")
    assert r.status_code == 200
    assert isinstance(r.json(), dict)


def test_recommendations_endpoint(auth_session):
    r = auth_session.get(f"{API}/recommendations")
    assert r.status_code == 200
    body = r.json()
    assert "recommendations" in body


def test_saved_jobs_endpoint(auth_session):
    r = auth_session.get(f"{API}/jobs/saved")
    assert r.status_code == 200
    assert isinstance(r.json(), list)


def test_jobs_browse(auth_session):
    r = auth_session.get(f"{API}/jobs", timeout=45)
    assert r.status_code == 200
    body = r.json()
    assert "jobs" in body
    assert isinstance(body["jobs"], list)


def test_chat_endpoint(auth_session):
    r = auth_session.post(f"{API}/chat", json={"message": "Give me one quick career tip in 1 sentence."}, timeout=60)
    assert r.status_code == 200
    body = r.json()
    assert "reply" in body and len(body["reply"]) > 0


# ---------- CORS preflight returns explicit origin + allow-credentials ----------
def test_cors_credentials_explicit_origin():
    origin = BASE_URL
    r = requests.options(f"{API}/auth/login", headers={
        "Origin": origin,
        "Access-Control-Request-Method": "POST",
        "Access-Control-Request-Headers": "content-type",
    })
    # FastAPI CORS returns 200 on preflight
    assert r.status_code in (200, 204), r.text
    assert r.headers.get("access-control-allow-credentials", "").lower() == "true"
    allowed = r.headers.get("access-control-allow-origin", "")
    assert allowed == origin  # must be explicit, NOT '*'


# ---------- Onboarding gate flow on new account ----------
def test_onboarding_flow_new_user():
    s = requests.Session()
    email = f"tester_onb_{int(time.time())}@careermap.ai"
    r = s.post(f"{API}/auth/signup", json={"email": email, "password": NEW_PWD, "full_name": "Onb Tester"})
    assert r.status_code == 200
    me = s.get(f"{API}/auth/me").json()
    assert me["onboarding_completed"] is False
    # Update profile
    pr = s.put(f"{API}/profile", json={
        "skills": ["Python"], "interests": ["AI"], "education_level": "Diploma",
        "experience_level": "Intern", "job_type": "Internship", "work_mode": "Remote",
        "career_interests": ["Software"],
    })
    assert pr.status_code == 200
    cr = s.post(f"{API}/onboarding/complete")
    assert cr.status_code == 200
    me2 = s.get(f"{API}/auth/me").json()
    assert me2["onboarding_completed"] is True
