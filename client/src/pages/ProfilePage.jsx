import { useState, useRef, useEffect } from "react";
import api from "../lib/api.js";
import Layout from "../components/layout/Layout.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import Modal from "../components/ui/Modal.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import { useToast } from "../context/ToastContext.jsx";

export default function ProfilePage() {
  const { user, updateUser } = useAuth();
  const { show } = useToast();

  const [activeTab, setActiveTab] = useState("profile");
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    avatarColor: user?.avatarColor || "#6366f1",
  });
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  // Sync form when user updates (e.g. after avatar upload)
  useEffect(() => {
    if (user) {
      setForm({
        name: user.name || "",
        bio: user.bio || "",
        avatarColor: user.avatarColor || "#6366f1",
      });
    }
  }, [user]);

  // ============================================================
  // SAVE PROFILE — uses updateUser (partial merge)
  // ============================================================
  const saveProfile = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      const { data } = await api.patch("/users/me", form);
      updateUser(data); // merges {name, bio, theme, avatarColor, avatarUrl} into context
      show("Profile updated ✅", "success");
    } catch (err) {
      show(err.response?.data?.error || "Update failed", "error");
    } finally {
      setSaving(false);
    }
  };

  // ============================================================
  // UPLOAD AVATAR — uses updateUser
  // ============================================================
  const uploadAvatar = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      show("File too large (max 5MB)", "error");
      return;
    }

    setUploading(true);
    const fd = new FormData();
    fd.append("avatar", file);
    try {
      const { data } = await api.post("/users/me/avatar", fd, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      updateUser(data); // merges {avatarUrl, ...}
      show("Avatar updated! 📸", "success");
    } catch (err) {
      show(err.response?.data?.error || "Upload failed", "error");
    } finally {
      setUploading(false);
      e.target.value = "";
    }
  };

  const tabs = [
    { id: "profile", label: "Profile", icon: "👤" },
    { id: "security", label: "Security", icon: "🔒" },
    { id: "activity", label: "Activity", icon: "📊" },
    { id: "danger", label: "Danger Zone", icon: "⚠️" },
  ];

  return (
    <Layout>
      <div className="max-w-4xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-6">Profile & Settings</h1>

        <div className="flex gap-2 mb-6 border-b overflow-x-auto" style={{ borderColor: "var(--border)" }}>
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              className="px-4 py-2 text-sm font-medium transition border-b-2 -mb-px whitespace-nowrap"
              style={
                activeTab === t.id
                  ? { borderColor: "var(--accent-primary)", color: "var(--accent-primary)" }
                  : { borderColor: "transparent", color: "var(--text-secondary)" }
              }
            >
              <span className="mr-1.5">{t.icon}</span>
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === "profile" && (
          <ProfileTab
            user={user}
            form={form}
            setForm={setForm}
            saveProfile={saveProfile}
            saving={saving}
            fileRef={fileRef}
            uploadAvatar={uploadAvatar}
            uploading={uploading}
          />
        )}

        {activeTab === "security" && <SecurityTab user={user} />}
        {activeTab === "activity" && <ActivityTab />}
        {activeTab === "danger" && <DangerTab user={user} />}
      </div>
    </Layout>
  );
}

