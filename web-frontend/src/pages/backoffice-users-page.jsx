import { useEffect, useState } from 'react';
import { getUsers, registerUserRequest, updateUserRequest, deleteUserRequest } from '../lib/api';
import { useAuth } from '../hooks/use-auth';

function formatDate(timestamp) {
    if (!timestamp) return '-';
    const date = new Date(Number(timestamp));
    return Number.isNaN(date.getTime()) ? '-' : date.toLocaleString();
}

export default function BackofficeUsersPage() {
    const { token } = useAuth();
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');
    const [editingUserId, setEditingUserId] = useState('');
    const [editForm, setEditForm] = useState({ name: '', email: '', role: 'user', password: '' });
    const [form, setForm] = useState({ name: '', email: '', password: '', role: 'user' });

    const load = async () => {
        setLoading(true);
        setError('');
        try {
            const res = await getUsers(token);
            setUsers(res.users || []);
        } catch (err) {
            setError(err.message);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { load(); }, [token]);

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
            if (!response.success) throw new Error(response.message || 'Failed to register user');
            setSuccess('User registered successfully.');
            setForm({ name: '', email: '', password: '', role: 'user' });
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const startEdit = (user) => {
        setEditingUserId(user.id);
        setEditForm({ name: user.name || '', email: user.email || '', role: user.role || 'user', password: '' });
        setError('');
        setSuccess('');
    };

    const cancelEdit = () => setEditingUserId('');

    const saveEdit = async (userId) => {
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await updateUserRequest(token, userId, editForm);
            if (!response.success) throw new Error(response.message || 'Failed to update user');
            setSuccess('User updated successfully.');
            setEditingUserId('');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const removeUser = async (userId, email) => {
        if (!globalThis.confirm(`Delete user ${email}? This action cannot be undone.`)) return;
        setSaving(true);
        setError('');
        setSuccess('');
        try {
            const response = await deleteUserRequest(token, userId);
            if (!response.success) throw new Error(response.message || 'Failed to delete user');
            setSuccess('User deleted successfully.');
            if (editingUserId === userId) setEditingUserId('');
            await load();
        } catch (err) {
            setError(err.message);
        } finally {
            setSaving(false);
        }
    };

    const superAdminCount = users.filter((u) => u.role === 'superadmin').length;

    return (
        <>
            <section className="page-intro dashboard-intro">
                <h2>Backoffice Users</h2>
                <p>Manage internal operator accounts and their access levels.</p>
            </section>
            <section className="content-grid dashboard-grid">
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
                    {loading ? <p>Loading users...</p> : (
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
                                    {users.length === 0 && <tr><td colSpan={6}>No users found.</td></tr>}
                                    {users.map((user) => (
                                        <tr key={user.id}>
                                            <td data-label="Name">
                                                {editingUserId === user.id
                                                    ? <input value={editForm.name} onChange={(e) => setEditForm((c) => ({ ...c, name: e.target.value }))} placeholder="Name" />
                                                    : (user.name || '-')}
                                            </td>
                                            <td data-label="Email">
                                                {editingUserId === user.id
                                                    ? <input type="email" value={editForm.email} onChange={(e) => setEditForm((c) => ({ ...c, email: e.target.value }))} placeholder="Email" />
                                                    : user.email}
                                            </td>
                                            <td data-label="Role">
                                                {editingUserId === user.id
                                                    ? (
                                                        <select value={editForm.role} onChange={(e) => setEditForm((c) => ({ ...c, role: e.target.value }))}>
                                                            <option value="user">User</option>
                                                            <option value="superadmin">Super Admin</option>
                                                        </select>
                                                    )
                                                    : <span className="status-pill">{user.role}</span>}
                                            </td>
                                            <td data-label="Password">
                                                {editingUserId === user.id
                                                    ? <input type="password" value={editForm.password} onChange={(e) => setEditForm((c) => ({ ...c, password: e.target.value }))} placeholder="New password (optional)" />
                                                    : '********'}
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
            </section>
        </>
    );
}
