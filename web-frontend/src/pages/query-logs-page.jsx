import { useState } from 'react';
import LogsTable from '../components/logs-table';
import { getAllLogs } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

function toDateTimeLocal(ts) {
    const d = new Date(ts);
    const p = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

function buildQuery(filters) {
    const now = Date.now();
    const query = { actor_type: filters.actor_type, actor_id: filters.actor_id, page: 1, limit: 50 };
    switch (filters.range) {
        case 'today': { const s = new Date(); s.setHours(0, 0, 0, 0); query.from = s.getTime(); query.to = now; break; }
        case '24h': query.from = now - 86400000; query.to = now; break;
        case '7d': query.from = now - 604800000; query.to = now; break;
        case 'custom':
            if (filters.customFrom) query.from = new Date(filters.customFrom).getTime();
            if (filters.customTo) query.to = new Date(filters.customTo).getTime();
            break;
        default: break;
    }
    return query;
}

export default function QueryLogsPage() {
    const { token, role } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const [filters, setFilters] = useState({
        actor_type: '',
        actor_id: '',
        range: '24h',
        customFrom: toDateTimeLocal(new Date().setHours(0, 0, 0, 0)),
        customTo: toDateTimeLocal(Date.now()),
    });
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        setSearched(true);
        try {
            const res = await getAllLogs(token, buildQuery(filters));
            setLogs(res.logs || []);
            setTotal(res.total || 0);
        } catch (err) {
            setError(err.message);
            setLogs([]);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Query Logs</h2>
                <p>Run a targeted search across the audit log with full filter control.</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    <h3>Filter</h3>
                    <form className="filters-grid" onSubmit={handleSubmit}>
                        {isSuperAdmin ? (
                            <>
                                <label>
                                    <span>Actor Type</span>
                                    <select value={filters.actor_type} onChange={(e) => setFilters((f) => ({ ...f, actor_type: e.target.value }))}>
                                        <option value="">All</option>
                                        <option value="client">Client</option>
                                        <option value="user">User</option>
                                        <option value="superadmin">Super Admin</option>
                                    </select>
                                </label>
                                <label>
                                    <span>Actor ID</span>
                                    <input value={filters.actor_id} onChange={(e) => setFilters((f) => ({ ...f, actor_id: e.target.value }))} placeholder="email or actor id" />
                                </label>
                            </>
                        ) : (
                            <label>
                                <span>Actor Type</span>
                                <select value={filters.actor_type} onChange={(e) => setFilters((f) => ({ ...f, actor_type: e.target.value }))}>
                                    <option value="">My Logs</option>
                                    <option value="client">Client</option>
                                </select>
                            </label>
                        )}
                        <label>
                            <span>Time Range</span>
                            <select value={filters.range} onChange={(e) => setFilters((f) => ({ ...f, range: e.target.value }))}>
                                <option value="24h">Last 24 Hours</option>
                                <option value="today">Today</option>
                                <option value="7d">Last 7 Days</option>
                                <option value="all">All Time</option>
                                <option value="custom">Custom Range</option>
                            </select>
                        </label>
                        {filters.range === 'custom' && (
                            <>
                                <label><span>From</span><input type="datetime-local" value={filters.customFrom} onChange={(e) => setFilters((f) => ({ ...f, customFrom: e.target.value }))} /></label>
                                <label><span>To</span><input type="datetime-local" value={filters.customTo} onChange={(e) => setFilters((f) => ({ ...f, customTo: e.target.value }))} /></label>
                            </>
                        )}
                        <button type="submit" disabled={loading}>{loading ? 'Querying…' : 'Run Query'}</button>
                    </form>
                    {error && <p className="error-text">{error}</p>}
                    {searched
                        ? <LogsTable title={`Results — ${total} matching records`} logs={logs} />
                        : <p style={{ color: 'var(--ink-soft)', marginTop: '0.5rem' }}>Run a query to see results.</p>
                    }
                </section>
            </section>
        </>
    );
}
