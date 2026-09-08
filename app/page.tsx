"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "./../utils/supabase/client";

const supabase = createClient();

type TypeDeclaration = {
  id: string;
  periodicite: string;
};

type DeclarationClient = {
  id: string;
  type_declaration_id: string;
  mois_debut: number;
  annee_debut: number;
};

type SuiviDeclaration = {
  declaration_client_id: string;
  statut: string;
};

type RecentDossier = {
  id: string;
  reference: string;
  statut: string;
  priorite: string;
  created_at: string;
  clients?: {
    nom?: string;
  } | null;
};

type RecentTask = {
  id: string;
  titre: string;
  statut: string;
  date_limite: string | null;
  responsable: string | null;
  dossiers?: {
    reference?: string;
  } | null;
};

const MONTHS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

type UserProfile = {
  nom: string | null;
  email: string | null;
  role: string | null;
  actif: boolean | null;
};

export default function HomePage() {
  const [logoutLoading, setLogoutLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);

  async function seDeconnecter() {
    setLogoutLoading(true);

    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error(error);
      alert("Erreur lors de la déconnexion.");
      setLogoutLoading(false);
      return;
    }

    window.location.href = "/login";
  }

  const [stats, setStats] = useState({
    total: 0,
    clients: 0,
    nouveaux: 0,
    enCours: 0,
    enAttente: 0,
    termines: 0,
    urgents: 0,
    declarationsMois: 0,
    declarationsAFaire: 0,
    declarationsEnCours: 0,
    declarationsDeposees: 0,
  });

  const [recentDossiers, setRecentDossiers] = useState<RecentDossier[]>([]);
  const [recentTasks, setRecentTasks] = useState<RecentTask[]>([]);

  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();

  async function chargerProfil() {
    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return;
    }

    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("nom, email, role, actif")
      .eq("id", user.id)
      .single();

    if (profileError) {
      console.error(profileError);
      return;
    }

    setUserProfile(profile as UserProfile);
  }

  async function chargerDashboard() {
    setLoading(true);

    const [
      dossiersResult,
      clientsResult,
      typesResult,
      configsResult,
      suivisResult,
      recentDossiersResult,
      recentTasksResult,
    ] = await Promise.all([
      supabase.from("dossiers").select("id, statut, priorite"),

      supabase.from("clients").select("id"),

      supabase
        .from("types_declarations")
        .select("id, periodicite")
        .eq("actif", true),

      supabase
        .from("declarations_clients")
        .select("id, type_declaration_id, mois_debut, annee_debut")
        .eq("actif", true),

      supabase
        .from("suivi_declarations")
        .select("declaration_client_id, statut")
        .eq("mois", currentMonth)
        .eq("annee", currentYear),

      supabase
        .from("dossiers")
        .select(`
          id,
          reference,
          statut,
          priorite,
          created_at,
          clients (
            nom
          )
        `)
        .order("created_at", { ascending: false })
        .limit(4),

      supabase
        .from("taches")
        .select(`
          id,
          titre,
          statut,
          date_limite,
          responsable,
          dossiers (
            reference
          )
        `)
        .order("created_at", { ascending: false })
        .limit(4),
    ]);

    const dossiers = dossiersResult.data || [];
    const clients = clientsResult.data || [];

    const types = (typesResult.data || []) as TypeDeclaration[];

    const configs =
      (configsResult.data || []) as DeclarationClient[];

    const suivis =
      (suivisResult.data || []) as SuiviDeclaration[];

    function declarationVisible(config: DeclarationClient) {
      const selected =
        currentYear * 12 + (currentMonth - 1);

      const start =
        config.annee_debut * 12 +
        (config.mois_debut - 1);

      if (selected < start) return false;

      const difference = selected - start;

      const type = types.find(
        (t) => t.id === config.type_declaration_id
      );

      if (!type) return false;

      const periodicite =
        type.periodicite?.toLowerCase() || "";

      if (periodicite.includes("mens")) return true;
      if (periodicite.includes("trim"))
        return difference % 3 === 0;
      if (periodicite.includes("ann"))
        return difference % 12 === 0;

      return true;
    }

    const declarations =
      configs.filter(declarationVisible);

    function declarationStatus(id: string) {
      return (
        suivis.find(
          (s) => s.declaration_client_id === id
        )?.statut || "À faire"
      );
    }

    setStats({
      total: dossiers.length,
      clients: clients.length,

      nouveaux: dossiers.filter(
        (d) => d.statut === "Nouveau"
      ).length,

      enCours: dossiers.filter(
        (d) => d.statut === "En cours"
      ).length,

      enAttente: dossiers.filter(
        (d) => d.statut === "En attente"
      ).length,

      termines: dossiers.filter(
        (d) => d.statut === "Terminé"
      ).length,

      urgents: dossiers.filter(
        (d) => d.priorite === "Urgente"
      ).length,

      declarationsMois: declarations.length,

      declarationsAFaire: declarations.filter(
        (d) => declarationStatus(d.id) === "À faire"
      ).length,

      declarationsEnCours: declarations.filter(
        (d) => declarationStatus(d.id) === "En cours"
      ).length,

      declarationsDeposees: declarations.filter(
        (d) => declarationStatus(d.id) === "Déposée"
      ).length,
    });

    setRecentDossiers(
      (recentDossiersResult.data || []) as unknown as RecentDossier[]
    );

    setRecentTasks(
      (recentTasksResult.data || []) as unknown as RecentTask[]
    );

    setLoading(false);
  }

  useEffect(() => {
    chargerProfil();
    chargerDashboard();
  }, []);

  return (
    <div className="app">
      {/* SIDEBAR */}

      <aside className="sidebar">
        <div className="logoArea">
          <img
            src="/logo-eddaqaq.png"
            alt="EDDAQAQ EXPERTISES"
          />
        </div>

        <nav>
          <NavItem
            href="/"
            label="Tableau de bord"
            icon={<HomeIcon />}
            active
          />

          <NavItem
            href="/dossiers"
            label="Dossiers"
            icon={<FolderIcon />}
          />

          <NavItem
            href="/taches"
            label="Tâches"
            icon={<TaskIcon />}
          />

          <NavItem
            href="/clients"
            label="Clients"
            icon={<UsersIcon />}
          />

          <NavItem
            href="/declarations"
            label="Déclarations"
            icon={<FileIcon />}
          />

          <NavItem
            href="/documents"
            label="Documents"
            icon={<DocumentIcon />}
          />

          {userProfile?.role === "Administrateur" && (
            <NavItem
              href="/utilisateurs"
              label="Utilisateurs"
              icon={<UsersIcon />}
            />
          )}
        </nav>

        <div className="sidebarSlogan">
          <strong>
            L&apos;expertise
            <br />
            au service
            <br />
            de votre réussite
          </strong>

          <div className="smallLines">
            <span />
            <span />
          </div>
        </div>

        <button
          className="logoutButton"
          onClick={seDeconnecter}
          disabled={logoutLoading}
        >
          <LogoutIcon />
          <span>{logoutLoading ? "Déconnexion..." : "Se déconnecter"}</span>
        </button>

        <div className="sidebarFooter">
          © {currentYear} EDDAQAQ EXPERTISES
          <br />
          Audit · Management · Finance
        </div>
      </aside>

      {/* MAIN */}

      <main className="main">
        {/* HERO */}

        <section className="hero">
          <div className="heroText">
            <span>Bienvenue,</span>
            <h1>{userProfile?.nom || "Utilisateur"} !</h1>

            <p>
              Gérez vos dossiers et suivez votre activité en temps réel.
            </p>
          </div>

          <div className="heroRight">
            <div className="searchBox">
              <SearchIcon />

              <input
                placeholder="Rechercher un dossier, un client..."
              />
            </div>

            <div className="userBox">
              <div className="avatar">
                {(userProfile?.nom || userProfile?.email || "U")
                  .trim()
                  .charAt(0)
                  .toUpperCase()}
              </div>

              <div>
                <strong>{userProfile?.nom || "Utilisateur"}</strong>
                <small>{userProfile?.role || "—"}</small>
              </div>
            </div>

            <div className="periodBox">
              <div className="periodIcon">
                <CalendarIcon />
              </div>

              <div>
                <span>PÉRIODE ACTUELLE</span>

                <strong>
                  {MONTHS[currentMonth - 1]}{" "}
                  {currentYear}
                </strong>
              </div>
            </div>
          </div>
        </section>

        {loading ? (
          <div className="loading">
            <div className="spinner" />
            Chargement...
          </div>
        ) : (
          <>
            {/* KPI */}

            <section className="kpis">
              <Kpi
                title="Total dossiers"
                value={stats.total}
                icon={<FolderIcon />}
              />

              <Kpi
                title="Clients"
                value={stats.clients}
                icon={<UsersIcon />}
              />

              <Kpi
                title="Dossiers en cours"
                value={stats.enCours}
                icon={<ClockIcon />}
              />

              <Kpi
                title="Dossiers urgents"
                value={stats.urgents}
                icon={<AlertIcon />}
                orange
              />
            </section>

            {/* MIDDLE */}

            <section className="middleGrid">
              {/* DOSSIERS */}

              <div className="card chartCard">
                <CardHeader
                  icon={<FolderIcon />}
                  title="Suivi des dossiers"
                  subtitle="Répartition actuelle de vos dossiers"
                  href="/dossiers"
                  button="Voir tous les dossiers"
                />

                <div className="chartContent">
                  <Donut
                    total={stats.total}
                    text="Dossiers"
                  />

                  <div className="legend">
                    <Legend
                      type="red"
                      label="Nouveaux"
                      value={stats.nouveaux}
                    />

                    <Legend
                      type="orange"
                      label="En cours"
                      value={stats.enCours}
                    />

                    <Legend
                      type="yellow"
                      label="En attente"
                      value={stats.enAttente}
                    />

                    <Legend
                      type="green"
                      label="Terminés"
                      value={stats.termines}
                    />
                  </div>
                </div>
              </div>

              {/* DECLARATIONS */}

              <div className="card chartCard">
                <CardHeader
                  icon={<FileIcon />}
                  title="Déclarations du mois"
                  subtitle={`Suivi fiscal de ${
                    MONTHS[currentMonth - 1]
                  } ${currentYear}`}
                  href="/declarations"
                  button="Gérer les déclarations"
                />

                <div className="chartContent">
                  <Donut
                    total={stats.declarationsMois}
                    text={
                      stats.declarationsMois === 1
                        ? "Déclaration"
                        : "Déclarations"
                    }
                  />

                  <div className="legend">
                    <Legend
                      type="red"
                      label="À faire"
                      value={stats.declarationsAFaire}
                    />

                    <Legend
                      type="orange"
                      label="En cours"
                      value={stats.declarationsEnCours}
                    />

                    <Legend
                      type="green"
                      label="Déposées"
                      value={stats.declarationsDeposees}
                    />
                  </div>
                </div>
              </div>

              {/* TASKS */}

              <div className="card taskCard">
                <CardHeader
                  icon={<TaskIcon />}
                  title="Tâches récentes"
                  subtitle="Dernières tâches enregistrées"
                  href="/taches"
                  button="Voir toutes"
                />

                <div className="taskList">
                  {recentTasks.length === 0 ? (
                    <div className="empty">
                      Aucune tâche enregistrée
                    </div>
                  ) : (
                    recentTasks.map((task) => (
                      <div
                        className="taskRow"
                        key={task.id}
                      >
                        <div className="taskDot" />

                        <div className="taskInfo">
                          <strong>
                            {task.titre}
                          </strong>

                          <span>
                            {task.dossiers?.reference ||
                              task.responsable ||
                              "EDDAQAQ"}
                          </span>
                        </div>

                        <small>
                          {formatDate(
                            task.date_limite
                          )}
                        </small>

                        <ArrowIcon />
                      </div>
                    ))
                  )}
                </div>
              </div>
            </section>

            {/* BOTTOM */}

            <section className="bottomGrid">
              {/* RECENT DOSSIERS */}

              <div className="card dossiersTable">
                <CardHeader
                  icon={<FolderIcon />}
                  title="Derniers dossiers"
                  subtitle="Les dossiers récemment ajoutés"
                  href="/dossiers"
                  button="Voir tous"
                />

                {recentDossiers.length === 0 ? (
                  <div className="empty">
                    Aucun dossier enregistré
                  </div>
                ) : (
                  <div className="tableWrap">
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>Client</th>
                          <th>Statut</th>
                          <th>Priorité</th>
                          <th>Date</th>
                        </tr>
                      </thead>

                      <tbody>
                        {recentDossiers.map(
                          (dossier, index) => (
                            <tr key={dossier.id}>
                              <td>{index + 1}</td>

                              <td>
                                <strong>
                                  {dossier.clients?.nom ||
                                    dossier.reference}
                                </strong>
                              </td>

                              <td>
                                <Badge
                                  text={
                                    dossier.statut ||
                                    "Nouveau"
                                  }
                                  type={
                                    dossier.statut ===
                                    "Terminé"
                                      ? "green"
                                      : dossier.statut ===
                                          "En cours"
                                        ? "orange"
                                        : "red"
                                  }
                                />
                              </td>

                              <td>
                                <Badge
                                  text={
                                    dossier.priorite ||
                                    "Normale"
                                  }
                                  type={
                                    dossier.priorite ===
                                    "Urgente"
                                      ? "red"
                                      : "gray"
                                  }
                                />
                              </td>

                              <td>
                                {formatDate(
                                  dossier.created_at
                                )}
                              </td>
                            </tr>
                          )
                        )}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* QUICK */}

              <div className="card quickCard">
                <div className="quickHeader">
                  <div className="quickMainIcon">
                    <BoltIcon />
                  </div>

                  <div>
                    <h2>Accès rapide</h2>
                    <p>
                      Accédez rapidement aux principales fonctionnalités
                    </p>
                  </div>
                </div>

                <div className="quickGrid">
                  <Quick
                    href="/dossiers"
                    icon={<PlusIcon />}
                    label="Nouveau dossier"
                  />

                  <Quick
                    href="/clients"
                    icon={<UsersIcon />}
                    label="Ajouter un client"
                  />

                  <Quick
                    href="/taches"
                    icon={<TaskIcon />}
                    label="Nouvelle tâche"
                  />

                  <Quick
                    href="/declarations"
                    icon={<FileIcon />}
                    label="Déclaration du mois"
                  />
                </div>
              </div>
            </section>

            {/* BRAND BANNER */}

            <section className="brandBanner">
              <div>
                <h2>EDDAQAQ EXPERTISES</h2>
                <span>
                  Audit · Management · Finance
                </span>

                <div className="brandLines">
                  <i />
                  <i />
                </div>
              </div>

              <blockquote>
                « Votre partenaire en matière de conseil,
                <br />
                de gestion et de croissance. »
              </blockquote>

              <div className="bannerShape">
                <span />
                <span />
              </div>
            </section>
          </>
        )}
      </main>

      <style jsx global>{`
        :root {
          --red: #c82027;
          --red-dark: #a9151c;
          --orange: #ff6b0b;
          --orange2: #ff9138;
          --green: #0b9d61;
          --yellow: #e8b000;
          --navy: #14213d;
          --text: #303844;
          --muted: #858d99;
          --bg: #f5f6f8;
          --white: #fff;
          --border: #e7e8eb;
        }

        * {
          box-sizing: border-box;
        }

        html,
        body {
          margin: 0;
          padding: 0;
          font-family: Arial, Helvetica, sans-serif;
          background: var(--bg);
          color: var(--text);
        }

        a {
          text-decoration: none;
          color: inherit;
        }

        .app {
          min-height: 100vh;
          display: flex;
        }

        /* SIDEBAR */

        .sidebar {
          position: fixed;
          left: 0;
          top: 0;
          bottom: 0;

          width: 220px;

          padding: 20px 13px;

          background:
            linear-gradient(
              160deg,
              #ffffff 0%,
              #ffffff 70%,
              #fff6f0 100%
            );

          border-right: 1px solid #eee;

          display: flex;
          flex-direction: column;

          z-index: 50;
        }

        .logoArea {
          height: 170px;

          display: flex;
          align-items: center;
          justify-content: center;

          margin-bottom: 10px;
        }

        .logoArea img {
          width: 155px;
          height: 155px;
          object-fit: contain;
          border-radius: 50%;
        }

        .sidebar nav {
          display: flex;
          flex-direction: column;
          gap: 5px;
        }

        .navItem {
          height: 50px;

          padding: 0 14px;

          display: flex;
          align-items: center;
          gap: 14px;

          border-radius: 10px;

          color: #334052;

          font-size: 13px;
          font-weight: 600;

          transition: 0.2s;
        }

        .navItem:hover {
          background: #fff3ec;
          color: var(--red);
        }

        .navItem.active {
          color: white;

          background:
            linear-gradient(
              135deg,
              #d92c2c,
              #f05024
            );

          box-shadow:
            0 8px 22px
            rgba(207, 43, 37, 0.22);
        }

        .navItem svg {
          width: 22px;
          height: 22px;
        }

        .sidebarSlogan {
          margin-top: auto;

          padding: 15px;

          color: var(--red);

          font-style: italic;
        }

        .sidebarSlogan strong {
          font-size: 14px;
          line-height: 1.25;
        }

        .smallLines {
          width: 90px;
          height: 4px;

          display: flex;

          margin-top: 14px;
        }

        .smallLines span:first-child {
          width: 55%;
          background: var(--red);
        }

        .smallLines span:last-child {
          flex: 1;
          background: var(--orange);
        }

        .logoutButton {
          width: calc(100% - 16px);
          min-height: 43px;
          margin: 0 8px 8px;
          padding: 0 12px;
          border: 1px solid #f1c7c9;
          border-radius: 9px;
          display: flex;
          align-items: center;
          gap: 10px;
          background: #fff;
          color: var(--red);
          font-size: 10px;
          font-weight: 800;
          cursor: pointer;
          transition: .2s;
        }

        .logoutButton:hover:not(:disabled) {
          background: #fdebed;
          border-color: #eaaeb1;
        }

        .logoutButton:disabled {
          opacity: .6;
          cursor: wait;
        }

        .logoutButton svg {
          width: 17px;
          height: 17px;
        }

        .sidebarFooter {
          padding: 15px;

          color: #9a9fa7;

          font-size: 8px;
          line-height: 1.8;
        }

        /* MAIN */

        .main {
          width: calc(100% - 220px);

          margin-left: 220px;

          min-height: 100vh;

          padding: 0 22px 30px;

          background:
            linear-gradient(
              180deg,
              #ef552b 0,
              #ff813b 270px,
              #f6f7f9 460px
            );
        }

        /* HERO */

        .hero {
          max-width: 1550px;

          min-height: 185px;

          margin: auto;

          padding: 26px 10px;

          display: flex;
          justify-content: space-between;
          align-items: flex-start;

          color: white;
        }

        .heroText > span {
          font-size: 20px;
        }

        .heroText h1 {
          margin: 6px 0;

          font-size: 40px;
          line-height: 1;

          letter-spacing: -1px;
        }

        .heroText p {
          margin: 10px 0 0;

          font-size: 15px;
        }

        .heroRight {
          display: grid;

          grid-template-columns:
            minmax(260px, 330px)
            auto;

          gap: 14px;
        }

        .searchBox {
          height: 48px;

          padding: 0 16px;

          display: flex;
          align-items: center;
          gap: 10px;

          border-radius: 13px;

          background:
            rgba(255,255,255,.91);

          color: var(--red);
        }

        .searchBox svg {
          width: 20px;
          height: 20px;
        }

        .searchBox input {
          width: 100%;

          border: 0;
          outline: 0;

          background: transparent;

          color: #555;
        }

        .userBox {
          display: flex;
          align-items: center;
          gap: 9px;
        }

        .avatar {
          width: 42px;
          height: 42px;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background: white;

          color: var(--red);

          font-weight: 800;
        }

        .userBox strong,
        .userBox small {
          display: block;
        }

        .userBox strong {
          font-size: 11px;
        }

        .userBox small {
          margin-top: 3px;
          font-size: 9px;
        }

        .periodBox {
          grid-column: 2;

          min-width: 225px;

          padding: 12px 15px;

          display: flex;
          align-items: center;
          gap: 12px;

          border-radius: 13px;

          background: white;

          color: var(--navy);

          box-shadow:
            0 10px 25px
            rgba(100,30,10,.12);
        }

        .periodIcon {
          width: 42px;
          height: 42px;

          border-radius: 10px;

          display: flex;
          align-items: center;
          justify-content: center;

          background: #fdebec;

          color: var(--red);
        }

        .periodIcon svg {
          width: 22px;
          height: 22px;
        }

        .periodBox span {
          display: block;

          margin-bottom: 5px;

          color: #8d939b;

          font-size: 8px;
          font-weight: 800;
        }

        .periodBox strong {
          font-size: 13px;
        }

        /* KPI */

        .kpis {
          max-width: 1550px;

          margin: -5px auto 18px;

          display: grid;
          grid-template-columns:
            repeat(4, 1fr);

          gap: 13px;
        }

        .kpi {
          min-height: 120px;

          padding: 18px;

          display: flex;
          align-items: center;
          gap: 15px;

          background: white;

          border: 1px solid var(--border);

          border-radius: 13px;

          box-shadow:
            0 7px 24px
            rgba(31,37,45,.07);
        }

        .kpiIcon {
          width: 54px;
          height: 54px;

          flex-shrink: 0;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 50%;

          color: var(--red);

          background: #fcebec;
        }

        .kpi.orange .kpiIcon {
          color: var(--orange);
          background: #fff0e6;
        }

        .kpiIcon svg {
          width: 27px;
          height: 27px;
        }

        .kpiLabel {
          color: #737b86;

          font-size: 9px;
          font-weight: 800;

          text-transform: uppercase;
        }

        .kpiValue {
          margin-top: 7px;

          color: var(--navy);

          font-size: 28px;
          font-weight: 800;
        }

        /* CARDS */

        .middleGrid {
          max-width: 1550px;

          margin: auto;

          display: grid;

          grid-template-columns:
            1fr 1fr .8fr;

          gap: 14px;
        }

        .bottomGrid {
          max-width: 1550px;

          margin: 14px auto;

          display: grid;

          grid-template-columns:
            1.15fr 1fr;

          gap: 14px;
        }

        .card {
          background: white;

          border: 1px solid var(--border);

          border-radius: 13px;

          box-shadow:
            0 6px 22px
            rgba(31,37,45,.045);
        }

        .chartCard,
        .taskCard,
        .dossiersTable,
        .quickCard {
          padding: 17px;
        }

        .cardHeader {
          display: flex;
          justify-content: space-between;
          align-items: center;

          gap: 10px;

          margin-bottom: 16px;
        }

        .cardTitle {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .cardIcon {
          width: 40px;
          height: 40px;

          flex-shrink: 0;

          border-radius: 9px;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            linear-gradient(
              135deg,
              var(--orange),
              #ff4d16
            );

          color: white;
        }

        .cardIcon svg {
          width: 21px;
          height: 21px;
        }

        .cardTitle h2 {
          margin: 0;

          color: var(--navy);

          font-size: 14px;
        }

        .cardTitle p {
          margin: 4px 0 0;

          color: #8d939b;

          font-size: 9px;
        }

        .cardButton {
          padding: 8px 10px;

          display: flex;
          align-items: center;
          gap: 6px;

          border-radius: 8px;

          background: #fff2e9;

          color: var(--red);

          font-size: 8px;
          font-weight: 700;
        }

        .cardButton svg {
          width: 12px;
          height: 12px;
        }

        /* DONUT */

        .chartContent {
          min-height: 185px;

          display: flex;
          align-items: center;
          justify-content: center;

          gap: 35px;
        }

        .donut {
          width: 145px;
          height: 145px;

          flex-shrink: 0;

          border-radius: 50%;

          display: flex;
          align-items: center;
          justify-content: center;

          background:
            conic-gradient(
              #d9282e 0 72%,
              #f14b32 72% 100%
            );

          position: relative;
        }

        .donut::after {
          content: "";

          position: absolute;

          width: 92px;
          height: 92px;

          border-radius: 50%;

          background: white;
        }

        .donutCenter {
          position: relative;
          z-index: 2;

          text-align: center;
        }

        .donutCenter strong {
          display: block;

          color: var(--navy);

          font-size: 22px;
        }

        .donutCenter span {
          color: #59616c;

          font-size: 10px;
        }

        .legend {
          min-width: 135px;

          display: flex;
          flex-direction: column;

          gap: 13px;
        }

        .legendRow {
          display: grid;

          grid-template-columns:
            10px 1fr auto;

          align-items: center;

          gap: 8px;

          font-size: 9px;
        }

        .legendDot {
          width: 9px;
          height: 9px;

          border-radius: 50%;
        }

        .legendDot.red {
          background: var(--red);
        }

        .legendDot.orange {
          background: var(--orange);
        }

        .legendDot.yellow {
          background: var(--yellow);
        }

        .legendDot.green {
          background: var(--green);
        }

        .legendRow strong {
          color: var(--navy);
        }

        /* TASKS */

        .taskList {
          display: flex;
          flex-direction: column;
        }

        .taskRow {
          min-height: 50px;

          display: grid;

          grid-template-columns:
            9px 1fr auto 15px;

          align-items: center;

          gap: 9px;

          border-bottom:
            1px solid #eef0f2;
        }

        .taskDot {
          width: 8px;
          height: 8px;

          border-radius: 50%;

          background: var(--red);
        }

        .taskInfo strong,
        .taskInfo span {
          display: block;
        }

        .taskInfo strong {
          color: var(--navy);

          font-size: 9px;
        }

        .taskInfo span {
          margin-top: 3px;

          color: #89909a;

          font-size: 8px;
        }

        .taskRow small {
          color: #89909a;

          font-size: 7px;
        }

        .taskRow > svg {
          width: 12px;
          height: 12px;
        }

        /* TABLE */

        .tableWrap {
          overflow-x: auto;
        }

        table {
          width: 100%;

          border-collapse: collapse;

          font-size: 9px;
        }

        th {
          padding: 10px;

          text-align: left;

          background: #f6f7f9;

          color: #4b5563;
        }

        td {
          padding: 9px 10px;

          border-bottom:
            1px solid #eef0f2;

          color: #66707c;
        }

        td strong {
          color: var(--navy);
        }

        .badge {
          display: inline-block;

          padding: 4px 9px;

          border-radius: 6px;

          font-size: 8px;
          font-weight: 700;
        }

        .badge.red {
          color: var(--red);
          background: #fdebed;
        }

        .badge.orange {
          color: #df6415;
          background: #fff0e4;
        }

        .badge.green {
          color: var(--green);
          background: #e9f8f1;
        }

        .badge.gray {
          color: #626b76;
          background: #f0f1f3;
        }

        /* QUICK */

        .quickHeader {
          display: flex;
          align-items: center;

          gap: 10px;

          margin-bottom: 17px;
        }

        .quickMainIcon {
          width: 40px;
          height: 40px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          color: white;

          background:
            linear-gradient(
              135deg,
              var(--orange),
              #ff4d16
            );
        }

        .quickMainIcon svg {
          width: 21px;
          height: 21px;
        }

        .quickHeader h2 {
          margin: 0;

          color: var(--navy);

          font-size: 14px;
        }

        .quickHeader p {
          margin: 4px 0 0;

          color: #8c929b;

          font-size: 9px;
        }

        .quickGrid {
          display: grid;

          grid-template-columns:
            repeat(4, 1fr);

          gap: 10px;
        }

        .quickItem {
          min-height: 100px;

          padding: 10px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 9px;

          text-align: center;

          border:
            1px solid #eceef0;

          border-radius: 9px;

          transition: .2s;
        }

        .quickItem:hover {
          transform: translateY(-2px);

          background: #fff8f4;

          border-color: #f2b18b;
        }

        .quickItemIcon {
          width: 38px;
          height: 38px;

          display: flex;
          align-items: center;
          justify-content: center;

          border-radius: 9px;

          color: var(--red);

          background: #fdeced;
        }

        .quickItemIcon svg {
          width: 20px;
          height: 20px;
        }

        .quickItem strong {
          color: var(--navy);

          font-size: 9px;
        }

        /* BANNER */

        .brandBanner {
          position: relative;

          max-width: 1550px;

          min-height: 110px;

          margin: 0 auto;

          padding: 22px 40px;

          overflow: hidden;

          display: flex;
          align-items: center;
          justify-content: space-between;

          background:
            linear-gradient(
              120deg,
              white,
              #fff6f1
            );

          border: 1px solid var(--border);

          border-radius: 13px;
        }

        .brandBanner h2 {
          margin: 0;

          color: var(--red-dark);

          font-size: 18px;
        }

        .brandBanner > div > span {
          display: block;

          margin-top: 4px;

          font-size: 9px;
        }

        .brandLines {
          width: 95px;
          height: 4px;

          margin-top: 10px;

          display: flex;
        }

        .brandLines i:first-child {
          width: 55%;
          background: var(--red);
        }

        .brandLines i:last-child {
          flex: 1;
          background: var(--orange);
        }

        blockquote {
          position: relative;
          z-index: 2;

          margin: 0;

          color: var(--red-dark);

          font-size: 15px;
          font-style: italic;

          line-height: 1.5;
        }

        .bannerShape {
          position: absolute;

          right: 0;
          top: 0;
          bottom: 0;

          width: 260px;

          overflow: hidden;
        }

        .bannerShape span:first-child {
          position: absolute;

          width: 200px;
          height: 200px;

          right: -30px;
          top: -50px;

          transform: rotate(45deg);

          background:
            linear-gradient(
              135deg,
              var(--orange),
              var(--red)
            );
        }

        .bannerShape span:last-child {
          position: absolute;

          width: 70px;
          height: 200px;

          left: 25px;
          top: -30px;

          transform: rotate(35deg);

          background: var(--red);
        }

        .empty {
          padding: 35px;

          text-align: center;

          color: #9ba1a9;

          font-size: 10px;
        }

        .loading {
          min-height: 400px;

          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;

          gap: 12px;

          color: white;
        }

        .spinner {
          width: 35px;
          height: 35px;

          border:
            3px solid rgba(255,255,255,.35);

          border-top-color: white;

          border-radius: 50%;

          animation:
            spin .7s linear infinite;
        }

        @keyframes spin {
          to {
            transform: rotate(360deg);
          }
        }

        @media (max-width: 1250px) {
          .middleGrid {
            grid-template-columns:
              1fr 1fr;
          }

          .taskCard {
            grid-column: 1 / -1;
          }

          .kpis {
            grid-template-columns:
              repeat(2,1fr);
          }
        }
      `}</style>
    </div>
  );
}

