import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { toast } from "sonner";
import { ArrowRight } from "lucide-react";

export default function SignUp() {
  const { signup } = useAuth();
  const nav = useNavigate();
  const [form, setForm] = useState({ full_name: "", email: "", password: "" });
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (form.password.length < 6) { toast.error("Password must be 6+ characters"); return; }
    setLoading(true);
    try {
      await signup(form.email, form.password, form.full_name);
      toast.success("Account created");
      nav("/onboarding");
    } catch (err) {
      toast.error(err?.response?.data?.detail || "Sign up failed");
    } finally { setLoading(false); }
  };

  return (
    <div className="min-h-screen bg-white grid lg:grid-cols-2">
      <div className="hidden lg:flex flex-col justify-between bg-[#002FA7] text-white p-12">
        <Link to="/" className="font-heading font-black text-xl tracking-tight" data-testid="signup-logo-link">
          CareerMap<span className="text-white opacity-60">.</span>AI
        </Link>
        <div>
          <div className="overline text-white/70 mb-6">Get Started · Free</div>
          <h1 className="font-heading text-5xl font-black leading-none tracking-tight mb-4">
            Two minutes<br/>to your<br/>career map.
          </h1>
          <p className="text-white/70 max-w-md">Upload a resume, get matched to careers, and follow a personalised roadmap.</p>
        </div>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div><div className="overline text-white/50 mb-1">Powered by</div><div className="font-semibold">Claude Sonnet 4.5</div></div>
          <div><div className="overline text-white/50 mb-1">Live jobs</div><div className="font-semibold">Remotive feed</div></div>
        </div>
      </div>
      <div className="flex items-center justify-center p-8 lg:p-16">
        <div className="w-full max-w-md">
          <div className="overline text-[#002FA7] mb-4">Sign Up</div>
          <h2 className="font-heading text-4xl font-black tracking-tight mb-8">Create your account.</h2>
          <form onSubmit={submit} className="space-y-5" data-testid="signup-form">
            <div>
              <label className="form-label">Full Name</label>
              <input required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} placeholder="e.g. James Smith" className="input-swiss" data-testid="signup-fullname-input" />
            </div>
            <div>
              <label className="form-label">Email</label>
              <input type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="you@example.com" className="input-swiss" data-testid="signup-email-input" />
            </div>
            <div>
              <label className="form-label">Password</label>
              <input type="password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Minimum 6 characters" className="input-swiss" data-testid="signup-password-input" />
              <div className="text-xs text-[#868E96] mt-1">Min. 6 characters</div>
            </div>
            <button type="submit" disabled={loading} className="btn-primary w-full inline-flex items-center justify-center gap-2 disabled:opacity-60" data-testid="signup-submit-btn">
              {loading ? "Creating..." : <>Create Account <ArrowRight size={16} /></>}
            </button>
          </form>
          <div className="mt-8 text-sm text-[#495057]">
            Already have an account?{" "}
            <Link to="/signin" className="text-[#002FA7] font-semibold hover:underline" data-testid="signup-to-signin-link">Sign in</Link>
          </div>
        </div>
      </div>
    </div>
  );
}
