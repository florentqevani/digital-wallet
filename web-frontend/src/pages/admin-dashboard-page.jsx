import { useEffect, useState } from "react";
import LogsBarChart from "../components/logs-bar-chart";
import StatCard from "../components/stat-card";
import { getDashboard } from "../lib/api";
import { useAuth } from "../hooks/use-auth";
import TotalCashCard from "../components/total-cash-card";
import UsersSummaryCard from "../components/users-summary-card";
import AccountsSummaryCard from "../components/accounts-summary-card";

export default function AdminDashboardPage() {
  const { token, role } = useAuth();
  const isSuperAdmin = role === "superadmin";
  const [summary, setSummary] = useState({
    totalClientLogs: 0,
    totalUserLogs: 0,
    errorCount: 0,
    successCount: 0,
  });
  const [latestClientLogs, setLatestClientLogs] = useState([]);
  const [latestUserLogs, setLatestUserLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;
    async function load() {
      setLoading(true);
      setError("");
      try {
        const response = await getDashboard(token);
        if (active) {
          setSummary(
            response.summary || {
              totalClientLogs: 0,
              totalUserLogs: 0,
              errorCount: 0,
              successCount: 0,
            },
          );
          setLatestClientLogs(response.clientLogs || []);
          setLatestUserLogs(response.userLogs || []);
        }
      } catch (requestError) {
        if (active) setError(requestError.message);
      } finally {
        if (active) setLoading(false);
      }
    }
    load();
    return () => {
      active = false;
    };
  }, [token]);

  return (
    <>
      <section className="page-intro dashboard-intro">
        <h2>{isSuperAdmin ? "Executive Overview" : "Activity Overview"}</h2>
        <p>
          {isSuperAdmin
            ? "Compact operational view for health checks and targeted investigations."
            : "A scoped view of recent activity across the platform."}
        </p>
      </section>
      <section className="content-grid dashboard-grid">
        <section className="panel compact-panel dashboard-summary-panel">
          <h3>{isSuperAdmin ? "System Pulse" : "Activity Pulse"}</h3>
          <p>
            {isSuperAdmin
              ? "Global activity and reliability trends."
              : "A snapshot of recent actions and outcomes."}
          </p>
          {error && <p className="error-text">{error}</p>}
          <div className="stats-row">
            <StatCard
              label="Client Logs"
              value={summary.totalClientLogs}
              tone="default"
            />
            <StatCard
              label="User Logs"
              value={summary.totalUserLogs}
              tone="default"
            />
            <StatCard
              label="Success"
              value={summary.successCount}
              tone="success"
            />
            <StatCard label="Errors" value={summary.errorCount} tone="danger" />
          </div>
          {loading && <p>Loading dashboard...</p>}
        </section>

        <section className="dashboard-chart-row">
          <LogsBarChart
            clientLogs={latestClientLogs}
            userLogs={latestUserLogs}
          />
        </section>

        {isSuperAdmin && <TotalCashCard />}
        <UsersSummaryCard />
        <AccountsSummaryCard />
      </section>
    </>
  );
}
