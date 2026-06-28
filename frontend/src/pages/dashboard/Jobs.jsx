import { INDIA_STATES, JOB_TYPE_FILTERS } from "../../lib/jobFilters";
import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { Search, ExternalLink, Bookmark, BookmarkCheck, Trash2 } from "lucide-react";

const STATUSES = ["saved", "applied", "interviewing", "offer", "rejected"];

export default function Jobs() {
  const [tab, setTab] = useState("browse");
  const [search, setSearch] = useState("");
  const [activeCareer, setActiveCareer] = useState("");
  const [careers, setCareers] = useState([]);
  const [jobs, setJobs] = useState([]);
  const [saved, setSaved] = useState([]);
  const [loading, setLoading] = useState(false);

  const [stateFilter,setStateFilter]=useState("");const [typeFilter,setTypeFilter]=useState("All");
  const filteredJobs=jobs.filter(j=>(!stateFilter||(j.location||"").toLowerCase().includes(stateFilter.toLowerCase()))&&(typeFilter==="All"||(j.job_type||"").toLowerCase().includes(typeFilter.toLowerCase().replace("-time","").replace("-","").trim())));

  const fetchJobs = useCallback(async (q) => {
    setLoading(true);
    try {
      const r = await api.get("/jobs", { params: q ? { search: q } : {} });
      setJobs(r.data?.jobs || []);
    } catch { toast.error("Failed to load jobs"); }
    finally { setLoading(false); }
  }, []);

  const loadSaved = useCallback(async () => {
    try {
      const r = await api.get("/jobs/saved");
      setSaved(Array.isArray(r.data) ? r.data : (r.data?.saved || []));
    } catch (error) { console.error("Failed to load saved jobs:", error); }
  }, []);

  useEffect(() => {
    api.get("/recommendations").then((r) => setCareers((r.data?.recommendations || []).slice(0, 4)));
    fetchJobs();
    loadSaved();
  }, [fetchJobs, loadSaved]);

  useEffect(() => {
    if (activeCareer !== undefined) fetchJobs(activeCareer || search);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- intentionally excludes `search` to avoid refetching on every keystroke
  }, [activeCareer, fetchJobs]);

  const save = async (j) => {
    try {
      await api.post("/jobs/save", { job_id: j.id, title: j.title, company: j.company, location: j.location, url: j.url, salary: j.salary });
      toast.success("Saved");
      loadSaved();
    } catch (e) { toast.error(e?.response?.data?.detail || "Save failed"); }
  };

  const updateStatus = async (job_id, status) => {
    await api.put(`/jobs/saved/${job_id}/status`, { status });
    loadSaved();
  };

  const removeSaved = async (job_id) => {
    await api.delete(`/jobs/saved/${job_id}`);
    toast.success("Removed");
    loadSaved();
  };

  const savedIds = new Set(saved.map((s) => s.job_id));

  return (
    <div className="p-8 lg:p-12 max-w-6xl">
      <div className="overline text-[#002FA7] mb-3">Jobs & Internships</div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Opportunities</h1>
      <p className="text-[#495057] mb-8">Live remote jobs ranked by skill match. Save and track applications.</p>

      <div className="flex border-b border-[#DEE2E6] mb-6">
        <button onClick={() => setTab("browse")} className={`px-6 py-3 text-sm font-semibold transition-colors ${tab === 'browse' ? 'text-[#002FA7] border-b-2 border-[#002FA7]' : 'text-[#868E96] hover:text-[#0A0A0A]'}`} data-testid="jobs-tab-browse">Browse · {jobs.length}</button>
        <button onClick={() => setTab("saved")} className={`px-6 py-3 text-sm font-semibold transition-colors ${tab === 'saved' ? 'text-[#002FA7] border-b-2 border-[#002FA7]' : 'text-[#868E96] hover:text-[#0A0A0A]'}`} data-testid="jobs-tab-saved">Application Tracker · {saved.length}</button>
      </div>

      {tab === "browse" && (
        <>
          <div className="flex gap-2 mb-4 flex-wrap items-center"><select value={stateFilter} onChange={e=>setStateFilter(e.target.value)} className="input-swiss max-w-[200px]" data-testid="state-filter"><option value="">All States</option>{INDIA_STATES.map(s=><option key={s} value={s}>{s}</option>)}</select><select value={typeFilter} onChange={e=>setTypeFilter(e.target.value)} className="input-swiss max-w-[160px]" data-testid="type-filter">{JOB_TYPE_FILTERS.map(t=><option key={t} value={t}>{t}</option>)}</select></div>
          <div className="flex gap-2 mb-4 flex-wrap items-center">
            <input value={search} onChange={(e) => setSearch(e.target.value)} onKeyDown={(e) => e.key === 'Enter' && fetchJobs(search)} placeholder="Search by role or skill" className="input-swiss flex-1 min-w-[240px]" data-testid="jobs-search-input" />
            <button onClick={() => fetchJobs(search)} className="btn-primary inline-flex items-center gap-2" data-testid="jobs-search-btn">
              <Search size={16} /> Search
            </button>
          </div>
          {careers.length > 0 && (
            <div className="mb-6 flex flex-wrap gap-2 items-center" data-testid="career-filters">
              <span className="text-xs uppercase tracking-[0.2em] font-bold text-[#868E96] mr-2">Filter by career:</span>
              <button onClick={() => setActiveCareer("")} className={`text-xs px-3 py-1.5 font-medium border transition-colors ${activeCareer === "" ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-[#0A0A0A] border-[#DEE2E6] hover:border-[#002FA7]"}`} data-testid="career-filter-all">All</button>
              {careers.map((c) => (
                <button key={c.id || c.title} onClick={() => setActiveCareer(c.title)} className={`text-xs px-3 py-1.5 font-medium border transition-colors ${activeCareer === c.title ? "bg-[#002FA7] text-white border-[#002FA7]" : "bg-white text-[#0A0A0A] border-[#DEE2E6] hover:border-[#002FA7]"}`} data-testid={`career-filter-${(c.title||'').replace(/\s+/g,'-').toLowerCase()}`}>
                  {c.title}
                </button>
              ))}
            </div>
          )}
          {loading ? <div className="text-[#495057]">Loading...</div> : jobs.length === 0 ? (
            <div className="border border-[#DEE2E6] bg-white p-12 text-center text-[#495057]">No jobs found.</div>
          ) : (
            <div className="space-y-3">
              {jobs.map((j) => (
                <div key={j.id} className="bg-white border border-[#DEE2E6] hover:border-[#002FA7] transition-colors p-5" data-testid={`job-card-${j.id}`}>
                  <div className="grid grid-cols-12 gap-4 items-start">
                    <div className="col-span-12 md:col-span-9">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="font-heading font-bold text-base">{j.title}</span>
                        <span className="text-xs text-[#868E96]">· {j.company}</span>
                      </div>
                      <div className="text-xs text-[#868E96] mb-2">{j.location} · {j.job_type || 'full-time'} {j.salary ? `· ${j.salary}` : ''}</div>
                      <p className="text-sm text-[#495057] mb-2 line-clamp-2">{j.description_snippet}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {(j.tags || []).slice(0, 6).map((t) => <span key={t} className="text-[10px] uppercase tracking-wider bg-[#F1F3F5] px-1.5 py-0.5 font-semibold">{t}</span>)}
                      </div>
                    </div>
                    <div className="col-span-12 md:col-span-3 flex md:flex-col items-end justify-between gap-2">
                      <div className="text-right">
                        <div className="overline text-[#868E96] mb-0.5">Match</div>
                        <div className="font-mono font-bold text-2xl text-[#002FA7]">{j.match_score}<span className="text-xs text-[#868E96]">%</span></div>
                      </div>
                      <div className="flex gap-2">
                        <a href={j.url} target="_blank" rel="noopener noreferrer" className="btn-primary inline-flex items-center gap-1 text-xs px-3 py-1.5" data-testid={`job-view-${j.id}`}>
                          Apply <ExternalLink size={12} />
                        </a>
                        {savedIds.has(j.id) ? (
                          <span className="btn-ghost inline-flex items-center gap-1 text-xs border border-[#00C853] text-[#00C853]" data-testid={`job-saved-${j.id}`}><BookmarkCheck size={12} /> Saved</span>
                        ) : (
                          <button onClick={() => save(j)} className="btn-secondary text-xs inline-flex items-center gap-1 px-3 py-1" data-testid={`job-save-${j.id}`}>
                            <Bookmark size={12} /> Save
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "saved" && (
        <div className="space-y-3">
          {saved.length === 0 ? (
            <div className="border border-[#DEE2E6] bg-white p-12 text-center text-[#495057]">No saved jobs yet.</div>
          ) : saved.map((s) => (
            <div key={s.job_id} className="bg-white border border-[#DEE2E6] p-5" data-testid={`saved-job-${s.job_id}`}>
              <div className="grid grid-cols-12 gap-4 items-center">
                <div className="col-span-12 md:col-span-7">
                  <div className="font-heading font-bold">{s.title}</div>
                  <div className="text-xs text-[#868E96]">{s.company} · {s.location}</div>
                </div>
                <div className="col-span-8 md:col-span-3">
                  <select value={s.status} onChange={(e) => updateStatus(s.job_id, e.target.value)} className="input-swiss text-sm py-1" data-testid={`saved-status-${s.job_id}`}>
                    {STATUSES.map((st) => <option key={st} value={st}>{st.toUpperCase()}</option>)}
                  </select>
                </div>
                <div className="col-span-4 md:col-span-2 flex justify-end gap-2">
                  <a href={s.url} target="_blank" rel="noopener noreferrer" className="btn-ghost p-2" data-testid={`saved-view-${s.job_id}`}><ExternalLink size={14} /></a>
                  <button onClick={() => removeSaved(s.job_id)} className="btn-ghost p-2 hover:text-[#FF3333]" data-testid={`saved-delete-${s.job_id}`}><Trash2 size={14} /></button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
