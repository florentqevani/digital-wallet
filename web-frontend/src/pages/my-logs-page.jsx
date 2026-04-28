import { useEffect, useState } from 'react';
import TopNav from '../components/top-nav';
import LogsTable from '../components/logs-table';
import { getMyLogs } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

export default function MyLogsPage() {
    const { token } = useAuth();
    const [page, setPage] = useState(1);
    const [data, setData] = useState({ logs: [], total: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    useEffect(() => {
        let active = true;

        async function load() {
            setLoading(true);
            setError('');

            try {
                const response = await getMyLogs(token, page, 20);

                if (active) {
                    setData({ logs: response.logs || [], total: response.total || 0 });
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

        load();

        return () => {
            active = false;
        };
    }, [token, page]);

    const totalPages = Math.max(1, Math.ceil(data.total / 20));

    return (
        <main className="page-shell">
            <TopNav />
            <section className="page-intro">
                <h2>Activity Timeline</h2>
                <p>Review your own login and operational events with pagination and status context.</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel">
                    <h3>My Audit Trail</h3>
                    <p>Track your own actions across the platform.</p>
                    {error && <p className="error-text">{error}</p>}
                    {loading ? <p>Loading logs...</p> : <LogsTable title="Recent Activity" logs={data.logs} />}
                    <div className="pager">
                        <button type="button" onClick={() => setPage((current) => Math.max(1, current - 1))} disabled={page === 1 || loading}>
                            Previous
                        </button>
                        <span>Page {page} of {totalPages}</span>
                        <button type="button" onClick={() => setPage((current) => Math.min(totalPages, current + 1))} disabled={page === totalPages || loading}>
                            Next
                        </button>
                    </div>
                </section>
            </section>
        </main>
    );
}
