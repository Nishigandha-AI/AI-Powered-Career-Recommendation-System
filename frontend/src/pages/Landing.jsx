import { Link } from "react-router-dom";
import { ArrowRight, FileText, Sparkles, Target, Compass, BookOpen, Briefcase, MessageSquare, BarChart3 } from "lucide-react";

const HERO_IMG = "https://images.pexels.com/photos/8068008/pexels-photo-8068008.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";
const STAIRS_IMG = "https://images.unsplash.com/photo-1505027725876-3eefb3af668f?crop=entropy&cs=srgb&fm=jpg&ixid=M3w3NTY2NzZ8MHwxfHNlYXJjaHwzfHxhYnN0cmFjdCUyMGFyY2hpdGVjdHVyZSUyMHN0YWlycyUyMGdyb3d0aHxlbnwwfHx8fDE3ODE5NDA1MDN8MA&ixlib=rb-4.1.0&q=85";
const WORKSPACE_IMG = "https://images.pexels.com/photos/19513471/pexels-photo-19513471.jpeg?auto=compress&cs=tinysrgb&dpr=2&h=650&w=940";

const FEATURES = [
  { icon: FileText, label: "Resume Analysis", desc: "Upload PDF/DOCX. We extract skills, experience, and education with AI." },
  { icon: Sparkles, label: "AI Recommendations", desc: "Five tailored career paths with match scores, salary, and demand." },
  { icon: Target, label: "Skill Gap Analysis", desc: "Quantify what you have vs what each role needs. Close the gap." },
  { icon: Compass, label: "Learning Roadmaps", desc: "Personalised, milestone-based paths with progress tracking." },
  { icon: BookOpen, label: "Curated Resources", desc: "Top YouTube videos, docs, courses, GitHub repos, and articles." },
  { icon: Briefcase, label: "Live Jobs Matched", desc: "Real remote jobs ranked by skill fit. Save & track applications." },
  { icon: MessageSquare, label: "AI Career Coach", desc: "24/7 chatbot for resume help, interviews, and planning." },
  { icon: BarChart3, label: "Readiness Score", desc: "A single number that tells you how close you are to your goal." },
];

const PROCESS = [
  { n: "01", t: "Build your profile", d: "Upload your resume or input skills, education, and goals." },
  { n: "02", t: "Get AI recommendations", d: "Receive five career paths matched to your unique profile." },
  { n: "03", t: "Close skill gaps", d: "Follow milestone roadmaps with curated learning resources." },
  { n: "04", t: "Apply to live jobs", d: "Save, track, and convert opportunities into offers." },
];

