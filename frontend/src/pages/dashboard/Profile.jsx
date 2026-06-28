import { useEffect, useRef, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Upload, X, FileText } from "lucide-react";
import { EDUCATION_LEVELS, EXPERIENCE_LEVELS, JOB_TYPES, WORK_MODES, CAREER_INTERESTS, INDIA_LOCATIONS, GRADUATION_YEARS } from "../../lib/options";

const AUTOSAVE_DEBOUNCE_MS = 1200;
const AUTO_STATUS_CLEAR_MS = 4000;

function TagInput({ label, value, onChange, testId }) {
  const [input, setInput] = useState("");
  const add = () => { const v = input.trim(); if (!v) return; if (!value.includes(v)) onChange([...value, v]); setInput(""); };
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">{label}</label>
      <div className="border border-[#DEE2E6] p-3 min-h-[80px] flex flex-wrap gap-2 bg-white" data-testid={`${testId}-container`}>
        {value.map((t) => (
          <span key={t} className="inline-flex items-center gap-1 bg-[#F1F3F5] text-[#0A0A0A] text-sm px-2 py-1">
            {t}<button onClick={() => onChange(value.filter((x) => x !== t))} data-testid={`${testId}-remove-${t}`}><X size={12} /></button>
          </span>
        ))}
        <input value={input} onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => { if (e.key === "Enter" || e.key === ",") { e.preventDefault(); add(); } }}
          onBlur={add} placeholder="Type and press Enter"
          className="flex-1 min-w-[140px] outline-none text-sm bg-transparent" data-testid={`${testId}-input`} />
      </div>
    </div>
  );
}

