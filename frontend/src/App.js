import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Toaster } from "sonner";
import Landing from "./pages/Landing";
import SignIn from "./pages/SignIn";
import SignUp from "./pages/SignUp";
import Dashboard from "./pages/Dashboard";
import Onboarding from "./pages/Onboarding";
import "./index.css";

function Protected({ children, requireOnboarding = true }) {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#495057]">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (requireOnboarding && !user.onboarding_completed) return <Navigate to="/onboarding" replace />;
  return children;
}

function OnboardingGate() {
  const { user, loading } = useAuth();
  if (loading) return <div className="min-h-screen flex items-center justify-center text-[#495057]">Loading...</div>;
  if (!user) return <Navigate to="/signin" replace />;
  if (user.onboarding_completed) return <Navigate to="/app" replace />;
  return <Onboarding />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="swiss">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/signin" element={<SignIn />} />
            <Route path="/signup" element={<SignUp />} />
            <Route path="/onboarding" element={<OnboardingGate />} />
            <Route path="/app/*" element={<Protected><Dashboard /></Protected>} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
        <Toaster position="top-right" />
      </BrowserRouter>
    </AuthProvider>
  );
}
