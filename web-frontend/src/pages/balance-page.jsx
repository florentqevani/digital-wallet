import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getClients, getPaymentBalance } from "../lib/api";

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
      const res = await getPaymentBalance(token, selectedClient.id);
      if (res.success) {
        setBalanceInfo(res);
      } else {
        setError(res.message || "Not found");
      }
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
            {balanceInfo && (
              <div
                style={{
                  marginTop: "0.2rem",
                  padding: "0.72rem 0.88rem",
                  borderRadius: "10px",
                  background:
                    "linear-gradient(180deg, #f3f8ff 0%, #ebf3ff 100%)",
                  border: "1px solid #b9d0f5",
                }}
              >
                <p
                  style={{
                    margin: 0,
                    fontSize: "0.78rem",
                    color: "var(--ink-soft)",
                    fontWeight: 700,
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Available Balance
                </p>
                <strong
                  style={{
                    fontSize: "1.7rem",
                    fontFamily: "'JetBrains Mono', monospace",
                    color: "black",
                  }}
                >
                  {formatAmount(balanceInfo.balance)}
                </strong>
                <span
                  style={{
                    marginLeft: "0.4rem",
                    fontSize: "0.88rem",
                    color: "var(--ink-soft)",
                    fontWeight: 700,
                  }}
                >
                  {balanceInfo.currency || "ALL"}
                </span>
              </div>
            )}
          </form>
        </section>
      </section>
    </>
  );
}
