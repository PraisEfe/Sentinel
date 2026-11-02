import { Link } from "react-router-dom";
import Brand from "../common/Brand";

const updated = "2 November 2026";

const documents = {
  privacy: {
    eyebrow: "Legal",
    title: "Privacy Policy",
    intro:
      "This policy explains what Sentinel collects, why we collect it, and the choices available to you when you use the Sentinel public-web intelligence service.",
    sections: [
      {
        title: "Information we collect",
        body: [
          "Account information such as your name, email address, locale and timezone. If you sign in with Google or Microsoft, we receive the account identifier, name and verified email address supplied by that provider.",
          "Workspace content such as the monitors, search queries, saved searches and notification preferences you create. Passwords are stored only as one-way hashes, and social sign-in does not give us your provider password.",
          "Technical information needed to operate the service, including session tokens, device and browser information, push subscription endpoints and basic request logs.",
        ],
      },
      {
        title: "Public-web content",
        body: [
          "Sentinel monitors publicly available information from news, websites, blogs, forums and public social sources. We do not access private messages, private accounts or content that is not publicly available.",
          "Mentions are retained for the period described in your workspace plan and configured retention window. Duplicate and near-duplicate mentions are grouped to keep results useful.",
        ],
      },
      {
        title: "How we use information",
        body: [
          "To create and secure your account, provide workspaces and monitoring, deliver alerts and digests, respond to support requests, and improve the reliability of the service.",
          "We do not sell personal information. We do not use your data for advertising. We may share information with service providers that help us host and operate Sentinel, where they are bound to protect it.",
        ],
      },
      {
        title: "Cookies and local storage",
        body: [
          "Sentinel uses browser storage to keep you signed in and to remember device-level preferences. You can clear this storage in your browser, which signs you out of the service.",
        ],
      },
      {
        title: "Third-party sign-in",
        body: [
          "When you choose Google or Microsoft sign-in, the provider authenticates you and shares the basic profile information needed to create or link your Sentinel account. Your use of that provider is governed by its own privacy policy.",
        ],
      },
      {
        title: "Security and retention",
        body: [
          "We use access controls, tenant isolation and encrypted transport to protect information. No service can guarantee absolute security.",
          "Account information is retained while your account is active and for a reasonable period afterwards where needed for security, legal or operational purposes. Public-web mentions are removed according to the retention window.",
        ],
      },
      {
        title: "Your choices",
        body: [
          "You can update your account details, change notification settings, remove push subscriptions and request deletion of your account through your workspace administrator or by contacting us.",
        ],
      },
      {
        title: "Contact",
        body: [
          "Questions about this policy can be sent to privacy@sentinel.africa.",
        ],
      },
    ],
  },
  terms: {
    eyebrow: "Legal",
    title: "Terms of Service",
    intro:
      "These terms govern your use of Sentinel. By creating an account or using the service, you agree to them.",
    sections: [
      {
        title: "Accounts and workspaces",
        body: [
          "You must provide accurate account information and keep your credentials secure. You are responsible for activity under your account and for the members you invite to a workspace.",
          "Workspace access is managed by your organisation. Owners and administrators may change roles, remove members or restrict access.",
        ],
      },
      {
        title: "Acceptable use",
        body: [
          "Use Sentinel only for lawful research, monitoring and public-interest intelligence. Do not use the service to harass, stalk, discriminate, infringe rights, distribute malware or attempt to gain unauthorised access.",
          "Do not place unreasonable load on the service, circumvent rate limits, scrape the platform, or resell access without permission.",
        ],
      },
      {
        title: "Public-web content",
        body: [
          "Sentinel indexes and summarises publicly available content. We do not control that content and do not guarantee that it is accurate, complete or current.",
          "You are responsible for how you use and share monitored content, including compliance with copyright, defamation, data-protection and other applicable laws.",
        ],
      },
      {
        title: "Service availability",
        body: [
          "Sentinel is provided on an as-available basis. Discovery timing depends on the cadence and availability of public sources, so we cannot guarantee that a mention will be found at a particular time.",
          "We may change, suspend or discontinue features, and we may perform maintenance that temporarily interrupts the service.",
        ],
      },
      {
        title: "Intellectual property",
        body: [
          "Sentinel and its software, design and documentation remain the property of their respective owners. You retain ownership of the content you submit, and grant us the limited rights needed to operate the service for you.",
        ],
      },
      {
        title: "Disclaimers and liability",
        body: [
          "The service is provided without warranties to the extent permitted by law. We are not liable for indirect or consequential loss, or for decisions made in reliance on monitored content.",
          "Nothing in these terms limits liability that cannot lawfully be limited.",
        ],
      },
      {
        title: "Termination",
        body: [
          "We may suspend or terminate access where these terms are materially breached or where required for security or legal reasons. You may stop using the service at any time.",
        ],
      },
      {
        title: "Changes and contact",
        body: [
          "We may update these terms and will post the revised version on this page. Continued use after an update means you accept the revised terms.",
          "Questions can be sent to support@sentinel.africa.",
        ],
      },
    ],
  },
};

export default function LegalView({ kind }) {
  const document = documents[kind] ?? documents.privacy;

  return (
    <div className="legal-page">
      <header className="legal-header">
        <Link to="/" className="landing-brand" aria-label="Sentinel home">
          <Brand />
        </Link>
        <Link to="/signin" className="landing-link">
          Sign in
        </Link>
      </header>
      <main className="legal-shell">
        <span className="eyebrow">{document.eyebrow}</span>
        <h1>{document.title}</h1>
        <p className="legal-updated">Last updated: {updated}</p>
        <p className="legal-intro">{document.intro}</p>
        {document.sections.map((section) => (
          <section key={section.title} className="legal-section">
            <h2>{section.title}</h2>
            {section.body.map((paragraph) => (
              <p key={paragraph}>{paragraph}</p>
            ))}
          </section>
        ))}
      </main>
      <footer className="landing-footer">
        <span>© {new Date().getFullYear()} Sentinel Intelligence</span>
        <nav aria-label="Legal">
          <Link to="/privacy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/">Home</Link>
        </nav>
      </footer>
    </div>
  );
}
