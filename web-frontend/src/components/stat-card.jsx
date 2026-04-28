export default function StatCard({ label, value, tone = 'default' }) {
    return (
        <article className={`stat-card stat-card-${tone}`}>
            <p>{label}</p>
            <strong>{value}</strong>
        </article>
    );
}
