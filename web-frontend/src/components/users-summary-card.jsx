import { useEffect, useState } from "react";
import { useAuth } from "../hooks/use-auth";
import { getUsers, getClients } from "../lib/api";

export default function UsersSummaryCard() {
  const { token, role } = useAuth();
  const isSuperAdmin = role === "superadmin";
  const [staffCount, setStaffCount] = useState(null);
  const [clientCount, setClientCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        if (isSuperAdmin) {
          const [usersRes, clientsRes] = await Promise.all([
            getUsers(token),
            getClients(token),
          ]);
          if (active) {
            setStaffCount((usersRes.users || []).length);
            setClientCount((clientsRes.clients || []).length);
          }
        } else {
          const clientsRes = await getClients(token);
          if (active) setClientCount((clientsRes.clients || []).length);
        }
      } catch (err) {
        if (active) setError("Failed to load user counts");
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token, isSuperAdmin]);

  return (
    <section className="panel compact-panel">
      <span className="section-eyebrow">Users</span>
      <h3>Total Users</h3>
      {loading && <p style={{ color: "var(--ink-soft)" }}>Loading…</p>}
      {error && <p className="error-text">{error}</p>}
      {!loading && !error && (
        <div className="stats-row">
          {isSuperAdmin && (
            <div
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
                Staff
              </span>
              <strong
                style={{
                  fontSize: "1.35rem",
                  fontFamily: "'JetBrains Mono', monospace",
                  color: "var(--ink)",
                }}
              >
                {staffCount}
              </strong>
              <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
                users
              </span>
            </div>
          )}
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
              Clients
            </span>
            <strong
              style={{
                fontSize: "1.35rem",
                fontFamily: "'JetBrains Mono', monospace",
                color: "var(--ink)",
              }}
            >
              {clientCount}
            </strong>
            <span style={{ fontSize: "0.7rem", color: "var(--ink-soft)" }}>
              clients
            </span>
          </div>
        </div>
      )}
    </section>
  );
}
