// Shared dropdown constants for profile/onboarding
export const EDUCATION_LEVELS = ["High School", "Diploma", "Associate", "Bachelor's", "Master's", "PhD", "Other"];
export const EXPERIENCE_LEVELS = ["Fresher", "Intern", "0-1 Years", "1-3 Years", "3+ Years"];
export const JOB_TYPES = ["Internship", "Full-Time", "Part-Time"];
export const WORK_MODES = ["Remote", "Hybrid", "On-Site"];
export const CAREER_INTERESTS = [
  "Engineering",
  "Designing & Architecture",
  "Arts & Design",
  "Business, Management & Finance",
  "Medical & Healthcare Sciences",
  "Manufacturing, Logistics & Trades",
  "Agriculture & Natural Resources",
  "Public Service, Education & Human Services",
  "Other",
];
export const INDIA_LOCATIONS = [
  "Bengaluru", "Mumbai", "Delhi NCR", "Hyderabad", "Pune", "Chennai",
  "Kolkata", "Ahmedabad", "Gurugram", "Noida", "Jaipur", "Kochi",
  "Indore", "Chandigarh", "Remote", "Other",
];
export const GRADUATION_YEARS = (() => {
  const now = new Date().getFullYear();
  const out = [];
  for (let y = now + 6; y >= 1990; y--) out.push(String(y));
  return out;
})();
