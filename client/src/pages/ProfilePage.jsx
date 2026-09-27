import { useState } from "react";
import Layout from "../components/layout/Layout.jsx";
import { useAuth } from "../context/AuthContext.jsx";
import Input from "../components/ui/Input.jsx";
import Button from "../components/ui/Button.jsx";
import api from "../lib/api.js";
import { useToast } from "../context/ToastContext.jsx";
import Avatar from "../components/ui/Avatar.jsx";

export default function ProfilePage() {
  const { user, login } = useAuth();
  const { show } = useToast();
  const [form, setForm] = useState({
    name: user?.name || "",
    bio: user?.bio || "",
    avatarColor: user?.avatarColor || "#6366f1",
  });
  const [pwd, setPwd] = useState({ oldPassword: "", newPassword: "" });

  const save = async (e) => {
    e.preventDefault();
    try {
      const { data } = await api.patch("/users/me", form);
      login(localStorage.getItem("token"), data);
      show("Profile updated", "success");
    } catch {
      show("Update failed", "error");
    }
  };

  const changePwd = async (e) => {
    e.preventDefault();
    try {
      await api.patch("/users/me/password", pwd);
      setPwd({ oldPassword: "", newPassword: "" });
      show("Password changed", "success");
    } catch (err) {
      show(err.response?.data?.error || "Failed", "error");
    }
  };

  return (
    <Layout>
      <div className="max-w-3xl mx-auto p-6">
        <h1 className="text-3xl font-bold mb-8">👤 Profile</h1>

        <div className="card p-6 mb-6">
          <div className="flex items-center gap-4 mb-6">
            <Avatar name={form.name} color={form.avatarColor} size={72} />
            <div>
              <h2 className="text-xl font-semibold">{form.name}</h2>
              <p className="text-sm" style={{ color: "var(--text-muted)" }}>{user?.email}</p>
            </div>
          </div>

          <form onSubmit={save} className="space-y-4">
            <div>
              <label className="text-xs font-medium mb-1 block">Name</label>
              <Input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Bio</label>
              <Input value={form.bio} onChange={(e) => setForm({ ...form, bio: e.target.value })} placeholder="Tell us about yourself" />
            </div>
            <div>
              <label className="text-xs font-medium mb-1 block">Avatar Color</label>
              <input type="color" value={form.avatarColor} onChange={(e) => setForm({ ...form, avatarColor: e.target.value })} className="h-10 w-20 rounded cursor-pointer" />
            </div>
            <Button type="submit">Save Changes</Button>
          </form>
        </div>

        <div className="card p-6">
          <h2 className="text-lg font-semibold mb-4">🔒 Change Password</h2>
          <form onSubmit={changePwd} className="space-y-4">
            <Input type="password" placeholder="Current password" value={pwd.oldPassword} onChange={(e) => setPwd({ ...pwd, oldPassword: e.target.value })} required />
            <Input type="password" placeholder="New password" value={pwd.newPassword} onChange={(e) => setPwd({ ...pwd, newPassword: e.target.value })} required />
            <Button type="submit">Update Password</Button>
          </form>
        </div>
      </div>
    </Layout>
  );
}