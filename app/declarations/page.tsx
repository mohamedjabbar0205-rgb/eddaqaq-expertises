"use client";

import { useEffect, useMemo, useState, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Client = {
  id: string;
  nom: string;
};

type TypeDeclaration = {
  id: string;
  nom: string;
  periodicite: string;
  actif: boolean;
};

type DeclarationClient = {
  id: string;
  client_id: string;
  type_declaration_id: string;
  mois_debut: number;
  annee_debut: number;
  jour_limite: number | null;
  responsable: string | null;
  actif: boolean;
};

type SuiviDeclaration = {
  id: string;
  declaration_client_id: string;
  mois: number;
  annee: number;
  statut: string;
  date_depot: string | null;
  commentaire: string | null;
};

type SuiviLocal = {
  statut: string;
  date_depot: string;
  commentaire: string;
};

const moisNoms = [
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

export default function DeclarationsPage() {
  const maintenant = new Date();

  const [mois, setMois] = useState(maintenant.getMonth() + 1);
  const [annee, setAnnee] = useState(maintenant.getFullYear());

  const [clients, setClients] = useState<Client[]>([]);
  const [types, setTypes] = useState<TypeDeclaration[]>([]);
  const [configurations, setConfigurations] = useState<DeclarationClient[]>([]);
  const [suivis, setSuivis] = useState<SuiviDeclaration[]>([]);

  const [chargement, setChargement] = useState(true);
  const [afficherFormulaire, setAfficherFormulaire] = useState(false);
  const [declarationEnModification, setDeclarationEnModification] = useState<string | null>(null);

  const [clientId, setClientId] = useState("");
  const [typeId, setTypeId] = useState("");
  const [responsable, setResponsable] = useState("");
  const [jourLimite, setJourLimite] = useState("");
  const [moisDebut, setMoisDebut] = useState(
    String(maintenant.getMonth() + 1)
  );
  const [anneeDebut, setAnneeDebut] = useState(
    String(maintenant.getFullYear())
  );

  const [recherche, setRecherche] = useState("");
  const [filtreStatut, setFiltreStatut] = useState("Tous");

  const [suivisLocaux, setSuivisLocaux] = useState<
    Record<string, SuiviLocal>
  >({});

  useEffect(() => {
    chargerDonneesBase();
  }, []);

  useEffect(() => {
    chargerSuivis();
  }, [mois, annee]);

  async function chargerDonneesBase() {
    setChargement(true);

    const [
      { data: clientsData, error: clientsError },
      { data: typesData, error: typesError },
      { data: configurationsData, error: configurationsError },
    ] = await Promise.all([
      supabase.from("clients").select("id, nom").order("nom"),
      supabase
        .from("types_declarations")
        .select("*")
        .eq("actif", true)
        .order("nom"),
      supabase
        .from("declarations_clients")
        .select("*")
        .eq("actif", true)
        .order("created_at", { ascending: false }),
    ]);

    if (clientsError) {
      console.error(clientsError);
      alert("Erreur lors du chargement des clients.");
    }

    if (typesError) {
      console.error(typesError);
      alert("Erreur lors du chargement des types de déclarations.");
    }

    if (configurationsError) {
      console.error(configurationsError);
      alert("Erreur lors du chargement des déclarations clients.");
    }

    setClients(clientsData || []);
    setTypes(typesData || []);
    setConfigurations(configurationsData || []);

    setChargement(false);
  }

  async function chargerSuivis() {
    const { data, error } = await supabase
      .from("suivi_declarations")
      .select("*")
      .eq("mois", mois)
      .eq("annee", annee);

    if (error) {
      console.error(error);
      return;
    }

    const resultat = data || [];

    setSuivis(resultat);

    const locaux: Record<string, SuiviLocal> = {};

    resultat.forEach((item) => {
      locaux[item.declaration_client_id] = {
        statut: item.statut || "À faire",
        date_depot: item.date_depot || "",
        commentaire: item.commentaire || "",
      };
    });

    setSuivisLocaux(locaux);
  }

  function declarationDoitApparaitre(config: DeclarationClient) {
    const periodeSelectionnee = annee * 12 + (mois - 1);
    const periodeDebut = config.annee_debut * 12 + (config.mois_debut - 1);

    if (periodeSelectionnee < periodeDebut) {
      return false;
    }

    const difference = periodeSelectionnee - periodeDebut;

    const type = types.find((t) => t.id === config.type_declaration_id);

    if (!type) return false;

    const periodicite = type.periodicite?.toLowerCase() || "";

    if (periodicite.includes("mens")) {
      return true;
    }

    if (periodicite.includes("trim")) {
      return difference % 3 === 0;
    }

    if (periodicite.includes("ann")) {
      return difference % 12 === 0;
    }

    return true;
  }

  const declarationsDuMois = useMemo(() => {
    return configurations
      .filter(declarationDoitApparaitre)
      .map((config) => {
        const client = clients.find((c) => c.id === config.client_id);
        const type = types.find(
          (t) => t.id === config.type_declaration_id
        );

        const suiviExistant = suivis.find(
          (s) => s.declaration_client_id === config.id
        );

        return {
          ...config,
          clientNom: client?.nom || "Client inconnu",
          typeNom: type?.nom || "Déclaration inconnue",
          periodicite: type?.periodicite || "-",
          suiviExistant,
        };
      });
  }, [configurations, clients, types, suivis, mois, annee]);

  const declarationsFiltrees = useMemo(() => {
    return declarationsDuMois.filter((item) => {
      const texte = recherche.toLowerCase();

      const correspondRecherche =
        item.clientNom.toLowerCase().includes(texte) ||
        item.typeNom.toLowerCase().includes(texte) ||
        (item.responsable || "").toLowerCase().includes(texte);

      const suivi = suivisLocaux[item.id];

      const statut = suivi?.statut || "À faire";

      const correspondStatut =
        filtreStatut === "Tous" || statut === filtreStatut;

      return correspondRecherche && correspondStatut;
    });
  }, [
    declarationsDuMois,
    recherche,
    filtreStatut,
    suivisLocaux,
  ]);

  function moisPrecedent() {
    if (mois === 1) {
      setMois(12);
      setAnnee((a) => a - 1);
    } else {
      setMois((m) => m - 1);
    }
  }

  function moisSuivant() {
    if (mois === 12) {
      setMois(1);
      setAnnee((a) => a + 1);
    } else {
      setMois((m) => m + 1);
    }
  }

  function revenirAujourdhui() {
    const date = new Date();

    setMois(date.getMonth() + 1);
    setAnnee(date.getFullYear());
  }

  function reinitialiserFormulaire() {
    setDeclarationEnModification(null);
    setClientId("");
    setTypeId("");
    setResponsable("");
    setJourLimite("");
    setMoisDebut(String(mois));
    setAnneeDebut(String(annee));
    setAfficherFormulaire(false);
  }

  function ouvrirNouvelleDeclaration() {
    setDeclarationEnModification(null);
    setClientId("");
    setTypeId("");
    setResponsable("");
    setJourLimite("");
    setMoisDebut(String(mois));
    setAnneeDebut(String(annee));
    setAfficherFormulaire(true);
  }

  function ouvrirModification(config: DeclarationClient) {
    setDeclarationEnModification(config.id);
    setClientId(config.client_id);
    setTypeId(config.type_declaration_id);
    setResponsable(config.responsable || "");
    setJourLimite(config.jour_limite ? String(config.jour_limite) : "");
    setMoisDebut(String(config.mois_debut));
    setAnneeDebut(String(config.annee_debut));
    setAfficherFormulaire(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function ajouterDeclarationClient(e: React.FormEvent) {
    e.preventDefault();

    if (!clientId || !typeId) {
      alert("Veuillez choisir un client et une déclaration.");
      return;
    }

    const jour =
      jourLimite.trim() === "" ? null : Number(jourLimite);

    if (jour !== null && (jour < 1 || jour > 31)) {
      alert("Le jour limite doit être entre 1 et 31.");
      return;
    }

    const donnees = {
      client_id: clientId,
      type_declaration_id: typeId,
      mois_debut: Number(moisDebut),
      annee_debut: Number(anneeDebut),
      jour_limite: jour,
      responsable: responsable.trim() || null,
      actif: true,
    };

    let error;

    if (declarationEnModification) {
      const resultat = await supabase
        .from("declarations_clients")
        .update(donnees)
        .eq("id", declarationEnModification);

      error = resultat.error;
    } else {
      const resultat = await supabase
        .from("declarations_clients")
        .insert(donnees);

      error = resultat.error;
    }

    if (error) {
      console.error(error);

      if (error.code === "23505") {
        alert("Cette déclaration existe déjà pour ce client.");
      } else {
        alert(
          declarationEnModification
            ? "Erreur lors de la modification de la déclaration."
            : "Erreur lors de l'ajout de la déclaration."
        );
      }

      return;
    }

    alert(
      declarationEnModification
        ? "Déclaration modifiée avec succès."
        : "Déclaration ajoutée avec succès."
    );

    reinitialiserFormulaire();

    await chargerDonneesBase();
    await chargerSuivis();
  }

  function modifierSuiviLocal(
    declarationId: string,
    champ: keyof SuiviLocal,
    valeur: string
  ) {
    setSuivisLocaux((ancien) => ({
      ...ancien,
      [declarationId]: {
        statut:
          ancien[declarationId]?.statut || "À faire",
        date_depot:
          ancien[declarationId]?.date_depot || "",
        commentaire:
          ancien[declarationId]?.commentaire || "",
        [champ]: valeur,
      },
    }));
  }

  async function enregistrerSuivi(declarationId: string) {
    const valeurs = suivisLocaux[declarationId] || {
      statut: "À faire",
      date_depot: "",
      commentaire: "",
    };

    const { error } = await supabase
      .from("suivi_declarations")
      .upsert(
        {
          declaration_client_id: declarationId,
          mois,
          annee,
          statut: valeurs.statut,
          date_depot: valeurs.date_depot || null,
          commentaire: valeurs.commentaire.trim() || null,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: "declaration_client_id,mois,annee",
        }
      );

    if (error) {
      console.error(error);
      alert("Erreur lors de l'enregistrement.");
      return;
    }

    alert("Déclaration enregistrée avec succès.");

    await chargerSuivis();
  }

  async function supprimerConfiguration(id: string) {
    const confirmation = window.confirm(
      "Voulez-vous vraiment supprimer cette déclaration du client ?"
    );

    if (!confirmation) return;

    const { error } = await supabase
      .from("declarations_clients")
      .delete()
      .eq("id", id);

    if (error) {
      console.error(error);
      alert("Erreur lors de la suppression.");
      return;
    }

    alert("Déclaration supprimée.");

    await chargerDonneesBase();
    await chargerSuivis();
  }

  function statutPour(id: string) {
    return suivisLocaux[id]?.statut || "À faire";
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoArea"><img src="/logo-eddaqaq.png" alt="EDDAQAQ EXPERTISES" /></div>
        <nav>
          <NavItem href="/" label="Tableau de bord" icon={<HomeIcon />} />
          <NavItem href="/dossiers" label="Dossiers" icon={<FolderIcon />} />
          <NavItem href="/taches" label="Tâches" icon={<TaskIcon />} />
          <NavItem href="/clients" label="Clients" icon={<UsersIcon />} />
          <NavItem href="/declarations" label="Déclarations" icon={<DeclarationIcon />} active />
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
            <span>Gestion & suivi fiscal</span>
            <h1>Déclarations</h1>
            <p>Suivez les déclarations de vos clients mois par mois.</p>
          </div>
          <button className="newButton" onClick={() => {
            if (afficherFormulaire && !declarationEnModification) reinitialiserFormulaire();
            else ouvrirNouvelleDeclaration();
          }}><PlusIcon />Ajouter une déclaration</button>
        </section>

        <div className="pageContent">
          <section className="monthCard">
            <button className="monthButton" onClick={moisPrecedent}><ChevronLeftIcon />Mois précédent</button>
            <div className="currentMonth"><span>Période sélectionnée</span><strong>{moisNoms[mois - 1]} {annee}</strong></div>
            <button className="monthButton right" onClick={moisSuivant}>Mois suivant<ChevronRightIcon /></button>
          </section>
          <div className="todayRow"><button className="todayButton" onClick={revenirAujourdhui}><CalendarIcon />Revenir au mois actuel</button></div>

          <section className="statsGrid">
            <StatCard title="Déclarations du mois" value={declarationsDuMois.length} icon={<DeclarationIcon />} />
            <StatCard title="À faire" value={declarationsDuMois.filter(d => statutPour(d.id) === "À faire").length} icon={<FileIcon />} />
            <StatCard title="En cours" value={declarationsDuMois.filter(d => statutPour(d.id) === "En cours").length} icon={<ClockIcon />} />
            <StatCard title="Déposées" value={declarationsDuMois.filter(d => statutPour(d.id) === "Déposée").length} icon={<CheckIcon />} orange />
          </section>

          {afficherFormulaire && (
            <section className="card formCard">
              <div className="formTop">
                <SectionHeader icon={<DeclarationIcon />} title={declarationEnModification ? "Modifier la déclaration" : "Nouvelle déclaration client"} subtitle={declarationEnModification ? "Modifiez les informations puis enregistrez les changements." : "Configurez la déclaration une fois : elle apparaîtra automatiquement selon sa périodicité."} />
                <button className="closeButton" onClick={reinitialiserFormulaire}><CloseIcon /></button>
              </div>
              <form onSubmit={ajouterDeclarationClient} className="formGrid">
                <Field label="Client *">
                  <select value={clientId} onChange={(e)=>setClientId(e.target.value)} required>
                    <option value="">Choisir un client</option>
                    {clients.map(c=><option key={c.id} value={c.id}>{c.nom}</option>)}
                  </select>
                </Field>
                <Field label="Déclaration *">
                  <select value={typeId} onChange={(e)=>setTypeId(e.target.value)} required>
                    <option value="">Choisir une déclaration</option>
                    {types.map(t=><option key={t.id} value={t.id}>{t.nom} — {t.periodicite}</option>)}
                  </select>
                </Field>
                <Field label="Mois de début">
                  <select value={moisDebut} onChange={(e)=>setMoisDebut(e.target.value)}>
                    {moisNoms.map((nom,index)=><option key={index} value={index+1}>{nom}</option>)}
                  </select>
                </Field>
                <Field label="Année de début">
                  <input type="number" value={anneeDebut} onChange={(e)=>setAnneeDebut(e.target.value)} min="2020" max="2100" required />
                </Field>
                <Field label="Jour limite">
                  <input type="number" min="1" max="31" placeholder="Ex : 20" value={jourLimite} onChange={(e)=>setJourLimite(e.target.value)} />
                </Field>
                <Field label="Responsable">
                  <input type="text" placeholder="Nom du responsable" value={responsable} onChange={(e)=>setResponsable(e.target.value)} />
                </Field>
                <div className="formActions">
                  <button type="button" className="cancelButton" onClick={reinitialiserFormulaire}>Annuler</button>
                  <button type="submit" className="saveMainButton"><SaveIcon />{declarationEnModification ? "Enregistrer les modifications" : "Enregistrer"}</button>
                </div>
              </form>
            </section>
          )}

          <section className="card filtersCard">
            <SectionHeader icon={<SearchIcon />} title="Recherche & filtres" subtitle={`Déclarations de ${moisNoms[mois - 1]} ${annee}`} />
            <div className="filterGrid">
              <div className="searchField"><SearchIcon /><input type="text" placeholder="Rechercher client, déclaration, responsable..." value={recherche} onChange={(e)=>setRecherche(e.target.value)} /></div>
              <select value={filtreStatut} onChange={(e)=>setFiltreStatut(e.target.value)}>
                <option>Tous</option><option>À faire</option><option>En cours</option><option>Déposée</option><option>Terminée</option>
              </select>
            </div>
            <div className="found">{declarationsFiltrees.length} déclaration(s) trouvée(s)</div>
          </section>

          <section className="card tableCard">
            <div className="listHeader">
              <SectionHeader icon={<DeclarationIcon />} title="Suivi des déclarations" subtitle="Statut, dépôt et commentaire pour la période sélectionnée." />
              <div className="countPill">{declarationsFiltrees.length} déclaration(s)</div>
            </div>
            {chargement ? <div className="empty">Chargement...</div> : declarationsFiltrees.length===0 ? (
              <div className="empty"><strong>Aucune déclaration pour {moisNoms[mois-1]} {annee}</strong><span>Ajoutez une déclaration client ou changez de mois.</span></div>
            ) : (
              <div className="tableWrapper"><table>
                <thead><tr><th>Client</th><th>Déclaration</th><th>Périodicité</th><th>Période</th><th>Limite</th><th>Responsable</th><th>Statut</th><th>Date dépôt</th><th>Commentaire</th><th>Actions</th></tr></thead>
                <tbody>{declarationsFiltrees.map(item=>{
                  const suivi=suivisLocaux[item.id]||{statut:"À faire",date_depot:"",commentaire:""};
                  return <tr key={item.id}>
                    <td><strong className="clientName">{item.clientNom}</strong></td>
                    <td>{item.typeNom}</td>
                    <td><span className="periodBadge">{item.periodicite}</span></td>
                    <td>{moisNoms[mois-1]} {annee}</td>
                    <td>{item.jour_limite ? `${item.jour_limite.toString().padStart(2,"0")}/${mois.toString().padStart(2,"0")}/${annee}` : "-"}</td>
                    <td>{item.responsable||"-"}</td>
                    <td><select className={`tableSelect status-${slugStatus(suivi.statut)}`} value={suivi.statut} onChange={(e)=>modifierSuiviLocal(item.id,"statut",e.target.value)}><option>À faire</option><option>En cours</option><option>Déposée</option><option>Terminée</option></select></td>
                    <td><input className="tableInput" type="date" value={suivi.date_depot} onChange={(e)=>modifierSuiviLocal(item.id,"date_depot",e.target.value)} /></td>
                    <td><input className="tableInput comment" type="text" placeholder="Commentaire..." value={suivi.commentaire} onChange={(e)=>modifierSuiviLocal(item.id,"commentaire",e.target.value)} /></td>
                    <td><div className="actions">
                      <button className="actionButton save" onClick={()=>enregistrerSuivi(item.id)} title="Enregistrer"><SaveIcon /></button>
                      <button className="actionButton edit" onClick={()=>ouvrirModification(item)} title="Modifier"><EditIcon /></button>
                      <button className="actionButton delete" onClick={()=>supprimerConfiguration(item.id)} title="Supprimer"><TrashIcon /></button>
                    </div></td>
                  </tr>
                })}</tbody>
              </table></div>
            )}
          </section>
        </div>
      </main>

      <style jsx global>{`
        :root{--red:#c82027;--orange:#ff6b0b;--green:#0b9d61;--navy:#14213d;--border:#e7e8eb}
        *{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#303844}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}
        .app{min-height:100vh;display:flex}.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;padding:20px 13px;background:linear-gradient(160deg,#fff 0%,#fff 70%,#fff6f0 100%);border-right:1px solid #eee;display:flex;flex-direction:column;z-index:50}.logoArea{height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.logoArea img{width:155px;height:155px;object-fit:contain;border-radius:50%}
        .sidebar nav{display:flex;flex-direction:column;gap:5px}.navItem{height:50px;padding:0 14px;display:flex;align-items:center;gap:14px;border-radius:10px;color:#334052;font-size:13px;font-weight:600;transition:.2s}.navItem:hover{background:#fff3ec;color:var(--red)}.navItem.active{color:#fff;background:linear-gradient(135deg,#d92c2c,#f05024);box-shadow:0 8px 22px rgba(207,43,37,.22)}.navItem svg{width:22px;height:22px}.sidebarSlogan{margin-top:auto;padding:15px;color:var(--red);font-style:italic}.sidebarSlogan strong{font-size:14px;line-height:1.25}.smallLines{width:90px;height:4px;display:flex;margin-top:14px}.smallLines span:first-child{width:55%;background:var(--red)}.smallLines span:last-child{flex:1;background:var(--orange)}.sidebarFooter{padding:15px;color:#9a9fa7;font-size:8px;line-height:1.8}
        .main{width:calc(100% - 220px);margin-left:220px;min-height:100vh;padding:0 22px 35px;background:linear-gradient(180deg,#ef552b 0,#ff813b 260px,#f6f7f9 470px)}.hero{max-width:1500px;min-height:200px;margin:auto;padding:35px 10px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff}.heroText>span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.85}.heroText h1{margin:7px 0;font-size:40px;line-height:1}.heroText p{margin:10px 0 0;font-size:14px}.newButton{margin-top:8px;padding:13px 18px;border:0;border-radius:11px;background:#fff;color:var(--red);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;box-shadow:0 10px 25px rgba(100,30,10,.15);cursor:pointer}.newButton svg{width:18px;height:18px}.pageContent{max-width:1500px;margin:-58px auto 0}
        .monthCard{min-height:88px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07);display:grid;grid-template-columns:1fr auto 1fr;align-items:center;padding:14px 18px;margin-bottom:10px}.monthButton{justify-self:start;border:0;background:#fff3ec;color:var(--red);border-radius:9px;padding:10px 13px;display:flex;align-items:center;gap:6px;font-size:10px;font-weight:800;cursor:pointer}.monthButton.right{justify-self:end}.monthButton svg{width:16px;height:16px}.currentMonth{text-align:center;min-width:230px}.currentMonth span{display:block;color:#9299a2;font-size:8px;font-weight:800;text-transform:uppercase;letter-spacing:.8px;margin-bottom:5px}.currentMonth strong{font-size:20px;color:var(--navy)}.todayRow{text-align:center;margin-bottom:12px}.todayButton{border:0;background:transparent;color:#737b86;font-size:9px;font-weight:700;display:inline-flex;align-items:center;gap:5px;cursor:pointer}.todayButton svg{width:14px;height:14px}
        .statsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.statCard{min-height:105px;padding:17px;display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07)}.statIcon{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);background:#fdebed}.statCard.orange .statIcon{color:var(--orange);background:#fff0e6}.statIcon svg{width:24px;height:24px}.statLabel{color:#737b86;font-size:9px;font-weight:800;text-transform:uppercase}.statValue{margin-top:6px;color:var(--navy);font-size:27px;font-weight:800}
        .card{background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 6px 22px rgba(31,37,45,.05);margin-bottom:14px}.formCard,.filtersCard{padding:19px}.formTop,.listHeader{display:flex;align-items:center;justify-content:space-between}.sectionHeader{display:flex;align-items:center;gap:10px}.sectionIcon{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--orange),#ff4d16);color:#fff}.sectionIcon svg{width:21px;height:21px}.sectionHeader h2{margin:0;color:var(--navy);font-size:14px}.sectionHeader p{margin:4px 0 0;color:#8d939b;font-size:9px}.closeButton{width:34px;height:34px;border:0;border-radius:8px;background:#f3f4f6;color:#6b7280;display:flex;align-items:center;justify-content:center;cursor:pointer}.closeButton svg{width:17px;height:17px}
        .formGrid{display:grid;grid-template-columns:repeat(3,1fr);gap:16px;margin-top:20px}.field label{display:block;margin-bottom:7px;color:#4d5661;font-size:10px;font-weight:700}.field input,.field select,.filterGrid input,.filterGrid select{width:100%;min-height:43px;padding:11px 12px;border:1px solid #dfe2e6;border-radius:9px;outline:0;background:#fff;color:#333b46;font-size:12px}.field input:focus,.field select:focus,.filterGrid input:focus,.filterGrid select:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,11,.08)}.formActions{grid-column:1/-1;display:flex;justify-content:flex-end;gap:10px;margin-top:4px}.saveMainButton,.cancelButton{min-height:42px;padding:0 17px;border:0;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;font-weight:700;cursor:pointer}.saveMainButton{background:linear-gradient(135deg,var(--red),#ed4b26);color:#fff}.saveMainButton svg{width:17px;height:17px}.cancelButton{background:#eef0f2;color:#5e6670}
        .filterGrid{display:grid;grid-template-columns:1fr 220px;gap:12px;margin-top:18px}.searchField{position:relative}.searchField>svg{position:absolute;left:12px;top:50%;transform:translateY(-50%);width:17px;height:17px;color:var(--red)}.searchField input{padding-left:39px}.found{margin-top:12px;color:#858d99;font-size:9px}
        .tableCard{overflow:hidden}.listHeader{padding:17px 19px;border-bottom:1px solid #eef0f2}.countPill{padding:6px 10px;border-radius:20px;background:#fff0e6;color:var(--red);font-size:8px;font-weight:800}.tableWrapper{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;min-width:1380px}th{padding:12px 13px;text-align:left;background:#f7f8fa;border-bottom:1px solid #e8eaed;color:#56606d;font-size:9px;font-weight:800;text-transform:uppercase;white-space:nowrap}td{padding:11px 13px;border-bottom:1px solid #eef0f2;color:#66707c;font-size:10px;vertical-align:middle;white-space:nowrap}tbody tr:hover{background:#fffaf7}.clientName{color:var(--navy)}.periodBadge{display:inline-flex;padding:5px 9px;border-radius:20px;background:#fff0e6;color:#d85d10;font-size:8px;font-weight:800}.tableSelect,.tableInput{min-width:125px;padding:8px;border:1px solid #e0e3e7;border-radius:7px;background:#fff;font-size:9px;outline:0}.tableInput{min-width:135px}.comment{min-width:180px}.status-à-faire{background:#fdebed;color:var(--red)}.status-en-cours{background:#fff0e6;color:#d85d10}.status-déposée,.status-terminée{background:#e8f8f1;color:var(--green)}
        .actions{display:flex;gap:5px}.actionButton{width:31px;height:31px;border:0;border-radius:8px;display:flex;align-items:center;justify-content:center;cursor:pointer}.actionButton svg{width:15px;height:15px}.actionButton.save{color:#fff;background:linear-gradient(135deg,var(--red),#ed4b26)}.actionButton.edit{color:#d85d10;background:#fff0e6}.actionButton.delete{color:var(--red);background:#fdebed}.empty{padding:50px;text-align:center;color:#858d99;font-size:11px;display:flex;flex-direction:column;gap:7px}.empty strong{color:#4b5563;font-size:13px}
        @media(max-width:1150px){.statsGrid{grid-template-columns:repeat(2,1fr)}.formGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.app{display:block}.sidebar{position:relative;width:100%;min-height:auto}.logoArea{height:135px}.sidebar nav{display:grid;grid-template-columns:repeat(2,1fr)}.sidebarSlogan,.sidebarFooter{display:none}.main{width:100%;margin-left:0}.hero{min-height:250px;flex-direction:column}.pageContent{margin-top:-50px}.statsGrid,.formGrid,.filterGrid{grid-template-columns:1fr}.monthCard{grid-template-columns:1fr 1fr;gap:10px}.currentMonth{grid-column:1/-1;grid-row:1}.monthButton.right{justify-self:stretch}.monthButton{justify-content:center}}
      `}</style>
    </div>
  );
}

function slugStatus(v:string){return v.toLowerCase().replace(/\s+/g,"-")}
function NavItem({href,label,icon,active=false}:{href:string;label:string;icon:ReactNode;active?:boolean}){return <Link href={href} className={`navItem ${active?"active":""}`}>{icon}<span>{label}</span></Link>}
function StatCard({title,value,icon,orange=false}:{title:string;value:number;icon:ReactNode;orange?:boolean}){return <div className={`statCard ${orange?"orange":""}`}><div className="statIcon">{icon}</div><div><div className="statLabel">{title}</div><div className="statValue">{value}</div></div></div>}
function SectionHeader({icon,title,subtitle}:{icon:ReactNode;title:string;subtitle:string}){return <div className="sectionHeader"><div className="sectionIcon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
function Svg({children}:{children:ReactNode}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>}
function HomeIcon(){return <Svg><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Svg>}
function FolderIcon(){return <Svg><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>}
function TaskIcon(){return <Svg><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2 2 5-6"/></Svg>}
function UsersIcon(){return <Svg><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 12 0v2"/><path d="M16 3.5a4 4 0 0 1 0 7"/><path d="M18 15a5 5 0 0 1 4 5"/></Svg>}
function DeclarationIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="m9 15 2 2 4-5"/></Svg>}
function DocumentIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 11h6M9 15h6M9 19h4"/></Svg>}
function FileIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h6"/></Svg>}
function SearchIcon(){return <Svg><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4"/></Svg>}
function ClockIcon(){return <Svg><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></Svg>}
function CheckIcon(){return <Svg><circle cx="12" cy="12" r="9"/><path d="m8 12 3 3 5-6"/></Svg>}
function CalendarIcon(){return <Svg><rect x="3" y="5" width="18" height="16" rx="2"/><path d="M8 3v4M16 3v4M3 10h18"/></Svg>}
function ChevronLeftIcon(){return <Svg><path d="m15 18-6-6 6-6"/></Svg>}
function ChevronRightIcon(){return <Svg><path d="m9 18 6-6-6-6"/></Svg>}
function PlusIcon(){return <Svg><path d="M12 5v14M5 12h14"/></Svg>}
function SaveIcon(){return <Svg><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></Svg>}
function EditIcon(){return <Svg><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/></Svg>}
function TrashIcon(){return <Svg><path d="M3 6h18"/><path d="M8 6V4h8v2"/><path d="M19 6l-1 15H6L5 6"/><path d="M10 11v5M14 11v5"/></Svg>}
function CloseIcon(){return <Svg><path d="M6 6l12 12M18 6 6 18"/></Svg>}
