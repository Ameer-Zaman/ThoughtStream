import { useState } from "react";
import api, { errMsg } from "../api";

function timeLeft(endsAt) {
  const ms = new Date(endsAt) - Date.now();
  if (ms <= 0) return "Final results";
  const mins = Math.ceil(ms / 60000);
  if (mins < 60) return `${mins}m left`;
  const hrs = Math.ceil(mins / 60);
  return hrs < 48 ? `${hrs}h left` : `${Math.ceil(hrs / 24)}d left`;
}

// Shows a poll under a thought. Before you vote you see buttons; after you vote (or when it ends) you see results.
export default function Poll({ thoughtId, poll, onChange }) {
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const closed = poll.closed || (poll.endsAt && new Date(poll.endsAt) <= new Date());
  const showResults = closed || poll.myVote !== null;

  const vote = async (i) => {
    if (busy || showResults) return;
    setBusy(true);
    setError("");
    const before = poll;
    // instant feedback, then replace with the server's numbers
    onChange({
      ...poll,
      myVote: i,
      total: poll.total + 1,
      options: poll.options.map((o, j) => (j === i ? { ...o, votes: o.votes + 1 } : o)),
    });
    try {
      const res = await api.post(`/thoughts/${thoughtId}/vote`, { optionIndex: i });
      onChange(res.data.poll);
    } catch (err) {
      onChange(before);
      setError(errMsg(err, "Could not vote"));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="poll">
      {poll.options.map((o, i) => {
        const pct = poll.total ? Math.round((o.votes / poll.total) * 100) : 0;
        if (!showResults) {
          return (
            <button key={i} className="poll-option" onClick={() => vote(i)} disabled={busy}>
              {o.text}
            </button>
          );
        }
        const lead = o.votes === Math.max(...poll.options.map((x) => x.votes)) && o.votes > 0;
        return (
          <div key={i} className={"poll-result" + (poll.myVote === i ? " mine" : "") + (lead ? " lead" : "")}>
            <div className="poll-bar" style={{ width: pct + "%" }} />
            <span className="poll-text">
              {o.text}
              {poll.myVote === i && <span className="poll-check"> ✓</span>}
            </span>
            <span className="poll-pct">{pct}%</span>
          </div>
        );
      })}
      <div className="poll-meta">
        {poll.total} {poll.total === 1 ? "vote" : "votes"} · {poll.endsAt ? timeLeft(poll.endsAt) : ""}
      </div>
      {error && <div className="form-error">{error}</div>}
    </div>
  );
}
