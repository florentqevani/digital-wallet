import { useEffect, useState } from 'react';
import {
    deleteClientRequest,
    deleteUserRequest,
    getClients,
    getUsers,
    registerUserRequest,
    updateClientRequest,
    updateUserRequest,
} from '../lib/api';
import { useAuth } from '../hooks/use-auth';

function formatDate(timestamp) {
    if (!timestamp) {
        return '-';
    }

    const date = new Date(Number(timestamp));
    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString();
}

export default function UserManagementPage() {
    const { token, role } = useAuth();
    const isSuperAdmin = role === 'superadmin';

    const [users, setUsers] = useState([]);
    const [clients, setClients] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUserId, setEditingUserId] = useState('');
    const [editingClientId, setEditingClientId] = useState('');
    const [editForm, setEditForm] = useState({
        name: '',
        email: '',
        role: 'user',
        password: '',
    });
    const [clientEditForm, setClientEditForm] = useState({
        name: '',
        email: '',
    });
    const [form, setForm] = useState({
        name: '',
        email: '',
        password: '',
        role: 'user',
    });

    const superAdminCount = users.filter((user) => user.role === 'superadmin').length;
    const standardUserCount = users.filter((user) => user.role !== 'superadmin').length;

    const loadUsers = async () => {
        setLoading(true);
        setError('');

        try {
            if (isSuperAdmin) {
                const [usersResponse, clientsResponse] = await Promise.all([
                    getUsers(token),
                    getClients(token),
                ]);
                setUsers(usersResponse.users || []);
                setClients(clientsResponse.clients || []);
            } else {
                const clientsResponse = await getClients(token);
                setClients(clientsResponse.clients || []);
            }
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadUsers();
    }, [token]);

    const onFormChange = (event) => {
        const { name, value } = event.target;
        setForm((current) => ({ ...current, [name]: value }));
    };

    const onSubmit = async (event) => {
        event.preventDefault();
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await registerUserRequest(token, form);
            if (!response.success) {
                throw new Error(response.message || 'Failed to register user');
            }

            setSuccess('User registered successfully.');
            setForm({
                name: '',
                email: '',
                password: '',
                role: 'user',
            });
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (user) => {
        setEditingUserId(user.id);
        setEditForm({
            name: user.name || '',
            email: user.email || '',
            role: user.role || 'user',
            password: '',
        });
        setError('');
        setSuccess('');
    };

    const cancelEdit = () => {
        setEditingUserId('');
    };

    const startClientEdit = (client) => {
        setEditingClientId(client.id);
        setClientEditForm({
            name: client.name || '',
            email: client.email || '',
        });
        setError('');
        setSuccess('');
    };

    const cancelClientEdit = () => {
        setEditingClientId('');
    };

    const saveEdit = async (userId) => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await updateUserRequest(token, userId, editForm);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update user');
            }

            setSuccess('User updated successfully.');
            setEditingUserId('');
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const removeUser = async (userId, email) => {
        const shouldDelete = globalThis.confirm(`Delete user ${email}? This action cannot be undone.`);
        if (!shouldDelete) {
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await deleteUserRequest(token, userId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete user');
            }

            setSuccess('User deleted successfully.');
            if (editingUserId === userId) {
                setEditingUserId('');
            }
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const saveClientEdit = async (clientId) => {
        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await updateClientRequest(token, clientId, clientEditForm);
            if (!response.success) {
                throw new Error(response.message || 'Failed to update client');
            }

            setSuccess('Client updated successfully.');
            setEditingClientId('');
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    const removeClient = async (clientId, email) => {
        const shouldDelete = globalThis.confirm(`Delete client ${email}? This action cannot be undone.`);
        if (!shouldDelete) {
            return;
        }

        setSaving(true);
        setError('');
        setSuccess('');

        try {
            const response = await deleteClientRequest(token, clientId);
            if (!response.success) {
                throw new Error(response.message || 'Failed to delete client');
            }

            setSuccess('Client deleted successfully.');
            if (editingClientId === clientId) {
                setEditingClientId('');
            }
            await loadUsers();
        } catch (requestError) {
            setError(requestError.message);
        } finally {
            setSaving(false);
        }
    };

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Identity Administration</h2>
                <p>{isSuperAdmin ? 'Manage internal operators and customer accounts from a single control surface.' : 'Manage client accounts registered through the mobile app.'}</p>
            </section>
            <section className="content-grid dashboard-grid">
                <section className="panel compact-panel admin-overview-panel user-table-panel">
                    <div className="section-heading-row">
                        <div>
                            <span className="section-eyebrow">Access Overview</span>
                            <h3>Account Footprint</h3>
                        </div>
                        <p>Live totals across internal and client-facing identities.</p>
                    </div>
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
                </section>

                {isSuperAdmin ? (
                    <section className="panel compact-panel">
                        <div className="section-heading-row">
                            <div>
                                <span className="section-eyebrow">Provisioning</span>
                                <h3>Register Backoffice User</h3>
                            </div>
                            <p>Create a new internal operator and assign the correct access level.</p>
                        </div>
                        <form className="filters-grid" onSubmit={onSubmit}>
                            <label>
                                <span>Name</span>
                                <input name="name" value={form.name} onChange={onFormChange} placeholder="Jane Doe" required />
                            </label>
                            <label>
                                <span>Email</span>
                                <input name="email" type="email" value={form.email} onChange={onFormChange} placeholder="jane@example.com" required />
                            </label>
                            <label>
                                <span>Password</span>
                                <input name="password" type="password" value={form.password} onChange={onFormChange} placeholder="Temporary password" minLength={6} required />
                            </label>
                            <label>
                                <span>Role</span>
                                <select name="role" value={form.role} onChange={onFormChange}>
                                    <option value="user">User</option>
                                    <option value="superadmin">Super Admin</option>
                                </select>
                            </label>
                            <button type="submit" disabled={saving}>{saving ? 'Creating...' : 'Register User'}</button>
                        </form>
                        {error && <p className="error-text">{error}</p>}
                        {success && <p className="success-text">{success}</p>}
                    </section>
                ) : null}

                {isSuperAdmin ? (
                    <section className="panel compact-panel user-table-panel">
                        <div className="section-heading-row">
                            <div>
                                <span className="section-eyebrow">Internal Accounts</span>
                                <h3>User Directory</h3>
                            </div>
                            <div className="section-meta-pills">
                                <span className="status-pill">{users.length} total</span>
                                <span className="status-pill">{superAdminCount} super admins</span>
                            </div>
                        </div>
                        <p>Update internal access, correct account details, or remove obsolete users.</p>
                        {loading ? (
                            <p>Loading users...</p>
                        ) : (
                            <div className="table-wrapper">
                                <table>
                                    <thead>
                                        <tr>
                                            <th>Name</th>
                                            <th>Email</th>
                                            <th>Role</th>
                                            <th>Password</th>
                                            <th>Created At</th>
                                            <th>Actions</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {users.length === 0 && (
                                            <tr>
                                                <td colSpan={6}>No users found.</td>
                                            </tr>
                                        )}
                                        {users.map((user) => (
                                            <tr key={user.id}>
                                                <td data-label="Name">
                                                    {editingUserId === user.id ? (
                                                        <input
                                                            value={editForm.name}
                                                            onChange={(event) => setEditForm((current) => ({ ...current, name: event.target.value }))}
                                                            placeholder="Name"
                                                        />
                                                    ) : (user.name || '-')}
                                                </td>
                                                <td data-label="Email">
                                                    {editingUserId === user.id ? (
                                                        <input
                                                            type="email"
                                                            value={editForm.email}
                                                            onChange={(event) => setEditForm((current) => ({ ...current, email: event.target.value }))}
                                                            placeholder="Email"
                                                        />
                                                    ) : user.email}
                                                </td>
                                                <td data-label="Role">
                                                    {editingUserId === user.id ? (
                                                        <select
                                                            value={editForm.role}
                                                            onChange={(event) => setEditForm((current) => ({ ...current, role: event.target.value }))}
                                                        >
                                                            <option value="user">User</option>
                                                            <option value="superadmin">Super Admin</option>
                                                        </select>
                                                    ) : (
                                                        <span className="status-pill">{user.role}</span>
                                                    )}
                                                </td>
                                                <td data-label="Password">
                                                    {editingUserId === user.id ? (
                                                        <input
                                                            type="password"
                                                            value={editForm.password}
                                                            onChange={(event) => setEditForm((current) => ({ ...current, password: event.target.value }))}
                                                            placeholder="Password"
                                                        />
                                                    ) : '********'}
                                                </td>
                                                <td data-label="Created At">{formatDate(user.created_at)}</td>
                                                <td data-label="Actions">
                                                    <div className="row-actions">
                                                        {editingUserId === user.id ? (
                                                            <>
                                                                <button type="button" onClick={() => saveEdit(user.id)} disabled={saving}>Save</button>
                                                                <button type="button" className="button-muted" onClick={cancelEdit} disabled={saving}>Cancel</button>
                                                            </>
                                                        ) : (
                                                            <>
                                                                <button type="button" className="button-muted" onClick={() => startEdit(user)} disabled={saving}>Edit</button>
                                                                <button type="button" className="button-danger" onClick={() => removeUser(user.id, user.email)} disabled={saving}>Delete</button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </section>
                ) : null}

                <section className="panel compact-panel user-table-panel">
                    <div className="section-heading-row">
                        <div>
                            <span className="section-eyebrow">External Accounts</span>
                            <h3>Client Directory</h3>
                        </div>
                        <div className="section-meta-pills">
                            <span className="status-pill">{clients.length} total</span>
                        </div>
                    </div>
                    <p>Review customer accounts created through the client registration flow.</p>
                    {!isSuperAdmin && error && <p className="error-text">{error}</p>}
                    {!isSuperAdmin && success && <p className="success-text">{success}</p>}
                    {loading ? (
                        <p>Loading clients...</p>
                    ) : (
                        <div className="table-wrapper">
                            <table>
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Email</th>
                                        <th>Created At</th>
                                        <th>Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {clients.length === 0 && (
                                        <tr>
                                            <td colSpan={4}>No clients found.</td>
                                        </tr>
                                    )}
                                    {clients.map((client) => (
                                        <tr key={client.id}>
                                            <td data-label="Name">
                                                {editingClientId === client.id ? (
                                                    <input
                                                        value={clientEditForm.name}
                                                        onChange={(event) => setClientEditForm((current) => ({ ...current, name: event.target.value }))}
                                                        placeholder="Name"
                                                    />
                                                ) : (client.name || '-')}
                                            </td>
                                            <td data-label="Email">
                                                {editingClientId === client.id ? (
                                                    <input
                                                        type="email"
                                                        value={clientEditForm.email}
                                                        onChange={(event) => setClientEditForm((current) => ({ ...current, email: event.target.value }))}
                                                        placeholder="Email"
                                                    />
                                                ) : client.email}
                                            </td>
                                            <td data-label="Created At">{formatDate(client.created_at)}</td>
                                            <td data-label="Actions">
                                                <div className="row-actions">
                                                    {editingClientId === client.id ? (
                                                        <>
                                                            <button type="button" onClick={() => saveClientEdit(client.id)} disabled={saving}>Save</button>
                                                            <button type="button" className="button-muted" onClick={cancelClientEdit} disabled={saving}>Cancel</button>
                                                        </>
                                                    ) : (
                                                        <>
                                                            <button type="button" className="button-muted" onClick={() => startClientEdit(client)} disabled={saving}>Edit</button>
                                                            <button type="button" className="button-danger" onClick={() => removeClient(client.id, client.email)} disabled={saving}>Delete</button>
                                                        </>
                                                    )}
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </section>
            </section>
        </>
    );
}
