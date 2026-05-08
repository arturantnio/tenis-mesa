// Tenis de Mesa PWA - JS puro sem JSX, sem Babel
if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
  document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;font-family:monospace;color:#c04040">❌ Erro a carregar React.<br>Verifica a tua ligação à internet e recarrega.</div>';
  throw new Error('React não carregou');
}
const e = React.createElement;
const { useState, useEffect } = React;

// --- DADOS ---
const CURRENT_JORNADA = 19;
const LAST_UPDATE_DEFAULT = "07/05/2026 (quarta-feira)";
const LS_KEY = "tm_ranking_v4";

const PLAYERS_INIT = [
  { id:"JM", name:"José Martins",    pts:35, rkg:1  },
  { id:"PV", name:"Paulo Vieira",    pts:42, rkg:2  },
  { id:"LL", name:"Luís Libânio",    pts:40, rkg:3  },
  { id:"JG", name:"João Garcia",     pts:27, rkg:4  },
  { id:"RR", name:"Rui Ribeiro",     pts:28, rkg:5  },
  { id:"FA", name:"Flávio Antunes",  pts:27, rkg:6  },
  { id:"CS", name:"Cláudio Silva",   pts:27, rkg:7  },
  { id:"CM", name:"César Moreira",   pts:25, rkg:8  },
  { id:"PG", name:"Pedro Garcia",    pts:25, rkg:9  },
  { id:"HA", name:"Heider Antunes",  pts:22, rkg:10 },
  { id:"VD", name:"Vítor Duarte",    pts:19, rkg:11 },
  { id:"WC", name:"William Codfish", pts:20, rkg:12 },
  { id:"JA", name:"João Afonso",     pts:16, rkg:13 },
];

const CHALLENGE_PRIORITY = ["LL","HA","JA","CM","PG","FA","PV","VD","RR","JG","JM","WC","CS"];

const RULES = [
  { n:1,  t:"Escalonamento inicial",  d:"Ranking do último torneio." },
  { n:2,  t:"Pontos iniciais",        d:"1º→13 Pts, 2º→12 Pts, …, 13º→1 Pt. Os pontos só servem para ajustar o ranking no caso de não comparência (regra 13)." },
  { n:3,  t:"Sorteio de desafiante",  d:"Sorteio de quem desafia até definição de lista completa. Depois a rodar de acordo com a lista e a regra 6." },
  { n:4,  t:"Desafio",                d:"Desafio até 3 lugares acima." },
  { n:5,  t:"Treino",                 d:"Uma jornada por treino (de acordo com as regras de desafio acima)." },
  { n:6,  t:"Sem jogo possível",      d:"Quem não puder jogar, ou após os desafios não for possível haver mais encontros, os elementos que não jogarem assumem as primeiras posições disponíveis na lista de escolhas (desafios), na próxima oportunidade." },
  { n:7,  t:"Formato",                d:"Jogos à maior de 3 sets." },
  { n:8,  t:"Pontuação",              d:"3 pts vitória, 1 pt derrota ou não pôde jogar por nº ímpar de elementos. 0 pts não comparência." },
  { n:9,  t:"Novo escalonamento",     d:"No final de cada jornada estabelece-se novo escalonamento." },
  { n:10, t:"Vitória",                d:"Se ganha a quem está acima → toma esse lugar. Se ganha a quem está abaixo → mantém esse lugar." },
  { n:11, t:"Derrota",                d:"Se perde com quem está abaixo → perde um lugar. Se perde com quem está acima → fica." },
  { n:12, t:"Lugar ocupado por dois", d:"Quem ganhou fica com o lugar. Quem perdeu continua a descer até um lugar desocupado ou de alguém que também perdeu, ou for de alguém que não compareceu (este último desce um lugar)." },
  { n:13, t:"Não comparência",        d:"No final de cada jornada, os elementos que não comparecerem perdem o lugar para alguém abaixo que tiver mais uma diferença superior de 2 pontos ou mais." },
];

