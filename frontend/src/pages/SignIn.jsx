import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function SignIn() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const me = await login(email, password);
      toast.success("Welcome back");
      nav(me?.onboarding_completed ? "/app" : "/onboarding");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Invalid credentials");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#0A0A0A] text-white p-12">
        <Link to="/" className="font-heading font-black text-xl tracking-tight" data-testid="signin-logo-link">
          CareerMap<span className="text-[#002FA7]">.</span>AI
        </Link>
        <div>
          <div className="overline text-[#FFB300] mb-6">Welcome back</div>
          <h1 className="font-heading text-5xl font-black leading-none tracking-tight mb-4">
            Pick up<br/>where you<br/>left off.
          </h1>
          <p className="text-white/60 max-w-md">Continue building your career roadmap with AI guidance.</p>
        </div>
        <div className="text-xs text-white/40 font-mono">v1.0 · Production</div>
      </div>
      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="overline text-[#002FA7] mb-4">Sign In</div>
          <h2 className="font-heading text-4xl font-black tracking-tight mb-8">Welcome back.</h2>
          <form onSubmit={submit} className="space-y-5" data-testid="signin-form">
            <div>
              <label className="form-label">Email</label>
              <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" className="input-swiss" data-testid="signin-email-input" />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Your password" className="input-swiss" data-testid="signin-password-input" />
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="signin-submit-btn">
              {loading ? "Signing in..." : <>Sign In <ArrowRight size={16} /></>}
            </button>
          </form>
          <div className="mt-8 text-sm text-[#495057]">
            New here?{" "}
            <Link to="/signup" className="text-[#002FA7] font-semibold hover:underline" data-testid="signin-to-signup-link">Create an account</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
