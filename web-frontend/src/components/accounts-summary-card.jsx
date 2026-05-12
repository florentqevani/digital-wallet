import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { listAccounts } from "../lib/api";

export default function AccountsSummaryCard() {
  const { token } = useAuth();
  const [byCurrency, setByCurrency] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await listAccounts(token);
        const accounts = res.accounts || [];
        const counts = {};
        accounts.forEach((acc) => {
          const cur = acc.currency || "OTHER";
          counts[cur] = (counts[cur] || 0) + 1;
        });
        if (active) setByCurrency(counts);
      } catch (err) {
        if (active) setError("Failed to load account counts");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const currencies = Object.keys(byCurrency).sort();
  const total = currencies.reduce((sum, cur) => sum + byCurrency[cur], 0);

  return (
    <section className="panel compact-panel">
      <span className="section-eyebrow">Accounts</span>
      <h3>Total Accounts</h3>
      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <div className="stats-row">
          <div
            style={{ display: "flex", flexDirection: "column", gap: "0.25rem" }}
          >
            <span
              style={{
                fontSize: "0.72rem",
                fontWeight: 600,
                color: "var(--ink-soft)",
                textTransform: "uppercase",
                letterSpacing: "0.06em",
              }}
            >
              Total
            </span>
            <strong
              style={{
                fontSize: "1.35rem",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--ink)",
              }}
            >
              {total}
            </strong>
            <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
              accounts
            </span>
          </div>
          {currencies.map((cur) => (
            <div
              key={cur}
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.25rem",
              }}
            >
              <span
                style={{
                  fontSize: "0.72rem",
                  fontWeight: 600,
                  color: "var(--ink-soft)",
                  textTransform: "uppercase",
                  letterSpacing: "0.06em",
                }}
              >
                {cur}
              </span>
              <strong
                style={{
                  fontSize: "1.35rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ink)",
                }}
              >
                {byCurrency[cur]}
              </strong>
              <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
                accounts
              </span>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}
