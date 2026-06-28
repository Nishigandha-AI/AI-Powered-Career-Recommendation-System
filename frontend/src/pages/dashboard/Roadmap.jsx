import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { CheckCircle2, Circle, Map } from "lucide-react";

export default function Roadmap() {
  const [recs, setRecs] = useState([]);
  const [selected, setSelected] = useState(null);
  const [progress, setProgress] = useState({});

  useEffect(() => {
    api.get("/recommendations").then((r) => {
      const list = r.data?.recommendations || [];
      setRecs(list);
      if (list[0]) setSelected(list[0]);
    });
  }, []);

  useEffect(() => {
    if (!selected) return;
    api.get(`/roadmap/progress/${selected.id}`).then((r) => setProgress(r.data || {}));
  }, [selected]);

  const toggle = async (idx) => {
    const next = !progress[idx];
    setProgress({ ...progress, [idx]: next });
    try {
      await api.post("/roadmap/progress", { career_id: selected.id, step_index: idx, completed: next });
      if (next) toast.success("Milestone completed");
    } catch { toast.error("Failed to update"); }
  };

  if (recs.length === 0) {
    return (
      <div className="p-8 lg:p-12 max-w-4xl">
        <div className="overline text-[#002FA7] mb-3">Roadmap</div>
        <h1 className="font-heading text-4xl font-black tracking-tight mb-6">Learning roadmap</h1>
        <div className="border border-[#DEE2E6] bg-white p-12 text-center">
          <Map className="mx-auto text-[#002FA7] mb-4" size={32} />
          <p className="text-[#495057]">Generate recommendations first to see roadmaps.</p>
        </div>
      </div>
    );
  }

  const roadmap = selected?.roadmap || [];
  const completed = Object.values(progress).filter(Boolean).length;
  const pct = roadmap.length ? Math.round(completed / roadmap.length * 100) : 0;

  return (
    <div className="p-8 lg:p-12 max-w-5xl">
      <div className="overline text-[#002FA7] mb-3">Roadmap</div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Learning Roadmap</h1>
      <p className="text-[#495057] mb-8">Milestone-based path from your current skills to your target role.</p>

      <div className="grid md:grid-cols-3 gap-4 mb-6">
        <div className="md:col-span-2 bg-white border border-[#DEE2E6] p-4">
          <div className="overline text-[#868E96] mb-2">Career</div>
          <select value={selected?.id || ""} onChange={(e) => setSelected(recs.find((r) => r.id === e.target.value))} className="input-swiss" data-testid="roadmap-career-select">
            {recs.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
          </select>
        </div>
        <div className="bg-[#0A0A0A] text-white p-4" data-testid="roadmap-progress-stat">
          <div className="overline text-[#FFB300] mb-1">Progress</div>
          <div className="font-heading text-3xl font-black">{pct}%</div>
          <div className="text-xs text-white/60">{completed} / {roadmap.length} milestones</div>
          <div className="score-bar mt-3 bg-white/10" style={{ '--w': `${pct}%` }}></div>
        </div>
      </div>

      <div className="relative">
        {roadmap.map((m, i) => {
          const done = !!progress[i];
          return (
            <div key={m.milestone || `milestone-${i}`} className="grid grid-cols-[40px_1fr] gap-4 mb-6" data-testid={`roadmap-step-${i}`}>
              <div className="flex flex-col items-center">
                <button onClick={() => toggle(i)} className="shrink-0" data-testid={`milestone-toggle-${i}`}>
                  {done ? <CheckCircle2 className="text-[#00C853]" size={32} /> : <Circle className="text-[#DEE2E6] hover:text-[#002FA7]" size={32} />}
                </button>
                {i < roadmap.length - 1 && <div className="flex-1 w-px bg-[#DEE2E6] mt-2" />}
              </div>
              <div className={`bg-white border border-[#DEE2E6] p-5 ${done ? 'opacity-60' : ''}`}>
                <div className="flex items-start justify-between gap-2 flex-wrap mb-2">
                  <div>
                    <div className="font-mono text-xs text-[#002FA7] mb-1">MILESTONE {String(i+1).padStart(2,'0')} · {m.duration}</div>
                    <div className="font-heading text-lg font-bold">{m.milestone}</div>
                  </div>
                </div>
                <ul className="mt-3 space-y-1 text-sm text-[#495057]">
                  {(m.tasks || []).map((t) => <li key={t} className="flex gap-2"><span className="text-[#868E96]">·</span> {t}</li>)}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