// --- STORAGE ---
function loadState() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}
function saveState(s) {
  try { localStorage.setItem(LS_KEY, JSON.stringify(s)); } catch {}
}

// --- HELPERS ---
const byRkg = arr => [...arr].sort((a,b) => a.rkg - b.rkg);

function getTargets(players, playerId) {
  const sorted = byRkg(players);
  const idx = sorted.findIndex(p => p.id === playerId);
  if (idx < 0) return [];
  return sorted.slice(Math.max(0, idx - 3), idx);
}

function applyAbsenceRule(players, absentIds) {
  let ps = players.map(p => ({ ...p }));
  const sorted = byRkg(ps);
  absentIds.forEach(aid => {
    const absentIdx = sorted.findIndex(p => p.id === aid);
    if (absentIdx < 0) return;
    const absent = sorted[absentIdx];
    for (let i = absentIdx + 1; i < sorted.length; i++) {
      const below = sorted[i];
      if (!absentIds.includes(below.id) && below.pts >= absent.pts + 2) {
        const ai = ps.findIndex(p => p.id === absent.id);
        const bi = ps.findIndex(p => p.id === below.id);
        const tmp = ps[ai].rkg;
        ps[ai] = { ...ps[ai], rkg: ps[bi].rkg };
        ps[bi] = { ...ps[bi], rkg: tmp };
        sorted[absentIdx] = { ...sorted[absentIdx], rkg: ps[ai].rkg };
        sorted[i]         = { ...sorted[i], rkg: ps[bi].rkg };
        break;
      }
    }
  });
  return ps;
}

function nowStr() {
  return new Date().toLocaleString("pt-PT", { day:"2-digit", month:"2-digit", year:"numeric", hour:"2-digit", minute:"2-digit" });
}

