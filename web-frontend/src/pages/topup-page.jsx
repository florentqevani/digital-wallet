import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getClients, listAccounts, adminTopUp } from "../lib/api";

function formatAmount(n) {
  return Number(n).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export default function TopUpPage() {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [accounts, setAccounts] = useState([]);
  const [emailQuery, setEmailQuery] = useState("");
  const [selectedClient, setSelectedClient] = useState(null);
  const [amount, setAmount] = useState("");
  const [currency, setCurrency] = useState("USD");
  const [note, setNote] = useState("");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    getClients(token)
      .then((res) => setClients(res.clients || []))
      .catch(() => {});
  }, [token]);

  // Load accounts for selected client
  useEffect(() => {
    if (!selectedClient) {
      setAccounts([]);
      return;
    }
    listAccounts(token, selectedClient.id)
      .then((res) => {
        const accs = res.accounts || [];
        setAccounts(accs);
        // Auto-select first available currency the client actually has
        if (accs.length > 0) setCurrency(accs[0].currency);
      })
      .catch(() => setAccounts([]));
  }, [selectedClient, token]);

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
    setResult(null);
  };

  const handleSelect = (client) => {
    setSelectedClient(client);
    setEmailQuery(client.email);
    // currency will be auto-set by the accounts useEffect
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setResult(null);
    if (!selectedClient)
      return setResult({
        success: false,
        message: "Select a client from the suggestions.",
      });
    const amt = parseFloat(amount);
    if (Number.isNaN(amt) || amt <= 0)
      return setResult({
        success: false,
        message: "Enter a valid positive amount.",
      });
    setLoading(true);
    try {
      const res = await adminTopUp(token, {
        client_id: selectedClient.id,
        amount: amt,
        currency,
        note,
      });
      setResult(res);
      if (res.success) {
        setAmount("");
        setNote("");
        setEmailQuery("");
        setSelectedClient(null);
        setAccounts([]);
        setCurrency("ALL");
      }
    } catch (err) {
      setResult({ success: false, message: err.message });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Top-Up</h2>
        <p>Credit a client wallet balance.</p>
      </section>
      <section className="content-grid single-column">
        <section className="panel compact-panel">
          <span className="section-eyebrow">Admin Action</span>
          <h3>Top-Up Client Wallet</h3>
          <p style={{ marginBottom: "0.9rem" }}>
            Search for a client by email, then enter the amount to credit.
          </p>
          <form
            onSubmit={handleSubmit}
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
            <label>
              Currency
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                required
                disabled={!selectedClient}
              >
                {["ALL", "USD", "EUR", "GBP"].map((cur) => {
                  const alreadyHas = accounts.some((a) => a.currency === cur);
                  return (
                    <option
                      key={cur}
                      value={cur}
                      disabled={selectedClient && !alreadyHas}
                    >
                      {cur}
                      {selectedClient && !alreadyHas ? " (no account)" : ""}
                    </option>
                  );
                })}
              </select>
            </label>
            <label>
              Amount
              <input
                type="number"
                min="0.01"
                step="0.01"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
                disabled={!selectedClient}
              />
            </label>
            <label>
              Note{" "}
              <span style={{ fontWeight: 400, fontSize: "0.8rem" }}>
                (optional)
              </span>
              <input
                type="text"
                placeholder="e.g. Monthly credit"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={200}
              />
            </label>
            <button
              type="submit"
              disabled={loading || !selectedClient}
              style={{ justifySelf: "start" }}
            >
              {loading ? "Processing…" : "Apply Top-Up"}
            </button>
            {result && (
              <p
                className={result.success ? "success-text" : "error-text"}
                style={{ margin: 0 }}
              >
                {result.success
                  ? `✓ ${result.message} New balance: ${formatAmount(result.new_balance)} ${result.currency || currency}`
                  : `✗ ${result.message}`}
              </p>
            )}
          </form>
        </section>
      </section>
    </>
  );
}
