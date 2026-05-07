import { useEffect, useState } from 'react';
import LogsTable from '../components/logs-table';
import { getAllLogs, getMyLogs } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

const LIMIT = 50;

function toDateTimeLocal(ts) {
    const d = new Date(ts);
    const p = (v) => String(v).padStart(2, '0');
    return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}T${p(d.getHours())}:${p(d.getMinutes())}`;
}

export default function UserLogsPage() {
    const { token, role } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const [logs, setLogs] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [actorType, setActorType] = useState('');
    const [actorId, setActorId] = useState('');
    const [range, setRange] = useState('24h');
    const [customFrom, setCustomFrom] = useState(() => toDateTimeLocal(new Date().setHours(0, 0, 0, 0)));
    const [customTo, setCustomTo] = useState(() => toDateTimeLocal(Date.now()));
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const buildQuery = (targetPage = 1) => {
        const now = Date.now();
        const q = { actor_type: actorType, actor_id: actorId, page: targetPage, limit: LIMIT };
        if (range === 'today') { const s = new Date(); s.setHours(0, 0, 0, 0); q.from = s.getTime(); q.to = now; }
        else if (range === '24h') { q.from = now - 86400000; q.to = now; }
        else if (range === '7d') { q.from = now - 604800000; q.to = now; }
        else if (range === 'custom') {
            if (customFrom) q.from = new Date(customFrom).getTime();
            if (customTo) q.to = new Date(customTo).getTime();
        }
        return q;
    };

    const load = async (targetPage = 1) => {
        setLoading(true);
        setError('');
        try {
            let res;
            if (isSuperAdmin) {
                res = await getAllLogs(token, buildQuery(targetPage));
            } else {
                res = await getMyLogs(token, targetPage, LIMIT);
            }
            setLogs(res.logs || []);
            setTotal(res.total || 0);
            setPage(targetPage);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(1); }, [token]);

    const totalPages = Math.max(1, Math.ceil(total / LIMIT));

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>User Logs</h2>
                <p>{isSuperAdmin ? 'Audit trail for all backoffice operator actions.' : 'Your own activity log across the platform.'}</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    {isSuperAdmin && (
                        <form className="filters-grid" onSubmit={(e) => { e.preventDefault(); load(1); }}>
                            <label>
                                <span>Actor Type</span>
                                <select value={actorType} onChange={(e) => setActorType(e.target.value)}>
                                    <option value="">All</option>
                                    <option value="user">User</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </label>
                            <label>
                                <span>Actor ID</span>
                                <input value={actorId} onChange={(e) => setActorId(e.target.value)} placeholder="email or actor id" />
                            </label>
                            <label>
                                <span>Time Range</span>
                                <select value={range} onChange={(e) => setRange(e.target.value)}>
                                    <option value="24h">Last 24 Hours</option>
                                    <option value="today">Today</option>
                                    <option value="7d">Last 7 Days</option>
                                    <option value="all">All Time</option>
                                    <option value="custom">Custom Range</option>
                                </select>
                            </label>
                            {range === 'custom' && (
                                <>
                                    <label><span>From</span><input type="datetime-local" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} /></label>
                                    <label><span>To</span><input type="datetime-local" value={customTo} onChange={(e) => setCustomTo(e.target.value)} /></label>
                                </>
                            )}
                            <button type="submit" disabled={loading}>{loading ? 'Loading…' : 'Apply'}</button>
                        </form>
                    )}
                    {error && <p className="error-text">{error}</p>}
                    <LogsTable title={isSuperAdmin ? `User Activity — ${total} records` : `My Activity — ${total} records`} logs={logs} />
                    <div className="pager">
                        <button type="button" onClick={() => load(page - 1)} disabled={page <= 1 || loading}>← Prev</button>
                        <span>Page {page} of {totalPages} — {total} total</span>
                        <button type="button" onClick={() => load(page + 1)} disabled={page >= totalPages || loading}>Next →</button>
                    </div>
                </section>
            </section>
        </>
    );
}
