import { useState, useEffect } from "react";
import {
  listAccounts,
  createAccount,
  deleteAccount,
  updateAccountStatus,
  getClients,
} from "../lib/api";
import { useAuth } from "../hooks/use-auth";

function MonoCell({ value }) {
  if (!value) return <span style={{ color: "var(--ink-soft)" }}>—</span>;
  return (
    <span
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem" }}
      title={value}
    >
      {value}
    </span>
  );
}

const CURRENCY_COLORS = {
  USD: { bg: "#e8f5e9", color: "#2e7d32" },
  EUR: { bg: "#ede7f6", color: "#4527a0" },
  GBP: { bg: "#e3f2fd", color: "#1565c0" },
};

function CurrencyBadge({ currency }) {
  const style = CURRENCY_COLORS[currency] || { bg: "#f5f5f5", color: "#555" };
  return (
    <span
      style={{
        background: style.bg,
        color: style.color,
        fontWeight: 700,
        fontSize: "0.72rem",
        letterSpacing: "0.06em",
        padding: "0.2rem 0.55rem",
        borderRadius: "999px",
        whiteSpace: "nowrap",
      }}
    >
      {currency}
    </span>
  );
}

function StatusSelect({ value, accountId, onChange }) {
  const colors = {
    active: { bg: "#e8f5e9", color: "#2e7d32", border: "#a5d6a7" },
    suspended: { bg: "#fff3e0", color: "#e65100", border: "#ffcc80" },
  };
  const c = colors[value] || colors.active;
  return (
    <select
      value={value}
      onChange={(e) => onChange(accountId, e.target.value)}
      style={{
        background: c.bg,
        color: c.color,
        border: `1px solid ${c.border}`,
        borderRadius: "999px",
        padding: "0.2rem 0.7rem",
        fontSize: "0.75rem",
        fontWeight: 600,
        cursor: "pointer",
        appearance: "auto",
      }}
    >
      <option value="active">Active</option>
      <option value="suspended">Suspended</option>
    </select>
  );
}

  if (!ts) return "—";
  const d = new Date(Number(ts));
  return Number.isNaN(d.getTime()) ? "—" : d.toLocaleString();
}

