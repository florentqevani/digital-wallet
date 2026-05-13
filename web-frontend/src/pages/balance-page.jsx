import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getClients, getPaymentBalance, listAccounts } from "../lib/api";

function formatAmount(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function BalancePage() {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [emailQuery, setEmailQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [balanceInfo, setBalanceInfo] = useState(null);
  const [accounts, setAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    getClients(token)
      .then((res) => setClients(res.clients || []))
      .catch(() => {});
  }, [token]);

  const suggestions =
    emailQuery.length > 0 && !selectedClient
      ? clients
          .filter((c) =>
            c.email.toLowerCase().includes(emailQuery.toLowerCase()),
          )
          .slice(0, 8)
      : [];

  const handleEmailChange = (e) => {
    setEmailQuery(e.target.value);
    setSelectedClient(null);
    setBalanceInfo(null);
    setAccounts([]);
    setError("");
  };

  const handleSelect = (client) => {
    setSelectedClient(client);
    setEmailQuery(client.email);
  };

  const handleLookup = async (e) => {
    e.preventDefault();
    if (!selectedClient) return;
    setError("");
    setBalanceInfo(null);
    setLoading(true);
    try {
      const [balRes, accRes] = await Promise.all([
        getPaymentBalance(token, selectedClient.id),
        listAccounts(token, selectedClient.id),
      ]);
      if (balRes.success) {
        setBalanceInfo(balRes);
      } else {
        setError(balRes.message || "Not found");
      }
      setAccounts(accRes.accounts || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Balance</h2>
        <p>Check the current wallet balance for any registered client.</p>
      </section>
      <section className="content-grid single-column">
        <section className="panel compact-panel">
          <span className="section-eyebrow">Wallet</span>
          <h3>Balance Lookup</h3>
          <form
            onSubmit={handleLookup}
            style={{ display: "grid", gap: "0.7rem", maxWidth: "420px" }}
          >
            <label style={{ position: "relative" }}>
              Client Email
              <input
                type="text"
                placeholder="Type to search by email…"
                value={emailQuery}
                onChange={handleEmailChange}
                autoComplete="off"
              />
              {suggestions.length > 0 && (
                <ul className="email-suggestions">
                  {suggestions.map((c) => (
                    <li key={c.id}>
                      <button type="button" onClick={() => handleSelect(c)}>
                        <span className="suggestion-email">{c.email}</span>
                        {c.name && (
                          <span className="suggestion-name">{c.name}</span>
                        )}
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </label>
            <button
              type="submit"
              disabled={loading || !selectedClient}
              style={{ justifySelf: "start" }}
            >
              {loading ? "Fetching…" : "Check Balance"}
            </button>
            {error && (
              <p className="error-text" style={{ margin: 0 }}>
                ✗ {error}
              </p>
            )}
          </form>
        </section>

        {/* ── Per-currency account cards ── */}
        {accounts.length > 0 && (
          <section className="panel compact-panel">
            <span className="section-eyebrow">Currency Accounts</span>
            <h3 style={{ marginBottom: "0.8rem" }}>
              {selectedClient?.name || selectedClient?.email} — All Accounts
            </h3>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.75rem" }}>
              {accounts.map((acc) => {
                const palette = {
                  USD: {
                    bg: "#e0f2fe",
                    border: "#93c5fd",
                    color: "#0369a1",
                    label: "US Dollar",
                  },
                  EUR: {
                    bg: "#ede9fe",
                    border: "#c4b5fd",
                    color: "#6d28d9",
                    label: "Euro",
                  },
                  GBP: {
                    bg: "#fef9c3",
                    border: "#fde68a",
                    color: "#92400e",
                    label: "British Pound",
                  },
                  ALL: {
                    bg: "#f1f5f9",
                    border: "#cbd5e1",
                    color: "#475569",
                    label: "Albanian Lek",
                  },
                };
                const p = palette[acc.currency] || palette.ALL;
                const isActive = (acc.status || "").toUpperCase() === "ACTIVE";
                return (
                  <div
                    key={acc.id}
                    style={{
                      flex: "1 1 160px",
                      maxWidth: "220px",
                      padding: "0.85rem 1rem",
                      borderRadius: "12px",
                      background: p.bg,
                      border: `1.5px solid ${p.border}`,
                      opacity: isActive ? 1 : 0.55,
                    }}
                  >
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        marginBottom: "0.4rem",
                      }}
                    >
                      <span
                        style={{
                          fontWeight: 700,
                          fontSize: "0.82rem",
                          color: p.color,
                          letterSpacing: "0.06em",
                        }}
                      >
                        {acc.currency}
                      </span>
                      <span
                        style={{
                          fontSize: "0.68rem",
                          fontWeight: 700,
                          color: isActive ? "#0c7f55" : "#b91c1c",
                          background: isActive ? "#e4f8ef" : "#fee2e2",
                          padding: "0.15rem 0.45rem",
                          borderRadius: "999px",
                        }}
                      >
                        {isActive ? "ACTIVE" : acc.status}
                      </span>
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: p.color,
                        marginBottom: "0.45rem",
                      }}
                    >
                      {p.label}
                    </div>
                    <strong
                      style={{
                        fontFamily: "'JetBrains Mono', monospace",
                        fontSize: "1.3rem",
                        color: "#111",
                      }}
                    >
                      {formatAmount(acc.balance || 0)}
                    </strong>
                  </div>
                );
              })}
            </div>
          </section>
        )}
      </section>
    </>
  );
}