// ============================================================
// PROFILE TAB
// ============================================================
function ProfileTab({ user, form, setForm, saveProfile, saving, fileRef, uploadAvatar, uploading }) {
  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-6">Basic Information</h2>

      <div className="flex flex-col sm:flex-row items-center gap-6 mb-6 pb-6 border-b" style={{ borderColor: "var(--border)" }}>
        <div className="relative">
          {user?.avatarUrl ? (
            <img
              src={"http://localhost:5000" + user.avatarUrl}
              alt={user.name}
              className="w-24 h-24 rounded-full object-cover shadow-lg border-4 border-white dark:border-slate-700"
            />
          ) : (
            <Avatar name={user?.name} color={user?.avatarColor} size={96} />
          )}
          {uploading && (
            <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-4 border-white border-t-transparent" />
            </div>
          )}
        </div>
        <div className="text-center sm:text-left">
          <h3 className="font-semibold text-lg">{user?.name}</h3>
          <p className="text-sm mb-3" style={{ color: "var(--text-muted)" }}>
            {user?.email}
          </p>
          <input ref={fileRef} type="file" accept="image/*" hidden onChange={uploadAvatar} />
          <Button type="button" variant="ghost" onClick={() => fileRef.current?.click()} disabled={uploading}>
            {uploading ? "Uploading..." : "📸 Change Photo"}
          </Button>
          <p className="text-xs mt-2" style={{ color: "var(--text-muted)" }}>
            JPG, PNG or GIF · Max 5 MB
          </p>
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-4">
        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
            Full Name
          </label>
          <Input
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            placeholder="Your name"
            required
          />
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
            Bio
          </label>
          <textarea
            className="input"
            rows="3"
            value={form.bio}
            onChange={(e) => setForm({ ...form, bio: e.target.value })}
            placeholder="Tell us about yourself (max 200 chars)"
            maxLength={200}
          />
          <p className="text-xs mt-1" style={{ color: "var(--text-muted)" }}>
            {form.bio.length}/200 characters
          </p>
        </div>

        <div>
          <label className="text-xs font-medium mb-1.5 block" style={{ color: "var(--text-secondary)" }}>
            Avatar Color (if no photo)
          </label>
          <input
            type="color"
            value={form.avatarColor}
            onChange={(e) => setForm({ ...form, avatarColor: e.target.value })}
            className="h-10 w-20 rounded cursor-pointer"
          />
        </div>

        <Button type="submit" disabled={saving}>
          {saving ? "Saving..." : "💾 Save Changes"}
        </Button>
      </form>
    </div>
  );
}