function Sel({ label, value, onChange, options, testId }) {
  return (
    <div>
      <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">{label}</label>
      <select value={value || ""} onChange={(e) => onChange(e.target.value)} className="input-swiss" data-testid={testId}>
        <option value="">Select...</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

export default function Profile() {
  const [p, setP] = useState({
    skills: [], interests: [], education: "", education_level: "", graduation_year: "",
    current_location: "", experience: "", experience_level: "", career_goals: "",
    preferred_location: "", career_preferences: "", job_type: "", work_mode: "",
    career_interests: [], resume_text: "", resume_filename: "",
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [autoStatus, setAutoStatus] = useState("");
  const fileRef = useRef(null);
  const initialLoad = useRef(true);
  const debounceRef = useRef(null);

  useEffect(() => {
    api.get("/profile").then((r) => {
      setP((prev) => ({ ...prev, ...r.data }));
      setTimeout(() => { initialLoad.current = false; }, 300);
    }).finally(() => setLoading(false));
  }, []);

  // Auto-save dropdown/chip changes (debounced) and refresh recommendations
  useEffect(() => {
    if (initialLoad.current || loading) return;
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      setAutoStatus("Saving...");
      try {
        const { resume_filename: _x, ...payload } = p;
        await api.put("/profile", payload);
        setAutoStatus("Refreshing recommendations...");
        api.post("/recommendations/generate").then(() => setAutoStatus("Updated")).catch(() => setAutoStatus(""));
        setTimeout(() => setAutoStatus(""), AUTO_STATUS_CLEAR_MS);
      } catch { setAutoStatus(""); }
    }, AUTOSAVE_DEBOUNCE_MS);
    return () => debounceRef.current && clearTimeout(debounceRef.current);
  }, [p.education_level, p.graduation_year, p.current_location, p.preferred_location, p.experience_level, p.job_type, p.work_mode, p.career_interests, p.skills, loading]);
  // eslint react-hooks/exhaustive-deps: intentional partial dep list to only react to structured fields

  const save = async () => {
    setSaving(true);
    try {
      const { resume_filename: _x, ...payload } = p;
      const r = await api.put("/profile", payload);
      setP((prev) => ({ ...prev, ...r.data }));
      // refresh recommendations in background since profile changed
      api.post("/recommendations/generate").catch(() => {});
      toast.success("Profile saved — recommendations refreshing");
    } catch { toast.error("Save failed"); }
    finally { setSaving(false); }
  };

  const onFile = async (e) => {
    const f = e.target.files?.[0]; if (!f) return;
    setUploading(true);
    const fd = new FormData(); fd.append("file", f);
    try {
      const r = await api.post("/profile/resume", fd, { headers: { "Content-Type": "multipart/form-data" } });
      setP((prev) => ({ ...prev, ...r.data.profile }));
      toast.success(`Resume parsed: ${r.data.extracted?.skills?.length || 0} skills`);
    } catch (err) { toast.error(err?.response?.data?.detail || "Upload failed"); }
    finally { setUploading(false); if (fileRef.current) fileRef.current.value = ""; }
  };

  const toggleInterest = (it) => {
    setP({ ...p, career_interests: p.career_interests.includes(it) ? p.career_interests.filter((x) => x !== it) : [...p.career_interests, it] });
  };

  if (loading) return <div className="p-12 text-[#495057]">Loading...</div>;

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Your Background</h1>
      <p className="text-[#495057] mb-8">Update any time — recommendations refresh automatically. {autoStatus && <span className="ml-2 inline-block text-xs font-mono text-[#002FA7] bg-[#F1F3F5] px-2 py-0.5" data-testid="auto-status">{autoStatus}</span>}</p>

      <div className="border border-[#DEE2E6] bg-white p-6 mb-8">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <FileText className="text-[#002FA7]" size={24} />
            <div>
              <div className="font-semibold text-sm">{p.resume_filename || "No resume uploaded"}</div>
              <div className="text-xs text-[#868E96]">PDF, DOCX, or TXT. AI auto-extracts skills.</div>
            </div>
          </div>
          <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" onChange={onFile} className="hidden" data-testid="resume-file-input" />
          <button onClick={() => fileRef.current?.click()} disabled={uploading} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60" data-testid="resume-upload-btn">
            <Upload size={16} /> {uploading ? "Parsing..." : "Upload Resume"}
          </button>
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <Sel label="Education Level" value={p.education_level} onChange={(v) => setP({ ...p, education_level: v })} options={EDUCATION_LEVELS} testId="edu-level-select" />
        <Sel label="Graduation Year" value={p.graduation_year} onChange={(v) => setP({ ...p, graduation_year: v })} options={GRADUATION_YEARS} testId="grad-year-select" />
        <Sel label="Current Location" value={p.current_location} onChange={(v) => setP({ ...p, current_location: v })} options={INDIA_LOCATIONS} testId="curr-loc-select" />
        <Sel label="Preferred Location" value={p.preferred_location} onChange={(v) => setP({ ...p, preferred_location: v })} options={INDIA_LOCATIONS} testId="pref-loc-select" />
        <Sel label="Experience Level" value={p.experience_level} onChange={(v) => setP({ ...p, experience_level: v })} options={EXPERIENCE_LEVELS} testId="exp-level-select" />
        <Sel label="Job Type" value={p.job_type} onChange={(v) => setP({ ...p, job_type: v })} options={JOB_TYPES} testId="job-type-select" />
        <Sel label="Work Mode" value={p.work_mode} onChange={(v) => setP({ ...p, work_mode: v })} options={WORK_MODES} testId="work-mode-select" />
      </div>

      <div className="mb-6">
        <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Career Interests</label>
        <div className="flex flex-wrap gap-2" data-testid="career-interests-list">
          {CAREER_INTERESTS.map((ci) => {
            const active = (p.career_interests || []).includes(ci);
            return (
              <button key={ci} onClick={() => toggleInterest(ci)}
                className={`text-sm px-3 py-1.5 font-medium border transition-colors ${active ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-[#0A0A0A] border-[#DEE2E6] hover:border-[#002FA7]"}`}
                data-testid={`interest-${ci.replace(/[^a-z]/gi,'-').toLowerCase()}`}
              >{ci}</button>
            );
          })}
        </div>
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <TagInput label="Skills" value={p.skills} onChange={(v) => setP({ ...p, skills: v })} testId="skills" />
        <TagInput label="Personal Interests" value={p.interests} onChange={(v) => setP({ ...p, interests: v })} testId="interests" />
      </div>

      <div className="grid md:grid-cols-2 gap-6 mb-6">
        <div>
          <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Education Details</label>
          <textarea rows={3} value={p.education} onChange={(e) => setP({ ...p, education: e.target.value })} className="input-swiss resize-none" data-testid="education-input" />
        </div>
        <div>
          <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Experience Details</label>
          <textarea rows={3} value={p.experience} onChange={(e) => setP({ ...p, experience: e.target.value })} className="input-swiss resize-none" data-testid="experience-input" />
        </div>
        <div className="md:col-span-2">
          <label className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] block mb-2">Career Goals</label>
          <textarea rows={2} value={p.career_goals} onChange={(e) => setP({ ...p, career_goals: e.target.value })} className="input-swiss resize-none" data-testid="goals-input" />
        </div>
      </div>

      <button onClick={save} disabled={saving} className="btn-primary disabled:opacity-60" data-testid="profile-save-btn">
        {saving ? "Saving..." : "Save Profile"}
      </button>
    </div>
  );
}
