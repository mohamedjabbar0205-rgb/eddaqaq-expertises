"use client";

import { FormEvent, ReactNode, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

type Profile = {
  id: string;
  nom: string | null;
  email: string | null;
  role: string | null;
  actif: boolean | null;
  created_at: string | null;
};

export default function UtilisateursPage() {
  const supabase = useMemo(() => createClient(), []);
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [nom, setNom] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState("");
  const [success, setSuccess] = useState("");
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editProfile, setEditProfile] = useState<Profile | null>(null);
  const [editNom, setEditNom] = useState("");
  const [editRole, setEditRole] = useState<"Employé" | "Administrateur">("Employé");
  const [editSaving, setEditSaving] = useState(false);
  const [editError, setEditError] = useState("");

  async function chargerUtilisateurs() {
    setLoading(true);
    setErreur("");

    const { data, error } = await supabase
      .from("profiles")
      .select("id, nom, email, role, actif, created_at")
      .order("created_at", { ascending: true });

    if (error) {
      console.error(error);
      setErreur("Impossible de charger les utilisateurs.");
      setProfiles([]);
    } else {
      setProfiles((data || []) as Profile[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
    chargerUtilisateurs();
  }, []);

  function ouvrirModal() {
    setNom("");
    setEmail("");
    setPassword("");
    setFormError("");
    setSuccess("");
    setModalOpen(true);
  }

  function fermerModal() {
    if (!saving) setModalOpen(false);
  }

  async function ajouterEmploye(e: FormEvent) {
    e.preventDefault();
    setFormError("");
    setSuccess("");

    if (!nom.trim() || !email.trim() || !password) {
      setFormError("Veuillez remplir tous les champs.");
      return;
    }

    if (password.length < 6) {
      setFormError("Le mot de passe doit contenir au moins 6 caractères.");
      return;
    }

    setSaving(true);

    try {
      const response = await fetch("/api/utilisateurs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nom.trim(),
          email: email.trim().toLowerCase(),
          password,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setFormError(result?.error || "Impossible de créer l'employé.");
        return;
      }

      setSuccess("Employé créé avec succès.");
      await chargerUtilisateurs();

      setTimeout(() => {
        setModalOpen(false);
        setNom("");
        setEmail("");
        setPassword("");
        setSuccess("");
      }, 900);
    } catch (error) {
      console.error(error);
      setFormError("Erreur de connexion au serveur.");
    } finally {
      setSaving(false);
    }
  }

  function ouvrirModification(profile: Profile) {
    if (profile.id === currentUserId) {
      alert("Vous ne pouvez pas modifier votre propre compte depuis cette page.");
      return;
    }

    setEditProfile(profile);
    setEditNom(profile.nom || "");
    setEditRole(profile.role === "Administrateur" ? "Administrateur" : "Employé");
    setEditError("");
    setEditOpen(true);
  }

  function fermerModification() {
    if (!editSaving) {
      setEditOpen(false);
      setEditProfile(null);
      setEditError("");
    }
  }

  async function enregistrerModification(e: FormEvent) {
    e.preventDefault();

    if (!editProfile) return;

    const nomNettoye = editNom.trim();

    if (!nomNettoye) {
      setEditError("Veuillez renseigner le nom complet.");
      return;
    }

    setEditSaving(true);
    setEditError("");

    try {
      const response = await fetch(`/api/utilisateurs/${editProfile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          nom: nomNettoye,
          role: editRole,
        }),
      });

      const result = await response.json();

      if (!response.ok) {
        setEditError(result?.error || "Impossible de modifier l'utilisateur.");
        return;
      }

      await chargerUtilisateurs();
      setEditOpen(false);
      setEditProfile(null);
    } catch (error) {
      console.error(error);
      setEditError("Erreur de connexion au serveur.");
    } finally {
      setEditSaving(false);
    }
  }

  async function basculerStatut(profile: Profile) {
    if (profile.id === currentUserId) {
      alert("Vous ne pouvez pas désactiver votre propre compte.");
      return;
    }

    const nouvelEtat = !profile.actif;
    const confirmation = window.confirm(
      nouvelEtat
        ? `Activer le compte de ${profile.nom || profile.email || "cet utilisateur"} ?`
        : `Désactiver le compte de ${profile.nom || profile.email || "cet utilisateur"} ?`
    );

    if (!confirmation) return;

    setActionLoading(profile.id);

    try {
      const response = await fetch(`/api/utilisateurs/${profile.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ actif: nouvelEtat }),
      });

      const result = await response.json();

      if (!response.ok) {
        alert(result?.error || "Impossible de modifier l'utilisateur.");
        return;
      }

      await chargerUtilisateurs();
    } catch (error) {
      console.error(error);
      alert("Erreur de connexion au serveur.");
    } finally {
      setActionLoading(null);
    }
  }

  const total = profiles.length;
  const admins = profiles.filter((p) => p.role === "Administrateur").length;
  const employes = profiles.filter((p) => p.role === "Employé").length;
  const actifs = profiles.filter((p) => p.actif === true).length;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoArea">
          <img src="/logo-eddaqaq.png" alt="EDDAQAQ EXPERTISES" />
        </div>

        <nav>
          <NavItem href="/" label="Tableau de bord" icon={<HomeIcon />} />
          <NavItem href="/dossiers" label="Dossiers" icon={<FolderIcon />} />
          <NavItem href="/taches" label="Tâches" icon={<TaskIcon />} />
          <NavItem href="/clients" label="Clients" icon={<UsersIcon />} />
          <NavItem href="/declarations" label="Déclarations" icon={<FileIcon />} />
          <NavItem href="/documents" label="Documents" icon={<DocumentIcon />} />
          <NavItem href="/utilisateurs" label="Utilisateurs" icon={<UserCogIcon />} active />
        </nav>

        <div className="sidebarSlogan">
          <strong>L&apos;expertise<br />au service<br />de votre réussite</strong>
          <div className="smallLines"><span /><span /></div>
        </div>

        <div className="sidebarFooter">
          © {new Date().getFullYear()} EDDAQAQ EXPERTISES<br />
          Audit · Management · Finance
        </div>
      </aside>

      <main className="main">
        <section className="hero">
          <div>
            <span className="eyebrow">ADMINISTRATION</span>
            <h1>Utilisateurs</h1>
            <p>Gérez les comptes des utilisateurs de votre espace.</p>
          </div>

          <button className="addButton" type="button" onClick={ouvrirModal}>
            <PlusIcon />
            Ajouter un employé
          </button>
        </section>

        <section className="kpis">
          <Kpi title="Total utilisateurs" value={total} icon={<UsersIcon />} />
          <Kpi title="Administrateurs" value={admins} icon={<ShieldIcon />} />
          <Kpi title="Employés" value={employes} icon={<UserIcon />} orange />
          <Kpi title="Utilisateurs actifs" value={actifs} icon={<CheckIcon />} green />
        </section>

        <section className="card">
          <div className="cardHeader">
            <div className="cardTitle">
              <div className="cardIcon"><UserCogIcon /></div>
              <div>
                <h2>Gestion des utilisateurs</h2>
                <p>Comptes actuellement enregistrés dans EDDAQAQ EXPERTISES</p>
              </div>
            </div>

            <button className="refreshButton" onClick={chargerUtilisateurs} disabled={loading}>
              <RefreshIcon /> Actualiser
            </button>
          </div>

          {erreur && <div className="error">{erreur}</div>}

          {loading ? (
            <div className="loading"><div className="spinner" />Chargement des utilisateurs...</div>
          ) : profiles.length === 0 ? (
            <div className="empty">Aucun utilisateur enregistré.</div>
          ) : (
            <div className="tableWrap">
              <table>
                <thead>
                  <tr>
                    <th>UTILISATEUR</th>
                    <th>E-MAIL</th>
                    <th>RÔLE</th>
                    <th>STATUT</th>
                    <th>CRÉÉ LE</th>
                    <th>ACTION</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.map((profile) => (
                    <tr key={profile.id}>
                      <td>
                        <div className="userCell">
                          <div className="avatar">{initiales(profile.nom, profile.email)}</div>
                          <strong>{profile.nom || "Utilisateur"}</strong>
                        </div>
                      </td>
                      <td>{profile.email || "—"}</td>
                      <td>
                        <span className={`roleBadge ${profile.role === "Administrateur" ? "admin" : "employee"}`}>
                          {profile.role || "Employé"}
                        </span>
                      </td>
                      <td>
                        <span className={`statusBadge ${profile.actif ? "active" : "inactive"}`}>
                          <i />{profile.actif ? "Actif" : "Inactif"}
                        </span>
                      </td>
                      <td>{formatDate(profile.created_at)}</td>
                      <td>
                        {profile.id === currentUserId ? (
                          <span className="selfLabel">Votre compte</span>
                        ) : (
                          <div className="actionGroup">
                            <button
                              type="button"
                              className="editAction"
                              onClick={() => ouvrirModification(profile)}
                            >
                              Modifier
                            </button>
                            <button
                              type="button"
                              className={`statusAction ${profile.actif ? "deactivate" : "activate"}`}
                              onClick={() => basculerStatut(profile)}
                              disabled={actionLoading === profile.id}
                            >
                              {actionLoading === profile.id
                                ? "..."
                                : profile.actif
                                  ? "Désactiver"
                                  : "Activer"}
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </main>

      {modalOpen && (
        <div className="modalOverlay" onMouseDown={fermerModal}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span className="modalEyebrow">NOUVEAU COMPTE</span>
                <h2>Ajouter un employé</h2>
                <p>Le nouveau compte sera créé avec le rôle Employé.</p>
              </div>
              <button className="closeButton" type="button" onClick={fermerModal} disabled={saving}>×</button>
            </div>

            <form onSubmit={ajouterEmploye}>
              <label>
                Nom complet
                <input
                  value={nom}
                  onChange={(e) => setNom(e.target.value)}
                  placeholder="Ex : Ahmed Benali"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>

              <label>
                Adresse e-mail
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="exemple@eddaqaq.ma"
                  autoComplete="off"
                  disabled={saving}
                />
              </label>

              <label>
                Mot de passe
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Minimum 6 caractères"
                  autoComplete="new-password"
                  disabled={saving}
                />
              </label>

              {formError && <div className="formMessage error">{formError}</div>}
              {success && <div className="formMessage success">{success}</div>}

              <div className="modalActions">
                <button type="button" className="cancelButton" onClick={fermerModal} disabled={saving}>
                  Annuler
                </button>
                <button type="submit" className="saveButton" disabled={saving}>
                  {saving ? "Création..." : "Créer l'employé"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {editOpen && editProfile && (
        <div className="modalOverlay" onMouseDown={fermerModification}>
          <div className="modal" onMouseDown={(e) => e.stopPropagation()}>
            <div className="modalHeader">
              <div>
                <span className="modalEyebrow">MODIFICATION</span>
                <h2>Modifier l&apos;utilisateur</h2>
                <p>Modifiez le nom et le rôle du compte sélectionné.</p>
              </div>
              <button
                className="closeButton"
                type="button"
                onClick={fermerModification}
                disabled={editSaving}
              >
                ×
              </button>
            </div>

            <form onSubmit={enregistrerModification}>
              <label>
                Nom complet
                <input
                  value={editNom}
                  onChange={(e) => setEditNom(e.target.value)}
                  placeholder="Nom complet"
                  autoComplete="off"
                  disabled={editSaving}
                />
              </label>

              <label>
                Rôle
                <select
                  value={editRole}
                  onChange={(e) =>
                    setEditRole(e.target.value as "Employé" | "Administrateur")
                  }
                  disabled={editSaving}
                >
                  <option value="Employé">Employé</option>
                  <option value="Administrateur">Administrateur</option>
                </select>
              </label>

              {editError && <div className="formMessage error">{editError}</div>}

              <div className="modalActions">
                <button
                  type="button"
                  className="cancelButton"
                  onClick={fermerModification}
                  disabled={editSaving}
                >
                  Annuler
                </button>
                <button type="submit" className="saveButton" disabled={editSaving}>
                  {editSaving ? "Enregistrement..." : "Enregistrer"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <style jsx global>{`
        :root{--red:#c82027;--orange:#ff6b0b;--green:#0b9d61;--navy:#14213d;--text:#303844;--muted:#858d99;--border:#e7e8eb}
        *{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:var(--text)}
        a{text-decoration:none;color:inherit}button,input,select{font-family:inherit}.app{min-height:100vh;display:flex}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;padding:20px 13px;background:linear-gradient(160deg,#fff 0%,#fff 70%,#fff6f0 100%);border-right:1px solid #eee;display:flex;flex-direction:column;z-index:50}
        .logoArea{height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.logoArea img{width:155px;height:155px;object-fit:contain;border-radius:50%}
        .sidebar nav{display:flex;flex-direction:column;gap:5px}.navItem{height:50px;padding:0 14px;display:flex;align-items:center;gap:14px;border-radius:10px;color:#334052;font-size:13px;font-weight:600;transition:.2s}
        .navItem:hover{background:#fff3ec;color:var(--red)}.navItem.active{color:#fff;background:linear-gradient(135deg,#d92c2c,#f05024);box-shadow:0 8px 22px rgba(207,43,37,.22)}.navItem svg{width:22px;height:22px}
        .sidebarSlogan{margin-top:auto;padding:15px;color:var(--red);font-style:italic}.sidebarSlogan strong{font-size:14px;line-height:1.25}.smallLines{width:90px;height:4px;display:flex;margin-top:14px}.smallLines span:first-child{width:55%;background:var(--red)}.smallLines span:last-child{flex:1;background:var(--orange)}
        .sidebarFooter{padding:15px;color:#9a9fa7;font-size:8px;line-height:1.8}
        .main{width:calc(100% - 220px);margin-left:220px;min-height:100vh;padding:0 22px 35px;background:linear-gradient(180deg,#ef552b 0,#ff813b 260px,#f6f7f9 470px)}
        .hero{max-width:1550px;min-height:190px;margin:auto;padding:31px 10px;display:flex;align-items:flex-start;justify-content:space-between;gap:20px;color:#fff}.eyebrow{font-size:9px;font-weight:800;letter-spacing:1.5px;opacity:.9}.hero h1{margin:9px 0 7px;font-size:39px;line-height:1}.hero p{margin:0;font-size:14px}
        .addButton{margin-top:8px;height:47px;padding:0 18px;border:0;border-radius:11px;display:flex;align-items:center;gap:9px;background:#fff;color:var(--red);font-size:10px;font-weight:800;box-shadow:0 10px 25px rgba(100,30,10,.15);cursor:pointer}.addButton svg{width:18px;height:18px}
        .kpis{max-width:1550px;margin:-18px auto 16px;display:grid;grid-template-columns:repeat(4,1fr);gap:13px}.kpi{min-height:116px;padding:18px;display:flex;align-items:center;gap:15px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07)}
        .kpiIcon{width:54px;height:54px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);background:#fcebec}.kpi.orange .kpiIcon{color:var(--orange);background:#fff0e6}.kpi.green .kpiIcon{color:var(--green);background:#e9f8f1}.kpiIcon svg{width:27px;height:27px}.kpiLabel{color:#737b86;font-size:9px;font-weight:800;text-transform:uppercase}.kpiValue{margin-top:7px;color:var(--navy);font-size:28px;font-weight:800}
        .card{max-width:1550px;margin:0 auto;padding:18px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 6px 22px rgba(31,37,45,.05)}.cardHeader{display:flex;align-items:center;justify-content:space-between;gap:15px;margin-bottom:18px}.cardTitle{display:flex;align-items:center;gap:11px}.cardIcon{width:42px;height:42px;border-radius:9px;display:flex;align-items:center;justify-content:center;color:#fff;background:linear-gradient(135deg,var(--orange),#ff4d16)}.cardIcon svg{width:22px;height:22px}.cardTitle h2{margin:0;color:var(--navy);font-size:14px}.cardTitle p{margin:4px 0 0;color:#8d939b;font-size:9px}
        .refreshButton{height:36px;padding:0 12px;border:1px solid #f0d3c4;border-radius:8px;display:flex;align-items:center;gap:7px;background:#fff8f4;color:var(--red);font-size:9px;font-weight:800;cursor:pointer}.refreshButton svg{width:14px;height:14px}
        .tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:10px}th{padding:13px 12px;text-align:left;background:#f6f7f9;color:#59616c;font-size:8px;letter-spacing:.3px}td{padding:13px 12px;border-bottom:1px solid #eef0f2;color:#66707c}tbody tr:hover{background:#fffaf7}
        .userCell{display:flex;align-items:center;gap:10px}.userCell strong{color:var(--navy)}.avatar{width:34px;height:34px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fdebed;color:var(--red);font-size:10px;font-weight:800}
        .roleBadge,.statusBadge{display:inline-flex;align-items:center;gap:6px;padding:5px 9px;border-radius:7px;font-size:8px;font-weight:800}.roleBadge.admin{color:var(--red);background:#fdebed}.roleBadge.employee{color:#df6415;background:#fff0e4}.statusBadge.active{color:var(--green);background:#e9f8f1}.statusBadge.inactive{color:#737b86;background:#f0f1f3}.statusBadge i{width:6px;height:6px;border-radius:50%;background:currentColor}
        .actionGroup{display:flex;align-items:center;gap:7px}.editAction,.statusAction{height:30px;padding:0 11px;border-radius:7px;font-size:8px;font-weight:800;cursor:pointer}.editAction{border:1px solid #f3c8ad;background:#fff8f4;color:var(--orange)}.editAction:hover{background:#fff0e7}.statusAction.deactivate{border:1px solid #f0b8bb;background:#fff;color:var(--red)}.statusAction.activate{border:1px solid #a9dfc8;background:#f3fcf8;color:var(--green)}.statusAction:hover:not(:disabled){transform:translateY(-1px)}.selfLabel{font-size:8px;font-weight:800;color:#8a919b;background:#f2f3f5;padding:6px 9px;border-radius:7px}
        .loading,.empty{min-height:250px;display:flex;align-items:center;justify-content:center;flex-direction:column;gap:10px;color:#9097a1;font-size:10px}.spinner{width:30px;height:30px;border:3px solid #f2d9cd;border-top-color:var(--orange);border-radius:50%;animation:spin .7s linear infinite}@keyframes spin{to{transform:rotate(360deg)}}.error{padding:11px 13px;border-radius:8px;background:#fdebed;color:var(--red);font-size:10px;font-weight:700}
        .modalOverlay{position:fixed;inset:0;z-index:1000;background:rgba(20,33,61,.48);display:flex;align-items:center;justify-content:center;padding:20px;backdrop-filter:blur(3px)}.modal{width:100%;max-width:500px;background:#fff;border-radius:16px;box-shadow:0 25px 70px rgba(0,0,0,.24);overflow:hidden}.modalHeader{padding:24px 25px 18px;border-bottom:1px solid var(--border);display:flex;justify-content:space-between;gap:20px}.modalEyebrow{font-size:8px;font-weight:900;letter-spacing:1.3px;color:var(--orange)}.modalHeader h2{margin:6px 0;color:var(--navy);font-size:22px}.modalHeader p{margin:0;color:#858d99;font-size:10px}.closeButton{width:34px;height:34px;border:0;border-radius:50%;background:#f5f6f7;color:#777;font-size:23px;cursor:pointer}
        .modal form{padding:22px 25px 25px}.modal label{display:block;margin-bottom:15px;color:#515966;font-size:10px;font-weight:800}.modal input,.modal select{width:100%;height:44px;margin-top:7px;padding:0 13px;border:1px solid #dfe2e6;border-radius:9px;outline:none;font-size:11px;color:var(--navy);background:#fff}.modal input:focus,.modal select:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,11,.09)}.formMessage{margin:4px 0 14px}.formMessage.success{padding:11px 13px;border-radius:8px;background:#e9f8f1;color:var(--green);font-size:10px;font-weight:800}
        .modalActions{display:flex;justify-content:flex-end;gap:9px;margin-top:20px}.cancelButton,.saveButton{height:41px;padding:0 17px;border-radius:9px;font-size:10px;font-weight:800;cursor:pointer}.cancelButton{border:1px solid #ddd;background:#fff;color:#69717c}.saveButton{border:0;background:linear-gradient(135deg,var(--red),var(--orange));color:#fff;box-shadow:0 8px 18px rgba(220,70,25,.18)}button:disabled{opacity:.6;cursor:not-allowed}
        @media(max-width:1100px){.kpis{grid-template-columns:repeat(2,1fr)}}@media(max-width:760px){.sidebar{position:relative;width:100%;min-height:auto}.app{display:block}.main{width:100%;margin-left:0}.hero{flex-direction:column}.kpis{grid-template-columns:1fr;margin-top:-10px}}
      `}</style>
    </div>
  );
}

function initiales(nom?: string | null, email?: string | null) {
  const value = (nom || email || "U").trim();
  const parts = value.split(/\s+/).filter(Boolean);
  return (parts.length >= 2 ? `${parts[0][0]}${parts[1][0]}` : value.slice(0, 2)).toUpperCase();
}
function formatDate(value?: string | null) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("fr-FR", { day:"2-digit", month:"short", year:"numeric" });
}
function NavItem({href,label,icon,active=false}:{href:string;label:string;icon:ReactNode;active?:boolean}) {
  return <Link href={href} className={`navItem ${active ? "active" : ""}`}>{icon}<span>{label}</span></Link>;
}
function Kpi({title,value,icon,orange=false,green=false}:{title:string;value:number;icon:ReactNode;orange?:boolean;green?:boolean}) {
  return <div className={`kpi ${orange?"orange":""} ${green?"green":""}`}><div className="kpiIcon">{icon}</div><div><div className="kpiLabel">{title}</div><div className="kpiValue">{value}</div></div></div>;
}
function Svg({children}:{children:ReactNode}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>}
function HomeIcon(){return <Svg><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Svg>}
function FolderIcon(){return <Svg><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>}
function TaskIcon(){return <Svg><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2 2 5-6"/></Svg>}
function UsersIcon(){return <Svg><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 12 0v2"/><path d="M16 3.5a4 4 0 0 1 0 7"/><path d="M18 15a5 5 0 0 1 4 5"/></Svg>}
function FileIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h6"/></Svg>}
function DocumentIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 11h6M9 15h6M9 19h4"/></Svg>}
function UserCogIcon(){return <Svg><circle cx="9" cy="8" r="4"/><path d="M2 21v-2a7 7 0 0 1 12-5.2"/><circle cx="18" cy="17" r="3"/><path d="M18 12v2M18 20v2M13 17h2M21 17h2"/></Svg>}
function UserIcon(){return <Svg><circle cx="12" cy="8" r="4"/><path d="M4 21v-2a8 8 0 0 1 16 0v2"/></Svg>}
function ShieldIcon(){return <Svg><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10"/><path d="m9 12 2 2 4-4"/></Svg>}
function CheckIcon(){return <Svg><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></Svg>}
function PlusIcon(){return <Svg><circle cx="12" cy="12" r="9"/><path d="M12 8v8M8 12h8"/></Svg>}
function RefreshIcon(){return <Svg><path d="M20 6v5h-5"/><path d="M4 18v-5h5"/><path d="M18 9a7 7 0 0 0-12-2L4 11M6 15a7 7 0 0 0 12 2l2-4"/></Svg>}