/* COMPONENTS */

function NavItem({
  href,
  label,
  icon,
  active = false,
}: {
  href: string;
  label: string;
  icon: ReactNode;
  active?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`navItem ${
        active ? "active" : ""
      }`}
    >
      {icon}
      <span>{label}</span>
    </Link>
  );
}

function Kpi({
  title,
  value,
  icon,
  orange = false,
}: {
  title: string;
  value: number;
  icon: ReactNode;
  orange?: boolean;
}) {
  return (
    <div className={`kpi ${orange ? "orange" : ""}`}>
      <div className="kpiIcon">
        {icon}
      </div>

      <div>
        <div className="kpiLabel">
          {title}
        </div>

        <div className="kpiValue">
          {value}
        </div>
      </div>
    </div>
  );
}

function CardHeader({
  icon,
  title,
  subtitle,
  href,
  button,
}: {
  icon: ReactNode;
  title: string;
  subtitle: string;
  href: string;
  button: string;
}) {
  return (
    <div className="cardHeader">
      <div className="cardTitle">
        <div className="cardIcon">
          {icon}
        </div>

        <div>
          <h2>{title}</h2>
          <p>{subtitle}</p>
        </div>
      </div>

      <Link
        href={href}
        className="cardButton"
      >
        {button}
        <ArrowIcon />
      </Link>
    </div>
  );
}

