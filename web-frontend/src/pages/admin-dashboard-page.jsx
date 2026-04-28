import { useEffect, useState } from 'react';
import TopNav from '../components/top-nav';
import LogsTable from '../components/logs-table';
import StatCard from '../components/stat-card';
import { getAllLogs, getDashboard } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

function todayRange() {
    const now = new Date();
    const start = new Date(now);
    start.setHours(0, 0, 0, 0);

    return {
        from: start.getTime(),
        to: now.getTime(),
    };
}

function toDateTimeLocal(timestamp) {
    const date = new Date(timestamp);
    const pad = (value) => String(value).padStart(2, '0');

    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

function buildLogQuery(filters) {
    const now = Date.now();
    const query = {
        actor_type: filters.actor_type,
        actor_id: filters.actor_id,
        page: 1,
        limit: 50,
    };

    switch (filters.range) {
        case 'today': {
            const start = new Date();
            start.setHours(0, 0, 0, 0);
            query.from = start.getTime();
            query.to = now;
            break;
        }
        case '24h':
            query.from = now - (24 * 60 * 60 * 1000);
            query.to = now;
            break;
        case '7d':
            query.from = now - (7 * 24 * 60 * 60 * 1000);
            query.to = now;
            break;
        case 'custom': {
            if (filters.customFrom) {
                query.from = new Date(filters.customFrom).getTime();
            }
            if (filters.customTo) {
                query.to = new Date(filters.customTo).getTime();
            }
            break;
        }
        case 'all':
        default:
            break;
    }

    return query;
}

export default function AdminDashboardPage() {
    const { token, role } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const isUser = role === 'user';
    const [summary, setSummary] = useState({
        totalClientLogs: 0,
        totalUserLogs: 0,
        errorCount: 0,
        successCount: 0,
    });
    const [latestClientLogs, setLatestClientLogs] = useState([]);
    const [latestUserLogs, setLatestUserLogs] = useState([]);
    const [filteredLogs, setFilteredLogs] = useState([]);
    const [filters, setFilters] = useState(() => ({
        actor_type: '',
        actor_id: '',
        range: '24h',
        customFrom: toDateTimeLocal(todayRange().from),
        customTo: toDateTimeLocal(todayRange().to),
    }));
    const [loading, setLoading] = useState(true);
    const [filtering, setFiltering] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function loadDashboard() {
            setLoading(true);
            setError('');

            try {
                const response = await getDashboard(token);

                if (active) {
                    setSummary(response.summary || {
                        totalClientLogs: 0,
                        totalUserLogs: 0,
                        errorCount: 0,
                        successCount: 0,
                    });
                    setLatestClientLogs(response.clientLogs || []);
                    setLatestUserLogs(response.userLogs || []);
                }
            } catch (requestError) {
                if (active) {
                    setError(requestError.message);
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        }

        loadDashboard();

        return () => {
            active = false;
        };
    }, [token]);

    const applyFilters = async (event) => {
        if (event) {
            event.preventDefault();
        }

        setFiltering(true);
        setError('');

        try {
            const response = await getAllLogs(token, buildLogQuery(filters));
            setFilteredLogs(response.logs || []);
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setFiltering(false);
        }
    };

    let actorTypeFilter = null;
    if (isSuperAdmin) {
        actorTypeFilter = (
            <>
                <label>
                    <span>Actor Type</span>
                    <select value={filters.actor_type} onChange={(event) => setFilters((current) => ({ ...current, actor_type: event.target.value }))}>
                        <option value="">All</option>
                        <option value="client">Client</option>
                        <option value="user">User</option>
                        <option value="superadmin">Super Admin</option>
                    </select>
                </label>
                <label>
                    <span>User / Actor ID</span>
                    <input value={filters.actor_id} onChange={(event) => setFilters((current) => ({ ...current, actor_id: event.target.value }))} placeholder="email or actor id" />
                </label>
            </>
        );
    } else if (isUser) {
        actorTypeFilter = (
            <label>
                <span>Actor Type</span>
                <select value={filters.actor_type} onChange={(event) => setFilters((current) => ({ ...current, actor_type: event.target.value }))}>
                    <option value="">My Logs</option>
                    <option value="client">Client</option>
                </select>
            </label>
        );
    }

    return (
        <main className="page-shell">
            <TopNav />
            <section className="page-intro dashboard-intro">
                <h2>{isSuperAdmin ? 'Executive Overview' : 'Activity Overview'}</h2>
                <p>
                    {isSuperAdmin
                        ? 'Compact operational view for health checks and targeted investigations.'
                        : 'A scoped view of your own activity with quick filtering and recent event context.'}
                </p>
            </section>
            <section className="content-grid dashboard-grid">
                <section className="panel compact-panel dashboard-summary-panel">
                    <h3>{isSuperAdmin ? 'System Pulse' : 'My Activity Pulse'}</h3>
                    <p>{isSuperAdmin ? 'Global activity and reliability trends.' : 'A personal snapshot of recent actions and outcomes.'}</p>
                    {error && <p className="error-text">{error}</p>}
                    <div className="stats-row">
                        <StatCard label={isSuperAdmin || isUser ? 'Client Logs' : 'Visible Client Logs'} value={summary.totalClientLogs} tone="default" />
                        <StatCard label={isSuperAdmin || isUser ? 'User Logs' : 'My Logs'} value={summary.totalUserLogs} tone="default" />
                        <StatCard label="Success" value={summary.successCount} tone="success" />
                        <StatCard label="Errors" value={summary.errorCount} tone="danger" />
                    </div>
                    {loading ? <p>Loading dashboard...</p> : null}
                </section>

                <section className="panel compact-panel dashboard-query-panel">
                    <h3>{isSuperAdmin ? 'Query All Logs' : 'Query My Logs'}</h3>
                    <form className="filters-grid" onSubmit={applyFilters}>
                        {actorTypeFilter}
                        <label>
                            <span>Time Range</span>
                            <select value={filters.range} onChange={(event) => setFilters((current) => ({ ...current, range: event.target.value }))}>
                                <option value="24h">Last 24 Hours</option>
                                <option value="today">Today</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="all">All Time</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </label>
                        {filters.range === 'custom' ? (
                            <>
                                <label>
                                    <span>From</span>
                                    <input
                                        type="datetime-local"
                                        value={filters.customFrom}
                                        onChange={(event) => setFilters((current) => ({ ...current, customFrom: event.target.value }))}
                                    />
                                </label>
                                <label>
                                    <span>To</span>
                                    <input
                                        type="datetime-local"
                                        value={filters.customTo}
                                        onChange={(event) => setFilters((current) => ({ ...current, customTo: event.target.value }))}
                                    />
                                </label>
                            </>
                        ) : null}
                        <button type="submit" disabled={filtering}>{filtering ? 'Querying...' : 'Run Query'}</button>
                    </form>
                    {filteredLogs.length === 0 ? <p>{isSuperAdmin ? 'Run a query to load filtered results.' : 'Run a query to load your filtered activity.'}</p> : null}
                </section>

                <section className="dashboard-latest-grid">
                    {(isSuperAdmin || isUser) ? <LogsTable title="Latest Client Logs" logs={latestClientLogs} className="compact-panel" /> : null}
                    <LogsTable title={isSuperAdmin ? 'Latest User Logs' : 'Latest My Logs'} logs={latestUserLogs} className="compact-panel" />
                </section>

                {filtering ? (
                    <section className="panel compact-panel dashboard-query-results">
                        <h3>{isSuperAdmin ? 'Filtered Results' : 'My Filtered Results'}</h3>
                        <p>Loading matching logs...</p>
                    </section>
                ) : (
                    <LogsTable title={isSuperAdmin ? 'Filtered Results' : 'My Filtered Results'} logs={filteredLogs} className="compact-panel dashboard-query-results" />
                )}
            </section>
        </main>
    );
}