// --- ESTILOS ---
const S = {
  root:         { minHeight:"100vh", background:"#f4f7f4", fontFamily:"'Courier New',Courier,monospace", color:"#1a2e1a", maxWidth:500, margin:"0 auto", paddingBottom:60 },
  hdr:          { background:"linear-gradient(135deg,#1a7a3a,#228844)", borderBottom:"2px solid #1a6a30", padding:"13px 15px", display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:20 },
  htitle:       { fontSize:19, fontWeight:700, color:"#ffffff", letterSpacing:1 },
  hsub:         { fontSize:10, color:"#b8f0c8", letterSpacing:2 },
  rstBtn:       { background:"rgba(255,255,255,.2)", border:"1px solid rgba(255,255,255,.4)", color:"#fff", borderRadius:6, padding:"5px 10px", cursor:"pointer", fontSize:17, fontFamily:"monospace" },
  tabs:         { display:"flex", overflowX:"auto", background:"#ffffff", borderBottom:"2px solid #d0e8d0", position:"sticky", top:52, zIndex:19, boxShadow:"0 2px 6px rgba(0,0,0,.06)" },
  tab:          { flex:"0 0 auto", padding:"11px 9px", border:"none", background:"transparent", color:"#7aaa7a", cursor:"pointer", fontSize:10, fontFamily:"'Courier New',monospace", whiteSpace:"nowrap", borderBottom:"3px solid transparent" },
  tabOn:        { color:"#1a7a3a", borderBottom:"3px solid #1a7a3a", background:"#f0faf2" },
  body:         { padding:"13px 11px" },
  secTitle:     { fontSize:11, fontWeight:700, color:"#1a7a3a", letterSpacing:3, textTransform:"uppercase", marginBottom:11, borderBottom:"2px solid #c8e8c8", paddingBottom:5 },
  card:         { display:"flex", justifyContent:"space-between", alignItems:"center", background:"#ffffff", border:"1px solid #d8ead8", borderRadius:10, padding:"10px 12px", marginBottom:6, boxShadow:"0 1px 4px rgba(0,0,0,.05)", cursor:"pointer" },
  cardSel:      { border:"2px solid #1a7a3a", background:"#f0faf2" },
  cardTarget:   { border:"2px solid #e0a020", background:"#fffbf0" },
  cardAbsent:   { border:"1px solid #e07070", background:"#fff5f5", opacity:.9 },
  cl:           { display:"flex", alignItems:"center", gap:10 },
  cr:           { textAlign:"right" },
  pname:        { fontSize:13, fontWeight:600, color:"#1a2e1a" },
  pid:          { fontSize:10, color:"#7aaa7a", marginTop:1 },
  pts:          { fontSize:17, fontWeight:700, color:"#1a7a3a" },
  ptsl:         { fontSize:9, color:"#9aba9a", marginLeft:2 },
  targetLbl:    { fontSize:10, color:"#c07010", marginTop:2 },
  absentLbl:    { fontSize:10, color:"#c04040", marginTop:2 },
  rankNum:      { fontSize:14, fontWeight:700, color:"#8aaa8a", minWidth:28, display:"inline-block" },
  hint:         { fontSize:11, color:"#7a9a7a", marginBottom:11, lineHeight:1.6 },
  infoBox:      { background:"#f0faf2", border:"1px solid #a0d8a0", borderRadius:8, padding:"9px 12px", marginTop:9, fontSize:12, color:"#1a5a2a", lineHeight:1.6 },
  priBox:       { marginTop:16, background:"#ffffff", border:"1px solid #d0e8d0", borderRadius:10, padding:"11px 12px", boxShadow:"0 1px 4px rgba(0,0,0,.04)" },
  priTitle:     { fontSize:10, color:"#1a7a3a", letterSpacing:2, fontWeight:700, marginBottom:8 },
  chip:         { background:"#f0f7f0", border:"1px solid #c0dcc0", color:"#3a7a3a", borderRadius:6, padding:"4px 8px", fontSize:10, fontWeight:600, display:"inline-block" },
  chipOn:       { background:"#1a7a3a", border:"1px solid #1a7a3a", color:"#ffffff" },
  chipGrid:     { display:"flex", flexWrap:"wrap", gap:6 },
  matchSec:     { marginBottom:13 },
  matchLbl:     { fontSize:10, color:"#1a7a3a", letterSpacing:2, marginBottom:6, textTransform:"uppercase", fontWeight:700 },
  vs:           { textAlign:"center", fontSize:17, fontWeight:900, color:"#1a7a3a", margin:"6px 0", letterSpacing:5 },
  pBtn:         { background:"#f0f7f0", border:"1px solid #c0dcc0", color:"#2a6a2a", borderRadius:6, padding:"6px 10px", cursor:"pointer", fontSize:11, fontFamily:"'Courier New',monospace", fontWeight:700 },
  pBtnOn:       { background:"#1a7a3a", border:"1px solid #1a7a3a", color:"#ffffff" },
  winBtn:       { flex:1, background:"#f0f7f0", border:"1px solid #c0dcc0", color:"#2a6a2a", borderRadius:8, padding:"11px 6px", cursor:"pointer", fontSize:11.5, fontFamily:"'Courier New',monospace", fontWeight:700 },
  winBtnOn:     { background:"#1a7a3a", border:"2px solid #1a7a3a", color:"#ffffff" },
  confirmBtn:   { width:"100%", marginTop:14, background:"#1a7a3a", border:"2px solid #1a7a3a", color:"#ffffff", borderRadius:10, padding:"12px", fontSize:13, fontFamily:"'Courier New',monospace", fontWeight:700, cursor:"pointer" },
  btnDis:       { opacity:.4, cursor:"not-allowed", background:"#e8f0e8", border:"2px solid #c8d8c8", color:"#8aaa8a" },
  absPrev:      { background:"#fff5f5", border:"1px solid #f0c0c0", borderRadius:8, padding:"9px 12px", marginTop:10, marginBottom:4, fontSize:11.5, color:"#9a3030", lineHeight:1.6 },
  hCard:        { borderRadius:9, padding:"10px 12px", marginBottom:7, border:"1px solid" },
  hMatchCard:   { background:"#ffffff", borderColor:"#d8ead8", boxShadow:"0 1px 3px rgba(0,0,0,.05)" },
  hAbsCard:     { background:"#fff8f8", borderColor:"#f0d0d0" },
  hTime:        { fontSize:9.5, color:"#9aba9a", marginBottom:4, letterSpacing:1 },
  hMain:        { fontSize:12.5, fontWeight:600, marginBottom:3 },
  hDesc:        { fontSize:10.5, color:"#5a8a5a" },
  statsBox:     { marginTop:18, background:"#ffffff", border:"1px solid #d0e8d0", borderRadius:10, padding:"13px", boxShadow:"0 1px 4px rgba(0,0,0,.05)" },
  stTitle:      { fontSize:10, color:"#1a7a3a", letterSpacing:3, marginBottom:10, fontWeight:700 },
  stGrid:       { display:"flex", gap:8 },
  stItem:       { flex:1, background:"#f4f7f4", borderRadius:8, padding:"9px 6px", textAlign:"center", border:"1px solid #d8ead8" },
  stVal:        { fontSize:15, fontWeight:700, color:"#1a7a3a" },
  stLbl:        { fontSize:9.5, color:"#7aaa7a", marginTop:3 },
  expBtn:       { background:"#f0faf2", border:"1px solid #a0d8a0", color:"#1a7a3a", borderRadius:6, padding:"5px 11px", cursor:"pointer", fontSize:10.5, fontFamily:"'Courier New',monospace", fontWeight:700, marginBottom:12 },
  updateBanner: { display:"flex", alignItems:"center", gap:10, background:"#fff8e8", border:"1px solid #e8c850", borderRadius:10, padding:"10px 14px", marginBottom:14, boxShadow:"0 1px 4px rgba(0,0,0,.06)" },
  updateLabel:  { fontSize:9, color:"#9a7a10", letterSpacing:2, textTransform:"uppercase", fontWeight:700 },
  updateDate:   { fontSize:14, fontWeight:700, color:"#5a4a10", marginTop:2 },
  savedBadge:   { textAlign:"center", fontSize:10, color:"#9aba9a", marginTop:12, letterSpacing:1 },
  ruleCard:     { display:"flex", gap:10, marginBottom:9, background:"#ffffff", border:"1px solid #d8ead8", borderRadius:8, padding:"10px 12px", boxShadow:"0 1px 3px rgba(0,0,0,.04)" },
  ruleN:        { minWidth:21, height:21, background:"#1a7a3a", color:"#fff", borderRadius:"50%", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:900, fontSize:10, flexShrink:0 },
  ruleT:        { fontSize:12, fontWeight:700, color:"#1a2e1a", marginBottom:3 },
  ruleD:        { fontSize:10.5, color:"#4a7a4a", lineHeight:1.5 },
  overlay:      { position:"fixed", inset:0, background:"rgba(0,0,0,.5)", display:"flex", alignItems:"center", justifyContent:"center", zIndex:100, padding:20 },
  modal:        { background:"#ffffff", border:"2px solid #e07070", borderRadius:14, padding:"22px 18px", maxWidth:340, width:"100%", boxShadow:"0 8px 32px rgba(0,0,0,.15)" },
  toast:        { position:"fixed", bottom:22, left:"50%", transform:"translateX(-50%)", color:"#fff", padding:"9px 20px", borderRadius:20, fontWeight:700, fontSize:12.5, fontFamily:"'Courier New',monospace", zIndex:200, boxShadow:"0 4px 18px rgba(0,0,0,.2)", whiteSpace:"nowrap" },
};

