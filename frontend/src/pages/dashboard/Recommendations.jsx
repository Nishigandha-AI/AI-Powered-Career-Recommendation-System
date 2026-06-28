import { useCallback, useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { TrendingUp, Banknote, Target as TargetIcon, ChevronRight, Loader2, CheckCircle2, AlertCircle, RefreshCw, FileEdit, X, Copy, Save } from "lucide-react";

function TailorModal({ rec, onClose }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saved, setSaved] = useState(false);
  useEffect(() => {
    api.post("/resume/tailor", { career_title: rec.title, required_skills: rec.required_skills || [], missing_skills: rec.missing_skills || [] })
      .then((r) => setData(r.data))
      .catch((e) => toast.error(e?.response?.data?.detail || "Tailoring failed"))
      .finally(() => setLoading(false));
  }, [rec.title]); // eslint-disable-line
  const copy = (text) => { navigator.clipboard.writeText(text); toast.success("Copied"); };
  const save = async () => {
    if (!data) return;
    try {
      await api.post("/resume/tailor/save", { career_title: rec.title, data });
      setSaved(true);
      toast.success("Tailored resume saved to your profile");
    } catch { toast.error("Save failed"); }
  };
  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={onClose} data-testid="tailor-modal">
      <div className="bg-white max-w-3xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-[#DEE2E6] p-5 flex items-center justify-between sticky top-0 bg-white">
          <div>
            <div className="text-xs font-mono text-[#002FA7]">RESUME OPTIMIZATION</div>
            <h3 className="font-heading text-2xl font-black">{rec.title}</h3>
          </div>
          <button onClick={onClose} className="btn-ghost p-2" data-testid="tailor-close-btn"><X size={18} /></button>
        </div>
        <div className="p-6">
          {!loading && data && (
            <div className="flex justify-end mb-4">
              <button onClick={save} disabled={saved} className="btn-primary inline-flex items-center gap-2 text-sm disabled:opacity-60" data-testid="tailor-save-btn">
                {saved ? <><CheckCircle2 size={14} /> Saved</> : <><Save size={14} /> Save to Profile</>}
              </button>
            </div>
          )}
          {loading ? (
            <div className="flex items-center gap-3 text-[#002FA7] py-8"><Loader2 className="animate-spin" /> <span className="font-semibold text-sm">AI is rewriting your resume for this role...</span></div>
          ) : !data ? <div className="text-[#495057]">No output.</div> : (
            <div className="space-y-6">
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-heading font-bold">Tailored Summary</div>
                  <button onClick={() => copy(data.summary || "")} className="btn-ghost text-xs inline-flex items-center gap-1"><Copy size={12} /> Copy</button>
                </div>
                <p className="text-sm bg-[#F8F9FA] border border-[#DEE2E6] p-4">{data.summary}</p>
              </section>
              <section>
                <div className="flex items-center justify-between mb-2">
                  <div className="font-heading font-bold">Rewritten Bullets</div>
                  <button onClick={() => copy((data.bullets || []).map((b) => `• ${b}`).join("\n"))} className="btn-ghost text-xs inline-flex items-center gap-1"><Copy size={12} /> Copy all</button>
                </div>
                <ul className="space-y-2 text-sm bg-[#F8F9FA] border border-[#DEE2E6] p-4">
                  {(data.bullets || []).map((b, i) => <li key={`${i}-${b.slice(0,20)}`} className="flex gap-2"><span className="text-[#002FA7] font-bold">▸</span> <span>{b}</span></li>)}
                </ul>
              </section>
              <div className="grid md:grid-cols-2 gap-4">
                <section>
                  <div className="font-heading font-bold mb-2 text-sm">Skills to Highlight</div>
                  <div className="flex flex-wrap gap-2">
                    {(data.skills_to_highlight || []).map((s) => <span key={s} className="text-xs bg-[#00C853] text-white px-2 py-1 font-semibold">{s}</span>)}
                  </div>
                </section>
                <section>
                  <div className="font-heading font-bold mb-2 text-sm">Skills to Acquire</div>
                  <ul className="text-sm space-y-1">
                    {(data.skills_to_acquire || []).map((s, i) => <li key={`acq-${i}-${s.slice(0,20)}`} className="text-[#495057]">· {s}</li>)}
                  </ul>
                </section>
              </div>
              <section>
                <div className="font-heading font-bold mb-2 text-sm">ATS Keywords</div>
                <div className="flex flex-wrap gap-2">
                  {(data.keyword_optimizations || []).map((k) => <span key={k} className="text-xs bg-[#F1F3F5] px-2 py-1 font-mono">{k}</span>)}
                </div>
              </section>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default function Recommendations() {
  const [data, setData] = useState({ recommendations: [], readiness_score: 0 });
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [expanded, setExpanded] = useState(0);
  const [tailorFor, setTailorFor] = useState(null);

  // Parse salary string e.g. "$80k-$140k", "₹8-15 LPA", "8-12 LPA" → {min,max,label}
  const parseSalary = (s) => {
    if (!s) return null;
    const nums = (s.match(/\d+(?:\.\d+)?/g) || []).map(Number);
    if (nums.length < 2) return null;
    return { min: nums[0], max: nums[1], label: s };
  };
  const salaryBands = data.recommendations.map((r) => ({ title: r.title, ...parseSalary(r.salary_insight) })).filter((x) => x.min);
  const globalMax = salaryBands.length ? Math.max(...salaryBands.map((b) => b.max)) : 1;
  const globalMin = salaryBands.length ? Math.min(...salaryBands.map((b) => b.min)) : 0;

  const load = useCallback(async () => {
    const r = await api.get("/recommendations");
    setData(r.data);
    return r.data;
  }, []);

  const generate = useCallback(async (silent = false) => {
    setGenerating(true);
    try {
      const r = await api.post("/recommendations/generate");
      setData(r.data);
      if (!silent) toast.success("Recommendations refreshed");
    } catch (e) {
      if (!silent) toast.error("Generation failed");
    } finally { setGenerating(false); }
  }, []);

  useEffect(() => {
    (async () => {
      const d = await load().catch(() => null);
      if (!d || !d.recommendations || d.recommendations.length === 0) {
        await generate(true);
      }
      setLoading(false);
    })();
  }, [load, generate]);

  if (loading || (generating && data.recommendations.length === 0)) {
    return (
      <div className="p-8 lg:p-12 max-w-3xl">
        <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-3">Analyzing your career fit</h1>
        <p className="text-[#495057] mb-8">Claude Sonnet 4.5 is matching your profile to careers, salaries, and skill gaps. Takes ~30 seconds.</p>
        <div className="bg-white border border-[#DEE2E6] p-8 flex items-center gap-3 text-[#002FA7]">
          <Loader2 className="animate-spin" size={20} /> <span className="font-semibold text-sm">Analysing profile...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 lg:p-12 max-w-6xl">
      <div className="flex items-start justify-between gap-4 flex-wrap mb-10">
        <div>
          <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Best Career Fits</h1>
          <p className="text-[#495057]">Match scores, salary, demand and skill-gap — auto-generated by AI.</p>
        </div>
        <button onClick={() => generate()} disabled={generating} className="btn-secondary inline-flex items-center gap-2 disabled:opacity-60" data-testid="refresh-recs-btn">
          <RefreshCw size={14} className={generating ? "animate-spin" : ""} /> {generating ? "Refreshing..." : "Refresh"}
        </button>
      </div>

      {data.recommendations.length === 0 ? (
        <div className="border border-[#DEE2E6] bg-white p-12 text-center text-[#495057]">No recommendations yet — try refreshing.</div>
      ) : (
        <>
        {salaryBands.length >= 2 && (
          <div className="bg-white border border-[#DEE2E6] p-6 mb-6" data-testid="salary-bands">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-heading text-lg font-bold">Salary Bands — Side by Side</h3>
              <div className="text-xs font-mono text-[#868E96]">range across {salaryBands.length} careers</div>
            </div>
            <div className="space-y-3">
              {salaryBands.map((b) => {
                const left = ((b.min - globalMin) / (globalMax - globalMin || 1)) * 100;
                const width = ((b.max - b.min) / (globalMax - globalMin || 1)) * 100;
                return (
                  <div key={b.title} className="grid grid-cols-12 items-center gap-3 text-sm" data-testid={`salary-band-${b.title.replace(/\s+/g,'-').toLowerCase()}`}>
                    <div className="col-span-4 truncate font-medium">{b.title}</div>
                    <div className="col-span-6 relative h-6 bg-[#F1F3F5]">
                      <div className="absolute top-0 bottom-0 bg-[#002FA7]" style={{ left: `${left}%`, width: `${Math.max(width, 2)}%` }} />
                    </div>
                    <div className="col-span-2 text-xs font-mono text-[#495057] truncate">{b.label}</div>
                  </div>
                );
              })}
            </div>
            <div className="text-[10px] uppercase tracking-[0.2em] text-[#868E96] mt-3 flex justify-between"><span>Lower · {globalMin}</span><span>Higher · {globalMax}</span></div>
          </div>
        )}
        <div className="space-y-4">
          {data.recommendations.map((r, i) => {
            const required = r.required_skills || [];
            const missing = r.missing_skills || [];
            const present = required.filter((s) => !missing.includes(s));
            const completion = required.length ? Math.round(present.length / required.length * 100) : 0;
            return (
              <div key={r.id || i} className="bg-white border border-[#DEE2E6] hover:border-[#002FA7] transition-colors" data-testid={`rec-card-${i}`}>
                <button onClick={() => setExpanded(expanded === i ? null : i)} className="w-full text-left p-6">
                  <div className="grid grid-cols-12 gap-4 items-center">
                    <div className="col-span-12 md:col-span-7">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="font-mono text-xs text-[#868E96]">#{String(i+1).padStart(2,'0')}</span>
                        <h3 className="font-heading text-xl font-bold">{r.title}</h3>
                      </div>
                      <p className="text-sm text-[#495057]">{r.explanation}</p>
                    </div>
                    <div className="col-span-6 md:col-span-3">
                      <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#868E96] mb-1">Match</div>
                      <div className="font-mono font-bold text-3xl text-[#002FA7]">{r.match_score}<span className="text-sm text-[#868E96]">%</span></div>
                      <div className="score-bar mt-2" style={{ '--w': `${r.match_score}%` }}></div>
                    </div>
                    <div className="col-span-6 md:col-span-2 text-right">
                      <ChevronRight className={`inline transition-transform ${expanded === i ? 'rotate-90' : ''} text-[#495057]`} />
                    </div>
                  </div>
                </button>
                {expanded === i && (
                  <div className="border-t border-[#DEE2E6]">
                    <div className="p-6 grid lg:grid-cols-3 gap-6">
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#868E96] mb-2 flex items-center gap-1"><Banknote size={12}/> Salary</div>
                        <p className="text-sm">{r.salary_insight}</p>
                      </div>
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#868E96] mb-2 flex items-center gap-1"><TrendingUp size={12}/> Market Demand</div>
                        <p className="text-sm">{r.market_demand}</p>
                      </div>
                      <div>
                        <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#868E96] mb-2 flex items-center gap-1"><TargetIcon size={12}/> Growth</div>
                        <p className="text-sm">{r.growth_potential}</p>
                      </div>
                    </div>
                    {/* Skill Gap Analysis */}
                    <div className="border-t border-[#DEE2E6] bg-[#F8F9FA] p-6" data-testid={`skill-gap-${i}`}>
                      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
                        <h4 className="font-heading text-lg font-bold">Skill Gap Analysis</h4>
                        <div className="flex items-center gap-3">
                          <span className="text-xs text-[#868E96]">Skills Match</span>
                          <span className="font-mono font-bold text-xl text-[#002FA7]">{completion}%</span>
                          <button onClick={(e) => { e.stopPropagation(); setTailorFor(r); }} className="btn-primary text-xs inline-flex items-center gap-1.5 px-3 py-1.5" data-testid={`tailor-resume-btn-${i}`}>
                            <FileEdit size={12} /> Optimize Resume
                          </button>
                        </div>
                      </div>
                      <div className="grid md:grid-cols-2 gap-6">
                        <div>
                          <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#00C853] mb-2 flex items-center gap-1"><CheckCircle2 size={12}/> Current skills ({present.length})</div>
                          {present.length === 0 ? <p className="text-xs text-[#868E96]">No matching skills yet</p> : (
                            <div className="flex flex-wrap gap-2">
                              {present.map((s) => <span key={s} className="text-xs bg-white border border-[#00C853] text-[#00C853] px-2 py-1 font-semibold">{s}</span>)}
                            </div>
                          )}
                        </div>
                        <div>
                          <div className="text-[10px] tracking-[0.2em] uppercase font-bold text-[#FF3333] mb-2 flex items-center gap-1"><AlertCircle size={12}/> Missing skills ({missing.length})</div>
                          {missing.length === 0 ? <p className="text-xs text-[#868E96]">You&apos;ve covered them all</p> : (
                            <div className="flex flex-wrap gap-2">
                              {missing.map((s) => <span key={s} className="text-xs bg-white border border-[#FF3333] text-[#FF3333] px-2 py-1 font-semibold">{s}</span>)}
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
        </>
      )}
      {tailorFor && <TailorModal rec={tailorFor} onClose={() => setTailorFor(null)} />}
    </div>
  );
}
