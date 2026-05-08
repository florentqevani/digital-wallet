import { useEffect, useState } from "react";
import {
  getAccounts,
  updateClientRequest,
  deleteClientRequest,
} from "../lib/api";
import { useAuth } from "../hooks/use-auth";

function formatDate(timestamp) {
  if (!timestamp) return "-";
  const date = new Date(Number(timestamp));
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleString();
}

function MonoCell({ value, title }) {
  if (!value) return <span style={{ color: "var(--ink-soft)" }}>—</span>;
  return (
    <span
      style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: "0.72rem" }}
      title={title || value}
    >
      {value}
    </span>
  );
}

export default function ClientAccountsPage() {
  const { token } = useAuth();
  const [clients, setClients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [editingClientId, setEditingClientId] = useState("");
  const [clientEditForm, setClientEditForm] = useState({ name: "", email: "" });

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await getAccounts(token);
      setClients(res.clients || []);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const startClientEdit = (client) => {
    setEditingClientId(client.id);
    setClientEditForm({ name: client.name || "", email: client.email || "" });
    setError("");
    setSuccess("");
  };

  const cancelClientEdit = () => setEditingClientId("");

  const saveClientEdit = async (clientId) => {
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await updateClientRequest(
        token,
        clientId,
        clientEditForm,
      );
      if (!response.success)
        throw new Error(response.message || "Failed to update client");
      setSuccess("Client updated successfully.");
      setEditingClientId("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const removeClient = async (clientId, email) => {
    if (
      !globalThis.confirm(
        `Delete client ${email}? This action cannot be undone.`,
      )
    )
      return;
    setSaving(true);
    setError("");
    setSuccess("");
    try {
      const response = await deleteClientRequest(token, clientId);
      if (!response.success)
        throw new Error(response.message || "Failed to delete client");
      setSuccess("Client deleted successfully.");
      if (editingClientId === clientId) setEditingClientId("");
      await load();
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>Client Accounts</h2>
        <p>
          Review and manage customer accounts registered through the mobile app.
        </p>
      </section>
      <section className="content-grid single-column">
        <section className="panel compact-panel user-table-panel">
          <div className="section-heading-row">
            <div>
              <span className="section-eyebrow">External Accounts</span>
              <h3>Client Directory</h3>
            </div>
            <div className="section-meta-pills">
              <span className="status-pill">{clients.length} total</span>
              <button
                type="button"
                className="button-muted"
                onClick={load}
                disabled={loading}
                style={{ padding: "0.34rem 0.6rem", fontSize: "0.8rem" }}
              >
                {loading ? "Loading…" : "↻ Refresh"}
              </button>
            </div>
          </div>
          <p>
            Review customer accounts created through the client registration
            flow.
          </p>
          {error && <p className="error-text">{error}</p>}
          {success && <p className="success-text">{success}</p>}
          {loading ? (
            <p>Loading clients...</p>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Account ID</th>
                    <th>Balance (ALL)</th>
                    <th>Currency</th>
                    <th>Created At</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {clients.length === 0 && (
                    <tr>
                      <td
                        colSpan={7}
                        style={{
                          textAlign: "center",
                          color: "var(--ink-soft)",
                          padding: "2rem",
                        }}
                      >
                        No clients found.
                      </td>
                    </tr>
                  )}
                  {clients.map((client) => (
                    <tr key={client.id}>
                      <td data-label="Name">
                        {editingClientId === client.id ? (
                          <input
                            value={clientEditForm.name}
                            onChange={(e) =>
                              setClientEditForm((c) => ({
                                ...c,
                                name: e.target.value,
                              }))
                            }
                            placeholder="Name"
                          />
                        ) : (
                          client.name || (
                            <span style={{ color: "var(--ink-soft)" }}>—</span>
                          )
                        )}
                      </td>
                      <td data-label="Email">
                        {editingClientId === client.id ? (
                          <input
                            type="email"
                            value={clientEditForm.email}
                            onChange={(e) =>
                              setClientEditForm((c) => ({
                                ...c,
                                email: e.target.value,
                              }))
                            }
                            placeholder="Email"
                          />
                        ) : (
                          client.email
                        )}
                      </td>
                      <td data-label="Account ID">
                        <MonoCell value={client.account_id} />
                      </td>
                      <td data-label="Balance (ALL)">
                        <span
                          style={{
                            fontFamily: "'JetBrains Mono', monospace",
                            fontSize: "0.82rem",
                            fontWeight: 600,
                          }}
                        >
                          {client.balance != null ? client.balance : "—"}
                        </span>
                      </td>
                      <td data-label="Currency">
                        {client.currency ? (
                          <span className="status-pill">{client.currency}</span>
                        ) : (
                          <span style={{ color: "var(--ink-soft)" }}>—</span>
                        )}
                      </td>
                      <td data-label="Created At">
                        {formatDate(client.created_at)}
                      </td>
                      <td data-label="Actions">
                        <div className="row-actions">
                          {editingClientId === client.id ? (
                            <>
                              <button
                                type="button"
                                onClick={() => saveClientEdit(client.id)}
                                disabled={saving}
                              >
                                Save
                              </button>
                              <button
                                type="button"
                                className="button-muted"
                                onClick={cancelClientEdit}
                                disabled={saving}
                              >
                                Cancel
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                type="button"
                                className="button-muted"
                                onClick={() => startClientEdit(client)}
                                disabled={saving}
                              >
                                Edit
                              </button>
                              <button
                                type="button"
                                className="button-danger"
                                onClick={() =>
                                  removeClient(client.id, client.email)
                                }
                                disabled={saving}
                              >
                                Delete
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </section>
    </>
  );
}
