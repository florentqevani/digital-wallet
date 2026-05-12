import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getAccounts } from "../lib/api";

const CURRENCY_LABELS = {
  USD: "US Dollar",
  EUR: "Euro",
  GBP: "Pound",
  ALL: "Albanian Lek",
};

export default function TotalCashCard() {
  const { token } = useAuth();
  const [totals, setTotals] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const res = await getAccounts(token);
        const accounts = res.accounts || [];
        const sums = {};
        accounts.forEach((acc) => {
          const cur = acc.currency || "ALL";
          sums[cur] = (sums[cur] || 0) + parseFloat(acc.balance || 0);
        });
        if (active) setTotals(sums);
      } catch (err) {
        if (active) setError("Failed to load cash totals");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  const currencies = Object.keys(totals);

  return (
    <section className="panel compact-panel">
      <span className="section-eyebrow">Finance</span>
      <h3>Total Cash in System</h3>
      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <div className="stats-row">
          {currencies.length === 0 ? (
            <p style={{ color: "var(--ink-soft)" }}>No accounts found.</p>
          ) : (
            currencies.map((cur) => (
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
                  {CURRENCY_LABELS[cur] || cur}
                </span>
                <strong
                  style={{
                    fontSize: "1.35rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "var(--ink)",
                  }}
                >
                  {totals[cur].toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2,
                  })}
                </strong>
                <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
                  {cur}
                </span>
              </div>
            ))
          )}
        </div>
      )}
    </section>
  );
}
