import { useState } from "react";
import api, { errMsg } from "../api";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

export default function EditProfileModal({ onClose, onSaved }) {
  const { user, setUser } = useAuth();
  const [form, setForm] = useState({
    fullName: user.fullName,
    bio: user.bio || "",
    profilePicture: user.profilePicture || "",
    coverImage: user.coverImage || "",
  });
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const change = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const save = async () => {
    setBusy(true);
    setError("");
    try {
      const res = await api.put("/users/profile", form);
      setUser(res.data.user);
      onSaved(res.data.user);
      onClose();
    } catch (err) {
      setError(errMsg(err, "Could not save profile"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h3>Edit profile</h3>
          <button className="icon-btn" onClick={onClose} aria-label="Close">
            <Icon name="close" />
          </button>
        </div>
        <div className="modal-body">
          {error && <div className="form-error">{error}</div>}
          <label>Full name</label>
          <input name="fullName" value={form.fullName} onChange={change} />
          <label>Bio ({form.bio.length}/160)</label>
          <textarea name="bio" rows={3} maxLength={160} value={form.bio} onChange={change} />
          <label>Profile picture URL</label>
          <input name="profilePicture" value={form.profilePicture} onChange={change} placeholder="https://…" />
          <label>Cover image URL</label>
          <input name="coverImage" value={form.coverImage} onChange={change} placeholder="https://…" />
        </div>
        <div className="modal-foot">
          <button className="btn" onClick={onClose}>
            Cancel
          </button>
          <button className="btn btn-primary" onClick={save} disabled={busy || !form.fullName.trim()}>
            {busy ? "Saving…" : "Save"}
          </button>
        </div>
      </div>
    </div>
  );
}
