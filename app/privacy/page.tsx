"use client";

export default function PrivacyPage() {
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;600;700;900&family=IM+Fell+English:ital@0;1&display=swap');
        *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
      `}</style>

      <main
        style={{
          minHeight: "100vh",
          backgroundColor: "#f0deb4",
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='400' height='400'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3CfeColorMatrix type='saturate' values='0'/%3E%3C/filter%3E%3Crect width='400' height='400' filter='url(%23noise)' opacity='0.07'/%3E%3C/svg%3E")`,
          padding: "48px 24px 80px",
        }}
      >
        <div style={{ maxWidth: "780px", margin: "0 auto" }}>

          {/* ── Back link ── */}
          <a
            href="/"
            style={{
              display: "inline-block",
              fontFamily: "'Cinzel', serif",
              fontSize: "10px",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              color: "#8b6d38",
              textDecoration: "none",
              marginBottom: "32px",
              borderBottom: "1px solid #c9a96e",
              paddingBottom: "2px",
            }}
          >
            ← Return to Roster
          </a>

          {/* ── Page header ── */}
          <div
            style={{
              background: "rgba(253,246,227,0.85)",
              border: "2px solid #c9a96e",
              padding: "36px 40px",
              marginBottom: "40px",
              position: "relative",
              boxShadow: "inset 0 0 40px rgba(139,109,56,0.07), 0 4px 16px rgba(0,0,0,0.07)",
            }}
          >
            <div style={{
              position: "absolute", inset: "8px",
              border: "1px solid rgba(201,169,110,0.3)",
              pointerEvents: "none",
            }} />
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.5em", color: "#c9a96e", textAlign: "center", marginBottom: "12px" }}>
              ✦ ✦ ✦
            </p>
            <h1 style={{
              fontFamily: "'Cinzel', serif",
              fontSize: "clamp(20px, 4vw, 32px)",
              fontWeight: 900,
              color: "#2c1810",
              textAlign: "center",
              textTransform: "uppercase",
              letterSpacing: "0.07em",
              marginBottom: "10px",
            }}>
              Privacy Policy &amp; Terms of Service
            </h1>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "14px", color: "#8b6d38", textAlign: "center" }}>
              Grand Army Officer Roster — Allied Nations Directory
            </p>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.5em", color: "#c9a96e", textAlign: "center", marginTop: "12px" }}>
              ✦ ✦ ✦
            </p>
          </div>

          {/* Effective date */}
          <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "13px", color: "#8b6d38", marginBottom: "40px", textAlign: "center" }}>
            Effective Date: {new Date().toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" })}
          </p>

          {/* ══ PRIVACY POLICY ══ */}
          <Section title="Privacy Policy">
            <SubSection number="1." heading="Information We Collect">
              <p>
                When you sign in using Google OAuth authentication, we receive your <strong>email address</strong> and
                basic Google profile information from Google's authentication service. This is provided solely to
                verify your identity and grant appropriate access. We do not collect passwords, payment information,
                or any personal data beyond what Google provides during sign-in. Visitors who browse without signing
                in provide no personal information whatsoever.
              </p>
            </SubSection>

            <SubSection number="2." heading="How We Use Your Data">
              <p>
                Your email address is used exclusively to determine whether you are an authorised administrator.
                Only a designated admin email is granted write access to add, edit, or remove officer records.
                All other visitors receive read-only access to the public directory.
              </p>
              <p style={{ marginTop: "10px" }}>
                We do not sell, share, rent, or transmit your personal information to any third parties. Your
                data is never used for advertising, marketing, or any purpose beyond the authentication and
                access control described above.
              </p>
            </SubSection>

            <SubSection number="3." heading="Data Security and Storage">
              <p>
                Authentication is handled entirely by <strong>Supabase</strong> and <strong>Google OAuth 2.0</strong>,
                both of which implement industry-standard security protocols including encrypted data transmission
                (HTTPS/TLS) and secure session token management. We do not store your Google credentials or
                access tokens on our own servers.
              </p>
              <p style={{ marginTop: "10px" }}>
                Officer records are stored in a Supabase PostgreSQL database secured with Row Level Security (RLS)
                policies, ensuring only authenticated administrators may modify data while the roster remains
                publicly readable. If you wish to have your data removed, sign out at any time or contact the
                site administrator directly.
              </p>
            </SubSection>
          </Section>

          {/* Divider */}
          <div style={{ textAlign: "center", margin: "48px 0", color: "#c9a96e", letterSpacing: "0.6em", fontSize: "13px", fontFamily: "'Cinzel', serif" }}>
            ✦ ✦ ✦ ✦ ✦
          </div>

          {/* ══ TERMS OF SERVICE ══ */}
          <Section title="Terms of Service">
            <SubSection number="1." heading="Acceptance of Terms">
              <p>
                By accessing or using the Grand Army Officer Roster ("the Service"), you agree to be bound by
                these Terms of Service. If you do not agree to these terms, please do not use the Service.
                Your continued use following any updates constitutes your acceptance of those changes.
              </p>
            </SubSection>

            <SubSection number="2." heading="User Conduct and Directory Content">
              <p>
                This directory is intended solely for the display of fictional early 19th century military
                officer records for educational and demonstration purposes. All records are fictional and any
                resemblance to real persons is coincidental.
              </p>
              <p style={{ marginTop: "10px" }}>
                Authorised administrators are responsible for ensuring all submitted content is appropriate,
                fictitious, and consistent with the intended purpose of the application. You agree not to
                submit content that is unlawful, defamatory, harassing, or that infringes upon the rights
                of any third party.
              </p>
            </SubSection>

            <SubSection number="3." heading="Limitation of Liability">
              <p>
                This Service is provided on an "as is" and "as available" basis for educational purposes.
                The administrator makes no warranties, expressed or implied, regarding the accuracy,
                reliability, or availability of the Service. In no event shall the administrator be liable
                for any indirect, incidental, or consequential damages arising from your use of or inability
                to use the Service.
              </p>
            </SubSection>

            <SubSection number="4." heading="Modifications">
              <p>
                The administrator reserves the right to modify, suspend, or discontinue the Service at any
                time without prior notice. These Terms of Service may also be updated at any time. The
                effective date at the top of this document reflects the most recent revision. It is your
                responsibility to review these terms periodically for any changes.
              </p>
            </SubSection>
          </Section>

          {/* Footer */}
          <div style={{ textAlign: "center", marginTop: "56px" }}>
            <p style={{ fontFamily: "'Cinzel', serif", fontSize: "11px", letterSpacing: "0.5em", color: "#c9a96e", marginBottom: "8px" }}>✦ ✦ ✦</p>
            <p style={{ fontFamily: "'IM Fell English', serif", fontStyle: "italic", fontSize: "13px", color: "#8b6d38", letterSpacing: "0.05em" }}>
              By Order of the Allied General Staff
            </p>
          </div>

        </div>
      </main>
    </>
  );
}

