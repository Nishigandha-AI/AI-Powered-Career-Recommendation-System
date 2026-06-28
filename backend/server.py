"""CareerMap AI - FastAPI backend with JWT auth, Claude AI, resume parsing, and job scraping."""
from fastapi import FastAPI, APIRouter, HTTPException, Depends, UploadFile, File, status, Request, Response
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
import json
import io
import re
import asyncio
import uuid
from pathlib import Path
from pydantic import BaseModel, Field, EmailStr, ConfigDict
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone, timedelta
import jwt as pyjwt
import bcrypt
import httpx
import pypdf
import docx as docxlib
from ai_service import llm_call

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

MONGO_URL = os.environ['MONGO_URL']
DB_NAME = os.environ['DB_NAME']
JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALG = os.environ.get('JWT_ALGORITHM', 'HS256')
JWT_EXPIRY = int(os.environ.get('JWT_EXPIRY_HOURS', 168))

client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]

app = FastAPI(title="CareerMap AI")
api = APIRouter(prefix="/api")

AUTH_COOKIE = "careermap_token"
COOKIE_MAX_AGE = JWT_EXPIRY * 3600

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============ MODELS ============
class SignupRequest(BaseModel):
    email: EmailStr
    password: str
    full_name: str

class LoginRequest(BaseModel):
    email: EmailStr
    password: str

class ProfileUpdate(BaseModel):
    skills: List[str] = []
    interests: List[str] = []
    education: str = ""
    education_level: str = ""
    graduation_year: str = ""
    current_location: str = ""
    experience: str = ""
    experience_level: str = ""
    career_goals: str = ""
    preferred_location: str = ""
    career_preferences: str = ""
    job_type: str = ""
    work_mode: str = ""
    career_interests: List[str] = []
    resume_text: str = ""

class ChatMessage(BaseModel):
    message: str
    session_id: Optional[str] = None

class SavedJobReq(BaseModel):
    job_id: str
    title: str
    company: str
    location: str
    url: str
    salary: Optional[str] = None
    status: str = "saved"  # saved, applied, interviewing, offer, rejected

class JobStatusUpdate(BaseModel):
    status: str

class RoadmapProgress(BaseModel):
    career_id: str
    step_index: int
    completed: bool

# ============ AUTH ============
def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt()).decode()

def verify_password(p: str, h: str) -> bool:
    return bcrypt.checkpw(p.encode(), h.encode())

def make_token(user_id: str) -> str:
    payload = {
        "user_id": user_id,
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY),
        "iat": datetime.now(timezone.utc),
    }
    return pyjwt.encode(payload, JWT_SECRET, algorithm=JWT_ALG)

def set_auth_cookie(response: Response, token: str):
    response.set_cookie(
        key=AUTH_COOKIE, value=token, httponly=True, secure=True,
        samesite="lax", max_age=COOKIE_MAX_AGE, path="/",
    )

async def get_current_user(request: Request):
    token = request.cookies.get(AUTH_COOKIE)
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(401, "Not authenticated")
    try:
        payload = pyjwt.decode(token, JWT_SECRET, algorithms=[JWT_ALG])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password": 0})
        if not user:
            raise HTTPException(401, "User not found")
        return user
    except pyjwt.PyJWTError:
        raise HTTPException(401, "Invalid token")

# ============ HELPERS ============
def extract_pdf_text(data: bytes) -> str:
    reader = pypdf.PdfReader(io.BytesIO(data))
    return "\n".join((p.extract_text() or "") for p in reader.pages)

def extract_docx_text(data: bytes) -> str:
    doc = docxlib.Document(io.BytesIO(data))
    return "\n".join(p.text for p in doc.paragraphs)

def parse_json_from_llm(text: str) -> Any:
    """Extract JSON object/array from LLM output even if wrapped in markdown."""
    text = text.strip()
    m = re.search(r'```(?:json)?\s*([\s\S]*?)```', text)
    if m:
        text = m.group(1).strip()
    # find first { or [
    for start_ch, end_ch in [('{', '}'), ('[', ']')]:
        i = text.find(start_ch)
        if i >= 0:
            j = text.rfind(end_ch)
            if j > i:
                try:
                    return json.loads(text[i:j+1])
                except Exception:
                    pass
    return None

# ============ ROUTES ============
@api.get("/")
async def root():
    return {"message": "CareerMap AI API", "status": "operational"}