// ============================================================
// SECURITY TAB
// ============================================================
function SecurityTab({ user }) {
  const { show } = useToast();
  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "", confirm: "" });
  const [changingPwd, setChangingPwd] = useState(false);
  const [emailModal, setEmailModal] = useState(false);
  const [sessions, setSessions] = useState([]);

  useEffect(() => {
    api.get("/users/me/sessions").then((r) => setSessions(r.data)).catch(() => {});
  }, []);

  const changePwd = async (e) => {
    e.preventDefault();
    if (pwd.newPassword !== pwd.confirm) {
      show("Passwords don't match", "error");
      return;
    }
    if (pwd.newPassword.length < 6) {
      show("Password min 6 characters", "error");
      return;
    }
    setChangingPwd(true);
    try {
      await api.patch("/users/me/password", {
        oldPassword: pwd.oldPassword,
        newPassword: pwd.newPassword,
      });
      setPwd({ oldPassword: "", newPassword: "", confirm: "" });
      show("Password changed! 📧 Check email for confirmation", "success");
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
    } finally {
      setChangingPwd(false);
    }
  };

  const logoutAll = async () => {
    if (!confirm("Logout from all other devices?")) return;
    try {
      await api.post("/users/me/sessions/logout-all");
      show("All sessions logged out", "success");
      setSessions([]);
    } catch {
      show("Failed", "error");
    }
  };

  return (
    <div className="space-y-6">
      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">🔑 Change Password</h2>
        <form onSubmit={changePwd} className="space-y-4">
          <Input
            type="password"
            placeholder="Current password"
            value={pwd.oldPassword}
            onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="New password (min 6 chars)"
            value={pwd.newPassword}
            onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Confirm new password"
            value={pwd.confirm}
            onChange={(e) => setPwd({ ...pwd, confirm: e.target.value })}
            required
          />
          <Button type="submit" disabled={changingPwd}>
            {changingPwd ? "Changing..." : "Update Password"}
          </Button>
        </form>
      </div>

      <div className="card p-6">
        <h2 className="text-lg font-semibold mb-4">📧 Email Address</h2>
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div>
            <p className="font-medium">{user?.email}</p>
            <p className="text-xs" style={{ color: "var(--text-muted)" }}>
              Used for login and notifications
            </p>
          </div>
          <Button variant="ghost" onClick={() => setEmailModal(true)}>
            Change Email
          </Button>
        </div>
      </div>

      <div className="card p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">💻 Active Sessions</h2>
          {sessions.length > 0 && (
            <Button variant="ghost" onClick={logoutAll} className="text-xs">
              Logout All Devices
            </Button>
          )}
        </div>
        {sessions.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text-muted)" }}>
            No active sessions tracked yet.
          </p>
        ) : (
          <div className="space-y-2">
            {sessions.map((s) => (
              <div key={s.id} className="flex items-center gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
                <span className="text-lg">💻</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{s.userAgent || "Unknown device"}</p>
                  <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                    {s.ip} · Last active: {new Date(s.lastActiveAt).toLocaleString()}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {emailModal && <EmailChangeModal onClose={() => setEmailModal(false)} user={user} />}
    </div>
  );
}

// ============================================================
// EMAIL CHANGE MODAL
// ============================================================
function EmailChangeModal({ onClose, user }) {
  const { updateUser } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState("password");
  const [form, setForm] = useState({ newEmail: "", password: "", otp: "" });
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const requestOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/users/me/email/request", {
        newEmail: form.newEmail,
        password: form.password,
      });
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("otp");
      show("OTP sent to " + form.newEmail, "success");
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const verifyOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/users/me/email/verify", { otp: form.otp });
      updateUser(data.user); // ✅ partial update
      show("Email changed successfully! ✅", "success");
      onClose();
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open onClose={onClose} width="max-w-md">
      <h2 className="text-xl font-bold mb-4">
        {step === "password" ? "Change Email" : "Verify OTP"}
      </h2>

      {step === "password" && (
        <form onSubmit={requestOtp} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            Current email: <strong>{user.email}</strong>
          </p>
          <Input
            type="email"
            placeholder="New email address"
            value={form.newEmail}
            onChange={(e) => setForm({ ...form, newEmail: e.target.value })}
            required
          />
          <Input
            type="password"
            placeholder="Your current password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            required
          />
          <div className="text-xs p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300">
            💡 We'll send an OTP to your <strong>new email</strong> to verify you own it.
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={onClose} type="button">Cancel</Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Sending..." : "Send OTP"}
            </Button>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={verifyOtp} className="space-y-4">
          <p className="text-sm" style={{ color: "var(--text-secondary)" }}>
            OTP sent to <strong>{form.newEmail}</strong>
          </p>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={form.otp}
            onChange={(e) => setForm({ ...form, otp: e.target.value.replace(/\D/g, "") })}
            className="input text-center text-2xl font-bold"
            style={{ letterSpacing: "0.5em" }}
            autoFocus
            required
          />
          {devOtp && (
            <div className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-center">
              Dev mode OTP: <strong>{devOtp}</strong>
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="ghost" onClick={() => setStep("password")} type="button">Back</Button>
            <Button type="submit" disabled={loading || form.otp.length !== 6}>
              {loading ? "Verifying..." : "Verify & Change"}
            </Button>
          </div>
        </form>
      )}
    </Modal>
  );
}

// ============================================================
// ACTIVITY TAB
// ============================================================
function ActivityTab() {
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get("/users/me/security-log")
      .then((r) => setLogs(r.data))
      .finally(() => setLoading(false));
  }, []);

  const EVENT_ICONS = {
    login: "🔓",
    logout: "🔒",
    password_changed: "🔑",
    email_changed: "📧",
    email_change_requested: "📩",
    avatar_changed: "📸",
    all_sessions_revoked: "🚪",
  };

  const timeAgo = (date) => {
    const s = Math.floor((Date.now() - new Date(date)) / 1000);
    if (s < 60) return "just now";
    if (s < 3600) return Math.floor(s / 60) + "m ago";
    if (s < 86400) return Math.floor(s / 3600) + "h ago";
    return Math.floor(s / 86400) + "d ago";
  };

  if (loading) return <div className="card p-6 text-center">Loading...</div>;

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold mb-4">🔒 Security Activity</h2>
      {logs.length === 0 ? (
        <p className="text-sm text-center py-8" style={{ color: "var(--text-muted)" }}>
          No activity yet. Events like login, password change, and email updates will appear here.
        </p>
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg" style={{ background: "var(--bg-hover)" }}>
              <span className="text-lg">{EVENT_ICONS[log.event] || "•"}</span>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium capitalize">
                  {log.event.replace(/_/g, " ")}
                </p>
                <p className="text-xs" style={{ color: "var(--text-muted)" }}>
                  {log.ip} · {log.userAgent?.substring(0, 60) || "Unknown device"}
                </p>
              </div>
              <span className="text-xs whitespace-nowrap" style={{ color: "var(--text-muted)" }}>
                {timeAgo(log.createdAt)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================================
// DANGER ZONE TAB
// ============================================================
function DangerTab({ user }) {
  const { logout } = useAuth();
  const { show } = useToast();
  const [step, setStep] = useState("idle");
  const [password, setPassword] = useState("");
  const [otp, setOtp] = useState("");
  const [devOtp, setDevOtp] = useState("");
  const [loading, setLoading] = useState(false);

  const requestDeletion = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data } = await api.post("/users/me/delete/request", { password });
      if (data.devOtp) setDevOtp(data.devOtp);
      setStep("otp");
      show("Confirmation OTP sent to your email", "info");
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
    } finally {
      setLoading(false);
    }
  };

  const confirmDeletion = async (e) => {
    e.preventDefault();
    if (!confirm("This will PERMANENTLY delete your account and all data. Are you absolutely sure?")) return;
    setLoading(true);
    try {
      await api.post("/users/me/delete/confirm", { otp });
      show("Account deleted. Goodbye! 👋", "success");
      setTimeout(() => logout(), 2000);
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
      setLoading(false);
    }
  };

  return (
    <div className="card p-6 border-2 border-red-200 dark:border-red-900">
      <h2 className="text-lg font-semibold mb-2 text-red-600">⚠️ Danger Zone</h2>
      <p className="text-sm mb-4" style={{ color: "var(--text-secondary)" }}>
        These actions are permanent and cannot be undone.
      </p>

      {step === "idle" && (
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-4 mb-4">
          <h3 className="font-semibold text-red-700 dark:text-red-300 mb-2">🗑️ Delete Account</h3>
          <p className="text-sm text-red-600 dark:text-red-400 mb-3">
            Permanently delete your account and all associated data.
          </p>
          <Button onClick={() => setStep("password")} className="!bg-red-600 hover:!bg-red-700">
            Delete My Account
          </Button>
        </div>
      )}

      {step === "password" && (
        <form onSubmit={requestDeletion} className="space-y-4 max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            ⚠️ This is irreversible. Enter your password to confirm.
          </div>
          <Input
            type="password"
            placeholder="Your password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoFocus
            required
          />
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("idle")} type="button">Cancel</Button>
            <Button type="submit" disabled={loading} className="!bg-red-600 hover:!bg-red-700">
              {loading ? "Checking..." : "Send OTP"}
            </Button>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={confirmDeletion} className="space-y-4 max-w-md">
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 text-sm text-red-700 dark:text-red-300">
            📧 OTP sent to <strong>{user.email}</strong>. Enter it below.
          </div>
          <input
            type="text"
            inputMode="numeric"
            maxLength={6}
            placeholder="000000"
            value={otp}
            onChange={(e) => setOtp(e.target.value.replace(/\D/g, ""))}
            className="input text-center text-2xl font-bold"
            style={{ letterSpacing: "0.5em" }}
            autoFocus
            required
          />
          {devOtp && (
            <div className="text-xs p-2 rounded bg-blue-50 dark:bg-blue-900/20 text-blue-700 dark:text-blue-300 text-center">
              Dev mode OTP: <strong>{devOtp}</strong>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="ghost" onClick={() => setStep("idle")} type="button">Cancel</Button>
            <Button type="submit" disabled={loading || otp.length !== 6} className="!bg-red-600 hover:!bg-red-700">
              {loading ? "Deleting..." : "Permanently Delete"}
            </Button>
          </div>
        </form>
      )}
    </div>
  );
}