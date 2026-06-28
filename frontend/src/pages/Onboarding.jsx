import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "../lib/api";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { Upload, FileText, X, ArrowRight, CheckCircle2 } from "lucide-react";
import { EDUCATION_LEVELS, EXPERIENCE_LEVELS, JOB_TYPES, WORK_MODES, CAREER_INTERESTS, INDIA_LOCATIONS, GRADUATION_YEARS } from "../lib/options";

function TagInput({ label, value, onChange, testId, placeholder }) {
  const [t, setT] = useState("");
  const add = () => { const v = t.trim(); if (!v) return; if (!value.includes(v)) onChange([...value, v]); setT(""); };
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">{label}</label>
      <div className="border border-[#DEE2E6] p-3 min-h-[80px] flex flex-wrap gap-2 bg-white">
        {value.map((x) => (
          <span key={x} className="inline-flex items-center gap-1 bg-[#F1F3F5] text-[#0A0A0A] text-sm px-2 py-1">
            {x}<button onClick={() => onChange(value.filter((y) => y !== x))} data-testid={`${testId}-rm-${x}`}><X size={12} /></button>
          </span>
        ))}
        <input value={t} onChange={(e) => setT(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onBlur={add} placeholder={placeholder || "Type and press Enter"}
          className="flex-1 min-w-[140px] outline-none text-sm bg-transparent" data-testid={`${testId}-input`} />
      </div>
    </div>
  );
}

function Select({ label, value, onChange, options, testId, placeholder }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className="input-swiss" data-testid={testId}>
        <option value="">{placeholder || "Select..."}</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function Onboarding() {
  const { user, setUser } = useAuth();
  const nav = useNavigate();
  const [step, setStep] = useState(1);
  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef(null);
  const [p, setP] = useState({
    skills: [], interests: [], education: "", education_level: "", graduation_year: "",
    current_location: "", experience: "", experience_level: "", career_goals: "",
    preferred_location: "", career_preferences: "", job_type: "", work_mode: "",
    career_interests: [], resume_text: "", resume_filename: "",
  });

  useEffect(() => {
    if (user?.onboarding_completed) nav("/app", { replace: true });
    api.get("/profile").then((r) => setP((prev) => ({ ...prev, ...r.data })));
    // eslint-disable-next-line
  }, []);

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await api.post("/profile/resume", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setP((prev) => ({ ...prev, ...r.data.profile }));
      toast.success(`Resume parsed — extracted ${r.data.extracted?.skills?.length || 0} skills`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const toggleInterest = (it) => {
    setP({ ...p, career_interests: p.career_interests.includes(it) ? p.career_interests.filter((x) => x !== it) : [...p.career_interests, it] });
  };

  const submit = async () => {
    if (!p.education_level || !p.experience_level || !p.job_type || !p.work_mode) {
      toast.error("Please complete all required dropdowns"); return;
    }
    setSubmitting(true);
    try {
      const { resume_filename: _x, ...payload } = p;
      await api.put("/profile", payload);
      await api.post("/onboarding/complete");
      // fire & forget recommendations generation (continues in background); dashboard will poll
      api.post("/recommendations/generate").catch(() => {});
      setUser({ ...user, onboarding_completed: true });
      toast.success("Profile complete — analyzing your career fit");
      nav("/app", { replace: true });
    } catch (e) { toast.error("Save failed"); }
    finally { setSubmitting(false); }
  };

  return (
    <div className="min-h-screen bg-[#F8F9FA]">
      <header className="bg-white border-b border-[#DEE2E6]">
        <div className="max-w-4xl mx-auto px-6 lg:px-10 h-16 flex items-center justify-between">
          <div className="font-heading font-black text-lg tracking-tight">CareerMap<span className="text-[#002FA7]">.</span>AI</div>
          <div className="flex items-center gap-2 text-xs font-mono text-[#868E96]" data-testid="onboarding-stepper">
            <span className={step === 1 ? "text-[#002FA7] font-bold" : ""}>01 RESUME</span>
            <span>→</span>
            <span className={step === 2 ? "text-[#002FA7] font-bold" : ""}>02 PROFILE</span>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto p-6 lg:p-10">
        {step === 1 && (
          <div data-testid="onboarding-step-1">
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-3">Upload your resume</h1>
            <p className="text-[#495057] mb-8">We&apos;ll auto-extract your skills, education, and experience. PDF, DOCX, or TXT.</p>

            <div className="bg-white border border-[#DEE2E6] p-8 mb-6">
              <div className="flex flex-col items-center text-center gap-4 py-8">
                <div className="w-16 h-16 bg-[#F1F3F5] flex items-center justify-center"><FileText className="text-[#002FA7]" size={28} /></div>
                <div>
                  <div className="font-heading font-bold text-lg">{p.resume_filename || "No file selected"}</div>
                  <div className="text-sm text-[#868E96]">Drag & drop or click to upload</div>
                </div>
                <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={onFile} className="hidden" data-testid="onb-file-input" />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="onb-upload-btn">
                  <Upload size={16} /> {uploading ? "Parsing with AI..." : (p.resume_filename ? "Replace File" : "Choose File")}
                </button>
              </div>
              {p.skills.length > 0 && (
                <div className="border-t border-[#DEE2E6] pt-6 mt-6">
                  <div className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] mb-3 flex items-center gap-2"><CheckCircle2 size={14} className="text-[#00C853]" /> AI-extracted skills</div>
                  <div className="flex flex-wrap gap-2">
                    {p.skills.slice(0, 20).map((s) => <span key={s} className="text-sm bg-[#F1F3F5] px-2 py-1 font-medium">{s}</span>)}
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between">
              <button onClick={() => setStep(2)} className="text-sm text-[#495057] hover:text-[#0A0A0A]" data-testid="onb-skip-btn">Skip — I&apos;ll fill manually</button>
              <button onClick={() => setStep(2)} disabled={uploading} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="onb-next-btn">
                Continue <ArrowRight size={16} />
              </button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div data-testid="onboarding-step-2">
            <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-3">Tell us about you</h1>
            <p className="text-[#495057] mb-8">These details power your career match scores and job recommendations.</p>

            <div className="bg-white border border-[#DEE2E6] p-6 lg:p-8 space-y-6">
              <div className="grid md:grid-cols-2 gap-6">
                <Select label="Education Level *" value={p.education_level} onChange={(v) => setP({ ...p, education_level: v })} options={EDUCATION_LEVELS} testId="onb-education-level" />
                <Select label="Graduation Year" value={p.graduation_year} onChange={(v) => setP({ ...p, graduation_year: v })} options={GRADUATION_YEARS} testId="onb-grad-year" />
                <Select label="Current Location" value={p.current_location} onChange={(v) => setP({ ...p, current_location: v })} options={INDIA_LOCATIONS} testId="onb-current-location" />
                <Select label="Preferred Location" value={p.preferred_location} onChange={(v) => setP({ ...p, preferred_location: v })} options={INDIA_LOCATIONS} testId="onb-pref-location" />
                <Select label="Experience Level *" value={p.experience_level} onChange={(v) => setP({ ...p, experience_level: v })} options={EXPERIENCE_LEVELS} testId="onb-exp-level" />
                <Select label="Job Type *" value={p.job_type} onChange={(v) => setP({ ...p, job_type: v })} options={JOB_TYPES} testId="onb-job-type" />
                <Select label="Work Mode *" value={p.work_mode} onChange={(v) => setP({ ...p, work_mode: v })} options={WORK_MODES} testId="onb-work-mode" />
              </div>

              <div>
                <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Career Interests (pick one or more)</label>
                <div className="flex flex-wrap gap-2" data-testid="onb-interests-list">
                  {CAREER_INTERESTS.map((ci) => {
                    const active = p.career_interests.includes(ci);
                    return (
                      <button key={ci} onClick={() => toggleInterest(ci)}
                        className={`text-sm px-3 py-1.5 font-medium border transition-colors ${active ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-[#0A0A0A] border-[#DEE2E6] hover:border-[#002FA7]"}`}
                        data-testid={`onb-interest-${ci.replace(/[^a-z]/gi,'-').toLowerCase()}`}
                      >{ci}</button>
                    );
                  })}
                </div>
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <TagInput label="Skills" value={p.skills} onChange={(v) => setP({ ...p, skills: v })} testId="onb-skills" />
                <TagInput label="Interests / Hobbies" value={p.interests} onChange={(v) => setP({ ...p, interests: v })} testId="onb-personal-interests" />
              </div>

              <div className="grid md:grid-cols-2 gap-6">
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Education Details</label>
                  <textarea rows={3} value={p.education} onChange={(e) => setP({ ...p, education: e.target.value })} placeholder="Degree, school, year, GPA" className="input-swiss resize-none" data-testid="onb-education" />
                </div>
                <div>
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Experience Details</label>
                  <textarea rows={3} value={p.experience} onChange={(e) => setP({ ...p, experience: e.target.value })} placeholder="Roles, projects, internships" className="input-swiss resize-none" data-testid="onb-experience" />
                </div>
                <div className="md:col-span-2">
                  <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Career Goals</label>
                  <textarea rows={2} value={p.career_goals} onChange={(e) => setP({ ...p, career_goals: e.target.value })} placeholder="Where do you want to be in 2-5 years?" className="input-swiss resize-none" data-testid="onb-goals" />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-between mt-6">
              <button onClick={() => setStep(1)} className="btn-ghost" data-testid="onb-back-btn">← Back</button>
              <button onClick={submit} disabled={submitting} className="btn-primary inline-flex items-center gap-2 disabled:opacity-60" data-testid="onb-finish-btn">
                {submitting ? "Saving..." : <>Get Started <ArrowRight size={16} /></>}
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
