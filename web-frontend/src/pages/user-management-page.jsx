import { useEffect, useState } from 'react';
import { getClients, getUsers } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

export default function UserManagementPage() {
    const { token, role } = useAuth();
    const isSuperAdmin = role === 'superadmin';
    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');

    const superAdminCount = users.filter((u) => u.role === 'superadmin').length;
    const standardUserCount = users.filter((u) => u.role !== 'superadmin').length;

    useEffect(() => {
        let active = true;
        async function load() {
            setLoading(true);
            setError('');
            try {
                if (isSuperAdmin) {
                    const [usersRes, clientsRes] = await Promise.all([getUsers(token), getClients(token)]);
                    if (active) { setUsers(usersRes.users || []); setClients(clientsRes.clients || []); }
                } else {
                    const clientsRes = await getClients(token);
                    if (active) setClients(clientsRes.clients || []);
                }
            } catch (err) {
                if (active) setError(err.message);
            } finally {
                if (active) setLoading(false);
            }
        }
        load();
        return () => { active = false; };
    }, [token]);

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Identity Overview</h2>
                <p>{isSuperAdmin ? 'Manage internal operators and customer accounts from a single control surface.' : 'Manage client accounts registered through the mobile app.'}</p>
            </section>
            <section className="content-grid single-column">
                <section className="panel compact-panel">
                    <div className="section-heading-row">
                        <div>
                            <span className="section-eyebrow">Access Overview</span>
                            <h3>Account Footprint</h3>
                        </div>
                        <p>Live totals across internal and client-facing identities.</p>
                    </div>
                    {error && <p className="error-text">{error}</p>}
                    {loading ? <p>Loading…</p> : (
                        <div className="admin-overview-grid">
                            {isSuperAdmin && (
                                <>
                                    <article className="overview-tile">
                                        <span className="overview-label">Backoffice Users</span>
                                        <strong>{users.length}</strong>
                                        <p>All internal operator accounts.</p>
                                    </article>
                                    <article className="overview-tile">
                                        <span className="overview-label">Super Admins</span>
                                        <strong>{superAdminCount}</strong>
                                        <p>Highest-privilege backoffice users.</p>
                                    </article>
                                    <article className="overview-tile">
                                        <span className="overview-label">Standard Users</span>
                                        <strong>{standardUserCount}</strong>
                                        <p>Operational users with regular access.</p>
                                    </article>
                                </>
                            )}
                            <article className="overview-tile overview-tile-accent">
                                <span className="overview-label">Client Accounts</span>
                                <strong>{clients.length}</strong>
                                <p>Accounts registered through the client flow.</p>
                            </article>
                        </div>
                    )}
                </section>
            </section>
        </>
    );
}