export default function AccountsPage() {
  const { token } = useAuth();
  const [accounts, setAccounts] = useState([]);
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [createLoading, setCreateLoading] = useState(false);
  const [createError, setCreateError] = useState("");
  const [selectedClient, setSelectedClient] = useState("");
  const [selectedCurrency, setSelectedCurrency] = useState("USD");
  const [clientAccounts, setClientAccounts] = useState([]);

  const refresh = async () => {
    setLoading(true);
    setError("");
    try {
      const [accountsRes, clientsRes] = await Promise.all([
        listAccounts(token),
        getClients(token),
      ]);
      setAccounts(accountsRes.accounts || []);
      setClients(clientsRes.clients || []);
    } catch (error) {
      console.error("❌ Load accounts error:", error.message);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    refresh();
  }, [token]);

  // When client selection changes in create form, load their existing accounts
  useEffect(() => {
    if (!selectedClient) {
      setClientAccounts([]);
      return;
    }
    listAccounts(token, selectedClient)
      .then((res) => {
        setClientAccounts(res.accounts || []);
        // Auto-select first available currency
        const taken = (res.accounts || []).map((a) => a.currency);
        const avail = ["USD", "EUR", "GBP"].find((c) => !taken.includes(c));
        if (avail) setSelectedCurrency(avail);
      })
      .catch(() => setClientAccounts([]));
  }, [selectedClient, token]);

  const clientMap = {};
  clients.forEach((c) => {
    clientMap[c.id] = c;
  });

  // No filtering here; show all accounts
  const filtered = accounts;

  const handleDelete = async (acc) => {
    const balance = parseFloat(acc.balance) || 0;
    if (balance !== 0) {
      alert(
        "Cannot delete account with non-zero balance. Please transfer out the funds first.",
      );
      return;
    }
    if (!window.confirm("Are you sure you want to delete this account?"))
      return;
    try {
      await deleteAccount(token, acc.id);
      refresh();
    } catch (error) {
      console.error("❌ Delete account error:", error.message);
      alert("Failed to delete account: " + error.message);
    }
  };

  const handleStatusChange = async (accountId, newStatus) => {
    try {
      await updateAccountStatus(token, accountId, newStatus);
      refresh();
    } catch (error) {
      console.error("❌ Update account status error:", error.message);
      alert("Failed to update account status: " + error.message);
    }
  };

  const handleCreateAccount = async (e) => {
    e.preventDefault();
    if (!selectedClient) {
      setCreateError("Please select a client");
      return;
    }
    setCreateLoading(true);
    setCreateError("");
    try {
      await createAccount(token, selectedClient, selectedCurrency);
      setShowCreateForm(false);
      setSelectedClient("");
      setSelectedCurrency("");
      refresh();
    } catch (error) {
      console.error("❌ Create account error:", error.message);
      setCreateError(error.message);
    } finally {
      setCreateLoading(false);
    }
  };

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Accounts Management</h2>
        <p>View, create, and manage all client currency accounts.</p>
      </section>

      <section className="content-grid single-column">
        <section className="panel compact-panel">

          {/* Header row */}
          <div className="section-heading-row">
            <div>
              <span className="section-eyebrow">All Accounts</span>
              <h3>Account Directory</h3>
            </div>
            <div className="section-meta-pills">
              <span className="status-pill">{accounts.length} total</span>
              <button
                type="button"
                className="button-muted"
                onClick={refresh}
                disabled={loading}
                style={{ padding: "0.34rem 0.6rem", fontSize: "0.8rem" }}
              >
                {loading ? "Loading…" : "↻ Refresh"}
              </button>
              <button
                type="button"
                className={showCreateForm ? "button-muted" : "button-primary"}
                onClick={() => {
                  setShowCreateForm((v) => !v);
                  setCreateError("");
                }}
                style={{ padding: "0.34rem 0.75rem", fontSize: "0.8rem" }}
              >
                {showCreateForm ? "✕ Cancel" : "+ Create Account"}
              </button>
            </div>
          </div>

          {error && <p className="error-text">{error}</p>}

          {/* Create form */}
          {showCreateForm && (
            <div
              style={{
                background: "var(--surface-alt, #f8f9fc)",
                border: "1px solid var(--border, #e2e8f0)",
                borderRadius: "10px",
                padding: "1.25rem 1.5rem",
                marginBottom: "1.25rem",
              }}
            >
              <h4 style={{ marginBottom: "1rem", fontSize: "0.95rem" }}>
                New Account
              </h4>
              {createError && <p className="error-text">{createError}</p>}
              <form
                onSubmit={handleCreateAccount}
                style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap", alignItems: "flex-end" }}
              >
                <label style={{ flex: "1 1 220px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
                    Client
                  </span>
                  <select
                    value={selectedClient}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    required
                    style={{ width: "100%" }}
                  >
                    <option value="">— Select client —</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.email}{c.name ? ` (${c.name})` : ""}
                      </option>
                    ))}
                  </select>
                </label>
                <label style={{ flex: "0 1 140px" }}>
                  <span style={{ fontSize: "0.78rem", color: "var(--ink-soft)", display: "block", marginBottom: "0.3rem" }}>
                    Currency
                  </span>
                  <select
                    value={selectedCurrency}
                    onChange={(e) => setSelectedCurrency(e.target.value)}
                    style={{ width: "100%" }}
                  >
                    {["USD", "EUR", "GBP"].map((cur) => {
                      const taken = clientAccounts.some((a) => a.currency === cur);
                      return (
                        <option key={cur} value={cur} disabled={taken}>
                          {cur}{taken ? " (exists)" : ""}
                        </option>
                      );
                    })}
                  </select>
                </label>
                <button
                  type="submit"
                  disabled={createLoading}
                  style={{ alignSelf: "flex-end", padding: "0.45rem 1.1rem", fontSize: "0.85rem" }}
                >
                  {createLoading ? "Creating…" : "Create"}
                </button>
              </form>
            </div>
          )}

          {/* Table */}
          {loading ? (
            <p style={{ color: "var(--ink-soft)", padding: "1.5rem 0" }}>Loading accounts…</p>
          ) : filtered.length === 0 ? (
            <div
              style={{
                textAlign: "center",
                color: "var(--ink-soft)",
                padding: "3rem 1rem",
              }}
            >
              No accounts found.
            </div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Account ID</th>
                    <th>Client Email</th>
                    <th>Currency</th>
                    <th>Balance</th>
                    <th>Status</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((acc) => {
                    const client = clientMap[acc.client_id];
                    const email = client ? client.email : "Unknown";
                    const balance = parseFloat(acc.balance) || 0;
                    return (
                      <tr key={acc.id}>
                        <td data-label="Account ID">
                          <MonoCell value={acc.id} />
                        </td>
                        <td data-label="Client Email">{email}</td>
                        <td data-label="Currency">
                          <CurrencyBadge currency={acc.currency} />
                        </td>
                        <td data-label="Balance">
                          <span
                            style={{
                              fontWeight: 600,
                              color: balance > 0 ? "var(--ink)" : "var(--ink-soft)",
                            }}
                          >
                            {balance.toFixed(2)}
                          </span>
                        </td>
                        <td data-label="Status">
                          <StatusSelect
                            value={acc.status}
                            accountId={acc.id}
                            onChange={handleStatusChange}
                          />
                        </td>
                        <td data-label="Created At">{formatDate(acc.created_at)}</td>
                        <td data-label="Actions">
                          <div className="row-actions">
                            <button
                              type="button"
                              className="button-danger"
                              onClick={() => handleDelete(acc)}
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
