import { useRef, useState } from "react";
import api, { errMsg } from "../api";
import Avatar from "./Avatar";
import Icon from "./Icon";
import { useAuth } from "../context/AuthContext";

export default function Composer({ onPosted }) {
  const { user } = useAuth();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const taRef = useRef(null);
  const [pollOn, setPollOn] = useState(false);
  const [options, setOptions] = useState(["", ""]);
  const [hours, setHours] = useState(24);

  const filled = options.map((o) => o.trim()).filter(Boolean);
  const pollReady = !pollOn || filled.length >= 2;

  const grow = () => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = Math.min(el.scrollHeight, 220) + "px";
  };

  const submit = async () => {
    const content = text.trim();
    if (!content || busy || !pollReady) return;
    setBusy(true);
    setError("");
    try {
      const body = { content };
      if (pollOn) body.poll = { options: filled, hours };
      const res = await api.post("/thoughts", body);
      setText("");
      setPollOn(false);
      setOptions(["", ""]);
      setHours(24);
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
        {pollOn && (
          <div className="poll-editor">
            {options.map((o, i) => (
              <div className="poll-edit-row" key={i}>
                <input
                  value={o}
                  maxLength={60}
                  placeholder={`Option ${i + 1}`}
                  onChange={(e) => setOptions((prev) => prev.map((x, j) => (j === i ? e.target.value : x)))}
                />
                {options.length > 2 && (
                  <button
                    className="icon-btn"
                    aria-label="Remove option"
                    onClick={() => setOptions((prev) => prev.filter((_, j) => j !== i))}
                  >
                    <Icon name="close" size={16} />
                  </button>
                )}
              </div>
            ))}
            <div className="poll-edit-foot">
              {options.length < 4 && (
                <button className="btn btn-sm" onClick={() => setOptions((prev) => [...prev, ""])}>
                  + Add option
                </button>
              )}
              <select value={hours} onChange={(e) => setHours(Number(e.target.value))} aria-label="Poll length">
                <option value={1}>1 hour</option>
                <option value={24}>1 day</option>
                <option value={72}>3 days</option>
                <option value={168}>7 days</option>
              </select>
            </div>
          </div>
        )}
        {error && <div className="form-error">{error}</div>}
        <div className="composer-footer">
          <button
            className={"icon-btn poll-toggle" + (pollOn ? " active" : "")}
            onClick={() => setPollOn((v) => !v)}
            aria-label={pollOn ? "Remove poll" : "Add poll"}
            title={pollOn ? "Remove poll" : "Add poll"}
          >
            <Icon name="poll" size={18} />
          </button>
          <span className="spacer" />
          <span className={"char-count" + (text.length > 450 ? " warn" : "")}>{text.length}/500</span>
          <button className="btn btn-primary" onClick={submit} disabled={busy || !text.trim() || !pollReady}>
            {busy ? "Posting…" : "Post"}
          </button>
        </div>
      </div>
    </div>
  );
}
