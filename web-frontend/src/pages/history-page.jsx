import { useEffect, useMemo, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getClients, getTransactionHistory } from "../lib/api";

function formatDate(ms) {
  if (!ms) return "—";
  const d = new Date(Number(ms));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

function formatAmount(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

function TxTypePill({ type }) {
  const isTopup = type === "TOPUP";
  return (
    <span
      className="status-pill"
      style={{
        background: isTopup ? "#e4f8ef" : "#eef3fb",
        color: isTopup ? "#0c7f55" : "#2d4d8b",
        fontWeight: 700,
      }}
    >
      {isTopup ? "↑ TOP-UP" : "⇄ TRANSFER"}
    </span>
  );
}

function CurrencyBadge({ currency }) {
  const palette = {
    USD: { bg: "#e0f2fe", color: "#0369a1" },
    EUR: { bg: "#ede9fe", color: "#6d28d9" },
    GBP: { bg: "#fef9c3", color: "#92400e" },
    ALL: { bg: "#f1f5f9", color: "#475569" },
  };
  const c = palette[currency] || palette.ALL;
  return (
    <span
      style={{
        display: "inline-block",
        padding: "0.18rem 0.52rem",
        borderRadius: "6px",
        fontSize: "0.72rem",
        fontWeight: 700,
        background: c.bg,
        color: c.color,
      }}
    >
      {currency || "ALL"}
    </span>
  );
}

const PAGE_SIZE = 20;
const CURRENCIES = ["ALL", "USD", "EUR", "GBP"];

export default function HistoryPage() {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // ── Filter state ──────────────────────────────────────────────
  const [filterType, setFilterType] = useState("");
  const [filterCurrency, setFilterCurrency] = useState("");
  const [filterEmail, setFilterEmail] = useState("");
  const [filterDateFrom, setFilterDateFrom] = useState("");
  const [filterDateTo, setFilterDateTo] = useState("");

  const clientMap = useMemo(() => {
    const m = {};
    clients.forEach((c) => {
      m[c.id] = { name: c.name, email: c.email };
    });
    return m;
  }, [clients]);

  const load = async (targetPage = 1) => {
    setError("");
    setLoading(true);
    try {
      const offset = (targetPage - 1) * PAGE_SIZE;
      const res = await getTransactionHistory(
        token,
        undefined,
        PAGE_SIZE,
        offset,
      );
      setTransactions(res.transactions || []);
      setTotal(res.total || 0);
      setPage(targetPage);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    getClients(token)
      .then((res) => setClients(res.clients || []))
      .catch(() => {});
    load(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const totalPages = Math.ceil(total / PAGE_SIZE);

  // ── Client-side filtering ─────────────────────────────────────
  const filtered = useMemo(() => {
    const dateFrom = filterDateFrom ? new Date(filterDateFrom).getTime() : null;
    const dateTo = filterDateTo
      ? new Date(filterDateTo + "T23:59:59").getTime()
      : null;
    const emailLower = filterEmail.trim().toLowerCase();

    return transactions.filter((tx) => {
      if (filterType && tx.type !== filterType) return false;
      if (filterCurrency && tx.currency !== filterCurrency) return false;
      if (dateFrom && Number(tx.created_at) < dateFrom) return false;
      if (dateTo && Number(tx.created_at) > dateTo) return false;
      if (emailLower) {
        const fromEmail =
          clientMap[tx.from_client_id]?.email?.toLowerCase() || "";
        const toEmail = clientMap[tx.to_client_id]?.email?.toLowerCase() || "";
        if (!fromEmail.includes(emailLower) && !toEmail.includes(emailLower))
          return false;
      }
      return true;
    });
  }, [
    transactions,
    filterType,
    filterCurrency,
    filterEmail,
    filterDateFrom,
    filterDateTo,
    clientMap,
  ]);

  const hasFilters =
    filterType ||
    filterCurrency ||
    filterEmail ||
    filterDateFrom ||
    filterDateTo;
  const clearFilters = () => {
    setFilterType("");
    setFilterCurrency("");
    setFilterEmail("");
    setFilterDateFrom("");
    setFilterDateTo("");
  };

  const inputStyle = {
    padding: "0.45rem 0.6rem",
    borderRadius: "8px",
    border: "1px solid var(--line-strong)",
    fontSize: "0.85rem",
    background: "var(--bg)",
    color: "var(--ink)",
    width: "100%",
  };
  const labelStyle = {
    display: "flex",
    flexDirection: "column",
    gap: "0.3rem",
    fontSize: "0.78rem",
    fontWeight: 600,
    color: "var(--ink-soft)",
  };

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Transaction History</h2>
        <p>Full history of wallet transfers and admin top-ups.</p>
      </section>
      <section className="content-grid single-column">
        {/* ── Filter bar ── */}
        <section
          className="panel compact-panel"
          style={{ padding: "1rem 1.25rem" }}
        >
          <div
            style={{
              display: "flex",
              flexWrap: "wrap",
              gap: "0.75rem",
              alignItems: "flex-end",
            }}
          >
            <label style={{ ...labelStyle, minWidth: "130px" }}>
              Type
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                style={inputStyle}
              >
                <option value="">All Types</option>
                <option value="TOPUP">TOPUP</option>
                <option value="TRANSFER">TRANSFER</option>
              </select>
            </label>

            <label style={{ ...labelStyle, minWidth: "130px" }}>
              Currency
              <select
                value={filterCurrency}
                onChange={(e) => setFilterCurrency(e.target.value)}
                style={inputStyle}
              >
                <option value="">All Currencies</option>
                {CURRENCIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </label>

            <label style={{ ...labelStyle, flex: 1, minWidth: "180px" }}>
              Client email
              <input
                type="text"
                placeholder="Search by email…"
                value={filterEmail}
                onChange={(e) => setFilterEmail(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, minWidth: "145px" }}>
              From date
              <input
                type="date"
                value={filterDateFrom}
                onChange={(e) => setFilterDateFrom(e.target.value)}
                style={inputStyle}
              />
            </label>

            <label style={{ ...labelStyle, minWidth: "145px" }}>
              To date
              <input
                type="date"
                value={filterDateTo}
                onChange={(e) => setFilterDateTo(e.target.value)}
                style={inputStyle}
              />
            </label>

            <div
              style={{ display: "flex", gap: "0.5rem", alignItems: "flex-end" }}
            >
              <button
                type="button"
                className="button-muted"
                onClick={() => load(page)}
                disabled={loading}
                style={{ whiteSpace: "nowrap" }}
              >
                ↻ Refresh
              </button>
              {hasFilters && (
                <button
                  type="button"
                  className="button-muted"
                  onClick={clearFilters}
                  style={{ whiteSpace: "nowrap", color: "var(--danger)" }}
                >
                  ✕ Clear
                </button>
              )}
            </div>
          </div>
          <div
            style={{
              display: "flex",
              gap: "1.2rem",
              marginTop: "0.6rem",
              fontSize: "0.79rem",
              color: "var(--ink-soft)",
            }}
          >
            <span>
              <strong style={{ color: "var(--ink)" }}>{total}</strong> total
              record{total !== 1 ? "s" : ""}
            </span>
            {hasFilters && (
              <span>
                <strong style={{ color: "var(--accent)" }}>
                  {filtered.length}
                </strong>{" "}
                match{filtered.length !== 1 ? "es" : ""}
              </span>
            )}
          </div>
        </section>

        {/* ── Table ── */}
        <section className="panel compact-panel">
          {error && <p className="error-text">{error}</p>}
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Type</th>
                  <th>From</th>
                  <th>To</th>
                  <th>Amount</th>
                  <th>Currency</th>
                  <th>Note</th>
                  <th>Status</th>
                  <th>Date</th>
                  <th>Tx ID</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{ textAlign: "center", padding: "2rem" }}
                    >
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td
                      colSpan={9}
                      style={{
                        textAlign: "center",
                        padding: "2rem",
                        color: "var(--ink-soft)",
                      }}
                    >
                      {hasFilters
                        ? "No transactions match your filters."
                        : "No transactions found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((tx) => (
                    <tr key={tx.id}>
                      <td>
                        <TxTypePill type={tx.type} />
                      </td>
                      <td
                        style={{
                          color: "var(--ink-soft)",
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.76rem",
                        }}
                      >
                        {tx.type === "TOPUP" ? (
                          <span
                            className="status-pill"
                            style={{ background: "#fff3e0", color: "#8a4200" }}
                          >
                            Admin
                          </span>
                        ) : (
                          <span title={tx.from_client_id}>
                            {clientMap[tx.from_client_id]?.email ||
                              tx.from_client_id?.slice(0, 8) + "…"}
                          </span>
                        )}
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span title={tx.to_client_id}>
                          {clientMap[tx.to_client_id]?.email ||
                            tx.to_client_id?.slice(0, 8) + "…"}
                        </span>
                      </td>
                      <td>
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontWeight: 700,
                          }}
                        >
                          {formatAmount(tx.amount)}
                        </span>
                      </td>
                      <td>
                        <CurrencyBadge currency={tx.currency} />
                      </td>
                      <td
                        style={{
                          color: "var(--ink-soft)",
                          maxWidth: "160px",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {tx.note || "—"}
                      </td>
                      <td>
                        <span
                          className={`status-pill ${tx.status === "COMPLETED" ? "status-success" : "status-error"}`}
                        >
                          {tx.status}
                        </span>
                      </td>
                      <td
                        style={{
                          color: "var(--ink-soft)",
                          whiteSpace: "nowrap",
                          fontSize: "0.8rem",
                        }}
                      >
                        {formatDate(tx.created_at)}
                      </td>
                      <td
                        style={{
                          fontFamily: "'JetBrains Mono', monospace",
                          fontSize: "0.7rem",
                          color: "var(--ink-soft)",
                        }}
                        title={tx.id}
                      >
                        {tx.id?.slice(0, 8)}…
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          <div className="pager">
            <button
              type="button"
              className="button-muted"
              onClick={() => load(page - 1)}
              disabled={page <= 1 || loading}
            >
              ← Prev
            </button>
            <span>
              Page {page} of {Math.max(1, totalPages)} — {total} record
              {total !== 1 ? "s" : ""}
            </span>
            <button
              type="button"
              className="button-muted"
              onClick={() => load(page + 1)}
              disabled={page >= totalPages || loading}
            >
              Next →
            </button>
          </div>
        </section>
      </section>
    </>
  );
}
