"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "../../utils/supabase/client";

const supabase = createClient();

type Client = {
  id: string;
  nom: string;
};

type Dossier = {
  id: string;
  reference: string;
  client_id: string | null;
  type_dossier: string | null;
  responsable: string | null;
  date_creation: string | null;
  echeance: string | null;
  statut: string | null;
  priorite: string | null;
  description: string | null;
  clients: {
    nom: string;
  } | null;
};

export default function DossiersPage() {
  const [dossiers, setDossiers] = useState<Dossier[]>([]);
  const [clients, setClients] = useState<Client[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  // RECHERCHE + FILTRES
  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");

  const [form, setForm] = useState({
    reference: "",
    client_id: "",
    type_dossier: "",
    responsable: "",
    echeance: "",
    statut: "Nouveau",
    priorite: "Normale",
    description: "",
  });

  async function chargerClients() {
    const { data, error } = await supabase
      .from("clients")
      .select("id, nom")
      .order("nom", { ascending: true });

    if (error) {
      console.error(error);
      alert("Erreur lors du chargement des clients : " + error.message);
    } else {
      setClients(data || []);
    }
  }

  async function chargerDossiers() {
    setLoading(true);

    const { data, error } = await supabase
      .from("dossiers")
      .select(`
        *,
        clients (
          nom
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur lors du chargement des dossiers : " + error.message);
    } else {
      setDossiers(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    chargerClients();
    chargerDossiers();
  }, []);

  function viderFormulaire() {
    setForm({
      reference: "",
      client_id: "",
      type_dossier: "",
      responsable: "",
      echeance: "",
      statut: "Nouveau",
      priorite: "Normale",
      description: "",
    });

    setEditingId(null);
  }

  function fermerFormulaire() {
    viderFormulaire();
    setShowForm(false);
  }

  function ouvrirNouveauDossier() {
    viderFormulaire();
    setShowForm(true);
  }

  function modifierDossier(dossier: Dossier) {
    setEditingId(dossier.id);

    setForm({
      reference: dossier.reference || "",
      client_id: dossier.client_id || "",
      type_dossier: dossier.type_dossier || "",
      responsable: dossier.responsable || "",
      echeance: dossier.echeance || "",
      statut: dossier.statut || "Nouveau",
      priorite: dossier.priorite || "Normale",
      description: dossier.description || "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function supprimerDossier(id: string, reference: string) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer le dossier ${reference} ?`
    );

    if (!confirmation) {
      return;
    }

    const { error } = await supabase
      .from("dossiers")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }

    alert("Dossier supprimé avec succès");

    await chargerDossiers();
  }

  async function enregistrerDossier(e: React.FormEvent) {
    e.preventDefault();

    if (!form.reference.trim()) {
      alert("Veuillez saisir la référence du dossier.");
      return;
    }

    setSaving(true);

    if (editingId) {
      const { error } = await supabase
        .from("dossiers")
        .update({
          reference: form.reference.trim(),
          client_id: form.client_id || null,
          type_dossier: form.type_dossier || null,
          responsable: form.responsable || null,
          echeance: form.echeance || null,
          statut: form.statut,
          priorite: form.priorite,
          description: form.description || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        console.error(error);
        alert(
          "Erreur lors de la modification du dossier : " + error.message
        );
        setSaving(false);
        return;
      }

      alert("Dossier modifié avec succès");
    } else {
      const { error } = await supabase
        .from("dossiers")
        .insert({
          reference: form.reference.trim(),
          client_id: form.client_id || null,
          type_dossier: form.type_dossier || null,
          responsable: form.responsable || null,
          echeance: form.echeance || null,
          statut: form.statut,
          priorite: form.priorite,
          description: form.description || null,
        });

      if (error) {
        console.error(error);
        alert(
          "Erreur lors de la création du dossier : " + error.message
        );
        setSaving(false);
        return;
      }

      alert("Dossier créé avec succès");
    }

    fermerFormulaire();
    await chargerDossiers();
    setSaving(false);
  }

  const dossiersFiltres = dossiers.filter((dossier) => {
    const texteRecherche = recherche.toLowerCase().trim();

    const reference = dossier.reference?.toLowerCase() || "";
    const client = dossier.clients?.nom?.toLowerCase() || "";
    const type = dossier.type_dossier?.toLowerCase() || "";
    const responsable = dossier.responsable?.toLowerCase() || "";

    const correspondRecherche =
      texteRecherche === "" ||
      reference.includes(texteRecherche) ||
      client.includes(texteRecherche) ||
      type.includes(texteRecherche) ||
      responsable.includes(texteRecherche);

    const correspondStatut =
      filtreStatut === "" || dossier.statut === filtreStatut;

    const correspondPriorite =
      filtrePriorite === "" || dossier.priorite === filtrePriorite;

    return (
      correspondRecherche &&
      correspondStatut &&
      correspondPriorite
    );
  });

  function reinitialiserFiltres() {
    setRecherche("");
    setFiltreStatut("");
    setFiltrePriorite("");
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoArea">
          <img src="/logo-eddaqaq.png" alt="EDDAQAQ EXPERTISES" />
        </div>

        <nav>
          <NavItem href="/" label="Tableau de bord" icon={<HomeIcon />} />
          <NavItem href="/dossiers" label="Dossiers" icon={<FolderIcon />} active />
          <NavItem href="/taches" label="Tâches" icon={<TaskIcon />} />
          <NavItem href="/clients" label="Clients" icon={<UsersIcon />} />
          <NavItem href="/declarations" label="Déclarations" icon={<FileIcon />} />
          <NavItem href="/documents" label="Documents" icon={<DocumentIcon />} />
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
          <div className="heroText">
            <span>Gestion & suivi</span>
            <h1>Dossiers</h1>
            <p>Centralisez et suivez tous les dossiers de vos clients.</p>
          </div>

          <button className="newButton" onClick={ouvrirNouveauDossier}>
            <PlusIcon />
            Nouveau dossier
          </button>
        </section>

        <div className="pageContent">
          <section className="statsGrid">
            <StatCard title="Total dossiers" value={dossiers.length} icon={<FolderIcon />} />
            <StatCard title="Nouveaux" value={dossiers.filter(d => d.statut === "Nouveau").length} icon={<FileIcon />} />
            <StatCard title="En cours" value={dossiers.filter(d => d.statut === "En cours").length} icon={<ClockIcon />} />
            <StatCard title="Urgents" value={dossiers.filter(d => d.priorite === "Urgente").length} icon={<AlertIcon />} orange />
          </section>

          {showForm && (
            <form onSubmit={enregistrerDossier} className="card formCard">
              <SectionHeader
                icon={<FolderIcon />}
                title={editingId ? "Modifier le dossier" : "Nouveau dossier"}
                subtitle={editingId ? "Modifiez les informations du dossier sélectionné." : "Ajoutez un nouveau dossier à votre espace de travail."}
              />

              <div className="formGrid">
                <Field label="Référence *">
                  <input
                    type="text"
                    value={form.reference}
                    onChange={(e) => setForm({ ...form, reference: e.target.value })}
                    placeholder="Ex: DOS-0001"
                    required
                  />
                </Field>

                <Field label="Client">
                  <select value={form.client_id} onChange={(e) => setForm({ ...form, client_id: e.target.value })}>
                    <option value="">-- Sélectionner un client --</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>{client.nom}</option>
                    ))}
                  </select>
                </Field>

                <Field label="Type de dossier">
                  <input
                    type="text"
                    value={form.type_dossier}
                    onChange={(e) => setForm({ ...form, type_dossier: e.target.value })}
                    placeholder="Ex: Création"
                  />
                </Field>

                <Field label="Responsable">
                  <input
                    type="text"
                    value={form.responsable}
                    onChange={(e) => setForm({ ...form, responsable: e.target.value })}
                    placeholder="Nom du responsable"
                  />
                </Field>

                <Field label="Échéance">
                  <input type="date" value={form.echeance} onChange={(e) => setForm({ ...form, echeance: e.target.value })} />
                </Field>

                <Field label="Statut">
                  <select value={form.statut} onChange={(e) => setForm({ ...form, statut: e.target.value })}>
                    <option value="Nouveau">Nouveau</option>
                    <option value="En cours">En cours</option>
                    <option value="En attente">En attente</option>
                    <option value="Terminé">Terminé</option>
                    <option value="Annulé">Annulé</option>
                  </select>
                </Field>

                <Field label="Priorité">
                  <select value={form.priorite} onChange={(e) => setForm({ ...form, priorite: e.target.value })}>
                    <option value="Normale">Normale</option>
                    <option value="Urgente">Urgente</option>
                    <option value="Faible">Faible</option>
                  </select>
                </Field>

                <div className="fullWidth">
                  <Field label="Description">
                    <textarea
                      value={form.description}
                      onChange={(e) => setForm({ ...form, description: e.target.value })}
                      placeholder="Description du dossier..."
                      rows={4}
                    />
                  </Field>
                </div>
              </div>

              <div className="formActions">
                <button type="submit" disabled={saving} className="saveButton">
                  <SaveIcon />
                  {saving ? "Enregistrement..." : editingId ? "Enregistrer les modifications" : "Enregistrer"}
                </button>
                <button type="button" onClick={fermerFormulaire} className="cancelButton">Annuler</button>
              </div>
            </form>
          )}

          <section className="card filtersCard">
            <SectionHeader icon={<SearchIcon />} title="Recherche & filtres" subtitle="Retrouvez rapidement le dossier dont vous avez besoin." />

            <div className="filterGrid">
              <Field label="Recherche">
                <div className="searchField">
                  <SearchIcon />
                  <input
                    type="text"
                    value={recherche}
                    onChange={(e) => setRecherche(e.target.value)}
                    placeholder="Référence, client, type, responsable..."
                  />
                </div>
              </Field>

              <Field label="Statut">
                <select value={filtreStatut} onChange={(e) => setFiltreStatut(e.target.value)}>
                  <option value="">Tous les statuts</option>
                  <option value="Nouveau">Nouveau</option>
                  <option value="En cours">En cours</option>
                  <option value="En attente">En attente</option>
                  <option value="Terminé">Terminé</option>
                  <option value="Annulé">Annulé</option>
                </select>
              </Field>

              <Field label="Priorité">
                <select value={filtrePriorite} onChange={(e) => setFiltrePriorite(e.target.value)}>
                  <option value="">Toutes les priorités</option>
                  <option value="Normale">Normale</option>
                  <option value="Urgente">Urgente</option>
                  <option value="Faible">Faible</option>
                </select>
              </Field>

              <button type="button" onClick={reinitialiserFiltres} className="resetButton">
                <RefreshIcon />
                Réinitialiser
              </button>
            </div>

            <div className="found">{dossiersFiltres.length} dossier(s) trouvé(s)</div>
          </section>

          <section className="card listCard">
            <div className="listHeader">
              <SectionHeader icon={<FolderIcon />} title="Liste des dossiers" subtitle="Tous les dossiers enregistrés dans EDDAQAQ EXPERTISES." />
              <div className="countPill">{dossiersFiltres.length} dossier(s)</div>
            </div>

            {loading ? (
              <div className="empty">Chargement...</div>
            ) : dossiersFiltres.length === 0 ? (
              <div className="empty">Aucun dossier trouvé.</div>
            ) : (
              <div className="tableWrap">
                <table>
                  <thead>
                    <tr>
                      <th>Référence</th><th>Client</th><th>Type</th><th>Responsable</th>
                      <th>Échéance</th><th>Statut</th><th>Priorité</th><th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {dossiersFiltres.map((dossier) => (
                      <tr key={dossier.id}>
                        <td><strong className="ref">{dossier.reference}</strong></td>
                        <td>{dossier.clients?.nom || "-"}</td>
                        <td>{dossier.type_dossier || "-"}</td>
                        <td>{dossier.responsable || "-"}</td>
                        <td>{formatDate(dossier.echeance)}</td>
                        <td><StatusBadge value={dossier.statut || "-"} /></td>
                        <td><PriorityBadge value={dossier.priorite || "-"} /></td>
                        <td>
                          <div className="actions">
                            <button className="actionButton edit" onClick={() => modifierDossier(dossier)} title="Modifier"><EditIcon /></button>
                            <button className="actionButton delete" onClick={() => supprimerDossier(dossier.id, dossier.reference)} title="Supprimer"><TrashIcon /></button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        :root{--red:#c82027;--orange:#ff6b0b;--green:#0b9d61;--navy:#14213d;--muted:#858d99;--border:#e7e8eb}
        *{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#303844}
        a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}
        .app{min-height:100vh;display:flex}
        .sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;padding:20px 13px;background:linear-gradient(160deg,#fff 0%,#fff 70%,#fff6f0 100%);border-right:1px solid #eee;display:flex;flex-direction:column;z-index:50}
        .logoArea{height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.logoArea img{width:155px;height:155px;object-fit:contain;border-radius:50%}
        .sidebar nav{display:flex;flex-direction:column;gap:5px}.navItem{height:50px;padding:0 14px;display:flex;align-items:center;gap:14px;border-radius:10px;color:#334052;font-size:13px;font-weight:600;transition:.2s}.navItem:hover{background:#fff3ec;color:var(--red)}.navItem.active{color:#fff;background:linear-gradient(135deg,#d92c2c,#f05024);box-shadow:0 8px 22px rgba(207,43,37,.22)}.navItem svg{width:22px;height:22px}
        .sidebarSlogan{margin-top:auto;padding:15px;color:var(--red);font-style:italic}.sidebarSlogan strong{font-size:14px;line-height:1.25}.smallLines{width:90px;height:4px;display:flex;margin-top:14px}.smallLines span:first-child{width:55%;background:var(--red)}.smallLines span:last-child{flex:1;background:var(--orange)}.sidebarFooter{padding:15px;color:#9a9fa7;font-size:8px;line-height:1.8}
        .main{width:calc(100% - 220px);margin-left:220px;min-height:100vh;padding:0 22px 35px;background:linear-gradient(180deg,#ef552b 0,#ff813b 260px,#f6f7f9 470px)}
        .hero{max-width:1500px;min-height:200px;margin:auto;padding:35px 10px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff}.heroText>span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.85}.heroText h1{margin:7px 0;font-size:40px;line-height:1}.heroText p{margin:10px 0 0;font-size:14px}
        .newButton{margin-top:8px;padding:13px 18px;border:0;border-radius:11px;background:#fff;color:var(--red);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;box-shadow:0 10px 25px rgba(100,30,10,.15);cursor:pointer}.newButton svg{width:18px;height:18px}
        .pageContent{max-width:1500px;margin:-58px auto 0}
        .statsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.statCard{min-height:105px;padding:17px;display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07)}.statIcon{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);background:#fdebed}.statCard.orange .statIcon{color:var(--orange);background:#fff0e6}.statIcon svg{width:24px;height:24px}.statLabel{color:#737b86;font-size:9px;font-weight:800;text-transform:uppercase}.statValue{margin-top:6px;color:var(--navy);font-size:27px;font-weight:800}
        .card{background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 6px 22px rgba(31,37,45,.05);margin-bottom:14px}.formCard,.filtersCard{padding:19px}.sectionHeader{display:flex;align-items:center;gap:10px}.sectionIcon{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--orange),#ff4d16);color:#fff}.sectionIcon svg{width:21px;height:21px}.sectionHeader h2{margin:0;color:var(--navy);font-size:14px}.sectionHeader p{margin:4px 0 0;color:#8d939b;font-size:9px}
        .formGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}.fullWidth{grid-column:1/-1}.field label{display:block;margin-bottom:7px;color:#4d5661;font-size:10px;font-weight:700}.field input,.field select,.field textarea{width:100%;min-height:43px;padding:11px 12px;border:1px solid #dfe2e6;border-radius:9px;outline:0;background:#fff;color:#333b46;font-size:12px}.field textarea{resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,11,.08)}
        .formActions{display:flex;gap:10px;margin-top:18px}.saveButton,.cancelButton,.resetButton{min-height:42px;padding:0 17px;border:0;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;font-weight:700;cursor:pointer}.saveButton{background:linear-gradient(135deg,var(--red),#ed4b26);color:#fff}.saveButton svg,.resetButton svg{width:17px;height:17px}.saveButton:disabled{opacity:.6}.cancelButton{background:#eef0f2;color:#5e6670}
        .filtersCard{padding-bottom:15px}.filterGrid{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end;margin-top:18px}.searchField{position:relative}.searchField>svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:var(--red)}.searchField input{padding-left:39px}.resetButton{height:43px;color:var(--red);background:#fff2e9;border:1px solid #f7d6c1}.found{margin-top:12px;color:#858d99;font-size:9px}
        .listCard{overflow:hidden}.listHeader{padding:17px 19px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eef0f2}.countPill{padding:6px 10px;border-radius:20px;background:#fff0e6;color:var(--red);font-size:8px;font-weight:800}.tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th{padding:12px 14px;text-align:left;background:#f7f8fa;border-bottom:1px solid #e8eaed;color:#56606d;font-size:9px;font-weight:800;text-transform:uppercase;white-space:nowrap}td{padding:13px 14px;border-bottom:1px solid #eef0f2;color:#66707c;font-size:10px;white-space:nowrap}tbody tr:hover{background:#fffaf7}.ref{color:var(--navy)}
        .badge{display:inline-flex;padding:5px 9px;border-radius:20px;font-size:8px;font-weight:800}.badge.red{color:var(--red);background:#fdebed}.badge.orange{color:#d85d10;background:#fff0e6}.badge.green{color:var(--green);background:#e8f8f1}.badge.gray{color:#68717c;background:#f0f1f3}.actions{display:flex;gap:6px}.actionButton{width:32px;height:32px;padding:0;border:0;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}.actionButton svg{width:16px;height:16px}.actionButton.edit{color:#d85d10;background:#fff0e6}.actionButton.delete{color:var(--red);background:#fdebed}.empty{padding:50px;text-align:center;color:#858d99;font-size:11px}
        @media(max-width:1150px){.statsGrid{grid-template-columns:repeat(2,1fr)}.formGrid{grid-template-columns:repeat(2,1fr)}.filterGrid{grid-template-columns:1fr 1fr}}
        @media(max-width:800px){.app{display:block}.sidebar{position:relative;width:100%;min-height:auto}.logoArea{height:135px}.sidebar nav{display:grid;grid-template-columns:repeat(2,1fr)}.sidebarSlogan,.sidebarFooter{display:none}.main{width:100%;margin-left:0}.hero{min-height:250px;flex-direction:column}.pageContent{margin-top:-50px}.statsGrid,.formGrid,.filterGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

function NavItem({href,label,icon,active=false}:{href:string;label:string;icon:ReactNode;active?:boolean}) {
  return <Link href={href} className={`navItem ${active?"active":""}`}>{icon}<span>{label}</span></Link>;
}
function StatCard({title,value,icon,orange=false}:{title:string;value:number;icon:ReactNode;orange?:boolean}) {
  return <div className={`statCard ${orange?"orange":""}`}><div className="statIcon">{icon}</div><div><div className="statLabel">{title}</div><div className="statValue">{value}</div></div></div>;
}
function SectionHeader({icon,title,subtitle}:{icon:ReactNode;title:string;subtitle:string}) {
  return <div className="sectionHeader"><div className="sectionIcon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>;
}
function Field({label,children}:{label:string;children:ReactNode}) {
  return <div className="field"><label>{label}</label>{children}</div>;
}
function StatusBadge({value}:{value:string}) {
  const c=value==="Terminé"?"green":value==="En cours"?"orange":value==="Nouveau"?"red":"gray";
  return <span className={`badge ${c}`}>{value}</span>;
}
function PriorityBadge({value}:{value:string}) {
  const c=value==="Urgente"?"red":value==="Faible"?"green":"gray";
  return <span className={`badge ${c}`}>{value}</span>;
}
function formatDate(v?:string|null){if(!v)return "-";return new Date(v+"T00:00:00").toLocaleDateString("fr-FR")}
function Svg({children}:{children:ReactNode}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>}
function HomeIcon(){return <Svg><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Svg>}
function FolderIcon(){return <Svg><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>}
function TaskIcon(){return <Svg><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2 2 5-6"/></Svg>}
function UsersIcon(){return <Svg><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 12 0v2"/><path d="M16 3.5a4 4 0 0 1 0 7"/><path d="M18 15a5 5 0 0 1 4 5"/></Svg>}
function FileIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h6"/></Svg>}
function DocumentIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 11h6M9 15h6M9 19h4"/></Svg>}
function SearchIcon(){return <Svg><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Svg>}
function ClockIcon(){return <Svg><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>}
function AlertIcon(){return <Svg><path d="M12 3 2.5 20h19z"/><path d="M12 9v4M12 17h.01"/></Svg>}
function RefreshIcon(){return <Svg><path d="M20 7v5h-5"/><path d="M19 12a7 7 0 1 0-2 5"/></Svg>}
function PlusIcon(){return <Svg><path d="M12 5v14M5 12h14"/></Svg>}
function SaveIcon(){return <Svg><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></Svg>}
function EditIcon(){return <Svg><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></Svg>}
function TrashIcon(){return <Svg><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v5M14 11v5"/></Svg>}
