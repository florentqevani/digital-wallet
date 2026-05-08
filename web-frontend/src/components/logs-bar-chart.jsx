import { useState } from "react";

const DAYS = 28;

// Build a map of { 'YYYY-MM-DD': { client: n, user: n } } over the last DAYS days
function buildDailyData(clientLogs, userLogs, days = DAYS) {
  const buckets = {};
  const now = Date.now();

  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now - i * 86400000);
    const key = d.toISOString().slice(0, 10);
    buckets[key] = { date: key, client: 0, user: 0 };
  }

  const cutoff = now - days * 86400000;

  for (const log of clientLogs) {
    const ts = Number(log.timestamp);
    if (ts < cutoff) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].client += 1;
  }

  for (const log of userLogs) {
    const ts = Number(log.timestamp);
    if (ts < cutoff) continue;
    const key = new Date(ts).toISOString().slice(0, 10);
    if (buckets[key]) buckets[key].user += 1;
  }

  return Object.values(buckets);
}

// Map a count to one of 5 intensity levels (0–4)
function intensity(count, max) {
  if (count === 0 || max === 0) return 0;
  return Math.ceil((count / max) * 4);
}

function formatDate(isoDate) {
  const d = new Date(isoDate + "T12:00:00");
  return d.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
    weekday: "short",
  });
}

function HeatRow({ label, data, maxCount, accentVar }) {
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  return (
    <div className="heatmap-row">
      <span className="heatmap-row-label">{label}</span>
      <div className="heatmap-cells">
        {data.map((bucket) => {
          const count =
            bucket[label.toLowerCase() === "client logs" ? "client" : "user"];
          const lvl = intensity(count, maxCount);
          return (
            <div
              key={bucket.date}
              className={`heatmap-cell heatmap-cell--${lvl}`}
              style={{ "--cell-accent": `var(${accentVar})` }}
              onMouseEnter={(e) => {
                const rect = e.currentTarget.getBoundingClientRect();
                setTooltip({
                  text: `${formatDate(bucket.date)}: ${count} event${count !== 1 ? "s" : ""}`,
                  x: rect.left + rect.width / 2,
                  y: rect.top - 8,
                });
              }}
              onMouseLeave={() => setTooltip(null)}
            />
          );
        })}
      </div>
      {tooltip && (
        <div
          className="heatmap-tooltip"
          style={{ left: tooltip.x, top: tooltip.y }}
        >
          {tooltip.text}
        </div>
      )}
    </div>
  );
}

export default function LogsBarChart({ clientLogs = [], userLogs = [] }) {
  const data = buildDailyData(clientLogs, userLogs, DAYS);

  const maxClient = Math.max(...data.map((d) => d.client), 1);
  const maxUser = Math.max(...data.map((d) => d.user), 1);

  // Day labels: show every 7th entry (weekly tick)
  const dayLabels = data.map((d, i) => {
    if (i % 7 !== 0 && i !== data.length - 1) return "";
    const dt = new Date(d.date + "T12:00:00");
    return dt.toLocaleDateString(undefined, { month: "short", day: "numeric" });
  });

  return (
    <section className="panel compact-panel logs-chart-panel">
      <h3>Daily Activity Heatmap</h3>
      <p className="chart-subtitle">
        Event frequency over the last {DAYS} days — darker = more activity
      </p>

      <div className="heatmap-container">
        {/* Day-of-month axis */}
        <div className="heatmap-axis-row">
          <span className="heatmap-row-label" />
          <div className="heatmap-cells heatmap-axis">
            {dayLabels.map((label, i) => (
              <span key={i} className="heatmap-axis-tick">
                {label}
              </span>
            ))}
          </div>
        </div>

        <HeatRow
          label="Client Logs"
          data={data}
          maxCount={maxClient}
          accentVar="--accent"
        />
        <HeatRow
          label="User Logs"
          data={data}
          maxCount={maxUser}
          accentVar="--success"
        />

        {/* Legend */}
        <div className="heatmap-legend">
          <span className="heatmap-legend-label">Less</span>
          {[0, 1, 2, 3, 4].map((lvl) => (
            <div
              key={lvl}
              className={`heatmap-legend-cell heatmap-cell--${lvl}`}
              style={{ "--cell-accent": "var(--accent)" }}
            />
          ))}
          <span className="heatmap-legend-label">More</span>
        </div>
      </div>
    </section>
  );
}
