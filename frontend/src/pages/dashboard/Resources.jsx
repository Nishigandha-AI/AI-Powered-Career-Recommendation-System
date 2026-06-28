import { useEffect, useState } from "react";
import api from "../../lib/api";
import { toast } from "sonner";
import { ExternalLink, Search, Youtube, FileText, GraduationCap, Github, Newspaper, Code2 } from "lucide-react";

const CATS = [
  { key: "youtube", label: "YouTube", icon: Youtube },
  { key: "docs", label: "Docs", icon: FileText },
  { key: "courses", label: "Courses", icon: GraduationCap },
  { key: "github", label: "GitHub", icon: Github },
  { key: "articles", label: "Articles", icon: Newspaper },
  { key: "practice", label: "Practice", icon: Code2 },
];

export default function Resources() {
  const [skill, setSkill] = useState("");
  const [level, setLevel] = useState("beginner");
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [profileSkills, setProfileSkills] = useState([]);

  useEffect(() => {
    api.get("/profile").then((r) => setProfileSkills(r.data?.skills || []));
  }, []);

  const fetch = async (s) => {
    const q = (s || skill || "").trim();
    if (!q) { toast.error("Enter a skill"); return; }
    setSkill(q);
    setLoading(true);
    setData(null);
    try {
      const r = await api.post("/resources/for-skill", { skill: q, level });
      setData(r.data);
    } catch (e) { toast.error("Failed to fetch resources"); }
    finally { setLoading(false); }
  };

  return (
    <div className="p-8 lg:p-12 max-w-6xl">
      <div className="overline text-[#002FA7] mb-3">Learning Resources</div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Curated learning</h1>
      <p className="text-[#495057] mb-8">YouTube, docs, courses, GitHub repos, articles, and practice — ranked by quality.</p>

      <div className="bg-white border border-[#DEE2E6] p-6 mb-6">
        <div className="grid md:grid-cols-12 gap-3">
          <div className="md:col-span-7">
            <label className="overline text-[#868E96] block mb-2">Skill or topic</label>
            <input value={skill} onChange={(e) => setSkill(e.target.value)} placeholder="e.g. React, Python, System Design" className="input-swiss" data-testid="resources-skill-input" />
          </div>
          <div className="md:col-span-3">
            <label className="overline text-[#868E96] block mb-2">Level</label>
            <select value={level} onChange={(e) => setLevel(e.target.value)} className="input-swiss" data-testid="resources-level-select">
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div className="md:col-span-2 flex items-end">
            <button onClick={() => fetch()} disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="resources-search-btn">
              <Search size={16} /> {loading ? "Loading..." : "Find"}
            </button>
          </div>
        </div>
        {profileSkills.length > 0 && (
          <div className="mt-4">
            <div className="overline text-[#868E96] mb-2">Your skills</div>
            <div className="flex flex-wrap gap-2">
              {profileSkills.slice(0, 12).map((s) => (
                <button key={s} onClick={() => fetch(s)} className="text-xs bg-[#F1F3F5] hover:bg-[#002FA7] hover:text-white px-2 py-1 font-medium transition-colors" data-testid={`quick-skill-${s}`}>
                  {s}
                </button>
              ))}
            </div>
          </div>
        )}
      </div>

      {data && (
        <div className="space-y-6">
          {CATS.map(({ key, label, icon: Icon }) => {
            const items = data[key] || [];
            if (!items.length) return null;
            return (
              <div key={key} className="bg-white border border-[#DEE2E6] p-6" data-testid={`resource-section-${key}`}>
                <div className="flex items-center gap-2 mb-4">
                  <Icon size={20} className="text-[#002FA7]" />
                  <div className="font-heading text-lg font-bold">{label}</div>
                  <div className="font-mono text-xs text-[#868E96]">· {items.length} items</div>
                </div>
                <div className="grid md:grid-cols-2 gap-3">
                  {items.map((it, i) => (
                    <a key={it.url || `${key}-${i}`} href={it.url} target="_blank" rel="noopener noreferrer" className="block border border-[#DEE2E6] p-4 hover:border-[#002FA7] transition-colors group" data-testid={`resource-item-${key}-${i}`}>
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1 min-w-0">
                          <div className="font-semibold text-sm group-hover:text-[#002FA7] truncate">{it.title}</div>
                          <div className="text-xs text-[#868E96] mt-1">{it.channel || it.provider || it.platform || it.source || ""}</div>
                          {it.why && <p className="text-xs text-[#495057] mt-2 line-clamp-2">{it.why}</p>}
                        </div>
                        <ExternalLink size={14} className="text-[#868E96] group-hover:text-[#002FA7] shrink-0 mt-1" />
                      </div>
                    </a>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