@api.post("/auth/signup")
async def signup(req: SignupRequest, response: Response):
    if await db.users.find_one({"email": req.email}):
        raise HTTPException(400, "Email already registered")
    user_id = str(uuid.uuid4())
    user = {
        "id": user_id,
        "email": req.email,
        "full_name": req.full_name,
        "password": hash_password(req.password),
        "created_at": datetime.now(timezone.utc).isoformat(),
        "onboarding_completed": False,
        "profile": {
            "skills": [], "interests": [], "education": "", "education_level": "",
            "graduation_year": "", "current_location": "", "experience": "", "experience_level": "",
            "career_goals": "", "preferred_location": "", "career_preferences": "",
            "job_type": "", "work_mode": "", "career_interests": [],
            "resume_text": "", "resume_filename": "",
        },
    }
    await db.users.insert_one(user)
    set_auth_cookie(response, make_token(user_id))
    return {"user": {"id": user_id, "email": req.email, "full_name": req.full_name, "onboarding_completed": False}}

@api.post("/auth/login")
async def login(req: LoginRequest, response: Response):
    user = await db.users.find_one({"email": req.email})
    if not user or not verify_password(req.password, user["password"]):
        raise HTTPException(401, "Invalid credentials")
    set_auth_cookie(response, make_token(user["id"]))
    return {"user": {"id": user["id"], "email": user["email"], "full_name": user["full_name"], "onboarding_completed": user.get("onboarding_completed", False)}}

@api.post("/auth/logout")
async def logout(response: Response):
    response.delete_cookie(key=AUTH_COOKIE, path="/")
    return {"status": "ok"}

@api.get("/auth/me")
async def me(user=Depends(get_current_user)):
    return user

@api.get("/profile")
async def get_profile(user=Depends(get_current_user)):
    return user.get("profile", {})

@api.put("/profile")
async def update_profile(p: ProfileUpdate, user=Depends(get_current_user)):
    profile = {**user.get("profile", {}), **p.model_dump()}
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": profile}})
    return profile

@api.post("/onboarding/complete")
async def complete_onboarding(user=Depends(get_current_user)):
    await db.users.update_one({"id": user["id"]}, {"$set": {"onboarding_completed": True}})
    return {"status": "ok"}

@api.post("/profile/resume")
async def upload_resume(file: UploadFile = File(...), user=Depends(get_current_user)):
    data = await file.read()
    fn = (file.filename or "").lower()
    try:
        if fn.endswith(".pdf"):
            text = extract_pdf_text(data)
        elif fn.endswith(".docx"):
            text = extract_docx_text(data)
        elif fn.endswith(".txt"):
            text = data.decode("utf-8", errors="ignore")
        else:
            raise HTTPException(400, "Upload PDF, DOCX, or TXT")
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(400, f"Could not parse: {e}")
    # Use AI to extract structured data from resume
    sys = "You extract structured info from resumes. Return ONLY valid JSON, no markdown."
    prompt = f"""Resume text:
---
{text[:8000]}
---
Return JSON: {{"skills": ["skill1",...], "education": "summary", "experience": "summary", "interests": ["..."]}}"""
    try:
        raw = await llm_call(sys, prompt, f"resume-{user['id']}")
        parsed = parse_json_from_llm(raw) or {}
    except Exception as e:
        logger.exception("resume parse failed: %s", e)
        parsed = {}
    profile = user.get("profile", {})
    profile["resume_text"] = text
    profile["resume_filename"] = file.filename
    if parsed.get("skills"): profile["skills"] = list(set(profile.get("skills", []) + parsed["skills"]))[:30]
    if parsed.get("interests"): profile["interests"] = list(set(profile.get("interests", []) + parsed["interests"]))[:20]
    if parsed.get("education") and not profile.get("education"): profile["education"] = parsed["education"]
    if parsed.get("experience") and not profile.get("experience"): profile["experience"] = parsed["experience"]
    await db.users.update_one({"id": user["id"]}, {"$set": {"profile": profile}})
    return {"profile": profile, "extracted": parsed}

