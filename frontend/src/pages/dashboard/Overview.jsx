import { useEffect, useState } from "react";
import api from "../../lib/api";
import { Link } from "react-router-dom";
import { ArrowRight, Briefcase, Target, CheckCircle2, User as UserIcon } from "lucide-react";

export default function Overview() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/dashboard").then((r) => setData(r.data)).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="p-12 text-[#495057]">Loading...</div>;
  if (!data) return null;

  const stats = [
    { label: "Career Readiness", value: `${data.readiness_score}%`, hint: "Avg across top 3 careers", testId: "stat-readiness" },
    { label: "Profile Completion", value: `${data.profile_completion}%`, hint: `${data.skills_count} skills tracked`, testId: "stat-profile" },
    { label: "Jobs Saved", value: data.saved_jobs, hint: `${data.applied_jobs} applied`, testId: "stat-saved" },
    { label: "Milestones Done", value: data.completed_milestones, hint: "Across all roadmaps", testId: "stat-milestones" },
  ];

  return (
    <div className="p-8 lg:p-12 max-w-6xl">
      <div className="overline text-[#002FA7] mb-3">Dashboard</div>
      <h1 className="font-heading text-4xl sm:text-5xl font-black tracking-tight leading-none mb-2">Your Career Map</h1>
      <p className="text-[#495057] mb-10">A snapshot of where you are and what to do next.</p>

      {/* North Star metric */}
      <div className="grid grid-cols-12 gap-4 mb-4" data-testid="overview-stats">
        <div className="col-span-12 md:col-span-6 bg-[#0A0A0A] text-white p-8 border border-[#0A0A0A]" data-testid="north-star-metric">
          <div className="overline text-[#FFB300] mb-3">North Star</div>
          <div className="font-heading text-7xl font-black leading-none">{data.readiness_score}<span className="text-3xl text-white/40">/100</span></div>
          <div className="text-sm text-white/70 mt-3">Career Readiness Score across top 3 recommendations</div>
          <div className="score-bar mt-6 bg-white/10" style={{ '--w': `${data.readiness_score}%` }}></div>
        </div>
        {stats.slice(1).map((s) => (
          <div key={s.label} className="col-span-12 md:col-span-2 bg-white border border-[#DEE2E6] p-6" data-testid={s.testId}>
            <div className="overline text-[#868E96] mb-2">{s.label}</div>
            <div className="font-heading text-4xl font-black mb-1">{s.value}</div>
            <div className="text-xs text-[#868E96]">{s.hint}</div>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4 mt-8">
        <div className="lg:col-span-2 bg-white border border-[#DEE2E6] p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <div className="overline text-[#868E96]">Top recommendations</div>
              <div className="font-heading text-xl font-bold">Best career fits</div>
            </div>
            <Link to="/app/recommendations" className="text-sm text-[#002FA7] font-semibold inline-flex items-center gap-1 hover:underline" data-testid="overview-view-all-recs">View all <ArrowRight size={14} /></Link>
          </div>
          {data.top_recommendations.length === 0 ? (
            <div className="text-sm text-[#495057] py-6">No recommendations yet. <Link to="/app/profile" className="text-[#002FA7] font-semibold hover:underline">Complete your profile</Link> first.</div>
          ) : (
            <ul className="space-y-3">
              {data.top_recommendations.map((r, i) => (
                <li key={r.id || i} className="border border-[#DEE2E6] p-4 hover:border-[#002FA7] transition-colors" data-testid={`overview-rec-${i}`}>
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <div className="font-heading font-semibold">{r.title}</div>
                      <div className="text-xs text-[#868E96] mt-0.5">{r.salary_insight}</div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="font-mono text-2xl font-bold text-[#002FA7]">{r.match_score}<span className="text-xs text-[#868E96]">%</span></div>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
        <div className="bg-white border border-[#DEE2E6] p-6">
          <div className="overline text-[#868E96] mb-2">Quick actions</div>
          <div className="font-heading text-xl font-bold mb-4">Get moving</div>
          <div className="space-y-2">
            <Link to="/app/profile" className="flex items-center gap-3 p-3 border border-[#DEE2E6] hover:border-[#002FA7] hover:bg-[#F8F9FA] transition-all" data-testid="quick-profile">
              <UserIcon size={18} className="text-[#002FA7]" />
              <div className="text-sm font-medium">Update profile</div>
            </Link>
            <Link to="/app/recommendations" className="flex items-center gap-3 p-3 border border-[#DEE2E6] hover:border-[#002FA7] hover:bg-[#F8F9FA] transition-all" data-testid="quick-recs">
              <Target size={18} className="text-[#002FA7]" />
              <div className="text-sm font-medium">Get recommendations</div>
            </Link>
            <Link to="/app/jobs" className="flex items-center gap-3 p-3 border border-[#DEE2E6] hover:border-[#002FA7] hover:bg-[#F8F9FA] transition-all" data-testid="quick-jobs">
              <Briefcase size={18} className="text-[#002FA7]" />
              <div className="text-sm font-medium">Browse jobs</div>
            </Link>
            <Link to="/app/roadmap" className="flex items-center gap-3 p-3 border border-[#DEE2E6] hover:border-[#002FA7] hover:bg-[#F8F9FA] transition-all" data-testid="quick-roadmap">
              <CheckCircle2 size={18} className="text-[#002FA7]" />
              <div className="text-sm font-medium">Track progress</div>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
