function formatTimestamp(value) {
    if (!value) {
        return '-';
    }

    const date = new Date(Number(value));

    if (Number.isNaN(date.getTime())) {
        return '-';
    }

    return date.toLocaleString();
}

export default function LogsTable({ logs, title, className = '' }) {
    return (
        <section className={`panel ${className}`.trim()}>
            <h3>{title}</h3>
            <div className="table-wrapper">
                <table>
                    <thead>
                        <tr>
                            <th>Time</th>
                            <th>Actor Type</th>
                            <th>Actor ID</th>
                            <th>Action</th>
                            <th>Status</th>
                            <th>Message</th>
                        </tr>
                    </thead>
                    <tbody>
                        {logs.length === 0 && (
                            <tr>
                                <td colSpan={6}>No logs found.</td>
                            </tr>
                        )}
                        {logs.map((log) => (
                            <tr key={log.id || `${log.actor_id}-${log.timestamp}-${log.action}`}>
                                <td data-label="Time">{formatTimestamp(log.timestamp)}</td>
                                <td data-label="Actor Type">{log.actor_type || '-'}</td>
                                <td data-label="Actor ID">{log.actor_id || '-'}</td>
                                <td data-label="Action">{log.action || '-'}</td>
                                <td data-label="Status">
                                    <span className={`status-pill status-${String(log.status || '').toLowerCase()}`}>
                                        {log.status || '-'}
                                    </span>
                                </td>
                                <td data-label="Message">{log.message || '-'}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </section>
    );
}