// ── Sub-components ─────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ marginBottom: "40px" }}>
      <h2 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: "15px",
        fontWeight: 700,
        color: "#2c1810",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        borderBottom: "2px solid #c9a96e",
        paddingBottom: "8px",
        marginBottom: "28px",
      }}>
        {title}
      </h2>
      <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
        {children}
      </div>
    </section>
  );
}

function SubSection({ number, heading, children }: {
  number: string;
  heading: string;
  children: React.ReactNode;
}) {
  return (
    <div style={{
      background: "rgba(253,246,227,0.65)",
      border: "1px solid rgba(201,169,110,0.35)",
      padding: "20px 24px",
    }}>
      <h3 style={{
        fontFamily: "'Cinzel', serif",
        fontSize: "11px",
        fontWeight: 700,
        color: "#2c1810",
        textTransform: "uppercase",
        letterSpacing: "0.1em",
        marginBottom: "12px",
        display: "flex",
        gap: "8px",
        alignItems: "baseline",
      }}>
        <span style={{ color: "#c9a96e" }}>{number}</span>
        {heading}
      </h3>
      <div style={{
        fontFamily: "'IM Fell English', serif",
        fontSize: "14.5px",
        lineHeight: "1.85",
        color: "#3d2b1f",
      }}>
        {children}
      </div>
    </div>
  );
}