export default function Landing() {
  return (
    <div className="bg-white text-[#0A0A0A] min-h-screen">
      {/* NAV */}
      <nav className="bg-white/90 backdrop-blur-xl border-b border-[#DEE2E6] sticky top-0 z-50" data-testid="landing-nav">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 h-16 flex items-center justify-between">
          <Link to="/" className="font-heading font-black text-xl tracking-tight" data-testid="logo-link">
            CareerMap<span className="text-[#002FA7]">.</span>AI
          </Link>
          <div className="flex items-center gap-2">
            <Link to="/signin" className="btn-ghost" data-testid="nav-signin-btn">Sign In</Link>
            <Link to="/signup" className="btn-primary inline-flex items-center gap-2" data-testid="nav-signup-btn">
              Get Started <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </nav>

      {/* HERO */}
      <section className="border-b border-[#DEE2E6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-16 lg:py-24 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-7 fade-up">
            <div className="overline text-[#002FA7] mb-6" data-testid="hero-overline">AI Career Intelligence · v1</div>
            <h1 className="font-heading text-5xl sm:text-6xl lg:text-7xl tracking-tight leading-[0.95] font-black mb-6">
              Engineer your<br/>
              <span className="text-[#002FA7]">career path</span><br/>
              with precision.
            </h1>
            <p className="text-lg text-[#495057] max-w-xl leading-relaxed mb-8">
              CareerMap AI analyses your resume, identifies your strongest opportunities, and gives you a
              measurable, milestone-based plan to get hired — backed by Claude Sonnet 4.5 and live job data.
            </p>
            <div className="flex flex-wrap gap-3 mb-12">
              <Link to="/signup" className="btn-primary inline-flex items-center gap-2" data-testid="hero-get-started-btn">
                Get Started <ArrowRight size={18} />
              </Link>
              <Link to="/signin" className="btn-secondary" data-testid="hero-signin-btn">Sign In</Link>
            </div>
            <div className="grid grid-cols-3 gap-6 max-w-md">
              <div><div className="font-heading text-3xl font-black">5</div><div className="text-xs text-[#868E96] uppercase tracking-wider mt-1">Career Paths</div></div>
              <div><div className="font-heading text-3xl font-black text-[#002FA7]">100%</div><div className="text-xs text-[#868E96] uppercase tracking-wider mt-1">Personalised</div></div>
              <div><div className="font-heading text-3xl font-black">24/7</div><div className="text-xs text-[#868E96] uppercase tracking-wider mt-1">AI Coach</div></div>
            </div>
          </div>
          <div className="lg:col-span-5 relative">
            <div className="relative border border-[#DEE2E6]">
              <img src={HERO_IMG} alt="Modern career workspace" className="w-full h-[420px] object-cover" />
              <div className="absolute -bottom-4 -left-4 bg-white border border-[#0A0A0A] p-4 max-w-[200px]">
                <div className="overline text-[#868E96] mb-1">Readiness</div>
                <div className="font-heading font-black text-3xl">87%</div>
                <div className="score-bar mt-2" style={{ '--w': '87%' }}></div>
              </div>
              <div className="absolute -top-4 -right-4 bg-[#002FA7] text-white p-4 max-w-[180px]">
                <div className="overline opacity-80 mb-1">Top Match</div>
                <div className="font-heading font-bold text-base leading-tight">Senior Frontend Engineer</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* PROCESS */}
      <section className="border-b border-[#DEE2E6] bg-[#F8F9FA]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="grid lg:grid-cols-12 gap-12 mb-12">
            <div className="lg:col-span-4">
              <div className="overline text-[#002FA7] mb-4">The Process</div>
              <h2 className="font-heading text-4xl sm:text-5xl tracking-tight leading-none font-black">
                From profile to<br/>placement in<br/>four steps.
              </h2>
            </div>
            <div className="lg:col-span-8 grid sm:grid-cols-2 gap-px bg-[#DEE2E6] border border-[#DEE2E6]">
              {PROCESS.map((s) => (
                <div key={s.n} className="bg-white p-8" data-testid={`process-step-${s.n}`}>
                  <div className="font-mono text-sm text-[#002FA7] mb-3">{s.n}</div>
                  <div className="font-heading text-xl font-semibold mb-2">{s.t}</div>
                  <p className="text-[#495057] text-sm leading-relaxed">{s.d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* FEATURES */}
      <section className="border-b border-[#DEE2E6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20">
          <div className="grid lg:grid-cols-12 gap-12 mb-12">
            <div className="lg:col-span-12">
              <h2 className="font-heading text-4xl sm:text-5xl tracking-tight leading-none font-black mb-6">
                Every tool you need.<br/>None you don&apos;t.
              </h2>
              <p className="text-[#495057] leading-relaxed max-w-md">
                A focused toolkit built around the actual decisions and actions that move a career forward.
              </p>
            </div>
          </div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-px bg-[#DEE2E6] border border-[#DEE2E6]">
            {FEATURES.map((f) => {
              const Icon = f.icon;
              return (
                <div key={f.label} className="bg-white p-6 hover:bg-[#F8F9FA] transition-colors duration-200" data-testid={`feature-${f.label.toLowerCase().replace(/ /g,'-')}`}>
                  <Icon size={28} strokeWidth={1.5} className="mb-4 text-[#002FA7]" />
                  <div className="font-heading font-semibold text-base mb-2">{f.label}</div>
                  <p className="text-sm text-[#495057] leading-relaxed">{f.desc}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* BENEFITS */}
      <section className="border-b border-[#DEE2E6] bg-[#0A0A0A] text-white">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-20 grid lg:grid-cols-12 gap-12 items-center">
          <div className="lg:col-span-5">
            <img src={WORKSPACE_IMG} alt="Workspace" className="w-full h-80 object-cover" />
          </div>
          <div className="lg:col-span-7">
            <div className="overline text-[#FFB300] mb-4">Why CareerMap</div>
            <h2 className="font-heading text-4xl sm:text-5xl tracking-tight leading-none font-black mb-8">
              Direction over<br/>distraction.
            </h2>
            <div className="grid sm:grid-cols-2 gap-x-12 gap-y-6">
              {[
                ["Quantified match scores","No more guessing if a role fits — see exact alignment."],
                ["Resume → roadmap","Upload once, get an end-to-end plan with milestones."],
                ["Real job data","Live remote jobs ranked by your actual skill profile."],
                ["Conversation, not forms","An AI coach you can ask anything, any time."],
              ].map(([t, d]) => (
                <div key={t}>
                  <div className="font-heading font-semibold mb-1">{t}</div>
                  <p className="text-sm text-white/70 leading-relaxed">{d}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="border-b border-[#DEE2E6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-24 text-center">
          <h2 className="font-heading text-5xl sm:text-6xl tracking-tight leading-none font-black mb-6">
            Start your career map<br/><span className="text-[#002FA7]">in under two minutes.</span>
          </h2>
          <p className="text-[#495057] text-lg mb-10 max-w-xl mx-auto">
            Sign up, upload your resume, and get personalised recommendations powered by Claude Sonnet 4.5.
          </p>
          <Link to="/signup" className="btn-primary inline-flex items-center gap-2" data-testid="cta-signup-btn">
            Get Started <ArrowRight size={18} />
          </Link>
        </div>
      </section>

      <footer className="border-t border-[#DEE2E6]">
        <div className="max-w-7xl mx-auto px-6 lg:px-12 py-8 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="font-heading font-black tracking-tight">CareerMap<span className="text-[#002FA7]">.</span>AI</div>
          <div className="text-sm text-[#868E96]">© 2026 · Engineered for ambitious careers.</div>
        </div>
      </footer>
    </div>
  );
}
