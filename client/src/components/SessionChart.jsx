import { useEffect, useState } from "react";
import {
  ResponsiveContainer,
  ComposedChart,
  Bar,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
} from "recharts";
import api, { errMsg } from "../api";

// Bar = number of sessions that day. Line = average session length in minutes.
export default function SessionChart() {
  const [days, setDays] = useState(7);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError("");

    api
      .get(`/admin/sessions/daily?days=${days}`)
      .then((r) => {
        if (!cancelled) setData(r.data.data || []);
      })
      .catch((err) => {
        if (!cancelled) setError(errMsg(err));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [days]);

  // Short label for the X axis: "10-12" instead of "2026-10-12"
  const chartData = data.map((d) => ({ ...d, label: d.date.slice(5) }));

  return (
    <section className="chart-section">
      <div className="chart-head">
        <div>
          <h2 className="chart-title">Site usage</h2>
          <p className="chart-sub">Sessions and average duration per day.</p>
        </div>
        <div className="chart-toggle">
          <button
            type="button"
            className={"chip" + (days === 7 ? " active" : "")}
            onClick={() => setDays(7)}
          >
            7 days
          </button>
          <button
            type="button"
            className={"chip" + (days === 30 ? " active" : "")}
            onClick={() => setDays(30)}
          >
            30 days
          </button>
        </div>
      </div>

      {loading && <div className="chart-state">Loading…</div>}
      {error && <div className="form-error">{error}</div>}
      {!loading && !error && (
        <div className="chart-wrap">
          <ResponsiveContainer width="100%" height={260}>
            <ComposedChart data={chartData} margin={{ top: 8, right: 12, left: -12, bottom: 0 }}>
              <CartesianGrid stroke="var(--border)" strokeDasharray="3 3" vertical={false} />
              <XAxis
                dataKey="label"
                stroke="var(--muted)"
                tickLine={false}
                axisLine={{ stroke: "var(--border)" }}
                fontSize={12}
              />
              <YAxis
                yAxisId="left"
                stroke="var(--muted)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                allowDecimals={false}
              />
              <YAxis
                yAxisId="right"
                orientation="right"
                stroke="var(--muted)"
                tickLine={false}
                axisLine={false}
                fontSize={12}
                unit="m"
              />
              <Tooltip
                contentStyle={{
                  background: "var(--surface)",
                  border: "1px solid var(--border)",
                  borderRadius: 12,
                  fontSize: 13,
                  boxShadow: "var(--shadow-md)",
                }}
                labelStyle={{ color: "var(--ink)", fontWeight: 700 }}
                formatter={(value, name) => {
                  if (name === "Sessions") return [value, name];
                  if (name === "Avg duration") return [`${value} min`, name];
                  return [value, name];
                }}
              />
              <Legend wrapperStyle={{ fontSize: 12, color: "var(--muted)" }} />
              <Bar
                yAxisId="left"
                dataKey="sessions"
                name="Sessions"
                fill="var(--ink)"
                radius={[6, 6, 0, 0]}
                maxBarSize={40}
              />
              <Line
                yAxisId="right"
                type="monotone"
                dataKey="avgDurationMinutes"
                name="Avg duration"
                stroke="var(--blue)"
                strokeWidth={2.5}
                dot={{ r: 3, fill: "var(--blue)" }}
                activeDot={{ r: 5 }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}