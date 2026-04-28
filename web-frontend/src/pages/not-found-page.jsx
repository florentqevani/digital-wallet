import { Link } from 'react-router-dom';

export default function NotFoundPage() {
    return (
        <main className="not-found">
            <h1>404</h1>
            <p>The page you requested does not exist.</p>
            <Link to="/">Return home</Link>
        </main>
    );
}
