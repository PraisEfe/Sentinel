import { Link } from "react-router-dom";
import { Activity, ArrowRight, BellRing, Globe, Layers3 } from "lucide-react";
import Brand from "../common/Brand";

const features = [
  {
    icon: Globe,
    title: "Public-web discovery",
    body: "Search news, websites, blogs, forums and public social conversations from one workspace.",
  },
  {
    icon: BellRing,
    title: "Monitors and alerts",
    body: "Track the people, offices, organisations and topics that matter, with prioritised alerts.",
  },
  {
    icon: Layers3,
    title: "Clustered intelligence",
    body: "Deduplicated stories, summaries, sentiment and analytics help you see the signal clearly.",
  },
];

export default function LandingView() {
  return (
    <div className="landing">
      <header className="landing-header">
        <Link to="/" className="landing-brand" aria-label="Sentinel home">
          <Brand />
        </Link>
        <nav className="landing-nav" aria-label="Account">
          <Link to="/signin" className="landing-link">
            Sign in
          </Link>
          <Link to="/signup" className="landing-button">
            Create an account
          </Link>
        </nav>
      </header>

      <main>
        <section className="landing-hero">
          <span className="landing-badge">
            <Activity size={14} aria-hidden="true" />
            Continuous public-web discovery
          </span>
          <h1>Know what&apos;s being said. Understand what matters.</h1>
          <p>
            Search, organise and monitor relevant public information across
            news, websites, social discussions, blogs and forums — then act on
            the signals that matter to your office.
          </p>
          <div className="landing-actions">
            <Link to="/signup" className="landing-button landing-button-large">
              Create an account
              <ArrowRight size={16} aria-hidden="true" />
            </Link>
            <Link
              to="/signin"
              className="landing-link landing-link-large"
            >
              Sign in to your workspace
            </Link>
          </div>
          <div className="landing-signals" aria-hidden="true">
            <div>
              <strong>Public sources</strong>
              <span>News, web, social, blogs and forums</span>
            </div>
            <div>
              <strong>Live monitoring</strong>
              <span>Scheduled scans with prioritised alerts</span>
            </div>
            <div>
              <strong>Clear intelligence</strong>
              <span>Clusters, summaries and sentiment</span>
            </div>
          </div>
        </section>

        <section className="landing-features" aria-label="What Sentinel does">
          {features.map(({ icon: Icon, title, body }) => (
            <article key={title} className="landing-card">
              <span className="landing-card-icon">
                <Icon size={20} aria-hidden="true" />
              </span>
              <h2>{title}</h2>
              <p>{body}</p>
            </article>
          ))}
        </section>
      </main>

      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Sentinel Intelligence</span>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/signin">Sign in</Link>
        </nav>
      </footer>
    </div>
  );
}
