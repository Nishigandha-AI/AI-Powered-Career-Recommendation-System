# CareerMap AI

An AI career recommendation platform for the Indian job market. Upload your resume,
get matched to career paths with salary bands and skill-gap analysis, follow a
milestone-based learning roadmap, chat with an AI career coach, and track live job
and internship listings.

## Features

- Resume upload (PDF / DOCX / TXT) with automatic skill extraction
- AI career recommendations with match scores, salary bands and market demand
- Skill-gap analysis and personalised learning roadmaps with progress tracking
- AI career coach chat (resume tips, interview prep, skill planning)
- Curated learning resources (YouTube, docs, courses, GitHub, articles, practice)
- Live India-focused job & internship matching with state / type filters
- Resume optimisation tool tailored to a target role
- Dashboard analytics with a career-readiness score
- Light / dark theme

## Tech Stack

- **Frontend:** React, React Router, Tailwind CSS, shadcn/ui
- **Backend:** FastAPI, Motor (async MongoDB)
- **Auth:** JWT stored in an httpOnly cookie
- **Database:** MongoDB

## Project Structure

```
backend/    FastAPI app, auth, AI routes and job aggregation
frontend/   React app (landing, auth, onboarding, dashboard)
```

## Getting Started

### Backend

```bash
cd backend
pip install -r requirements.txt
uvicorn server:app --host 0.0.0.0 --port 8001 --reload
```

Create `backend/.env`:

```
MONGO_URL="mongodb://localhost:27017"
DB_NAME="careermap_db"
CORS_ORIGINS="http://localhost:3000"
JWT_SECRET="replace-with-a-random-secret"
JWT_ALGORITHM="HS256"
JWT_EXPIRY_HOURS=168
```

### Frontend

```bash
cd frontend
yarn install
yarn start
```

Create `frontend/.env`:

```
REACT_APP_BACKEND_URL=http://localhost:8001
```


