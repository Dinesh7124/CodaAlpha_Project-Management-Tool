import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import api from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";

export default function ForgotPassword() {
  const [step, setStep] = useState("email"); // email | otp | password
  const [form, setForm] = useState({ email: "", otp: "", newPassword: "", confirm: "" });
  const [resetToken, setResetToken] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [resendCooldown, setResendCooldown] = useState(0);
  const { show } = useToast();
  const nav = useNavigate();

  const sendOtp = async (e) => {
    if (e) e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/password/forgot", { email: form.email });
      setStep("otp");
      show("OTP sent to " + form.email, "success");
      startCooldown();
    } catch (err) {
      setError(err.response?.data?.error || "Failed to send OTP");
    } finally {
      setLoading(false);
    }
  };

  const startCooldown = () => {
    setResendCooldown(60);
    const interval = setInterval(() => {
      setResendCooldown((prev) => {
        if (prev <= 1) {
          clearInterval(interval);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const { data } = await api.post("/password/verify-otp", {
        email: form.email,
        otp: form.otp,
      });
      setResetToken(data.resetToken);
      setStep("password");
      show("OTP verified! Set new password", "success");
    } catch (err) {
      setError(err.response?.data?.error || "Invalid OTP");
    } finally {
      setLoading(false);
    }
  };

  const resetPassword = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirm) {
      setError("Passwords don't match");
      return;
    }
    if (form.newPassword.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }
    setError("");
    setLoading(true);
    try {
      await api.post("/password/reset", {
        email: form.email,
        resetToken,
        newPassword: form.newPassword,
      });
      show("Password reset successful! Please login.", "success");
      setTimeout(() => nav("/login"), 1000);
    } catch (err) {
      setError(err.response?.data?.error || "Reset failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-animated relative overflow-hidden">
      <div className="absolute top-20 left-20 w-72 h-72 bg-white/20 rounded-full blur-3xl animate-float" />
      <div className="absolute bottom-20 right-20 w-96 h-96 bg-purple-300/30 rounded-full blur-3xl animate-float" style={{ animationDelay: "1s" }} />

      <div className="relative w-full max-w-md">
        <div className="glass rounded-3xl p-8 shadow-2xl border border-white/40 animate-slide-up">
          <div className="text-center mb-8">
            <div className="inline-block p-3 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 shadow-lg mb-4">
              <span className="text-3xl">🔐</span>
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-600 to-purple-600 bg-clip-text text-transparent">
              {step === "email" && "Forgot Password"}
              {step === "otp" && "Enter OTP"}
              {step === "password" && "New Password"}
            </h1>
            <p className="text-sm mt-2" style={{ color: "var(--text-secondary)" }}>
              {step === "email" && "We'll send an OTP to your email"}
              {step === "otp" && "Check your inbox for the 6-digit code"}
              {step === "password" && "Set your new password"}
            </p>
          </div>

          {/* Step indicators */}
          <div className="flex justify-center gap-2 mb-6">
            {["email", "otp", "password"].map((s, i) => (
              <div key={s} className="flex items-center gap-2">
                <div
                  className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold transition"
                  style={{
                    background: ["email", "otp", "password"].indexOf(step) >= i
                      ? "linear-gradient(135deg, #6366f1, #8b5cf6)"
                      : "var(--border)",
                    color: ["email", "otp", "password"].indexOf(step) >= i ? "white" : "var(--text-muted)",
                  }}
                >
                  {i + 1}
                </div>
                {i < 2 && (
                  <div
                    className="w-8 h-0.5 rounded"
                    style={{
                      background: ["email", "otp", "password"].indexOf(step) > i
                        ? "#6366f1"
                        : "var(--border)",
                    }}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1 — Email */}
          {step === "email" && (
            <form onSubmit={sendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Email Address
                </label>
                <Input
                  type="email"
                  placeholder="you@example.com"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                />
              </div>
              {error && <ErrorMessage error={error} />}
              <Button type="submit" className="w-full !py-3" disabled={loading}>
                {loading ? "Sending OTP..." : "Send OTP"}
              </Button>
            </form>
          )}

          {/* Step 2 — OTP */}
          {step === "otp" && (
            <form onSubmit={verifyOtp} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Enter the 6-digit OTP
                </label>
                <input
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={form.otp}
                  onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}
                  className="input text-center text-2xl font-bold"
                  style={{ letterSpacing: "0.5em" }}
                  required
                  autoFocus
                />
              </div>

              {/* Info box — NO OTP shown */}
              <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800">
                <span className="text-lg">📬</span>
                <div className="text-xs text-blue-700 dark:text-blue-300">
                  <strong>OTP sent to your email.</strong> Check your inbox and spam folder.
                  OTP is valid for <strong>10 minutes</strong>.
                </div>
              </div>

              {error && <ErrorMessage error={error} />}

              <Button type="submit" className="w-full !py-3" disabled={loading || form.otp.length !== 6}>
                {loading ? "Verifying..." : "Verify OTP"}
              </Button>

              <div className="text-center">
                <button
                  type="button"
                  onClick={sendOtp}
                  disabled={resendCooldown > 0 || loading}
                  className="text-xs text-indigo-600 hover:underline disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {resendCooldown > 0
                    ? "Resend OTP in " + resendCooldown + "s"
                    : "Didn't receive? Resend OTP"}
                </button>
              </div>
            </form>
          )}

          {/* Step 3 — New Password */}
          {step === "password" && (
            <form onSubmit={resetPassword} className="space-y-4">
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  New Password
                </label>
                <Input
                  type="password"
                  placeholder="Min 6 characters"
                  value={form.newPassword}
                  onChange={(e) => setForm({ ...form, newPassword: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
                  Confirm Password
                </label>
                <Input
                  type="password"
                  placeholder="Re-enter password"
                  value={form.confirm}
                  onChange={(e) => setForm({ ...form, confirm: e.target.value })}
                  required
                />
              </div>
              {error && <ErrorMessage error={error} />}
              <Button type="submit" className="w-full !py-3" disabled={loading}>
                {loading ? "Resetting..." : "Reset Password"}
              </Button>
            </form>
          )}

          <div className="mt-6 text-center">
            <Link to="/login" className="text-sm text-indigo-600 hover:underline font-medium">
              ← Back to Sign In
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function ErrorMessage({ error }) {
  return (
    <div className="text-red-600 text-sm bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg px-3 py-2">
      ⚠️ {error}
    </div>
  );
}