@api.post("/recommendations/generate")
async def generate_recommendations(user=Depends(get_current_user)):
    p = user.get("profile", {})
    sys = "You are an elite career advisor with deep knowledge of job markets, salaries, and skill requirements. Always return ONLY valid JSON, no markdown."
    prompt = f"""User profile:
- Skills: {', '.join(p.get('skills', [])) or 'none'}
- Interests: {', '.join(p.get('interests', [])) or 'none'}
- Education: {p.get('education', 'n/a')}
- Experience: {p.get('experience', 'n/a')}
- Career goals: {p.get('career_goals', 'n/a')}
- Preferred location: {p.get('preferred_location', 'any')}
- Preferences: {p.get('career_preferences', 'n/a')}

Generate 4 distinct career path recommendations as JSON array. Each item:
{{
  "id": "kebab-case-id",
  "title": "Career title",
  "match_score": 0-100 integer,
  "explanation": "1-2 sentence why this fits",
  "salary_insight": "e.g. $80k-$140k USD",
  "market_demand": "High/Medium/Low + 1 short sentence",
  "growth_potential": "High/Medium/Low + 1 short sentence",
  "required_skills": ["skill1",...6 items],
  "missing_skills": ["skills user lacks vs required"],
  "roadmap": [
    {{"milestone":"Title", "duration":"4 weeks", "tasks":["task1","task2","task3"]}}
    ... 4 milestones from beginner to job-ready
  ]
}}
Be concise. Return ONLY the JSON array, no prose."""
    recs: list = []
    try:
        raw = await llm_call(sys, prompt, f"rec-{user['id']}")
        recs = parse_json_from_llm(raw) or []
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("rec failed: %s", e)
        raise HTTPException(500, "Recommendation generation failed")
    if not isinstance(recs, list):
        recs = []
    readiness = 0
    if recs:
        scores = []
        for r in recs[:3]:
            req = set(s.lower() for s in r.get("required_skills", []))
            have = set(s.lower() for s in p.get("skills", []))
            if req:
                scores.append(len(req & have) / len(req) * 100)
        readiness = int(sum(scores) / len(scores)) if scores else 0
    doc = {
        "user_id": user["id"],
        "recommendations": recs,
        "readiness_score": readiness,
        "generated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.recommendations.replace_one({"user_id": user["id"]}, doc, upsert=True)
    return {"recommendations": recs, "readiness_score": readiness}

@api.get("/recommendations")
async def get_recommendations(user=Depends(get_current_user)):
    doc = await db.recommendations.find_one({"user_id": user["id"]}, {"_id": 0})
    return doc or {"recommendations": [], "readiness_score": 0}

@api.post("/skills/gap-analysis")
async def skill_gap(payload: dict, user=Depends(get_current_user)):
    career_title = payload.get("career_title", "")
    required = payload.get("required_skills", [])
    p = user.get("profile", {})
    have = [s.lower() for s in p.get("skills", [])]
    missing = [s for s in required if s.lower() not in have]
    present = [s for s in required if s.lower() in have]
    return {
        "career_title": career_title,
        "present_skills": present,
        "missing_skills": missing,
        "completion_pct": int(len(present) / len(required) * 100) if required else 0,
    }

@api.post("/resources/for-skill")
async def resources_for_skill(payload: dict, user=Depends(get_current_user)):
    skill = payload.get("skill", "")
    level = payload.get("level", "beginner")
    if not skill:
        raise HTTPException(400, "skill required")
    cached = await db.resources_cache.find_one({"skill": skill.lower(), "level": level}, {"_id": 0})
    if cached:
        return cached.get("data", {})
    sys = "You curate the best learning resources. Return ONLY valid JSON, no markdown."
    prompt = f"""For learning "{skill}" at {level} level, return JSON:
{{
  "youtube": [{{"title":"...","channel":"...","url":"https://youtube.com/...","why":"short reason"}}, ... 4 items],
  "docs": [{{"title":"...","url":"https://...","why":"..."}}, ... 3 items, official docs],
  "courses": [{{"title":"...","provider":"Coursera/Udemy/edX/freeCodeCamp","url":"https://...","why":"..."}}, ... 4 items],
  "github": [{{"title":"repo","url":"https://github.com/...","why":"..."}}, ... 3 items popular repos],
  "articles": [{{"title":"...","source":"Medium/Dev.to/blog","url":"https://...","why":"..."}}, ... 3 items],
  "practice": [{{"title":"...","platform":"LeetCode/HackerRank/etc","url":"https://...","why":"..."}}, ... 3 items]
}}
Use real, well-known URLs. Return ONLY the JSON."""
    try:
        raw = await llm_call(sys, prompt, f"res-{user['id']}-{skill}")
        data = parse_json_from_llm(raw) or {}
    except Exception as e:
        logger.exception("resources failed: %s", e)
        data = {}
    await db.resources_cache.insert_one({"skill": skill.lower(), "level": level, "data": data, "cached_at": datetime.now(timezone.utc).isoformat()})
    return data

@api.post("/chat")
async def chat(req: ChatMessage, user=Depends(get_current_user)):
    session_id = req.session_id or f"chat-{user['id']}-{uuid.uuid4().hex[:8]}"
    p = user.get("profile", {})
    sys = f"""You are CareerMap AI, an expert career coach. You help with career planning, resume improvement, interview prep, skill development, learning guidance, and job search. Be concise, actionable, and supportive. Use markdown for structure.

User context:
- Name: {user.get('full_name','')}
- Skills: {', '.join(p.get('skills', [])) or 'not provided'}
- Goals: {p.get('career_goals') or 'not provided'}
- Experience: {(p.get('experience') or 'not provided')[:300]}"""
    reply: str = ""
    try:
        reply = await llm_call(sys, req.message, session_id)
    except HTTPException:
        raise
    except Exception as e:
        logger.exception("chat failed: %s", e)
        raise HTTPException(500, "Chat failed")
    msg_doc = {
        "user_id": user["id"], "session_id": session_id,
        "user_message": req.message, "assistant_message": reply,
        "created_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.chat_messages.insert_one(msg_doc)
    return {"reply": reply, "session_id": session_id}

@api.get("/chat/history")
async def chat_history(session_id: Optional[str] = None, user=Depends(get_current_user)):
    q = {"user_id": user["id"]}
    if session_id: q["session_id"] = session_id
    msgs = await db.chat_messages.find(q, {"_id": 0}).sort("created_at", 1).to_list(200)
    return msgs

# -------- Live Jobs via Remotive (free public API, no key) ----------
@api.get("/jobs")
async def jobs(search: Optional[str] = None, internships_only: Optional[bool] = None, user=Depends(get_current_user)):
    """India-focused jobs: JSearch (LinkedIn/Indeed/Glassdoor aggregator) + TheMuse + Remotive fallback."""
    p = user.get("profile", {})
    user_skills = set(s.lower() for s in p.get("skills", []))
    is_intern = internships_only if internships_only is not None else (p.get("job_type") == "Internship")
    exp_level = p.get("experience_level", "")
    # Map experience level -> JSearch filter and keyword boost
    exp_keyword = ""
    jsearch_exp = ""
    if exp_level in ("Fresher", "Intern", "0-1 Years"):
        exp_keyword = "entry level"
        jsearch_exp = "under_3_years_experience"
    elif exp_level == "1-3 Years":
        jsearch_exp = "under_3_years_experience"
    elif exp_level == "3+ Years":
        jsearch_exp = "more_than_3_years_experience"
    senior_kw = ["senior", "sr.", "lead", "principal", "staff", "manager", "head", "director", "architect", "vp"]
    is_fresher = exp_level in ("Fresher", "Intern", "0-1 Years")
    def _drop(title): return is_fresher and any(k in (title or "").lower() for k in senior_kw)
    keyword = search or ""
    if not keyword:
        rec = await db.recommendations.find_one({"user_id": user["id"]})
        if rec and rec.get("recommendations"):
            keyword = rec["recommendations"][0].get("title", "")
        elif user_skills:
            keyword = list(user_skills)[0]
    if is_intern and "intern" not in keyword.lower():
        keyword = f"{keyword} internship".strip()
    if exp_keyword and exp_keyword not in keyword.lower():
        keyword = f"{exp_keyword} {keyword}".strip()

    results = []
    jsearch_key = os.environ.get("JSEARCH_API_KEY", "")
    adz_id = os.environ.get("ADZUNA_APP_ID", "")
    adz_key = os.environ.get("ADZUNA_APP_KEY", "")
    try:
        async with httpx.AsyncClient(timeout=20) as h:
            # 0. Adzuna India
            if adz_id and adz_key:
                try:
                    az = await h.get(
                        "https://api.adzuna.com/v1/api/jobs/in/search/1",
                        params={"app_id": adz_id, "app_key": adz_key, "results_per_page": "20",
                                "what": keyword or "developer",
                                "category": "it-jobs" if is_intern else "",
                                "content-type": "application/json"},
                    )
                    if az.status_code == 200:
                        for j in (az.json().get("results") or [])[:20]:
                            title = j.get("title", "")
                            if is_intern and "intern" not in title.lower():
                                continue
                            tags = [(j.get("category") or {}).get("label", "").lower()]
                            match = int(len(set(tags) & user_skills) / max(len(tags) or 1, 1) * 100) if user_skills else 55
                            sal_min = j.get("salary_min"); sal_max = j.get("salary_max")
                            salary = f"₹{int(sal_min/1000)}k-{int(sal_max/1000)}k" if sal_min and sal_max else None
                            if _drop(title): continue
                            results.append({
                                "id": f"adz-{j.get('id')}",
                                "title": title,
                                "company": (j.get("company") or {}).get("display_name", ""),
                                "location": (j.get("location") or {}).get("display_name", "India"),
                                "url": j.get("redirect_url"),
                                "category": (j.get("category") or {}).get("label"),
                                "job_type": j.get("contract_time") or "Full Time",
                                "salary": salary,
                                "publication_date": j.get("created"),
                                "description_snippet": (j.get("description") or "")[:240],
                                "tags": tags,
                                "match_score": match,
                                "source": "adzuna",
                            })
                except Exception as e:
                    logger.warning("adzuna failed: %s", e)

            # 1. JSearch (RapidAPI) — primary India source
            if jsearch_key:
                try:
                    jr = await h.get(
                        "https://jsearch.p.rapidapi.com/search",
                        params={"query": f"{keyword or 'developer'} in India", "country": "in", "page": "1", "num_pages": "1",
                                "employment_types": "INTERN" if is_intern else "FULLTIME,PARTTIME,CONTRACTOR"},
                        headers={"X-RapidAPI-Key": jsearch_key, "X-RapidAPI-Host": "jsearch.p.rapidapi.com"},
                    )
                    if jr.status_code == 200:
                        for j in (jr.json().get("data") or [])[:25]:
                            tags = []
                            if j.get("job_required_skills"): tags = [s.lower() for s in j["job_required_skills"]]
                            match = int(len(set(tags) & user_skills) / max(len(tags) or 1, 1) * 100) if user_skills and tags else 60
                            loc = ", ".join(filter(None, [j.get("job_city"), j.get("job_state"), j.get("job_country")])) or "India"
                            if _drop(j.get("job_title")): continue
                            results.append({
                                "id": f"jse-{j.get('job_id')}",
                                "title": j.get("job_title"),
                                "company": j.get("employer_name"),
                                "location": loc,
                                "url": j.get("job_apply_link") or j.get("job_google_link"),
                                "category": j.get("job_publisher"),
                                "job_type": j.get("job_employment_type"),
                                "salary": (f"{j.get('job_min_salary','')}-{j.get('job_max_salary','')} {j.get('job_salary_currency','')}".strip() if j.get("job_min_salary") else None),
                                "publication_date": j.get("job_posted_at_datetime_utc"),
                                "description_snippet": (j.get("job_description") or "")[:240],
                                "tags": tags or [j.get("job_publisher", "")],
                                "match_score": match,
                                "source": "jsearch",
                            })
                except Exception as e:
                    logger.warning("jsearch failed: %s", e)

            # 2. TheMuse — India locations
            try:
                r = await h.get("https://www.themuse.com/api/public/jobs", params=[("location", "India"), ("page", "1")])
                muse = r.json().get("results", []) if r.status_code == 200 else []
                for j in muse[:20]:
                    if is_intern and "intern" not in (j.get("name") or "").lower():
                        continue
                    locs = ", ".join(loc.get("name", "") for loc in (j.get("locations") or []))
                    cats = [c.get("name", "") for c in (j.get("categories") or [])]
                    tags = [t.lower() for t in cats]
                    match = int(len(set(tags) & user_skills) / max(len(tags) or 1, 1) * 100) if user_skills else 50
                    snippet = re.sub(r'<[^>]+>', '', (j.get("contents") or ""))[:240]
                    if _drop(j.get("name")): continue
                    results.append({
                        "id": f"muse-{j.get('id')}",
                        "title": j.get("name"),
                        "company": (j.get("company") or {}).get("name", ""),
                        "location": locs or "India",
                        "url": (j.get("refs") or {}).get("landing_page", ""),
                        "category": cats[0] if cats else None,
                        "job_type": "Internship" if "intern" in (j.get("name") or "").lower() else "Full Time",
                        "salary": None,
                        "publication_date": j.get("publication_date"),
                        "description_snippet": snippet,
                        "tags": cats,
                        "match_score": match,
                        "source": "themuse",
                    })
            except Exception as e:
                logger.warning("themuse failed: %s", e)

            # 3. Remotive — India-friendly remote roles
            try:
                r2 = await h.get("https://remotive.com/api/remote-jobs", params={"search": keyword or "software"})
                rem = r2.json().get("jobs", []) if r2.status_code == 200 else []
                for j in rem[:15]:
                    loc = (j.get("candidate_required_location") or "").lower()
                    if not ("worldwide" in loc or "india" in loc or "asia" in loc or loc == ""):
                        continue
                    if is_intern and "intern" not in (j.get("title") or "").lower():
                        continue
                    tags = [t.lower() for t in j.get("tags", [])]
                    match = int(len(set(tags) & user_skills) / max(len(tags) or 1, 1) * 100) if user_skills else 30
                    if _drop(j.get("title")): continue
                    results.append({
                        "id": f"rem-{j.get('id')}",
                        "title": j.get("title"),
                        "company": j.get("company_name"),
                        "location": j.get("candidate_required_location") or "Remote",
                        "url": j.get("url"),
                        "category": j.get("category"),
                        "job_type": j.get("job_type"),
                        "salary": j.get("salary") or None,
                        "publication_date": j.get("publication_date"),
                        "description_snippet": re.sub(r'<[^>]+>', '', (j.get("description") or ""))[:240],
                        "tags": j.get("tags", []),
                        "match_score": match,
                        "source": "remotive",
                    })
            except Exception as e:
                logger.warning("remotive failed: %s", e)
    except Exception as e:
        logger.exception("jobs fetch failed: %s", e)

    # dedupe by URL
    seen = set(); unique = []
    for j in results:
        u = j.get("url") or j["id"]
        if u in seen: continue
        seen.add(u); unique.append(j)
    unique.sort(key=lambda x: x["match_score"], reverse=True)
    return {"jobs": unique, "keyword": keyword, "is_intern": is_intern}


class ResumeTailorReq(BaseModel):
    career_title: str
    required_skills: List[str] = []
    missing_skills: List[str] = []


@api.post("/resume/tailor")
async def tailor_resume(req: ResumeTailorReq, user=Depends(get_current_user)):
    p = user.get("profile", {})
    resume_text = (p.get("resume_text") or "")[:6000]
    if not resume_text and not (p.get("skills") or p.get("experience")):
        raise HTTPException(400, "Add a resume or skills/experience to your profile first")
    sys = "You are an elite resume strategist. Output ONLY valid JSON, no markdown."
    prompt = f"""Tailor the user's resume to target the career: "{req.career_title}".
Required skills for this role: {', '.join(req.required_skills) or 'n/a'}
Skills the user lacks: {', '.join(req.missing_skills) or 'none'}

User profile:
- Skills: {', '.join(p.get('skills', [])) or 'none'}
- Experience: {(p.get('experience') or 'n/a')[:500]}
- Education: {p.get('education', 'n/a')}
- Goals: {p.get('career_goals', 'n/a')}

User resume:
---
{resume_text or '(no resume uploaded)'}
---

Return JSON:
{{
  "summary": "2-3 sentence tailored professional summary that emphasizes fit for {req.career_title}",
  "bullets": ["6-8 rewritten resume bullets, each starting with a strong action verb and including quantified impact when possible. Emphasize required skills and downplay irrelevant ones."],
  "skills_to_highlight": ["6-10 skills from user that match this role, ordered by relevance"],
  "skills_to_acquire": ["3-5 missing skills the user should add — with brief 'how' suggestion"],
  "keyword_optimizations": ["5-7 ATS-friendly keywords/phrases to weave into the resume"]
}}
Return ONLY the JSON."""
    data: dict = {}
    try:
        raw = await llm_call(sys, prompt, f"tailor-{user['id']}-{req.career_title[:20]}")
        data = parse_json_from_llm(raw) or {}
    except Exception as e:
        logger.exception("tailor failed: %s", e)
        raise HTTPException(500, "Tailoring failed")
    return data


class SaveTailoredReq(BaseModel):
    career_title: str
    data: Dict[str, Any]


@api.post("/resume/tailor/save")
async def save_tailored(req: SaveTailoredReq, user=Depends(get_current_user)):
    doc = {
        "user_id": user["id"],
        "career_title": req.career_title,
        "data": req.data,
        "saved_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.tailored_resumes.replace_one(
        {"user_id": user["id"], "career_title": req.career_title},
        doc, upsert=True,
    )
    return {"status": "saved", "career_title": req.career_title}


@api.get("/resume/tailor/saved")
async def list_tailored(user=Depends(get_current_user)):
    rows = await db.tailored_resumes.find({"user_id": user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(50)
    return rows

@api.get("/jobs/saved")
async def saved_jobs(user=Depends(get_current_user)):
    jobs = await db.saved_jobs.find({"user_id": user["id"]}, {"_id": 0}).sort("saved_at", -1).to_list(200)
    return jobs

@api.post("/jobs/save")
async def save_job(req: SavedJobReq, user=Depends(get_current_user)):
    existing = await db.saved_jobs.find_one({"user_id": user["id"], "job_id": req.job_id})
    if existing:
        raise HTTPException(400, "Job already saved")
    doc = {**req.model_dump(), "user_id": user["id"], "saved_at": datetime.now(timezone.utc).isoformat()}
    await db.saved_jobs.insert_one(doc)
    doc.pop("_id", None)
    return doc

@api.put("/jobs/saved/{job_id}/status")
async def update_job_status(job_id: str, req: JobStatusUpdate, user=Depends(get_current_user)):
    r = await db.saved_jobs.update_one(
        {"user_id": user["id"], "job_id": job_id},
        {"$set": {"status": req.status, "updated_at": datetime.now(timezone.utc).isoformat()}},
    )
    if r.matched_count == 0:
        raise HTTPException(404, "Saved job not found")
    return {"status": "ok"}

@api.delete("/jobs/saved/{job_id}")
async def delete_saved_job(job_id: str, user=Depends(get_current_user)):
    await db.saved_jobs.delete_one({"user_id": user["id"], "job_id": job_id})
    return {"status": "ok"}

# -------- Roadmap progress ---------
@api.post("/roadmap/progress")
async def set_progress(req: RoadmapProgress, user=Depends(get_current_user)):
    key = f"{req.career_id}:{req.step_index}"
    await db.progress.update_one(
        {"user_id": user["id"], "key": key},
        {"$set": {"user_id": user["id"], "key": key, "career_id": req.career_id, "step_index": req.step_index, "completed": req.completed, "updated_at": datetime.now(timezone.utc).isoformat()}},
        upsert=True,
    )
    return {"status": "ok"}

@api.get("/roadmap/progress/{career_id}")
async def get_progress(career_id: str, user=Depends(get_current_user)):
    rows = await db.progress.find({"user_id": user["id"], "career_id": career_id}, {"_id": 0}).to_list(100)
    return {r["step_index"]: r["completed"] for r in rows}

# -------- Dashboard analytics ---------
@api.get("/dashboard")
async def dashboard(user=Depends(get_current_user)):
    rec = await db.recommendations.find_one({"user_id": user["id"]}, {"_id": 0})
    saved_count = await db.saved_jobs.count_documents({"user_id": user["id"]})
    applied_count = await db.saved_jobs.count_documents({"user_id": user["id"], "status": "applied"})
    interview_count = await db.saved_jobs.count_documents({"user_id": user["id"], "status": "interviewing"})
    progress_count = await db.progress.count_documents({"user_id": user["id"], "completed": True})
    profile = user.get("profile", {})
    profile_filled = sum(1 for k in ["skills","interests","education","experience","career_goals","resume_text"] if profile.get(k))
    return {
        "readiness_score": (rec or {}).get("readiness_score", 0),
        "top_recommendations": (rec or {}).get("recommendations", [])[:3],
        "saved_jobs": saved_count,
        "applied_jobs": applied_count,
        "interviews": interview_count,
        "completed_milestones": progress_count,
        "profile_completion": int(profile_filled / 6 * 100),
        "skills_count": len(profile.get("skills", [])),
    }

app.include_router(api)
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown():
    client.close()
