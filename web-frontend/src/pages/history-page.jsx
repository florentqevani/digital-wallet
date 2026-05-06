import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { getClients, getTransactionHistory } from '../lib/api';

function formatDate(ms) {
    if (!ms) return '—';
    const d = new Date(Number(ms));
    return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString();
}

function formatAmount(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function TxTypePill({ type }) {
    const isTopup = type === 'TOPUP';
    return (
        <span className="status-pill" style={{ background: isTopup ? '#e4f8ef' : '#eef3fb', color: isTopup ? '#0c7f55' : '#2d4d8b', fontWeight: 700 }}>
            {isTopup ? '↑ TOP-UP' : '⇄ TRANSFER'}
        </span>
    );
}

const PAGE_SIZE = 20;

export default function HistoryPage() {
    const { token } = useAuth();
    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [clientsError, setClientsError] = useState('');
    const [clientId, setClientId] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

    useEffect(() => {
        setLoadingClients(true);
        getClients(token)
            .then((res) => setClients(res.clients || []))
            .catch((err) => setClientsError(err.message))
            .finally(() => setLoadingClients(false));
    }, [token]);

    const clientMap = useMemo(() => {
        const m = {};
        clients.forEach((c) => { m[c.id] = c.name || c.email; });
        return m;
    }, [clients]);

    const load = async (targetPage = 1) => {
        setError('');
        setLoading(true);
        setSearched(true);
        try {
            const offset = (targetPage - 1) * PAGE_SIZE;
            const res = await getTransactionHistory(token, clientId || undefined, PAGE_SIZE, offset);
            setTransactions(res.transactions || []);
            setTotal(res.total || 0);
            setPage(targetPage);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Transaction History</h2>
                <p>Browse the full ledger of wallet transfers and admin top-ups, optionally filtered by client.</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    <span className="section-eyebrow">Ledger</span>
                    <h3>All Transactions</h3>
                    {clientsError && <p className="error-text">{clientsError}</p>}
                    <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                        <label style={{ flex: '0 0 280px', margin: 0 }}>
                            <span style={{ display: 'block', marginBottom: '0.3rem' }}>Filter by client</span>
                            <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSearched(false); setTransactions([]); setTotal(0); }} disabled={loadingClients}>
                                <option value="">— all clients —</option>
                                {clients.map((c) => (
                                    <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
                                ))}
                            </select>
                        </label>
                        <button type="button" onClick={() => load(1)} disabled={loading || loadingClients} style={{ alignSelf: 'flex-end' }}>
                            {loading ? 'Loading…' : 'Load'}
                        </button>
                        {searched && !loading && (
                            <button type="button" className="button-muted" onClick={() => load(page)} style={{ alignSelf: 'flex-end' }}>
                                ↻ Refresh
                            </button>
                        )}
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    {searched && (
                        <>
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Type</th>
                                            <th>From</th>
                                            <th>To</th>
                                            <th>Amount</th>
                                            <th>Note</th>
                                            <th>Status</th>
                                            <th>Date</th>
                                            <th>Tx ID</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {loading ? (
                                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>Loading…</td></tr>
                                        ) : transactions.length === 0 ? (
                                            <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem' }}>No transactions found.</td></tr>
                                        ) : (
                                            transactions.map((tx) => (
                                                <tr key={tx.id}>
                                                    <td><TxTypePill type={tx.type} /></td>
                                                    <td style={{ color: 'var(--ink-soft)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem' }}>
                                                        {tx.type === 'TOPUP'
                                                            ? <span className="status-pill" style={{ background: '#fff3e0', color: '#8a4200' }}>Admin</span>
                                                            : <span title={tx.from_client_id}>{clientMap[tx.from_client_id] || (tx.from_client_id?.slice(0, 8) + '…')}</span>}
                                                    </td>
                                                    <td style={{ fontWeight: 600 }}>
                                                        <span title={tx.to_client_id}>{clientMap[tx.to_client_id] || (tx.to_client_id?.slice(0, 8) + '…')}</span>
                                                    </td>
                                                    <td>
                                                        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>{formatAmount(tx.amount)}</span>
                                                        <span style={{ marginLeft: '0.25rem', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>{tx.currency}</span>
                                                    </td>
                                                    <td style={{ color: 'var(--ink-soft)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{tx.note || '—'}</td>
                                                    <td><span className={`status-pill ${tx.status === 'COMPLETED' ? 'status-success' : 'status-error'}`}>{tx.status}</span></td>
                                                    <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{formatDate(tx.created_at)}</td>
                                                    <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--ink-soft)' }} title={tx.id}>{tx.id?.slice(0, 8)}…</td>
                                                </tr>
                                            ))
                                        )}
                                    </tbody>
                                </table>
                            </div>
                            <div className="pager">
                                <button type="button" className="button-muted" onClick={() => load(page - 1)} disabled={page <= 1 || loading}>← Prev</button>
                                <span>Page {page} of {Math.max(1, totalPages)} — {total} record{total !== 1 ? 's' : ''}</span>
                                <button type="button" className="button-muted" onClick={() => load(page + 1)} disabled={page >= totalPages || loading}>Next →</button>
                            </div>
                        </>
                    )}
                </section>
            </section>
        </>
    );
}
