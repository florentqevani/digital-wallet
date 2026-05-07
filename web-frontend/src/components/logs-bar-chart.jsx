import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts';

function buildDailyData(clientLogs, userLogs, days = 14) {
    const buckets = {};
    const now = Date.now();

    for (let i = days - 1; i >= 0; i--) {
        const d = new Date(now - i * 86400000);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        buckets[key] = { day: key, client: 0, user: 0 };
    }

    const cutoff = now - days * 86400000;

    for (const log of clientLogs) {
        const ts = Number(log.timestamp);
        if (ts < cutoff) continue;
        const d = new Date(ts);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (buckets[key]) buckets[key].client += 1;
    }

    for (const log of userLogs) {
        const ts = Number(log.timestamp);
        if (ts < cutoff) continue;
        const d = new Date(ts);
        const key = `${d.getMonth() + 1}/${d.getDate()}`;
        if (buckets[key]) buckets[key].user += 1;
    }

    return Object.values(buckets);
}

export default function LogsBarChart({ clientLogs = [], userLogs = [] }) {
    const data = buildDailyData(clientLogs, userLogs, 14);

    return (
        <section className="panel compact-panel logs-chart-panel">
            <h3>Logs per Day</h3>
            <p className="chart-subtitle">Activity over the last 14 days</p>
            <div className="chart-wrapper">
                <ResponsiveContainer width="100%" height={280}>
                    <LineChart data={data} margin={{ top: 8, right: 12, left: 0, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="var(--line)" vertical={false} />
                        <XAxis
                            dataKey="day"
                            tick={{ fontSize: 11, fill: 'var(--ink-soft)' }}
                            axisLine={{ stroke: 'var(--line)' }}
                            tickLine={false}
                        />
                        <YAxis
                            allowDecimals={false}
                            tick={{ fontSize: 11, fill: 'var(--ink-soft)' }}
                            axisLine={false}
                            tickLine={false}
                            width={28}
                        />
                        <Tooltip
                            contentStyle={{
                                background: 'var(--bg-elevated)',
                                border: '1px solid var(--line)',
                                borderRadius: '8px',
                                fontSize: '0.82rem',
                                boxShadow: 'var(--shadow-card)',
                            }}
                            cursor={{ stroke: 'var(--line)', strokeWidth: 1 }}
                        />
                        <Legend
                            wrapperStyle={{ fontSize: '0.8rem', paddingTop: '8px' }}
                            formatter={(value) => value === 'client' ? 'Client Logs' : 'User Logs'}
                        />
                        <Line type="monotone" dataKey="client" name="client" stroke="var(--accent)" strokeWidth={2} dot={{ r: 3, fill: 'var(--accent)' }} activeDot={{ r: 5 }} />
                        <Line type="monotone" dataKey="user" name="user" stroke="var(--success)" strokeWidth={2} dot={{ r: 3, fill: 'var(--success)' }} activeDot={{ r: 5 }} />
                    </LineChart>
                </ResponsiveContainer>
            </div>
        </section>
    );
}