// --- COMPONENTES ---
function Badge({ rank }) {
  if (rank === 1) return e('span', { style:{fontSize:20} }, '🥇');
  if (rank === 2) return e('span', { style:{fontSize:20} }, '🥈');
  if (rank === 3) return e('span', { style:{fontSize:20} }, '🥉');
  return e('span', { style:S.rankNum }, '#' + rank);
}

function PRow({ p, selected, target, absent, onClick }) {
  const cardStyle = { ...S.card, ...(selected?S.cardSel:{}), ...(target?S.cardTarget:{}), ...(absent?S.cardAbsent:{}) };
  return e('div', { onClick, style: cardStyle },
    e('div', { style:S.cl },
      e(Badge, { rank: p.rkg }),
      e('div', null,
        e('div', { style:S.pname }, p.name + (absent ? ' 🚫' : '')),
        e('div', { style:S.pid }, p.id)
      )
    ),
    e('div', { style:S.cr },
      e('div', { style:S.pts }, p.pts, e('span', { style:S.ptsl }, 'pts')),
      target  ? e('div', { style:S.targetLbl }, '⚡ alvo') : null,
      absent  ? e('div', { style:S.absentLbl }, 'não compareceu') : null
    )
  );
}

// --- APP ---
function App() {
  const saved = loadState();
  const [players,    setPlayers]    = useState(saved?.players    || PLAYERS_INIT);
  const [history,    setHistory]    = useState(saved?.history    || []);
  const [absences,   setAbsences]   = useState(saved?.absences   || []);
  const [lastUpdate, setLastUpdate] = useState(saved?.lastUpdate || LAST_UPDATE_DEFAULT);
  const [tab,        setTab]        = useState('ranking');
  const [myPl,       setMyPl]       = useState(null);
  const [mA,         setMA]         = useState(null);
  const [mB,         setMB]         = useState(null);
  const [winId,      setWinId]      = useState(null);
  const [toast,      setToast]      = useState(null);
  const [resetDlg,   setResetDlg]   = useState(false);

  const sorted = byRkg(players);

  useEffect(() => { saveState({ players, history, absences, lastUpdate }); }, [players, history, absences, lastUpdate]);

  function showToast(msg, col) {
    setToast({ msg, col: col || '#1a7a3a' });
    setTimeout(() => setToast(null), 2600);
  }

  function doReset() {
    setPlayers(PLAYERS_INIT); setHistory([]); setAbsences([]);
    setMA(null); setMB(null); setWinId(null); setMyPl(null);
    setLastUpdate(LAST_UPDATE_DEFAULT);
    setResetDlg(false); showToast('🔄 App reiniciada', '#e07070');
  }

  function resolveMatch() {
    if (!mA || !mB || !winId || mA.id === mB.id) return;
    const losId = winId === mA.id ? mB.id : mA.id;
    let ps = players.map(p => ({ ...p }));
    const wi = ps.findIndex(p => p.id === winId);
    const li = ps.findIndex(p => p.id === losId);
    const wR = ps[wi].rkg, lR = ps[li].rkg;
    let desc;
    if (wR > lR) {
      ps[wi] = { ...ps[wi], rkg: lR };
      ps[li] = { ...ps[li], rkg: wR };
      desc = ps[wi].id + ' subiu para #' + lR + ' · ' + ps[li].id + ' baixou para #' + wR;
    } else {
      const nLR = lR + 1;
      ps = ps.map((p,i) => i !== li && p.rkg === nLR ? { ...p, rkg: nLR+1 } : p);
      ps[li] = { ...ps[li], rkg: nLR };
      desc = ps[wi].id + ' mantém #' + wR + ' · ' + ps[li].id + ' desce para #' + nLR;
    }
    ps[wi] = { ...ps[wi], pts: ps[wi].pts + 3 };
    ps[li] = { ...ps[li], pts: ps[li].pts + 1 };
    const entry = { id: Date.now(), type:'match', time: nowStr(), winner: winId, loser: losId, wName: ps[wi].name, lName: ps[li].name, desc };
    setPlayers(ps); setHistory(h => [entry,...h]);
    setMA(null); setMB(null); setWinId(null);
    setLastUpdate(nowStr());
    showToast('✅ Resultado registado!'); setTab('ranking');
  }

  function toggleAbs(id) {
    setAbsences(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  function applyAbs() {
    if (!absences.length) { showToast('Nenhuma falta selecionada','#e0a020'); return; }
    const ps = applyAbsenceRule(players, absences);
    const entry = { id: Date.now(), type:'absence', time: nowStr(), absent: [...absences], aNames: absences.map(id => players.find(p=>p.id===id)?.name || id), desc: 'Faltas: ' + absences.join(', ') };
    setPlayers(ps); setHistory(h => [entry,...h]); setAbsences([]);
    setLastUpdate(nowStr());
    showToast('🚫 ' + entry.absent.length + ' falta(s) processada(s)', '#e07070');
    setTab('ranking');
  }

  function doExport() {
    const lines = ['=== TÉNIS DE MESA – Jornada ' + CURRENT_JORNADA + ' ===\n', 'CLASSIFICAÇÃO:'];
    byRkg(players).forEach(p => lines.push('  #' + p.rkg + '  ' + p.name.padEnd(18) + ' ' + p.pts + ' pts'));
    lines.push('\nHISTÓRICO DE JORNADA:');
    history.forEach(entry => lines.push('[' + entry.time + '] ' + entry.desc));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type:'text/plain' }));
    a.download = 'TenisMesa_J' + CURRENT_JORNADA + '.txt';
    a.click();
    showToast('📥 Exportado!');
  }

  const targets = myPl ? getTargets(players, myPl) : [];
  const myPlayer = players.find(p => p.id === myPl);

  // -- RENDER --
  const TABS = [['ranking','🏆 Rank'],['challenge','⚡ Desafios'],['match','🎮 Jogo'],['absence','🚫 Faltas'],['history','📜 Historial'],['rules','📋 Regras']];

  return e('div', { style: S.root },

    // HEADER
    e('div', { style: S.hdr },
      e('span', { style:{fontSize:34} }, '🏓'),
      e('div', { style:{flex:1} },
        e('div', { style:S.htitle }, 'Ténis de Mesa'),
        e('div', { style:S.hsub }, 'Ranking · Jornada ' + CURRENT_JORNADA)
      ),
      e('button', { style:S.rstBtn, onClick:()=>setResetDlg(true), title:'Reiniciar tudo' }, '↺')
    ),

    // TABS
    e('div', { style:S.tabs },
      ...TABS.map(([id,lbl]) =>
        e('button', { key:id, style:{...S.tab,...(tab===id?S.tabOn:{})}, onClick:()=>setTab(id) }, lbl)
      )
    ),

    // CONTEÚDO
    e('div', { style:S.body },

      // -- RANKING --
      tab === 'ranking' && e('div', null,
        e('div', { style:S.updateBanner },
          e('span', { style:{fontSize:22} }, '🕐'),
          e('div', null,
            e('div', { style:S.updateLabel }, 'Última actualização'),
            e('div', { style:S.updateDate }, lastUpdate)
          )
        ),
        e('div', { style:S.secTitle }, 'Classificação Atual'),
        ...sorted.map(p => e(PRow, { key:p.id, p, absent:absences.includes(p.id) })),
        e('div', { style:S.savedBadge }, '💾 Guardado automaticamente')
      ),

      // -- DESAFIOS --
      tab === 'challenge' && e('div', null,
        e('div', { style:S.secTitle }, 'Quem posso desafiar?'),
        e('div', { style:S.hint }, 'Clica no teu nome — os alvos ficam a amarelo (até 3 lugares acima).'),
        ...sorted.map(p => e(PRow, { key:p.id, p,
          selected: myPl === p.id,
          target: !!myPl && targets.some(t=>t.id===p.id),
          onClick: () => setMyPl(myPl===p.id ? null : p.id)
        })),
        myPl && e('div', { style:S.infoBox },
          targets.length === 0
            ? '🏆 ' + myPlayer?.name + ' já está no topo!'
            : myPlayer?.name + ' pode desafiar: ' + targets.map(t=>t.name+' (#'+t.rkg+')').join(', ')
        ),
        e('div', { style:S.priBox },
          e('div', { style:S.priTitle }, 'Lista de Prioridade – Jornada ' + CURRENT_JORNADA),
          e('div', { style:{display:'flex',flexWrap:'wrap',gap:6,marginTop:8} },
            ...CHALLENGE_PRIORITY.map((id,i) =>
              e('div', { key:id, style:{...S.chip,...(myPl===id?S.chipOn:{})} }, (i+1)+'. '+id)
            )
          )
        )
      ),

      // -- JOGO --
      tab === 'match' && e('div', null,
        e('div', { style:S.secTitle }, 'Registar Resultado'),
        e('div', { style:S.matchSec },
          e('div', { style:S.matchLbl }, 'Jogador A'),
          e('div', { style:S.chipGrid },
            ...sorted.map(p => e('button', { key:p.id, style:{...S.pBtn,...(mA?.id===p.id?S.pBtnOn:{})},
              onClick:()=>{ setMA(players.find(x=>x.id===p.id)); setWinId(null); } }, p.id))
          )
        ),
        e('div', { style:S.vs }, 'CONTRA'),
        e('div', { style:S.matchSec },
          e('div', { style:S.matchLbl }, 'Jogador B'),
          e('div', { style:S.chipGrid },
            ...sorted.map(p => e('button', { key:p.id, style:{...S.pBtn,...(mB?.id===p.id?S.pBtnOn:{})},
              onClick:()=>{ setMB(players.find(x=>x.id===p.id)); setWinId(null); } }, p.id))
          )
        ),
        mA && mB && mA.id !== mB.id && e('div', null,
          e('div', { style:{...S.matchLbl,marginTop:16} }, 'Quem ganhou?'),
          e('div', { style:{display:'flex',gap:10,marginTop:8} },
            ...[mA,mB].map(p => e('button', { key:p.id, style:{...S.winBtn,...(winId===p.id?S.winBtnOn:{})},
              onClick:()=>setWinId(p.id) }, '🏆 '+p.name))
          )
        ),
        mA && mB && mA.id===mB.id && e('div', { style:S.hint }, 'Seleciona dois jogadores diferentes.'),
        winId && e('button', { style:S.confirmBtn, onClick:resolveMatch }, '✅ Confirmar Resultado')
      ),

      // -- FALTAS --
      tab === 'absence' && e('div', null,
        e('div', { style:S.secTitle }, 'Registar Não Comparências'),
        e('div', { style:S.hint }, 'Seleciona quem não compareceu. A regra 13 é aplicada automaticamente.'),
        ...sorted.map(p => {
          const abs = absences.includes(p.id);
          return e('div', { key:p.id, onClick:()=>toggleAbs(p.id), style:{...S.card,...(abs?S.cardAbsent:{})} },
            e('div', { style:S.cl },
              e(Badge, { rank:p.rkg }),
              e('div', null,
                e('div', { style:S.pname }, p.name),
                e('div', { style:S.pid }, p.id)
              )
            ),
            e('div', { style:S.cr },
              e('div', { style:S.pts }, p.pts, e('span', { style:S.ptsl }, 'pts')),
              abs ? e('div', { style:S.absentLbl }, '🚫 ausente') : e('div', { style:{fontSize:10,color:'#2a8a2a'} }, '✓ presente')
            )
          );
        }),
        absences.length > 0 && e('div', { style:S.absPrev },
          e('span', { style:{color:'#c04040',fontWeight:700} }, 'Ausentes (' + absences.length + '): '),
          absences.map(id => players.find(p=>p.id===id)?.name).join(', ')
        ),
        e('button', {
          style:{...S.confirmBtn,...(absences.length===0?S.btnDis:{background:'#c04040',border:'2px solid #c04040',color:'#fff'})},
          onClick:applyAbs, disabled:absences.length===0
        }, '🚫 Processar Faltas (' + absences.length + ')')
      ),

      // -- HISTORIAL --
      tab === 'history' && e('div', null,
        e('div', { style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12} },
          e('div', { style:S.secTitle }, 'Historial da Sessão'),
          history.length > 0 && e('button', { style:S.expBtn, onClick:doExport }, '📥 Exportar')
        ),
        history.length === 0 && e('div', { style:S.hint }, 'Ainda não há registos nesta sessão.'),
        ...history.map(entry =>
          e('div', { key:entry.id, style:{...S.hCard,...(entry.type==='absence'?S.hAbsCard:S.hMatchCard)} },
            e('div', { style:S.hTime }, entry.time),
            entry.type === 'match'
              ? e('div', null,
                  e('div', { style:S.hMain },
                    e('span', { style:{color:'#1a7a3a'} }, '🏆 '+entry.wName),
                    e('span', { style:{color:'#9aba9a'} }, ' contra '),
                    e('span', { style:{color:'#c04040'} }, entry.lName)
                  ),
                  e('div', { style:S.hDesc }, entry.desc)
                )
              : e('div', null,
                  e('div', { style:S.hMain }, e('span', { style:{color:'#c04040'} }, '🚫 Faltas processadas')),
                  e('div', { style:S.hDesc }, entry.aNames?.join(', '))
                )
          )
        ),
        history.length > 0 && (() => {
          const matches = history.filter(x=>x.type==='match');
          const absCnt = history.filter(x=>x.type==='absence').reduce((a,x)=>a+(x.absent?.length||0),0);
          const wins = {};
          matches.forEach(x => { wins[x.winner]=(wins[x.winner]||0)+1; });
          const top = Object.entries(wins).sort((a,b)=>b[1]-a[1])[0];
          return e('div', { style:S.statsBox },
            e('div', { style:S.stTitle }, 'Resumo'),
            e('div', { style:S.stGrid },
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, matches.length), e('div', { style:S.stLbl }, 'jogos')),
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, absCnt), e('div', { style:S.stLbl }, 'faltas')),
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, top ? top[0]+'('+top[1]+'V)' : '—'), e('div', { style:S.stLbl }, '+ vitórias'))
            )
          );
        })()
      ),

      // -- REGRAS --
      tab === 'rules' && e('div', null,
        e('div', { style:S.secTitle }, 'Regras'),
        ...RULES.map(r =>
          e('div', { key:r.n, style:S.ruleCard },
            e('div', { style:S.ruleN }, r.n),
            e('div', null,
              e('div', { style:S.ruleT }, r.t),
              e('div', { style:S.ruleD }, r.d)
            )
          )
        )
      )
    ),

    // MODAL RESET
    resetDlg && e('div', { style:S.overlay },
      e('div', { style:S.modal },
        e('div', { style:{fontSize:16,fontWeight:700,color:'#c04040',marginBottom:8} }, '⚠️ Reiniciar App?'),
        e('div', { style:{fontSize:12,color:'#5a3030',lineHeight:1.6} }, 'Todos os dados serão apagados e o ranking volta ao estado inicial da Jornada ' + CURRENT_JORNADA + '.'),
        e('div', { style:{display:'flex',gap:10,marginTop:16} },
          e('button', { style:{...S.confirmBtn,flex:1,marginTop:0,background:'#c04040',border:'2px solid #c04040',color:'#fff'}, onClick:doReset }, 'Confirmar'),
          e('button', { style:{...S.confirmBtn,flex:1,marginTop:0,background:'#f0f7f0',border:'2px solid #c0dcc0',color:'#2a6a2a'}, onClick:()=>setResetDlg(false) }, 'Cancelar')
        )
      )
    ),

    // TOAST
    toast && e('div', { style:{...S.toast,background:toast.col} }, toast.msg)
  );
}

// --- ARRANQUE ---
const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(e(App, null));
