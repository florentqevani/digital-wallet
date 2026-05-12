import { useEffect, useState } from "react";
import LogsTable from "../components/logs-table";
import { getAccountLogs } from "../lib/api";
import { useAuth } from "../hooks/use-auth";

const LIMIT = 50;

const ACTION_OPTIONS = [
  { value: "", label: "All Actions" },
  { value: "CREATE_ACCOUNT", label: "Create Account" },
  { value: "DELETE_ACCOUNT", label: "Delete Account" },
  { value: "UPDATE_ACCOUNT_STATUS", label: "Update Status" },
];

function toDateTimeLocal(ts) {
  const d = new Date(ts);
  const p = (v) => String(v).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function AccountLogsPage() {
  const { token } = useAuth();
  const [logs, setLogs] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [email, setEmail] = useState("");
  const [action, setAction] = useState("");
  const [range, setRange] = useState("24h");
  const [customFrom, setCustomFrom] = useState(() =>
    toDateTimeLocal(new Date().setHours(0, 0, 0, 0)),
  );
  const [customTo, setCustomTo] = useState(() => toDateTimeLocal(Date.now()));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildQuery = (targetPage = 1) => {
    const now = Date.now();
    const q = {
      actor_email: email,
      action,
      page: targetPage,
      limit: LIMIT,
    };
    if (range === "today") {
      const s = new Date();
      s.setHours(0, 0, 0, 0);
      q.from = s.getTime();
      q.to = now;
    } else if (range === "24h") {
      q.from = now - 86400000;
      q.to = now;
    } else if (range === "7d") {
      q.from = now - 604800000;
      q.to = now;
    } else if (range === "custom") {
      if (customFrom) q.from = new Date(customFrom).getTime();
      if (customTo) q.to = new Date(customTo).getTime();
    }
    return q;
  };

  const load = async (targetPage = 1) => {
    setLoading(true);
    setError("");
    try {
      const res = await getAccountLogs(token, buildQuery(targetPage));
      setLogs(res.logs || []);
      setTotal(res.total || 0);
      setPage(targetPage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(1);
  }, [token]);

  const totalPages = Math.max(1, Math.ceil(total / LIMIT));

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Account Logs</h2>
        <p>
          Audit trail for all account operations (create, delete, status
          changes).
        </p>
      </section>

      <section className="content-grid single-column">
        <section className="panel compact-panel">
          <form
            className="filters-grid"
            onSubmit={(e) => {
              e.preventDefault();
              load(1);
            }}
          >
            <label>
              <span>Performed By (Email)</span>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="user email"
              />
            </label>
            <label>
              <span>Action</span>
              <select
                value={action}
                onChange={(e) => setAction(e.target.value)}
              >
                {ACTION_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              <span>Time Range</span>
              <select value={range} onChange={(e) => setRange(e.target.value)}>
                <option value="24h">Last 24 Hours</option>
                <option value="today">Today</option>
                <option value="7d">Last 7 Days</option>
                <option value="all">All Time</option>
                <option value="custom">Custom Range</option>
              </select>
            </label>
            {range === "custom" && (
              <>
                <label>
                  <span>From</span>
                  <input
                    type="datetime-local"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                  />
                </label>
                <label>
                  <span>To</span>
                  <input
                    type="datetime-local"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                  />
                </label>
              </>
            )}
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? "Loading..." : "Search"}
            </button>
          </form>

          {error && <div className="alert alert-danger">{error}</div>}

          <LogsTable logs={logs} title={`Account Logs (${total} total)`} flat />

          {totalPages > 1 && (
            <div className="pagination">
              <button
                className="btn-secondary btn-small"
                disabled={page <= 1}
                onClick={() => load(page - 1)}
              >
                ← Prev
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                className="btn-secondary btn-small"
                disabled={page >= totalPages}
                onClick={() => load(page + 1)}
              >
                Next →
              </button>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
