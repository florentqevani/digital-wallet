import { useEffect, useMemo, useState } from 'react';
import TopNav from '../components/top-nav';
import { getAccounts, addCurrency, setBalance } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(Number(timestamp));
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

function Badge({ text }) {
    if (!text) return <span className="status-pill" style={{ opacity: 0.45 }}>none</span>;
    return (
        <span
            className="status-pill"
            style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: '0.72rem', letterSpacing: '0.01em' }}
            title={text}
        >
            {text.slice(0, 8)}…
        </span>
    );
}

export default function AccountsPage() {
    const { token } = useAuth();

    const [accounts, setAccounts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [query, setQuery] = useState('');
    const [currencySelections, setCurrencySelections] = useState({});
    const [settingIds, setSettingIds] = useState(new Set());
    const [currencyResults, setCurrencyResults] = useState({});
    const [balanceInputs, setBalanceInputs] = useState({});
    const [settingBalanceIds, setSettingBalanceIds] = useState(new Set());
    const [balanceResults, setBalanceResults] = useState({});

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getAccounts(token);
            const clients = res.clients || [];
            setAccounts(clients);
            const initial = {};
            const initialBalances = {};
            clients.forEach((c) => {
                initial[c.id] = c.currency || 'ALL';
                initialBalances[c.id] = c.balance != null ? String(c.balance) : '0';
            });
            setCurrencySelections(initial);
            setBalanceInputs(initialBalances);
            setCurrencyResults({});
            setBalanceResults({});
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [token]);

    const filtered = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return accounts;
        return accounts.filter(
            (a) =>
                (a.email || '').toLowerCase().includes(q) ||
                (a.name || '').toLowerCase().includes(q) ||
                (a.id || '').toLowerCase().includes(q),
        );
    }, [accounts, query]);

    const withAccountId = accounts.filter((a) => a.account_id).length;
    const withCurrency = accounts.filter((a) => a.currency && a.currency !== '').length;

    const handleSetCurrency = async (clientId) => {
        setSettingIds((prev) => new Set(prev).add(clientId));
        setCurrencyResults((prev) => ({ ...prev, [clientId]: null }));
        try {
            const res = await addCurrency(token, clientId, 'ALL');
            setCurrencyResults((prev) => ({ ...prev, [clientId]: { success: res.success, message: res.message } }));
            if (res.success) {
                setAccounts((prev) => prev.map((a) => a.id === clientId ? { ...a, currency: 'ALL' } : a));
            }
        } catch (err) {
            setCurrencyResults((prev) => ({ ...prev, [clientId]: { success: false, message: err.message } }));
        } finally {
            setSettingIds((prev) => { const s = new Set(prev); s.delete(clientId); return s; });
        }
    };

    const handleSetBalance = async (clientId) => {
        const amount = parseFloat(balanceInputs[clientId]);
        if (isNaN(amount) || amount < 0) return;
        setSettingBalanceIds((prev) => new Set(prev).add(clientId));
        setBalanceResults((prev) => ({ ...prev, [clientId]: null }));
        try {
            const res = await setBalance(token, clientId, amount);
            setBalanceResults((prev) => ({ ...prev, [clientId]: { success: res.success, message: res.message } }));
            if (res.success) {
                setAccounts((prev) => prev.map((a) => a.id === clientId ? { ...a, balance: amount } : a));
            }
        } catch (err) {
            setBalanceResults((prev) => ({ ...prev, [clientId]: { success: false, message: err.message } }));
        } finally {
            setSettingBalanceIds((prev) => { const s = new Set(prev); s.delete(clientId); return s; });
        }
    };

    return (
        <main className="page-shell">
            <TopNav />

            <section className="page-intro dashboard-intro">
                <h2>Accounts</h2>
                <p>Browse and search all registered client accounts.</p>
            </section>

            {/* Stats row */}
            <div className="stats-row" style={{ marginBottom: '0.8rem' }}>
                <article className="stat-card">
                    <p>Total Accounts</p>
                    <strong>{loading ? '—' : accounts.length}</strong>
                </article>
                <article className="stat-card stat-card-success">
                    <p>With Account ID</p>
                    <strong>{loading ? '—' : withAccountId}</strong>
                </article>
                <article className="stat-card">
                    <p>With Currency</p>
                    <strong>{loading ? '—' : withCurrency}</strong>
                </article>
            </div>

            <section className="panel compact-panel" style={{ gridColumn: '1 / -1' }}>
                {/* Search bar */}
                <div style={{ display: 'flex', gap: '0.6rem', alignItems: 'center', marginBottom: '0.8rem' }}>
                    <div style={{ position: 'relative', flex: 1, maxWidth: '420px' }}>
                        <span style={{
                            position: 'absolute', left: '0.6rem', top: '50%', transform: 'translateY(-50%)',
                            color: 'var(--ink-soft)', pointerEvents: 'none', fontSize: '0.95rem',
                        }}>⌕</span>
                        <input
                            type="search"
                            placeholder="Search by name, email or ID…"
                            value={query}
                            onChange={(e) => setQuery(e.target.value)}
                            style={{ paddingLeft: '1.8rem' }}
                        />
                    </div>
                    {query && (
                        <button
                            type="button"
                            className="button-muted"
                            onClick={() => setQuery('')}
                            style={{ padding: '0.52rem 0.72rem', fontSize: '0.84rem' }}
                        >
                            Clear
                        </button>
                    )}
                    <button
                        type="button"
                        className="button-muted"
                        onClick={load}
                        disabled={loading}
                        style={{ marginLeft: 'auto', padding: '0.52rem 0.72rem', fontSize: '0.84rem' }}
                    >
                        {loading ? 'Loading…' : '↻ Refresh'}
                    </button>
                </div>

                {error && <p className="error-text" style={{ marginBottom: '0.6rem' }}>{error}</p>}

                <div className="table-wrapper">
                    <table>
                        <thead>
                            <tr>
                                <th>Name</th>
                                <th>Email</th>
                                <th>Account ID</th>
                                <th>Client ID</th>
                                <th>Currency</th>
                                <th>Balance (ALL)</th>
                                <th>Registered</th>
                            </tr>
                        </thead>
                        <tbody>
                            {loading ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '2rem' }}>
                                        Loading accounts…
                                    </td>
                                </tr>
                            ) : filtered.length === 0 ? (
                                <tr>
                                    <td colSpan={7} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '2rem' }}>
                                        {query ? 'No accounts match your search.' : 'No accounts found.'}
                                    </td>
                                </tr>
                            ) : (
                                filtered.map((account) => (
                                    <tr key={account.id}>
                                        <td style={{ fontWeight: 600 }}>{account.name || <span style={{ color: 'var(--ink-soft)' }}>—</span>}</td>
                                        <td>{account.email}</td>
                                        <td><Badge text={account.account_id} /></td>
                                        <td>
                                            <span
                                                style={{
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.72rem',
                                                    color: 'var(--ink-soft)',
                                                }}
                                                title={account.id}
                                            >
                                                {account.id ? account.id.slice(0, 8) + '…' : '—'}
                                            </span>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <span style={{
                                                    fontFamily: "'JetBrains Mono', monospace",
                                                    fontSize: '0.78rem',
                                                    fontWeight: 600,
                                                    padding: '0.2rem 0.5rem',
                                                    background: 'var(--surface-raised, #f0f0f0)',
                                                    borderRadius: '4px',
                                                }}>ALL</span>
                                                {currencyResults[account.id] && (
                                                    <span style={{ fontSize: '0.72rem', color: currencyResults[account.id].success ? 'var(--green)' : 'var(--red)' }}>
                                                        {currencyResults[account.id].success ? '✓' : '✗'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td>
                                            <div style={{ display: 'flex', gap: '0.4rem', alignItems: 'center' }}>
                                                <input
                                                    type="number"
                                                    min="0"
                                                    step="0.01"
                                                    value={balanceInputs[account.id] ?? '0'}
                                                    onChange={(e) => setBalanceInputs((prev) => ({ ...prev, [account.id]: e.target.value }))}
                                                    disabled={settingBalanceIds.has(account.id)}
                                                    style={{ fontSize: '0.8rem', padding: '0.25rem 0.4rem', width: '100px' }}
                                                />
                                                <button
                                                    type="button"
                                                    className="button-muted"
                                                    onClick={() => handleSetBalance(account.id)}
                                                    disabled={settingBalanceIds.has(account.id)}
                                                    style={{ fontSize: '0.75rem', padding: '0.25rem 0.5rem' }}
                                                >
                                                    {settingBalanceIds.has(account.id) ? '…' : 'Set'}
                                                </button>
                                                {balanceResults[account.id] && (
                                                    <span style={{ fontSize: '0.72rem', color: balanceResults[account.id].success ? 'var(--green)' : 'var(--red)' }}>
                                                        {balanceResults[account.id].success ? '✓' : '✗'}
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                        <td style={{ color: 'var(--ink-soft)' }}>{formatDate(account.created_at)}</td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {!loading && filtered.length > 0 && (
                    <p style={{ marginTop: '0.6rem', fontSize: '0.82rem', color: 'var(--ink-soft)' }}>
                        {filtered.length} of {accounts.length} account{accounts.length !== 1 ? 's' : ''}
                        {query ? ` matching "${query}"` : ''}
                    </p>
                )}
            </section>
        </main>
    );
}
