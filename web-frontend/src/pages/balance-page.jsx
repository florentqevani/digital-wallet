import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { getClients, getPaymentBalance } from '../lib/api';

function formatAmount(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function BalancePage() {
    const { token } = useAuth();
    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [clientsError, setClientsError] = useState('');
    const [clientId, setClientId] = useState('');
    const [balanceInfo, setBalanceInfo] = useState(null);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        setLoadingClients(true);
        getClients(token)
            .then((res) => setClients(res.clients || []))
            .catch((err) => setClientsError(err.message))
            .finally(() => setLoadingClients(false));
    }, [token]);

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
        <>
            <section className="page-intro dashboard-intro">
                <h2>Balance</h2>
                <p>Check the current wallet balance for any registered client.</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    <span className="section-eyebrow">Wallet</span>
                    <h3>Balance Lookup</h3>
                    {clientsError && <p className="error-text">{clientsError}</p>}
                    {loadingClients ? <p>Loading clients…</p> : (
                        <form onSubmit={handleLookup} style={{ display: 'grid', gap: '0.7rem', maxWidth: '420px' }}>
                            <label>
                                Client
                                <select value={clientId} onChange={(e) => { setClientId(e.target.value); setBalanceInfo(null); setError(''); }} required>
                                    <option value="">— select client —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
                                    ))}
                                </select>
                            </label>
                            <button type="submit" disabled={loading || !clientId} style={{ justifySelf: 'start' }}>
                                {loading ? 'Fetching…' : 'Check Balance'}
                            </button>
                            {error && <p className="error-text" style={{ margin: 0 }}>✗ {error}</p>}
                            {balanceInfo && (
                                <div style={{ marginTop: '0.2rem', padding: '0.72rem 0.88rem', borderRadius: '10px', background: 'linear-gradient(180deg, #f3f8ff 0%, #ebf3ff 100%)', border: '1px solid #b9d0f5' }}>
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
                    )}
                </section>
            </section>
        </>
    );
}
