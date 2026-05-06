import { useEffect, useMemo, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import {
    getClients,
    adminTopUp,
    getPaymentBalance,
    getTransactionHistory,
} from '../lib/api';

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
        <span
            className="status-pill"
            style={{
                background: isTopup ? '#e4f8ef' : '#eef3fb',
                color: isTopup ? '#0c7f55' : '#2d4d8b',
                fontWeight: 700,
            }}
        >
            {isTopup ? '↑ TOP-UP' : '⇄ TRANSFER'}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Top-Up Panel
// ─────────────────────────────────────────────────────────────────────────────

function TopUpPanel({ token, clients, onSuccess }) {
    const [clientId, setClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResult(null);
        const amt = parseFloat(amount);
        if (!clientId) return setResult({ success: false, message: 'Select a client.' });
        if (isNaN(amt) || amt <= 0) return setResult({ success: false, message: 'Enter a valid positive amount.' });

        setLoading(true);
        try {
            const res = await adminTopUp(token, { client_id: clientId, amount: amt, note });
            setResult(res);
            if (res.success) {
                setAmount('');
                setNote('');
                onSuccess?.();
            }
        } catch (err) {
            setResult({ success: false, message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel compact-panel">
            <p className="section-eyebrow">Admin Action</p>
            <h3>Top-Up Client Wallet</h3>
            <p style={{ marginBottom: '0.9rem' }}>Credit a client's balance directly.</p>

            <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.7rem' }}>
                <label>
                    Client
                    <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                        <option value="">— select client —</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name || c.email} ({c.email})
                            </option>
                        ))}
                    </select>
                </label>

                <label>
                    Amount (ALL)
                    <input
                        type="number"
                        min="0.01"
                        step="0.01"
                        placeholder="0.00"
                        value={amount}
                        onChange={(e) => setAmount(e.target.value)}
                        required
                    />
                </label>

                <label>
                    Note <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span>
                    <input
                        type="text"
                        placeholder="e.g. Monthly credit"
                        value={note}
                        onChange={(e) => setNote(e.target.value)}
                        maxLength={200}
                    />
                </label>

                <button type="submit" disabled={loading} style={{ justifySelf: 'start' }}>
                    {loading ? 'Processing…' : 'Apply Top-Up'}
                </button>

                {result && (
                    <p className={result.success ? 'success-text' : 'error-text'} style={{ margin: 0 }}>
                        {result.success
                            ? `✓ ${result.message} New balance: ${formatAmount(result.new_balance)} ALL`
                            : `✗ ${result.message}`}
                    </p>
                )}
            </form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Balance Lookup Panel
// ─────────────────────────────────────────────────────────────────────────────

function BalanceLookupPanel({ token, clients }) {
    const [clientId, setClientId] = useState('');
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const handleLookup = async (e) => {
        e.preventDefault();
        if (!clientId) return;
        setError('');
        setBalanceInfo(null);
        setLoading(true);
        try {
            const res = await getPaymentBalance(token, clientId);
            if (res.success) {
                setBalanceInfo(res);
            } else {
                setError(res.message || 'Not found');
            }
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="panel compact-panel">
            <p className="section-eyebrow">Wallet</p>
            <h3>Balance Lookup</h3>
            <p style={{ marginBottom: '0.9rem' }}>Check the current wallet balance for any client.</p>

            <form onSubmit={handleLookup} style={{ display: 'grid', gap: '0.7rem' }}>
                <label>
                    Client
                    <select value={clientId} onChange={(e) => { setClientId(e.target.value); setBalanceInfo(null); setError(''); }} required>
                        <option value="">— select client —</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name || c.email} ({c.email})
                            </option>
                        ))}
                    </select>
                </label>

                <button type="submit" disabled={loading || !clientId} style={{ justifySelf: 'start' }}>
                    {loading ? 'Fetching…' : 'Check Balance'}
                </button>

                {error && <p className="error-text" style={{ margin: 0 }}>✗ {error}</p>}

                {balanceInfo && (
                    <div style={{
                        marginTop: '0.2rem',
                        padding: '0.72rem 0.88rem',
                        borderRadius: '10px',
                        background: 'linear-gradient(180deg, #f3f8ff 0%, #ebf3ff 100%)',
                        border: '1px solid #b9d0f5',
                    }}>
                        <p style={{ margin: 0, fontSize: '0.78rem', color: 'var(--ink-soft)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                            Available Balance
                        </p>
                        <strong style={{ fontSize: '1.7rem', fontFamily: "'JetBrains Mono', monospace", color: 'var(--ink)' }}>
                            {formatAmount(balanceInfo.balance)}
                        </strong>
                        <span style={{ marginLeft: '0.4rem', fontSize: '0.88rem', color: 'var(--ink-soft)', fontWeight: 700 }}>
                            {balanceInfo.currency || 'ALL'}
                        </span>
                    </div>
                )}
            </form>
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Transaction History Panel
// ─────────────────────────────────────────────────────────────────────────────

const PAGE_SIZE = 20;

function HistoryPanel({ token, clients, refreshSignal }) {
    const [clientId, setClientId] = useState('');
    const [transactions, setTransactions] = useState([]);
    const [total, setTotal] = useState(0);
    const [page, setPage] = useState(1);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [searched, setSearched] = useState(false);

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

    // Re-fetch on top-up success
    useEffect(() => {
        if (refreshSignal > 0 && searched) load(page);
    }, [refreshSignal]);

    const totalPages = Math.ceil(total / PAGE_SIZE);

    return (
        <div className="panel compact-panel" style={{ gridColumn: '1 / -1' }}>
            <div className="section-heading-row" style={{ marginBottom: '0.8rem' }}>
                <div>
                    <p className="section-eyebrow">Ledger</p>
                    <h3>Transaction History</h3>
                </div>
            </div>

            <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'flex-end', marginBottom: '0.8rem', flexWrap: 'wrap' }}>
                <label style={{ flex: '0 0 280px' }}>
                    Filter by client
                    <select value={clientId} onChange={(e) => { setClientId(e.target.value); setSearched(false); setTransactions([]); setTotal(0); }}>
                        <option value="">— all clients —</option>
                        {clients.map((c) => (
                            <option key={c.id} value={c.id}>
                                {c.name || c.email} ({c.email})
                            </option>
                        ))}
                    </select>
                </label>
                <button type="button" onClick={() => load(1)} disabled={loading} style={{ padding: '0.52rem 0.9rem', alignSelf: 'flex-end' }}>
                    {loading ? 'Loading…' : 'Load'}
                </button>
                {searched && !loading && (
                    <button type="button" className="button-muted" onClick={() => load(page)} style={{ padding: '0.52rem 0.7rem', alignSelf: 'flex-end' }}>
                        ↻ Refresh
                    </button>
                )}
            </div>

            {error && <p className="error-text" style={{ marginBottom: '0.6rem' }}>✗ {error}</p>}

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
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-soft)' }}>Loading…</td></tr>
                                ) : transactions.length === 0 ? (
                                    <tr><td colSpan={8} style={{ textAlign: 'center', padding: '2rem', color: 'var(--ink-soft)' }}>No transactions found.</td></tr>
                                ) : (
                                    transactions.map((tx) => (
                                        <tr key={tx.id}>
                                            <td><TxTypePill type={tx.type} /></td>
                                            <td style={{ color: 'var(--ink-soft)', fontFamily: "'JetBrains Mono', monospace", fontSize: '0.76rem' }}>
                                                {tx.type === 'TOPUP' ? (
                                                    <span className="status-pill" style={{ background: '#fff3e0', color: '#8a4200' }}>Admin</span>
                                                ) : (
                                                    <span title={tx.from_client_id}>
                                                        {clientMap[tx.from_client_id] || tx.from_client_id?.slice(0, 8) + '…'}
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                <span title={tx.to_client_id}>
                                                    {clientMap[tx.to_client_id] || tx.to_client_id?.slice(0, 8) + '…'}
                                                </span>
                                            </td>
                                            <td>
                                                <span style={{ fontFamily: "'JetBrains Mono', monospace", fontWeight: 700 }}>
                                                    {formatAmount(tx.amount)}
                                                </span>
                                                <span style={{ marginLeft: '0.25rem', fontSize: '0.72rem', color: 'var(--ink-soft)' }}>{tx.currency}</span>
                                            </td>
                                            <td style={{ color: 'var(--ink-soft)', maxWidth: '160px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                                {tx.note || '—'}
                                            </td>
                                            <td>
                                                <span className={`status-pill ${tx.status === 'COMPLETED' ? 'status-success' : 'status-error'}`}>
                                                    {tx.status}
                                                </span>
                                            </td>
                                            <td style={{ color: 'var(--ink-soft)', whiteSpace: 'nowrap' }}>{formatDate(tx.created_at)}</td>
                                            <td style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.7rem', color: 'var(--ink-soft)' }} title={tx.id}>
                                                {tx.id?.slice(0, 8)}…
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>

                    <div className="pager">
                        <button type="button" className="button-muted" onClick={() => load(page - 1)} disabled={page <= 1 || loading} style={{ padding: '0.38rem 0.7rem', fontSize: '0.82rem' }}>
                            ← Prev
                        </button>
                        <span>Page {page} of {Math.max(1, totalPages)} — {total} record{total !== 1 ? 's' : ''}</span>
                        <button type="button" className="button-muted" onClick={() => load(page + 1)} disabled={page >= totalPages || loading} style={{ padding: '0.38rem 0.7rem', fontSize: '0.82rem' }}>
                            Next →
                        </button>
                    </div>
                </>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────

export default function PaymentsPage() {
    const { token } = useAuth();
    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [clientsError, setClientsError] = useState('');
    const [refreshSignal, setRefreshSignal] = useState(0);

    useEffect(() => {
        setLoadingClients(true);
        getClients(token)
            .then((res) => setClients(res.clients || []))
            .catch((err) => setClientsError(err.message))
            .finally(() => setLoadingClients(false));
    }, [token]);

    const handleTopUpSuccess = () => setRefreshSignal((s) => s + 1);

    return (
        <main className="page-shell">
            <TopNav />

            <section className="page-intro dashboard-intro">
                <h2>Payments</h2>
                <p>Manage client wallets — top-up balances, inspect balances, and review the full transaction ledger.</p>
            </section>

            {clientsError && (
                <p className="error-text" style={{ marginBottom: '0.7rem' }}>
                    Could not load clients: {clientsError}
                </p>
            )}

            {/* Top row: two action panels */}
            <div className="content-grid" style={{ marginBottom: '0.8rem' }}>
                {loadingClients ? (
                    <div className="panel compact-panel" style={{ gridColumn: '1 / -1', textAlign: 'center', color: 'var(--ink-soft)', padding: '2rem' }}>
                        Loading clients…
                    </div>
                ) : (
                    <>
                        <TopUpPanel token={token} clients={clients} onSuccess={handleTopUpSuccess} />
                        <BalanceLookupPanel token={token} clients={clients} />
                    </>
                )}
            </div>

            {/* Full-width transaction history */}
            <div className="content-grid">
                {!loadingClients && (
                    <HistoryPanel token={token} clients={clients} refreshSignal={refreshSignal} />
                )}
            </div>
        </main>
    );
}
