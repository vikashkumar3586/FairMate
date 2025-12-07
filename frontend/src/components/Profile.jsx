import React, { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { getAvatarUrl, getAvatarFallbackInitial } from "../utils/avatar";
import "./Profile.css";

const API_BASE = import.meta.env.VITE_BACKEND_URL;


const Profile = () => {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [pwdSaving, setPwdSaving] = useState(false);
  const [avatarSaving, setAvatarSaving] = useState(false);

  const [user, setUser] = useState({ name: "", email: "", phone: "", avatarUrl: "" });
  const [form, setForm] = useState({ name: "", phone: "" });
  const [pwdForm, setPwdForm] = useState({ currentPassword: "", newPassword: "", confirmPassword: "" });
  const [avatarFile, setAvatarFile] = useState(null);
  const [phoneError, setPhoneError] = useState("");

  // Email change flow
  const [emailForm, setEmailForm] = useState({ newEmail: "", currentPassword: "" });
  const [emailReqLoading, setEmailReqLoading] = useState(false);
  const [emailToken, setEmailToken] = useState("");
  const [emailVerifyLoading, setEmailVerifyLoading] = useState(false);

  const token = localStorage.getItem("token");

  // Phone helpers in component scope so JSX can reference them
  const formatPhone = (val) => {
    const digits = (val || "").replace(/\D/g, "");
    // Format as (XXX) XXX-XXXX for 10 digits, else group by spaces
    if (digits.length === 10) {
      return `(${digits.slice(0,3)}) ${digits.slice(3,6)}-${digits.slice(6)}`;
    }
    // fallback grouping every 3-4
    return digits.replace(/(.{3})/g, '$1 ').trim();
  };

  const onPhoneChange = (e) => {
    const raw = e.target.value;
    const formatted = formatPhone(raw);
    setForm({ ...form, phone: formatted });
    const digits = raw.replace(/\D/g, "");
    if (digits && (digits.length < 7 || digits.length > 15)) {
      setPhoneError("Phone must be 7-15 digits");
    } else {
      setPhoneError("");
    }
  };

  useEffect(() => {
    const fetchMe = async () => {
      try {
        const res = await fetch(`${API_BASE}/api/auth/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!res.ok) throw new Error("Failed to fetch user");
        const data = await res.json();
        const u = data.user || {};
        setUser(u);
        setForm({ name: u.name || "", phone: u.phone || "" });
      } catch (e) {
        console.error(e);
        toast.error("Unable to load profile");
      } finally {
        setLoading(false);
      }
    };
    if (token) fetchMe();
  }, [token]);

  const onSubmitProfile = async (e) => {
    e.preventDefault();
    // Basic phone validation: allow 7-15 digits
    const digits = (form.phone || "").replace(/\D/g, "");
    if (digits && (digits.length < 7 || digits.length > 15)) {
      setPhoneError("Phone must be 7-15 digits");
      return;
    }
    setPhoneError("");
    setSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: form.name, phone: form.phone })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update profile");
      setUser(data.user);
      toast.success("Profile updated");
      // notify navbar to refresh
      window.dispatchEvent(new Event("userUpdated"));
      localStorage.setItem("userName", data.user?.name || "");
      localStorage.setItem("userEmail", data.user?.email || "");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setSaving(false);
    }
  };

  const onRemoveAvatar = async () => {
    try {
      setAvatarSaving(true);
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to remove avatar");
      setUser(data.user);
      toast.success("Avatar removed");
      window.dispatchEvent(new Event("userUpdated"));
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  const onRequestEmailChange = async (e) => {
    e.preventDefault();
    try {
      setEmailReqLoading(true);
      const res = await fetch(`${API_BASE}/api/user/email-change`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ newEmail: emailForm.newEmail, currentPassword: emailForm.currentPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to request email change");
      setEmailToken(data.token || "");
      toast.success("Verification email sent (dev: token shown below)");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setEmailReqLoading(false);
    }
  };

  const onVerifyEmailChange = async (e) => {
    e.preventDefault();
    try {
      setEmailVerifyLoading(true);
      const res = await fetch(`${API_BASE}/api/user/email-verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ token: emailToken })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to verify email");
      setUser(data.user);
      localStorage.setItem("userEmail", data.user?.email || "");
      window.dispatchEvent(new Event("userUpdated"));
      toast.success("Email updated");
      setEmailForm({ newEmail: "", currentPassword: "" });
      setEmailToken("");
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setEmailVerifyLoading(false);
    }
  };

  const onSubmitPassword = async (e) => {
    e.preventDefault();
    if (pwdForm.newPassword !== pwdForm.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setPwdSaving(true);
    try {
      const res = await fetch(`${API_BASE}/api/user/password`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ currentPassword: pwdForm.currentPassword, newPassword: pwdForm.newPassword })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to change password");
      toast.success("Password updated");
      setPwdForm({ currentPassword: "", newPassword: "", confirmPassword: "" });
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setPwdSaving(false);
    }
  };

  const onSubmitAvatar = async (e) => {
    e.preventDefault();
    if (!avatarFile) {
      toast.error("Please choose an image");
      return;
    }
    setAvatarSaving(true);
    try {
      const fd = new FormData();
      fd.append("avatar", avatarFile);
      const res = await fetch(`${API_BASE}/api/user/avatar`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || "Failed to update avatar");
      setUser(data.user);
      setAvatarFile(null);
      toast.success("Avatar updated");
      window.dispatchEvent(new Event("userUpdated"));
    } catch (e) {
      console.error(e);
      toast.error(e.message);
    } finally {
      setAvatarSaving(false);
    }
  };

  if (loading) {
    return <div className="profile-page"><div className="card"><p>Loading...</p></div></div>;
  }

  return (
    <div className="profile-page">
      <div className="profile-grid">
        <section className="card">
          <h2>Profile</h2>
          <div className="avatar-row">
            <div className="avatar-large">
              {getAvatarUrl(user) ? (
                <img src={getAvatarUrl(user)} alt="avatar" />
              ) : (
                <div className="avatar-fallback">{getAvatarFallbackInitial(user)}</div>
              )}
            </div>
            <form className="avatar-form" onSubmit={onSubmitAvatar}>
              <input type="file" accept="image/*" onChange={(e)=> setAvatarFile(e.target.files?.[0] || null)} />
              <button className="btn btn-blue" type="submit" disabled={avatarSaving}>{avatarSaving ? "Saving..." : "Update Avatar"}</button>
              {user.avatarUrl && (
                <button className="btn btn-red" type="button" onClick={onRemoveAvatar} disabled={avatarSaving} style={{marginLeft: 8}}>
                  {avatarSaving ? "..." : "Remove Avatar"}
                </button>
              )}
            </form>
          </div>

          <form className="form" onSubmit={onSubmitProfile}>
            <div className="form-row">
              <label>Name</label>
              <input value={form.name} onChange={(e)=> setForm({...form, name: e.target.value})} placeholder="Your name" />
            </div>
            <div className="form-row">
              <label>Email</label>
              <input value={user.email} disabled />
            </div>
            <div className="form-row">
              <label>Phone</label>
              <input value={form.phone} onChange={onPhoneChange} placeholder="Phone number" />
              {phoneError && <small style={{color: '#dc2626'}}>{phoneError}</small>}
            </div>
            <div className="form-actions">
              <button className="btn btn-blue" type="submit" disabled={saving}>{saving ? "Saving..." : "Save Changes"}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Change Password</h2>
          <form className="form" onSubmit={onSubmitPassword}>
            <div className="form-row">
              <label>Current Password</label>
              <input type="password" value={pwdForm.currentPassword} onChange={(e)=> setPwdForm({...pwdForm, currentPassword: e.target.value})} />
            </div>
            <div className="form-row">
              <label>New Password</label>
              <input type="password" value={pwdForm.newPassword} onChange={(e)=> setPwdForm({...pwdForm, newPassword: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Confirm New Password</label>
              <input type="password" value={pwdForm.confirmPassword} onChange={(e)=> setPwdForm({...pwdForm, confirmPassword: e.target.value})} />
            </div>
            <div className="form-actions">
              <button className="btn btn-blue" type="submit" disabled={pwdSaving}>{pwdSaving ? "Updating..." : "Update Password"}</button>
            </div>
          </form>
        </section>

        <section className="card">
          <h2>Change Email</h2>
          <form className="form" onSubmit={onRequestEmailChange}>
            <div className="form-row">
              <label>New Email</label>
              <input type="email" value={emailForm.newEmail} onChange={(e)=> setEmailForm({...emailForm, newEmail: e.target.value})} />
            </div>
            <div className="form-row">
              <label>Current Password</label>
              <input type="password" value={emailForm.currentPassword} onChange={(e)=> setEmailForm({...emailForm, currentPassword: e.target.value})} />
            </div>
            <div className="form-actions">
              <button className="btn btn-blue" type="submit" disabled={emailReqLoading}>{emailReqLoading ? "Requesting..." : "Request Change"}</button>
            </div>
          </form>

          <form className="form" onSubmit={onVerifyEmailChange} style={{marginTop: 12}}>
            <div className="form-row">
              <label>Verification Token (dev)</label>
              <input value={emailToken} onChange={(e)=> setEmailToken(e.target.value)} placeholder="Paste token here" />
            </div>
            <div className="form-actions">
              <button className="btn btn-blue" type="submit" disabled={emailVerifyLoading}>{emailVerifyLoading ? "Verifying..." : "Verify & Update Email"}</button>
            </div>
          </form>
        </section>
      </div>
    </div>
  );
};

export default Profile;
