import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/use-auth';
import { getClients, adminTopUp } from '../lib/api';

function formatAmount(n) {
    return Number(n).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

export default function TopUpPage() {
    const { token } = useAuth();
    const [clients, setClients] = useState([]);
    const [loadingClients, setLoadingClients] = useState(true);
    const [clientsError, setClientsError] = useState('');
    const [clientId, setClientId] = useState('');
    const [amount, setAmount] = useState('');
    const [note, setNote] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);

    useEffect(() => {
        setLoadingClients(true);
        getClients(token)
            .then((res) => setClients(res.clients || []))
            .catch((err) => setClientsError(err.message))
            .finally(() => setLoadingClients(false));
    }, [token]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setResult(null);
        const amt = parseFloat(amount);
        if (!clientId) return setResult({ success: false, message: 'Select a client.' });
        if (Number.isNaN(amt) || amt <= 0) return setResult({ success: false, message: 'Enter a valid positive amount.' });
        setLoading(true);
        try {
            const res = await adminTopUp(token, { client_id: clientId, amount: amt, note });
            setResult(res);
            if (res.success) { setAmount(''); setNote(''); }
        } catch (err) {
            setResult({ success: false, message: err.message });
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Top-Up</h2>
                <p>Credit a client wallet balance directly without a matching debit.</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    <span className="section-eyebrow">Admin Action</span>
                    <h3>Top-Up Client Wallet</h3>
                    <p style={{ marginBottom: '0.9rem' }}>Select a client and enter the amount to credit.</p>
                    {clientsError && <p className="error-text">{clientsError}</p>}
                    {loadingClients ? <p>Loading clients…</p> : (
                        <form onSubmit={handleSubmit} style={{ display: 'grid', gap: '0.7rem', maxWidth: '420px' }}>
                            <label>
                                Client
                                <select value={clientId} onChange={(e) => setClientId(e.target.value)} required>
                                    <option value="">— select client —</option>
                                    {clients.map((c) => (
                                        <option key={c.id} value={c.id}>{c.name || c.email} ({c.email})</option>
                                    ))}
                                </select>
                            </label>
                            <label>
                                Amount (ALL)
                                <input type="number" min="0.01" step="0.01" placeholder="0.00" value={amount} onChange={(e) => setAmount(e.target.value)} required />
                            </label>
                            <label>
                                Note <span style={{ fontWeight: 400, fontSize: '0.8rem' }}>(optional)</span>
                                <input type="text" placeholder="e.g. Monthly credit" value={note} onChange={(e) => setNote(e.target.value)} maxLength={200} />
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
                    )}
                </section>
            </section>
        </>
    );
}
