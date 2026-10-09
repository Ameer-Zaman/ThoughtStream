import { useRef, useState } from "react";
import api, { errMsg } from "../api";
import Avatar from "./Avatar";
import { useAuth } from "../context/AuthContext";

export default function Composer({ onPosted }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const taRef = useRef(null);

  const grow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || busy) return;
    setBusy(true);
    setError("");
    try {
      const res = await api.post("/thoughts", { content });
      setText("");
      requestAnimationFrame(grow);
      onPosted(res.data.thought);
    } catch (err) {
      setError(errMsg(err, "Could not post"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="composer">
      <Avatar user={user} size={44} />
      <div className="composer-body">
        <textarea
          ref={taRef}
          placeholder="What's on your mind?"
          maxLength={500}
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            grow();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) submit();
          }}
        />
        {error && <div className="form-error">{error}</div>}
        <div className="composer-footer">
          <span className={"char-count" + (text.length > 450 ? " warn" : "")}>{text.length}/500</span>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !text.trim()}>
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
