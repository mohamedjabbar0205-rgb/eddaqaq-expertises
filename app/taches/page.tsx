"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Dossier = {
  id: string;
  reference: string;
};

type Tache = {
  id: string;
  dossier_id: string | null;
  titre: string;
  responsable: string | null;
  date_debut: string | null;
  date_limite: string | null;
  priorite: string | null;
  statut: string | null;
  commentaire: string | null;
  dossiers: {
    reference: string;
  } | null;
};

export default function TachesPage() {
  const [taches, setTaches] = useState<Tache[]>([]);
  const [dossiers, setDossiers] = useState<Dossier[]>([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("");
  const [filtrePriorite, setFiltrePriorite] = useState("");

  const [form, setForm] = useState({
    dossier_id: "",
    titre: "",
    responsable: "",
    date_debut: "",
    date_limite: "",
    priorite: "Normale",
    statut: "À faire",
    commentaire: "",
  });

  async function chargerDossiers() {
    const { data, error } = await supabase
      .from("dossiers")
      .select("id, reference")
      .order("reference", { ascending: true });

    if (error) {
      console.error(error);
    } else {
      setDossiers(data || []);
    }
  }

  async function chargerTaches() {
    setLoading(true);

    const { data, error } = await supabase
      .from("taches")
      .select(`
        *,
        dossiers (
          reference
        )
      `)
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur lors du chargement des tâches : " + error.message);
    } else {
      setTaches(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    chargerDossiers();
    chargerTaches();
  }, []);

  function viderFormulaire() {
    setForm({
      dossier_id: "",
      titre: "",
      responsable: "",
      date_debut: "",
      date_limite: "",
      priorite: "Normale",
      statut: "À faire",
      commentaire: "",
    });

    setEditingId(null);
  }

  function ouvrirNouvelleTache() {
    viderFormulaire();
    setShowForm(true);
  }

  function fermerFormulaire() {
    viderFormulaire();
    setShowForm(false);
  }

  function modifierTache(tache: Tache) {
    setEditingId(tache.id);

    setForm({
      dossier_id: tache.dossier_id || "",
      titre: tache.titre || "",
      responsable: tache.responsable || "",
      date_debut: tache.date_debut || "",
      date_limite: tache.date_limite || "",
      priorite: tache.priorite || "Normale",
      statut: tache.statut || "À faire",
      commentaire: tache.commentaire || "",
    });

    setShowForm(true);

    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  async function enregistrerTache(e: React.FormEvent) {
    e.preventDefault();

    if (!form.titre.trim()) {
      alert("Veuillez saisir le titre de la tâche.");
      return;
    }

    setSaving(true);

    const donnees = {
      dossier_id: form.dossier_id || null,
      titre: form.titre.trim(),
      responsable: form.responsable.trim() || null,
      date_debut: form.date_debut || null,
      date_limite: form.date_limite || null,
      priorite: form.priorite,
      statut: form.statut,
      commentaire: form.commentaire.trim() || null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("taches")
        .update({
          ...donnees,
          updated_at: new Date().toISOString(),
        })
        .eq("id", editingId);

      if (error) {
        alert("Erreur lors de la modification : " + error.message);
        setSaving(false);
        return;
      }

      alert("Tâche modifiée avec succès");
    } else {
      const { error } = await supabase
        .from("taches")
        .insert(donnees);

      if (error) {
        alert("Erreur lors de la création : " + error.message);
        setSaving(false);
        return;
      }

      alert("Tâche créée avec succès");
    }

    fermerFormulaire();
    await chargerTaches();
    setSaving(false);
  }

  async function supprimerTache(id: string, titre: string) {
    const confirmation = window.confirm(
      `Voulez-vous vraiment supprimer la tâche "${titre}" ?`
    );

    if (!confirmation) return;

    const { error } = await supabase
      .from("taches")
      .delete()
      .eq("id", id);

    if (error) {
      alert("Erreur lors de la suppression : " + error.message);
      return;
    }

    alert("Tâche supprimée avec succès");
    await chargerTaches();
  }

  const tachesFiltrees = taches.filter((tache) => {
    const texte = recherche.toLowerCase().trim();

    const correspondRecherche =
      texte === "" ||
      tache.titre.toLowerCase().includes(texte) ||
      (tache.dossiers?.reference || "")
        .toLowerCase()
        .includes(texte) ||
      (tache.responsable || "")
        .toLowerCase()
        .includes(texte);

    const correspondStatut =
      filtreStatut === "" || tache.statut === filtreStatut;

    const correspondPriorite =
      filtrePriorite === "" ||
      tache.priorite === filtrePriorite;

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
        <div className="logoArea"><img src="/logo-eddaqaq.png" alt="EDDAQAQ EXPERTISES" /></div>
        <nav>
          <NavItem href="/" label="Tableau de bord" icon={<HomeIcon />} />
          <NavItem href="/dossiers" label="Dossiers" icon={<FolderIcon />} />
          <NavItem href="/taches" label="Tâches" icon={<TaskIcon />} active />
          <NavItem href="/clients" label="Clients" icon={<UsersIcon />} />
          <NavItem href="/declarations" label="Déclarations" icon={<FileIcon />} />
          <NavItem href="/documents" label="Documents" icon={<DocumentIcon />} />
        </nav>
        <div className="sidebarSlogan">
          <strong>L&apos;expertise<br />au service<br />de votre réussite</strong>
          <div className="smallLines"><span /><span /></div>
        </div>
        <div className="sidebarFooter">© {new Date().getFullYear()} EDDAQAQ EXPERTISES<br />Audit · Management · Finance</div>
      </aside>

      <main className="main">
        <section className="hero">
          <div className="heroText">
            <span>Gestion & suivi</span>
            <h1>Tâches</h1>
            <p>Planifiez et suivez les tâches liées à vos dossiers.</p>
          </div>
          <button className="newButton" onClick={ouvrirNouvelleTache}><PlusIcon />Nouvelle tâche</button>
        </section>

        <div className="pageContent">
          <section className="statsGrid">
            <StatCard title="Total tâches" value={taches.length} icon={<TaskIcon />} />
            <StatCard title="À faire" value={taches.filter(t => t.statut === "À faire").length} icon={<FileIcon />} />
            <StatCard title="En cours" value={taches.filter(t => t.statut === "En cours").length} icon={<ClockIcon />} />
            <StatCard title="Urgentes" value={taches.filter(t => t.priorite === "Urgente").length} icon={<AlertIcon />} orange />
          </section>

          {showForm && (
            <form onSubmit={enregistrerTache} className="card formCard">
              <SectionHeader icon={<TaskIcon />} title={editingId ? "Modifier la tâche" : "Nouvelle tâche"} subtitle={editingId ? "Modifiez les informations de la tâche sélectionnée." : "Ajoutez une nouvelle tâche à votre espace de travail."} />
              <div className="formGrid">
                <Field label="Dossier">
                  <select value={form.dossier_id} onChange={(e) => setForm({...form,dossier_id:e.target.value})}>
                    <option value="">-- Sélectionner un dossier --</option>
                    {dossiers.map(d => <option key={d.id} value={d.id}>{d.reference}</option>)}
                  </select>
                </Field>
                <Field label="Titre *">
                  <input value={form.titre} onChange={(e)=>setForm({...form,titre:e.target.value})} placeholder="Ex: Déposer le dossier à la DGI" required />
                </Field>
                <Field label="Responsable">
                  <input value={form.responsable} onChange={(e)=>setForm({...form,responsable:e.target.value})} placeholder="Nom du responsable" />
                </Field>
                <Field label="Date début">
                  <input type="date" value={form.date_debut} onChange={(e)=>setForm({...form,date_debut:e.target.value})} />
                </Field>
                <Field label="Date limite">
                  <input type="date" value={form.date_limite} onChange={(e)=>setForm({...form,date_limite:e.target.value})} />
                </Field>
                <Field label="Priorité">
                  <select value={form.priorite} onChange={(e)=>setForm({...form,priorite:e.target.value})}>
                    <option value="Faible">Faible</option><option value="Normale">Normale</option><option value="Urgente">Urgente</option>
                  </select>
                </Field>
                <Field label="Statut">
                  <select value={form.statut} onChange={(e)=>setForm({...form,statut:e.target.value})}>
                    <option value="À faire">À faire</option><option value="En cours">En cours</option><option value="En attente">En attente</option><option value="Terminée">Terminée</option>
                  </select>
                </Field>
                <div className="fullWidth">
                  <Field label="Commentaire">
                    <textarea value={form.commentaire} onChange={(e)=>setForm({...form,commentaire:e.target.value})} rows={4} placeholder="Commentaire..." />
                  </Field>
                </div>
              </div>
              <div className="formActions">
                <button type="submit" disabled={saving} className="saveButton"><SaveIcon />{saving?"Enregistrement...":editingId?"Enregistrer les modifications":"Enregistrer"}</button>
                <button type="button" onClick={fermerFormulaire} className="cancelButton">Annuler</button>
              </div>
            </form>
          )}

          <section className="card filtersCard">
            <SectionHeader icon={<SearchIcon />} title="Recherche & filtres" subtitle="Retrouvez rapidement une tâche." />
            <div className="filterGrid">
              <Field label="Recherche"><div className="searchField"><SearchIcon /><input value={recherche} onChange={(e)=>setRecherche(e.target.value)} placeholder="Tâche, dossier, responsable..." /></div></Field>
              <Field label="Statut">
                <select value={filtreStatut} onChange={(e)=>setFiltreStatut(e.target.value)}>
                  <option value="">Tous les statuts</option><option value="À faire">À faire</option><option value="En cours">En cours</option><option value="En attente">En attente</option><option value="Terminée">Terminée</option>
                </select>
              </Field>
              <Field label="Priorité">
                <select value={filtrePriorite} onChange={(e)=>setFiltrePriorite(e.target.value)}>
                  <option value="">Toutes les priorités</option><option value="Faible">Faible</option><option value="Normale">Normale</option><option value="Urgente">Urgente</option>
                </select>
              </Field>
              <button type="button" onClick={reinitialiserFiltres} className="resetButton"><RefreshIcon />Réinitialiser</button>
            </div>
            <div className="found">{tachesFiltrees.length} tâche(s) trouvée(s)</div>
          </section>

          <section className="card listCard">
            <div className="listHeader">
              <SectionHeader icon={<TaskIcon />} title="Liste des tâches" subtitle="Toutes les tâches enregistrées dans EDDAQAQ EXPERTISES." />
              <div className="countPill">{tachesFiltrees.length} tâche(s)</div>
            </div>
            {loading ? <div className="empty">Chargement...</div> : tachesFiltrees.length===0 ? <div className="empty">Aucune tâche trouvée.</div> : (
              <div className="tableWrap"><table>
                <thead><tr><th>Tâche</th><th>Dossier</th><th>Responsable</th><th>Date début</th><th>Date limite</th><th>Priorité</th><th>Statut</th><th>Actions</th></tr></thead>
                <tbody>{tachesFiltrees.map(t=>(
                  <tr key={t.id}>
                    <td><strong className="ref">{t.titre}</strong></td><td>{t.dossiers?.reference||"-"}</td><td>{t.responsable||"-"}</td>
                    <td>{formatDate(t.date_debut)}</td><td>{formatDate(t.date_limite)}</td>
                    <td><PriorityBadge value={t.priorite||"-"} /></td><td><StatusBadge value={t.statut||"-"} /></td>
                    <td><div className="actions">
                      <button className="actionButton edit" onClick={()=>modifierTache(t)} title="Modifier"><EditIcon /></button>
                      <button className="actionButton delete" onClick={()=>supprimerTache(t.id,t.titre)} title="Supprimer"><TrashIcon /></button>
                    </div></td>
                  </tr>
                ))}</tbody>
              </table></div>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        :root{--red:#c82027;--orange:#ff6b0b;--green:#0b9d61;--navy:#14213d;--border:#e7e8eb}
        *{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#303844}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}
        .app{min-height:100vh;display:flex}.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;padding:20px 13px;background:linear-gradient(160deg,#fff 0%,#fff 70%,#fff6f0 100%);border-right:1px solid #eee;display:flex;flex-direction:column;z-index:50}
        .logoArea{height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.logoArea img{width:155px;height:155px;object-fit:contain;border-radius:50%}.sidebar nav{display:flex;flex-direction:column;gap:5px}.navItem{height:50px;padding:0 14px;display:flex;align-items:center;gap:14px;border-radius:10px;color:#334052;font-size:13px;font-weight:600;transition:.2s}.navItem:hover{background:#fff3ec;color:var(--red)}.navItem.active{color:#fff;background:linear-gradient(135deg,#d92c2c,#f05024);box-shadow:0 8px 22px rgba(207,43,37,.22)}.navItem svg{width:22px;height:22px}
        .sidebarSlogan{margin-top:auto;padding:15px;color:var(--red);font-style:italic}.sidebarSlogan strong{font-size:14px;line-height:1.25}.smallLines{width:90px;height:4px;display:flex;margin-top:14px}.smallLines span:first-child{width:55%;background:var(--red)}.smallLines span:last-child{flex:1;background:var(--orange)}.sidebarFooter{padding:15px;color:#9a9fa7;font-size:8px;line-height:1.8}
        .main{width:calc(100% - 220px);margin-left:220px;min-height:100vh;padding:0 22px 35px;background:linear-gradient(180deg,#ef552b 0,#ff813b 260px,#f6f7f9 470px)}.hero{max-width:1500px;min-height:200px;margin:auto;padding:35px 10px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff}.heroText>span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.85}.heroText h1{margin:7px 0;font-size:40px;line-height:1}.heroText p{margin:10px 0 0;font-size:14px}.newButton{margin-top:8px;padding:13px 18px;border:0;border-radius:11px;background:#fff;color:var(--red);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;box-shadow:0 10px 25px rgba(100,30,10,.15);cursor:pointer}.newButton svg{width:18px;height:18px}.pageContent{max-width:1500px;margin:-58px auto 0}
        .statsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.statCard{min-height:105px;padding:17px;display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07)}.statIcon{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);background:#fdebed}.statCard.orange .statIcon{color:var(--orange);background:#fff0e6}.statIcon svg{width:24px;height:24px}.statLabel{color:#737b86;font-size:9px;font-weight:800;text-transform:uppercase}.statValue{margin-top:6px;color:var(--navy);font-size:27px;font-weight:800}
        .card{background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 6px 22px rgba(31,37,45,.05);margin-bottom:14px}.formCard,.filtersCard{padding:19px}.sectionHeader{display:flex;align-items:center;gap:10px}.sectionIcon{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--orange),#ff4d16);color:#fff}.sectionIcon svg{width:21px;height:21px}.sectionHeader h2{margin:0;color:var(--navy);font-size:14px}.sectionHeader p{margin:4px 0 0;color:#8d939b;font-size:9px}
        .formGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}.fullWidth{grid-column:1/-1}.field label{display:block;margin-bottom:7px;color:#4d5661;font-size:10px;font-weight:700}.field input,.field select,.field textarea{width:100%;min-height:43px;padding:11px 12px;border:1px solid #dfe2e6;border-radius:9px;outline:0;background:#fff;color:#333b46;font-size:12px}.field textarea{resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,11,.08)}
        .formActions{display:flex;gap:10px;margin-top:18px}.saveButton,.cancelButton,.resetButton{min-height:42px;padding:0 17px;border:0;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;font-weight:700;cursor:pointer}.saveButton{background:linear-gradient(135deg,var(--red),#ed4b26);color:#fff}.saveButton svg,.resetButton svg{width:17px;height:17px}.saveButton:disabled{opacity:.6}.cancelButton{background:#eef0f2;color:#5e6670}
        .filterGrid{display:grid;grid-template-columns:2fr 1fr 1fr auto;gap:12px;align-items:end;margin-top:18px}.searchField{position:relative}.searchField>svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:var(--red)}.searchField input{padding-left:39px}.resetButton{height:43px;color:var(--red);background:#fff2e9;border:1px solid #f7d6c1}.found{margin-top:12px;color:#858d99;font-size:9px}
        .listCard{overflow:hidden}.listHeader{padding:17px 19px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eef0f2}.countPill{padding:6px 10px;border-radius:20px;background:#fff0e6;color:var(--red);font-size:8px;font-weight:800}.tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th{padding:12px 14px;text-align:left;background:#f7f8fa;border-bottom:1px solid #e8eaed;color:#56606d;font-size:9px;font-weight:800;text-transform:uppercase;white-space:nowrap}td{padding:13px 14px;border-bottom:1px solid #eef0f2;color:#66707c;font-size:10px;white-space:nowrap}tbody tr:hover{background:#fffaf7}.ref{color:var(--navy)}
        .badge{display:inline-flex;padding:5px 9px;border-radius:20px;font-size:8px;font-weight:800}.badge.red{color:var(--red);background:#fdebed}.badge.orange{color:#d85d10;background:#fff0e6}.badge.green{color:var(--green);background:#e8f8f1}.badge.gray{color:#68717c;background:#f0f1f3}.actions{display:flex;gap:6px}.actionButton{width:32px;height:32px;padding:0;border:0;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}.actionButton svg{width:16px;height:16px}.actionButton.edit{color:#d85d10;background:#fff0e6}.actionButton.delete{color:var(--red);background:#fdebed}.empty{padding:50px;text-align:center;color:#858d99;font-size:11px}
        @media(max-width:1150px){.statsGrid{grid-template-columns:repeat(2,1fr)}.formGrid{grid-template-columns:repeat(2,1fr)}.filterGrid{grid-template-columns:1fr 1fr}}@media(max-width:800px){.app{display:block}.sidebar{position:relative;width:100%;min-height:auto}.logoArea{height:135px}.sidebar nav{display:grid;grid-template-columns:repeat(2,1fr)}.sidebarSlogan,.sidebarFooter{display:none}.main{width:100%;margin-left:0}.hero{min-height:250px;flex-direction:column}.pageContent{margin-top:-50px}.statsGrid,.formGrid,.filterGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

function NavItem({href,label,icon,active=false}:{href:string;label:string;icon:ReactNode;active?:boolean}){return <Link href={href} className={`navItem ${active?"active":""}`}>{icon}<span>{label}</span></Link>}
function StatCard({title,value,icon,orange=false}:{title:string;value:number;icon:ReactNode;orange?:boolean}){return <div className={`statCard ${orange?"orange":""}`}><div className="statIcon">{icon}</div><div><div className="statLabel">{title}</div><div className="statValue">{value}</div></div></div>}
function SectionHeader({icon,title,subtitle}:{icon:ReactNode;title:string;subtitle:string}){return <div className="sectionHeader"><div className="sectionIcon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
function StatusBadge({value}:{value:string}){const c=value==="Terminée"?"green":value==="En cours"?"orange":value==="À faire"?"red":"gray";return <span className={`badge ${c}`}>{value}</span>}
function PriorityBadge({value}:{value:string}){const c=value==="Urgente"?"red":value==="Faible"?"green":"gray";return <span className={`badge ${c}`}>{value}</span>}
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
