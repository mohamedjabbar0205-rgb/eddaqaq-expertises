"use client";

import { useState } from "react";
import { createClient } from "../../utils/supabase/client";
import { useRouter } from "next/navigation";

const supabase = createClient();

export default function LoginPage() {
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [erreur, setErreur] = useState("");

  async function connexion(e: React.FormEvent) {
    e.preventDefault();

    setErreur("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (error) {
      console.error(error);
      setErreur("Email ou mot de passe incorrect.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <main className="loginPage">
      <div className="backgroundShape shape1" />
      <div className="backgroundShape shape2" />

      <section className="loginCard">
        <div className="logoArea">
          <img
            src="/logo-eddaqaq.png"
            alt="EDDAQAQ EXPERTISES"
          />
        </div>

        <div className="titleArea">
          <span>ESPACE PROFESSIONNEL</span>

          <h1>Bienvenue</h1>

          <p>
            Connectez-vous à votre espace
            <strong> EDDAQAQ EXPERTISES</strong>
          </p>
        </div>

        <form onSubmit={connexion}>
          <div className="field">
            <label>Adresse e-mail</label>

            <div className="inputWrapper">
              <MailIcon />

              <input
                type="email"
                placeholder="votre@email.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>
          </div>

          <div className="field">
            <label>Mot de passe</label>

            <div className="inputWrapper">
              <LockIcon />

              <input
                type="password"
                placeholder="Votre mot de passe"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete="current-password"
                required
              />
            </div>
          </div>

          {erreur && (
            <div className="errorMessage">
              <AlertIcon />
              <span>{erreur}</span>
            </div>
          )}

          <button
            className="loginButton"
            type="submit"
            disabled={loading}
          >
            {loading ? (
              "Connexion..."
            ) : (
              <>
                Se connecter
                <ArrowIcon />
              </>
            )}
          </button>
        </form>

        <div className="security">
          <ShieldIcon />

          <span>
            Accès sécurisé réservé aux utilisateurs autorisés
          </span>
        </div>

        <div className="footer">
          <strong>EDDAQAQ EXPERTISES</strong>
          <span>Audit · Management · Finance</span>
        </div>
      </section>

      <style jsx global>{`
        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
        }

        .loginPage {
          position: relative;
          min-height: 100vh;
          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: center;

          padding: 35px 20px;

          background:
            radial-gradient(
              circle at 20% 10%,
              rgba(255, 255, 255, 0.16),
              transparent 30%
            ),
            linear-gradient(
              135deg,
              #c82027 0%,
              #ef552b 42%,
              #ff813b 100%
            );
        }

        .backgroundShape {
          position: absolute;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.08);
          pointer-events: none;
        }

        .shape1 {
          width: 450px;
          height: 450px;
          top: -220px;
          right: -100px;
        }

        .shape2 {
          width: 350px;
          height: 350px;
          bottom: -180px;
          left: -120px;
        }

        .loginCard {
          position: relative;
          z-index: 2;

          width: 100%;
          max-width: 430px;

          padding: 27px 38px 28px;

          background: rgba(255, 255, 255, 0.98);

          border-radius: 22px;

          box-shadow:
            0 30px 70px rgba(87, 23, 15, 0.25),
            0 5px 15px rgba(0, 0, 0, 0.08);
        }

        .logoArea {
          display: flex;
          justify-content: center;
          margin-top: -5px;
          margin-bottom: 4px;
        }

        .logoArea img {
          width: 145px;
          height: 145px;
          object-fit: contain;
        }

        .titleArea {
          text-align: center;
          margin-bottom: 27px;
        }

        .titleArea > span {
          color: #c82027;
          font-size: 9px;
          font-weight: 800;
          letter-spacing: 1.6px;
        }

        .titleArea h1 {
          margin: 8px 0 7px;

          color: #14213d;

          font-size: 28px;
          font-weight: 800;
        }

        .titleArea p {
          margin: 0;

          color: #858b94;

          font-size: 11px;
          line-height: 1.6;
        }

        .titleArea p strong {
          color: #c82027;
        }

        form {
          display: flex;
          flex-direction: column;
          gap: 17px;
        }

        .field label {
          display: block;

          margin-bottom: 7px;

          color: #49515d;

          font-size: 10px;
          font-weight: 700;
        }

        .inputWrapper {
          position: relative;
        }

        .inputWrapper svg {
          position: absolute;

          left: 14px;
          top: 50%;

          width: 18px;
          height: 18px;

          transform: translateY(-50%);

          color: #c82027;
        }

        .inputWrapper input {
          width: 100%;
          height: 48px;

          padding: 0 14px 0 45px;

          border: 1px solid #dfe2e6;
          border-radius: 10px;

          outline: none;

          background: #fafbfc;
          color: #303844;

          font-size: 12px;

          transition: 0.2s;
        }

        .inputWrapper input:focus {
          border-color: #ff6b0b;

          background: white;

          box-shadow:
            0 0 0 4px rgba(255, 107, 11, 0.08);
        }

        .inputWrapper input::placeholder {
          color: #b0b4ba;
        }

        .errorMessage {
          min-height: 42px;

          padding: 10px 12px;

          display: flex;
          align-items: center;
          gap: 8px;

          border-radius: 9px;

          background: #fdebed;
          color: #c82027;

          font-size: 10px;
          font-weight: 700;
        }

        .errorMessage svg {
          width: 17px;
          height: 17px;
          flex-shrink: 0;
        }

        .loginButton {
          width: 100%;
          height: 49px;

          margin-top: 3px;

          border: none;
          border-radius: 10px;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 10px;

          background:
            linear-gradient(
              135deg,
              #c82027,
              #ed4b26,
              #ff6b0b
            );

          color: white;

          font-size: 11px;
          font-weight: 800;

          cursor: pointer;

          box-shadow:
            0 9px 20px rgba(200, 32, 39, 0.22);

          transition:
            transform 0.2s,
            box-shadow 0.2s;
        }

        .loginButton:hover:not(:disabled) {
          transform: translateY(-1px);

          box-shadow:
            0 12px 25px rgba(200, 32, 39, 0.28);
        }

        .loginButton:disabled {
          opacity: 0.7;
          cursor: not-allowed;
        }

        .loginButton svg {
          width: 17px;
          height: 17px;
        }

        .security {
          margin-top: 22px;

          padding-top: 17px;

          border-top: 1px solid #eeeeee;

          display: flex;
          align-items: center;
          justify-content: center;
          gap: 7px;

          color: #8c929a;

          font-size: 9px;
        }

        .security svg {
          width: 15px;
          height: 15px;

          color: #0b9d61;
        }

        .footer {
          margin-top: 21px;

          text-align: center;

          display: flex;
          flex-direction: column;
          gap: 4px;
        }

        .footer strong {
          color: #c82027;

          font-size: 9px;
          letter-spacing: 0.8px;
        }

        .footer span {
          color: #a1a5ab;

          font-size: 8px;
        }

        @media (max-width: 500px) {
          .loginPage {
            padding: 20px 15px;
          }

          .loginCard {
            padding: 24px 24px 26px;
          }

          .logoArea img {
            width: 130px;
            height: 130px;
          }
        }
      `}</style>
    </main>
  );
}

function Svg({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      {children}
    </svg>
  );
}

function MailIcon() {
  return (
    <Svg>
      <rect x="3" y="5" width="18" height="14" rx="2" />
      <path d="m3 7 9 6 9-6" />
    </Svg>
  );
}

function LockIcon() {
  return (
    <Svg>
      <rect x="4" y="10" width="16" height="11" rx="2" />
      <path d="M8 10V7a4 4 0 0 1 8 0v3" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 12h14" />
      <path d="m14 7 5 5-5 5" />
    </Svg>
  );
}

function ShieldIcon() {
  return (
    <Svg>
      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10" />
      <path d="m9 12 2 2 4-4" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5" />
      <path d="M12 17h.01" />
    </Svg>
  );
}