import Image from "next/image";

export default function Home() {
  return (
    <div>
      <div className="bg-glow"></div>

      <header className="topbar">
        <div className="brand">
          <span className="brand-mark">⛁</span>
          <span className="brand-name">SimpleStorage</span>
        </div>
        <button id="connectButton" className="btn btn-ghost btn-connect">
          <span className="dot"></span>
          <span className="btn-connect-label">Connecter le wallet</span>
        </button>
      </header>

      <main className="container">
        <section className="hero">
          <h1>Stockage on-chain</h1>
          <p>
            Enregistrez un nombre sur la blockchain et relisez-le à tout moment.
          </p>
        </section>

        <section className="balance-card">
          <span className="balance-label">Valeur enregistrée</span>
          <div className="balance-amount">
            <span id="theNumber">—</span>
          </div>
          <button id="getNumber" className="btn btn-secondary btn-inline" disabled>
            Lire la valeur
          </button>
        </section>

        <section className="card card-single">
          <div className="card-head">
            <span className="card-icon store">✎</span>
            <div>
              <h2>Définir la valeur</h2>
              <p>Écrivez un nouveau nombre dans le contrat</p>
            </div>
          </div>
          <div className="field">
            <input
              type="number"
              id="inputNumber"
              placeholder="Votre nombre..."
            />
          </div>
          <button id="setNumber" className="btn btn-primary" disabled>
            Enregistrer le nombre
          </button>
        </section>
      </main>

      <div id="toast" className="toast" role="status" aria-live="polite"></div>
    </div>
  );
}