function Donut({
  total,
  text,
}: {
  total: number;
  text: string;
}) {
  return (
    <div className="donut">
      <div className="donutCenter">
        <strong>{total}</strong>
        <span>{text}</span>
      </div>
    </div>
  );
}

function Legend({
  type,
  label,
  value,
}: {
  type: "red" | "orange" | "yellow" | "green";
  label: string;
  value: number;
}) {
  return (
    <div className="legendRow">
      <div className={`legendDot ${type}`} />
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Badge({
  text,
  type,
}: {
  text: string;
  type: "red" | "orange" | "green" | "gray";
}) {
  return (
    <span className={`badge ${type}`}>
      {text}
    </span>
  );
}

function Quick({
  href,
  icon,
  label,
}: {
  href: string;
  icon: ReactNode;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="quickItem"
    >
      <div className="quickItemIcon">
        {icon}
      </div>

      <strong>{label}</strong>
    </Link>
  );
}

function formatDate(value?: string | null) {
  if (!value) return "—";

  return new Date(value).toLocaleDateString(
    "fr-FR",
    {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }
  );
}

/* SVG ICONS */

function Svg({
  children,
}: {
  children: ReactNode;
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

function HomeIcon() {
  return (
    <Svg>
      <path d="m3 11 9-8 9 8" />
      <path d="M5 10v10h14V10" />
      <path d="M9 20v-6h6v6" />
    </Svg>
  );
}

function FolderIcon() {
  return (
    <Svg>
      <path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" />
    </Svg>
  );
}

function TaskIcon() {
  return (
    <Svg>
      <rect x="4" y="3" width="16" height="18" rx="2" />
      <path d="m8 12 2 2 5-6" />
    </Svg>
  );
}

function UsersIcon() {
  return (
    <Svg>
      <circle cx="9" cy="7" r="4" />
      <path d="M2 21v-2a6 6 0 0 1 12 0v2" />
      <path d="M16 3.5a4 4 0 0 1 0 7" />
      <path d="M18 15a5 5 0 0 1 4 5" />
    </Svg>
  );
}

function FileIcon() {
  return (
    <Svg>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 12h6M9 16h6" />
    </Svg>
  );
}

function DocumentIcon() {
  return (
    <Svg>
      <path d="M6 2h9l4 4v16H6z" />
      <path d="M14 2v5h5" />
      <path d="M9 11h6M9 15h6M9 19h4" />
    </Svg>
  );
}

function ClockIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 7v5l3 2" />
    </Svg>
  );
}

function AlertIcon() {
  return (
    <Svg>
      <path d="M12 3 2.5 20h19z" />
      <path d="M12 9v4M12 17h.01" />
    </Svg>
  );
}

function CalendarIcon() {
  return (
    <Svg>
      <rect x="3" y="5" width="18" height="16" rx="2" />
      <path d="M7 3v4M17 3v4M3 10h18" />
    </Svg>
  );
}

function SearchIcon() {
  return (
    <Svg>
      <circle cx="11" cy="11" r="7" />
      <path d="m20 20-4-4" />
    </Svg>
  );
}

function BoltIcon() {
  return (
    <Svg>
      <path d="m13 2-8 12h7l-1 8 8-12h-7z" />
    </Svg>
  );
}

function PlusIcon() {
  return (
    <Svg>
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v8M8 12h8" />
    </Svg>
  );
}

function ArrowIcon() {
  return (
    <Svg>
      <path d="M5 12h14" />
      <path d="m15 8 4 4-4 4" />
    </Svg>
  );
}

function LogoutIcon() {
  return (
    <Svg>
      <path d="M10 17l5-5-5-5" />
      <path d="M15 12H3" />
      <path d="M14 3h5a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-5" />
    </Svg>
  );
}
