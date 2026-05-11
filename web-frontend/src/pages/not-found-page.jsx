import { Link } from "react-router-dom";

export default function NotFoundPage() {
  return (
    <main className="page-shell">
      <section className="section-card">
        <p className="top-nav-label">404</p>
        <h1>Page not found</h1>
        <p>
          The page you requested does not exist or has been moved to a new
          location.
        </p>
        <Link to="/dashboard" className="btn-primary">
          Back to dashboard
        </Link>
      </section>
    </main>
  );
}