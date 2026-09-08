"use client";

import { useEffect, useState, ReactNode } from "react";
import Link from "next/link";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

type Client = {
  id: string;
  nom: string;
  telephone: string | null;
  email: string | null;
  adresse: string | null;
  notes: string | null;
  created_at: string;
};

export default function ClientsPage() {
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showForm, setShowForm] = useState(false);

  const [form, setForm] = useState({
    nom: "",
    telephone: "",
    email: "",
    adresse: "",
    notes: "",
  });

  async function chargerClients() {
    setLoading(true);

    const { data, error } = await supabase
      .from("clients")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      console.error(error);
      alert("Erreur lors du chargement des clients : " + error.message);
    } else {
      setClients(data || []);
    }

    setLoading(false);
  }

  useEffect(() => {
    chargerClients();
  }, []);

  async function creerClient(e: React.FormEvent) {
    e.preventDefault();

    if (!form.nom.trim()) {
      alert("Veuillez saisir le nom du client.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("clients").insert({
      nom: form.nom.trim(),
      telephone: form.telephone.trim() || null,
      email: form.email.trim() || null,
      adresse: form.adresse.trim() || null,
      notes: form.notes.trim() || null,
    });

    if (error) {
      console.error(error);
      alert("Erreur lors de la création du client : " + error.message);
    } else {
      alert("Client créé avec succès");

      setForm({
        nom: "",
        telephone: "",
        email: "",
        adresse: "",
        notes: "",
      });

      setShowForm(false);
      chargerClients();
    }

    setSaving(false);
  }

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="logoArea"><img src="/logo-eddaqaq.png" alt="EDDAQAQ EXPERTISES" /></div>
        <nav>
          <NavItem href="/" label="Tableau de bord" icon={<HomeIcon />} />
          <NavItem href="/dossiers" label="Dossiers" icon={<FolderIcon />} />
          <NavItem href="/taches" label="Tâches" icon={<TaskIcon />} />
          <NavItem href="/clients" label="Clients" icon={<UsersIcon />} active />
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
            <h1>Clients</h1>
            <p>Centralisez les coordonnées et informations de tous vos clients.</p>
          </div>
          <button className="newButton" onClick={() => setShowForm(!showForm)}><PlusIcon />Nouveau client</button>
        </section>

        <div className="pageContent">
          <section className="statsGrid">
            <StatCard title="Total clients" value={clients.length} icon={<UsersIcon />} />
            <StatCard title="Avec téléphone" value={clients.filter(c => !!c.telephone).length} icon={<PhoneIcon />} />
            <StatCard title="Avec email" value={clients.filter(c => !!c.email).length} icon={<MailIcon />} />
            <StatCard title="Avec adresse" value={clients.filter(c => !!c.adresse).length} icon={<LocationIcon />} orange />
          </section>

          {showForm && (
            <form onSubmit={creerClient} className="card formCard">
              <SectionHeader icon={<UsersIcon />} title="Nouveau client" subtitle="Ajoutez un client ou une société à votre base." />
              <div className="formGrid">
                <Field label="Nom / Raison sociale *">
                  <input type="text" value={form.nom} onChange={(e)=>setForm({...form,nom:e.target.value})} placeholder="Ex: Société ABC" required />
                </Field>
                <Field label="Téléphone">
                  <input type="text" value={form.telephone} onChange={(e)=>setForm({...form,telephone:e.target.value})} placeholder="Ex: 06 00 00 00 00" />
                </Field>
                <Field label="Email">
                  <input type="email" value={form.email} onChange={(e)=>setForm({...form,email:e.target.value})} placeholder="Ex: contact@entreprise.com" />
                </Field>
                <Field label="Adresse">
                  <input type="text" value={form.adresse} onChange={(e)=>setForm({...form,adresse:e.target.value})} placeholder="Adresse du client" />
                </Field>
                <div className="fullWidth">
                  <Field label="Notes">
                    <textarea value={form.notes} onChange={(e)=>setForm({...form,notes:e.target.value})} placeholder="Informations supplémentaires..." rows={4} />
                  </Field>
                </div>
              </div>
              <div className="formActions">
                <button type="submit" disabled={saving} className="saveButton"><SaveIcon />{saving ? "Enregistrement..." : "Enregistrer"}</button>
                <button type="button" onClick={()=>setShowForm(false)} className="cancelButton">Annuler</button>
              </div>
            </form>
          )}

          <section className="card listCard">
            <div className="listHeader">
              <SectionHeader icon={<UsersIcon />} title="Liste des clients" subtitle="Tous les clients enregistrés dans EDDAQAQ EXPERTISES." />
              <div className="countPill">{clients.length} client(s)</div>
            </div>

            {loading ? <div className="empty">Chargement...</div> : clients.length===0 ? <div className="empty">Aucun client pour le moment.</div> : (
              <div className="tableWrap">
                <table>
                  <thead><tr><th>Nom / Raison sociale</th><th>Téléphone</th><th>Email</th><th>Adresse</th><th>Notes</th></tr></thead>
                  <tbody>
                    {clients.map(client=>(
                      <tr key={client.id}>
                        <td><div className="clientCell"><div className="clientAvatar">{initiales(client.nom)}</div><strong>{client.nom}</strong></div></td>
                        <td>{client.telephone || "-"}</td>
                        <td>{client.email || "-"}</td>
                        <td>{client.adresse || "-"}</td>
                        <td className="notesCell">{client.notes || "-"}</td>
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
        :root{--red:#c82027;--orange:#ff6b0b;--navy:#14213d;--border:#e7e8eb}
        *{box-sizing:border-box}html,body{margin:0;padding:0;font-family:Arial,Helvetica,sans-serif;background:#f6f7f9;color:#303844}a{text-decoration:none;color:inherit}button,input,select,textarea{font:inherit}
        .app{min-height:100vh;display:flex}.sidebar{position:fixed;left:0;top:0;bottom:0;width:220px;padding:20px 13px;background:linear-gradient(160deg,#fff 0%,#fff 70%,#fff6f0 100%);border-right:1px solid #eee;display:flex;flex-direction:column;z-index:50}
        .logoArea{height:170px;display:flex;align-items:center;justify-content:center;margin-bottom:10px}.logoArea img{width:155px;height:155px;object-fit:contain;border-radius:50%}.sidebar nav{display:flex;flex-direction:column;gap:5px}.navItem{height:50px;padding:0 14px;display:flex;align-items:center;gap:14px;border-radius:10px;color:#334052;font-size:13px;font-weight:600;transition:.2s}.navItem:hover{background:#fff3ec;color:var(--red)}.navItem.active{color:#fff;background:linear-gradient(135deg,#d92c2c,#f05024);box-shadow:0 8px 22px rgba(207,43,37,.22)}.navItem svg{width:22px;height:22px}
        .sidebarSlogan{margin-top:auto;padding:15px;color:var(--red);font-style:italic}.sidebarSlogan strong{font-size:14px;line-height:1.25}.smallLines{width:90px;height:4px;display:flex;margin-top:14px}.smallLines span:first-child{width:55%;background:var(--red)}.smallLines span:last-child{flex:1;background:var(--orange)}.sidebarFooter{padding:15px;color:#9a9fa7;font-size:8px;line-height:1.8}
        .main{width:calc(100% - 220px);margin-left:220px;min-height:100vh;padding:0 22px 35px;background:linear-gradient(180deg,#ef552b 0,#ff813b 260px,#f6f7f9 470px)}.hero{max-width:1500px;min-height:200px;margin:auto;padding:35px 10px;display:flex;justify-content:space-between;align-items:flex-start;color:#fff}.heroText>span{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:1px;opacity:.85}.heroText h1{margin:7px 0;font-size:40px;line-height:1}.heroText p{margin:10px 0 0;font-size:14px}.newButton{margin-top:8px;padding:13px 18px;border:0;border-radius:11px;background:#fff;color:var(--red);display:flex;align-items:center;gap:8px;font-size:12px;font-weight:800;box-shadow:0 10px 25px rgba(100,30,10,.15);cursor:pointer}.newButton svg{width:18px;height:18px}.pageContent{max-width:1500px;margin:-58px auto 0}
        .statsGrid{display:grid;grid-template-columns:repeat(4,1fr);gap:13px;margin-bottom:14px}.statCard{min-height:105px;padding:17px;display:flex;align-items:center;gap:14px;background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 7px 24px rgba(31,37,45,.07)}.statIcon{width:49px;height:49px;flex-shrink:0;border-radius:50%;display:flex;align-items:center;justify-content:center;color:var(--red);background:#fdebed}.statCard.orange .statIcon{color:var(--orange);background:#fff0e6}.statIcon svg{width:24px;height:24px}.statLabel{color:#737b86;font-size:9px;font-weight:800;text-transform:uppercase}.statValue{margin-top:6px;color:var(--navy);font-size:27px;font-weight:800}
        .card{background:#fff;border:1px solid var(--border);border-radius:13px;box-shadow:0 6px 22px rgba(31,37,45,.05);margin-bottom:14px}.formCard{padding:19px}.sectionHeader{display:flex;align-items:center;gap:10px}.sectionIcon{width:40px;height:40px;border-radius:9px;display:flex;align-items:center;justify-content:center;background:linear-gradient(135deg,var(--orange),#ff4d16);color:#fff}.sectionIcon svg{width:21px;height:21px}.sectionHeader h2{margin:0;color:var(--navy);font-size:14px}.sectionHeader p{margin:4px 0 0;color:#8d939b;font-size:9px}
        .formGrid{display:grid;grid-template-columns:repeat(2,1fr);gap:16px;margin-top:20px}.fullWidth{grid-column:1/-1}.field label{display:block;margin-bottom:7px;color:#4d5661;font-size:10px;font-weight:700}.field input,.field select,.field textarea{width:100%;min-height:43px;padding:11px 12px;border:1px solid #dfe2e6;border-radius:9px;outline:0;background:#fff;color:#333b46;font-size:12px}.field textarea{resize:vertical}.field input:focus,.field select:focus,.field textarea:focus{border-color:var(--orange);box-shadow:0 0 0 3px rgba(255,107,11,.08)}
        .formActions{display:flex;gap:10px;margin-top:18px}.saveButton,.cancelButton{min-height:42px;padding:0 17px;border:0;border-radius:9px;display:flex;align-items:center;justify-content:center;gap:7px;font-size:11px;font-weight:700;cursor:pointer}.saveButton{background:linear-gradient(135deg,var(--red),#ed4b26);color:#fff}.saveButton svg{width:17px;height:17px}.saveButton:disabled{opacity:.6}.cancelButton{background:#eef0f2;color:#5e6670}
        .listCard{overflow:hidden}.listHeader{padding:17px 19px;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid #eef0f2}.countPill{padding:6px 10px;border-radius:20px;background:#fff0e6;color:var(--red);font-size:8px;font-weight:800}.tableWrap{overflow-x:auto}table{width:100%;border-collapse:collapse}th{padding:12px 14px;text-align:left;background:#f7f8fa;border-bottom:1px solid #e8eaed;color:#56606d;font-size:9px;font-weight:800;text-transform:uppercase;white-space:nowrap}td{padding:13px 14px;border-bottom:1px solid #eef0f2;color:#66707c;font-size:10px}tbody tr:hover{background:#fffaf7}.clientCell{display:flex;align-items:center;gap:9px;color:var(--navy);white-space:nowrap}.clientAvatar{width:30px;height:30px;border-radius:50%;display:flex;align-items:center;justify-content:center;background:#fdebed;color:var(--red);font-size:9px;font-weight:800}.notesCell{max-width:260px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}.empty{padding:50px;text-align:center;color:#858d99;font-size:11px}
        @media(max-width:1150px){.statsGrid{grid-template-columns:repeat(2,1fr)}}@media(max-width:800px){.app{display:block}.sidebar{position:relative;width:100%;min-height:auto}.logoArea{height:135px}.sidebar nav{display:grid;grid-template-columns:repeat(2,1fr)}.sidebarSlogan,.sidebarFooter{display:none}.main{width:100%;margin-left:0}.hero{min-height:250px;flex-direction:column}.pageContent{margin-top:-50px}.statsGrid,.formGrid{grid-template-columns:1fr}}
      `}</style>
    </div>
  );
}

function initiales(nom:string){return nom.trim().split(/\s+/).slice(0,2).map(x=>x[0]?.toUpperCase()||"").join("")}
function NavItem({href,label,icon,active=false}:{href:string;label:string;icon:ReactNode;active?:boolean}){return <Link href={href} className={`navItem ${active?"active":""}`}>{icon}<span>{label}</span></Link>}
function StatCard({title,value,icon,orange=false}:{title:string;value:number;icon:ReactNode;orange?:boolean}){return <div className={`statCard ${orange?"orange":""}`}><div className="statIcon">{icon}</div><div><div className="statLabel">{title}</div><div className="statValue">{value}</div></div></div>}
function SectionHeader({icon,title,subtitle}:{icon:ReactNode;title:string;subtitle:string}){return <div className="sectionHeader"><div className="sectionIcon">{icon}</div><div><h2>{title}</h2><p>{subtitle}</p></div></div>}
function Field({label,children}:{label:string;children:ReactNode}){return <div className="field"><label>{label}</label>{children}</div>}
function Svg({children}:{children:ReactNode}){return <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">{children}</svg>}
function HomeIcon(){return <Svg><path d="m3 11 9-8 9 8"/><path d="M5 10v10h14V10"/><path d="M9 20v-6h6v6"/></Svg>}
function FolderIcon(){return <Svg><path d="M3 7a2 2 0 0 1 2-2h5l2 2h7a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/></Svg>}
function TaskIcon(){return <Svg><rect x="4" y="3" width="16" height="18" rx="2"/><path d="m8 12 2 2 5-6"/></Svg>}
function UsersIcon(){return <Svg><circle cx="9" cy="7" r="4"/><path d="M2 21v-2a6 6 0 0 1 12 0v2"/><path d="M16 3.5a4 4 0 0 1 0 7"/><path d="M18 15a5 5 0 0 1 4 5"/></Svg>}
function FileIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 12h6M9 16h6"/></Svg>}
function DocumentIcon(){return <Svg><path d="M6 2h9l4 4v16H6z"/><path d="M14 2v5h5"/><path d="M9 11h6M9 15h6M9 19h4"/></Svg>}
function PhoneIcon(){return <Svg><path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 2 .7 2.9a2 2 0 0 1-.5 2.1L8 10a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.5c.9.3 1.9.6 2.9.7a2 2 0 0 1 1.7 2z"/></Svg>}
function MailIcon(){return <Svg><rect x="3" y="5" width="18" height="14" rx="2"/><path d="m3 7 9 6 9-6"/></Svg>}
function LocationIcon(){return <Svg><path d="M20 10c0 5-8 12-8 12S4 15 4 10a8 8 0 1 1 16 0z"/><circle cx="12" cy="10" r="2"/></Svg>}
function PlusIcon(){return <Svg><path d="M12 5v14M5 12h14"/></Svg>}
function SaveIcon(){return <Svg><path d="M5 3h12l2 2v16H5z"/><path d="M8 3v6h8V3"/><path d="M8 21v-7h8v7"/></Svg>}
