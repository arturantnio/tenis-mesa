// Tenis de Mesa PWA - v5
if (typeof React === 'undefined' || typeof ReactDOM === 'undefined') {
  document.getElementById('root').innerHTML = '<div style="padding:40px;text-align:center;font-family:monospace;color:#c04040">Erro a carregar React. Verifica a ligacao e recarrega.</div>';
  throw new Error('React nao carregou');
}
const e = React.createElement;
const { useState, useEffect, useRef } = React;

// --- UTILIZADORES / PINS ---
const USERS = {
  '1982': { id:'JM', name:'José Martins',  color:'#1a7a3a' },
  '2025': { id:'RR', name:'Rui Ribeiro',   color:'#1a5a8a' },
};
const SESSION_TIMEOUT = 30 * 60 * 1000; // 30 minutos

// --- DADOS INICIAIS ---
const JORNADA_INIT = 19;
const LS_KEY = 'tm_ranking_v5';

const PLAYERS_INIT = [
  { id:'JM', name:'José Martins',    pts:35, rkg:1  },
  { id:'PV', name:'Paulo Vieira',    pts:42, rkg:2  },
  { id:'LL', name:'Luís Libânio',    pts:40, rkg:3  },
  { id:'JG', name:'João Garcia',     pts:27, rkg:4  },
  { id:'RR', name:'Rui Ribeiro',     pts:28, rkg:5  },
  { id:'FA', name:'Flávio Antunes',  pts:27, rkg:6  },
  { id:'CS', name:'Cláudio Silva',   pts:27, rkg:7  },
  { id:'CM', name:'César Moreira',   pts:25, rkg:8  },
  { id:'PG', name:'Pedro Garcia',    pts:25, rkg:9  },
  { id:'HA', name:'Heider Antunes',  pts:22, rkg:10 },
  { id:'VD', name:'Vítor Duarte',    pts:19, rkg:11 },
  { id:'WC', name:'William Codfish', pts:20, rkg:12 },
  { id:'JA', name:'João Afonso',     pts:16, rkg:13 },
];

const CHALLENGE_PRIORITY_INIT = ['LL','HA','JA','CM','PG','FA','PV','VD','RR','JG','JM','WC','CS'];

const RULES = [
  { n:1,  t:'Escalonamento inicial',  d:'Ranking do último torneio.' },
  { n:2,  t:'Pontos iniciais',        d:'1 a 13 Pts conforme posição. Os pontos só servem para ajustar o ranking no caso de não comparência (regra 13).' },
  { n:3,  t:'Sorteio de desafiante',  d:'Sorteio de quem desafia até definição de lista completa. Depois a rodar de acordo com a lista e a regra 6.' },
  { n:4,  t:'Desafio',                d:'Desafio até 3 lugares acima.' },
  { n:5,  t:'Treino',                 d:'Uma jornada por treino (de acordo com as regras de desafio acima).' },
  { n:6,  t:'Sem jogo possível',      d:'Quem não puder jogar, ou após os desafios não for possível haver mais encontros, os elementos que não jogarem assumem as primeiras posições disponíveis na lista de escolhas (desafios), na próxima oportunidade.' },
  { n:7,  t:'Formato',                d:'Jogos à maior de 3 sets.' },
  { n:8,  t:'Pontuação',              d:'3 pts vitória, 1 pt derrota ou não pôde jogar por nº ímpar de elementos. 0 pts não comparência.' },
  { n:9,  t:'Novo escalonamento',     d:'No final de cada jornada estabelece-se novo escalonamento.' },
  { n:10, t:'Vitória',                d:'Se ganha a quem está acima toma esse lugar. Se ganha a quem está abaixo mantém esse lugar.' },
  { n:11, t:'Derrota',                d:'Se perde com quem está abaixo perde um lugar. Se perde com quem está acima fica.' },
  { n:12, t:'Lugar ocupado por dois', d:'Quem ganhou fica com o lugar. Quem perdeu continua a descer até um lugar desocupado ou de alguém que também perdeu, ou for de alguém que não compareceu (este último desce um lugar).' },
  { n:13, t:'Não comparência',        d:'No final de cada jornada, os elementos que não comparecerem perdem o lugar para alguém abaixo que tiver mais uma diferença superior de 2 pontos ou mais.' },
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
  return new Date().toLocaleString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
}

function dateStr() {
  return new Date().toLocaleDateString('pt-PT', { day:'2-digit', month:'2-digit', year:'numeric' });
}

// --- ESTILOS ---
const S = {
  root:         { minHeight:'100vh', background:'#f4f7f4', fontFamily:"'Courier New',Courier,monospace", color:'#1a2e1a', maxWidth:740, margin:'0 auto', paddingBottom:60 },
  hdr:          { background:'linear-gradient(135deg,#1a7a3a,#228844)', borderBottom:'2px solid #1a6a30', padding:'16px 24px', display:'flex', alignItems:'center', gap:14, position:'sticky', top:0, zIndex:20 },
  htitle:       { fontSize:22, fontWeight:700, color:'#ffffff', letterSpacing:1 },
  hsub:         { fontSize:11, color:'#b8f0c8', letterSpacing:2 },
  hdrBtns:      { display:'flex', gap:8, marginLeft:'auto', alignItems:'center' },
  lockBtn:      { background:'rgba(255,255,255,.2)', border:'1px solid rgba(255,255,255,.4)', color:'#fff', borderRadius:6, padding:'6px 12px', cursor:'pointer', fontSize:15, fontFamily:'monospace' },
  userBadge:    { background:'rgba(255,255,255,.25)', border:'1px solid rgba(255,255,255,.5)', color:'#fff', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:700 },
  tabs:         { display:'flex', overflowX:'auto', background:'#ffffff', borderBottom:'2px solid #d0e8d0', position:'sticky', top:58, zIndex:19, boxShadow:'0 2px 6px rgba(0,0,0,.06)', padding:'0 8px' },
  tab:          { flex:'0 0 auto', padding:'13px 16px', border:'none', background:'transparent', color:'#7aaa7a', cursor:'pointer', fontSize:12, fontFamily:"'Courier New',monospace", whiteSpace:'nowrap', borderBottom:'3px solid transparent' },
  tabOn:        { color:'#1a7a3a', borderBottom:'3px solid #1a7a3a', background:'#f0faf2' },
  tabLocked:    { color:'#c0c0c0', cursor:'not-allowed' },
  body:         { padding:'20px 24px' },
  secTitle:     { fontSize:12, fontWeight:700, color:'#1a7a3a', letterSpacing:3, textTransform:'uppercase', marginBottom:14, borderBottom:'2px solid #c8e8c8', paddingBottom:6 },
  card:         { display:'flex', justifyContent:'space-between', alignItems:'center', background:'#ffffff', border:'1px solid #d8ead8', borderRadius:12, padding:'13px 16px', marginBottom:8, boxShadow:'0 1px 4px rgba(0,0,0,.05)', cursor:'pointer' },
  cardSel:      { border:'2px solid #1a7a3a', background:'#f0faf2' },
  cardTarget:   { border:'2px solid #e0a020', background:'#fffbf0' },
  cardAbsent:   { border:'1px solid #e07070', background:'#fff5f5', opacity:.9 },
  cl:           { display:'flex', alignItems:'center', gap:14 },
  cr:           { textAlign:'right' },
  pname:        { fontSize:15, fontWeight:600, color:'#1a2e1a' },
  pid:          { fontSize:11, color:'#7aaa7a', marginTop:2 },
  pts:          { fontSize:20, fontWeight:700, color:'#1a7a3a' },
  ptsl:         { fontSize:10, color:'#9aba9a', marginLeft:2 },
  targetLbl:    { fontSize:11, color:'#c07010', marginTop:2 },
  absentLbl:    { fontSize:11, color:'#c04040', marginTop:2 },
  rankNum:      { fontSize:16, fontWeight:700, color:'#8aaa8a', minWidth:32, display:'inline-block' },
  hint:         { fontSize:12, color:'#7a9a7a', marginBottom:12, lineHeight:1.6 },
  infoBox:      { background:'#f0faf2', border:'1px solid #a0d8a0', borderRadius:10, padding:'12px 16px', marginTop:10, fontSize:13, color:'#1a5a2a', lineHeight:1.6 },
  priBox:       { marginTop:18, background:'#ffffff', border:'1px solid #d0e8d0', borderRadius:12, padding:'14px 16px', boxShadow:'0 1px 4px rgba(0,0,0,.04)' },
  priTitle:     { fontSize:11, color:'#1a7a3a', letterSpacing:2, fontWeight:700, marginBottom:10 },
  chip:         { background:'#f0f7f0', border:'1px solid #c0dcc0', color:'#3a7a3a', borderRadius:6, padding:'5px 10px', fontSize:11, fontWeight:600, display:'inline-block' },
  chipOn:       { background:'#1a7a3a', border:'1px solid #1a7a3a', color:'#ffffff' },
  chipGrid:     { display:'flex', flexWrap:'wrap', gap:7 },
  matchSec:     { marginBottom:16 },
  matchLbl:     { fontSize:11, color:'#1a7a3a', letterSpacing:2, marginBottom:8, textTransform:'uppercase', fontWeight:700 },
  vs:           { textAlign:'center', fontSize:20, fontWeight:900, color:'#1a7a3a', margin:'8px 0', letterSpacing:6 },
  pBtn:         { background:'#f0f7f0', border:'1px solid #c0dcc0', color:'#2a6a2a', borderRadius:7, padding:'8px 13px', cursor:'pointer', fontSize:12, fontFamily:"'Courier New',monospace", fontWeight:700 },
  pBtnOn:       { background:'#1a7a3a', border:'1px solid #1a7a3a', color:'#ffffff' },
  winBtn:       { flex:1, background:'#f0f7f0', border:'1px solid #c0dcc0', color:'#2a6a2a', borderRadius:10, padding:'14px 8px', cursor:'pointer', fontSize:13, fontFamily:"'Courier New',monospace", fontWeight:700 },
  winBtnOn:     { background:'#1a7a3a', border:'2px solid #1a7a3a', color:'#ffffff' },
  confirmBtn:   { width:'100%', marginTop:16, background:'#1a7a3a', border:'2px solid #1a7a3a', color:'#ffffff', borderRadius:12, padding:'14px', fontSize:14, fontFamily:"'Courier New',monospace", fontWeight:700, cursor:'pointer' },
  btnDis:       { opacity:.4, cursor:'not-allowed', background:'#e8f0e8', border:'2px solid #c8d8c8', color:'#8aaa8a' },
  absPrev:      { background:'#fff5f5', border:'1px solid #f0c0c0', borderRadius:10, padding:'11px 14px', marginTop:12, marginBottom:6, fontSize:13, color:'#9a3030', lineHeight:1.6 },
  hCard:        { borderRadius:10, padding:'12px 14px', marginBottom:8, border:'1px solid' },
  hMatchCard:   { background:'#ffffff', borderColor:'#d8ead8', boxShadow:'0 1px 3px rgba(0,0,0,.05)' },
  hAbsCard:     { background:'#fff8f8', borderColor:'#f0d0d0' },
  hJornCard:    { background:'#f0faf2', borderColor:'#a0d8a0' },
  hTime:        { fontSize:10, color:'#9aba9a', marginBottom:4, letterSpacing:1 },
  hAuthor:      { fontSize:10, fontWeight:700, marginBottom:4 },
  hMain:        { fontSize:14, fontWeight:600, marginBottom:4 },
  hDesc:        { fontSize:11, color:'#5a8a5a' },
  statsBox:     { marginTop:20, background:'#ffffff', border:'1px solid #d0e8d0', borderRadius:12, padding:'16px', boxShadow:'0 1px 4px rgba(0,0,0,.05)' },
  stTitle:      { fontSize:11, color:'#1a7a3a', letterSpacing:3, marginBottom:12, fontWeight:700 },
  stGrid:       { display:'flex', gap:10 },
  stItem:       { flex:1, background:'#f4f7f4', borderRadius:10, padding:'12px 8px', textAlign:'center', border:'1px solid #d8ead8' },
  stVal:        { fontSize:18, fontWeight:700, color:'#1a7a3a' },
  stLbl:        { fontSize:10, color:'#7aaa7a', marginTop:4 },
  expBtn:       { background:'#f0faf2', border:'1px solid #a0d8a0', color:'#1a7a3a', borderRadius:7, padding:'7px 14px', cursor:'pointer', fontSize:12, fontFamily:"'Courier New',monospace", fontWeight:700, marginBottom:14 },
  updateBanner: { display:'flex', alignItems:'center', gap:12, background:'#fff8e8', border:'1px solid #e8c850', borderRadius:12, padding:'12px 16px', marginBottom:16, boxShadow:'0 1px 4px rgba(0,0,0,.06)' },
  updateLabel:  { fontSize:10, color:'#9a7a10', letterSpacing:2, textTransform:'uppercase', fontWeight:700 },
  updateDate:   { fontSize:15, fontWeight:700, color:'#5a4a10', marginTop:2 },
  savedBadge:   { textAlign:'center', fontSize:11, color:'#9aba9a', marginTop:14, letterSpacing:1 },
  ruleCard:     { display:'flex', gap:12, marginBottom:10, background:'#ffffff', border:'1px solid #d8ead8', borderRadius:10, padding:'13px 14px', boxShadow:'0 1px 3px rgba(0,0,0,.04)' },
  ruleN:        { minWidth:24, height:24, background:'#1a7a3a', color:'#fff', borderRadius:'50%', display:'flex', alignItems:'center', justifyContent:'center', fontWeight:900, fontSize:11, flexShrink:0 },
  ruleT:        { fontSize:13, fontWeight:700, color:'#1a2e1a', marginBottom:3 },
  ruleD:        { fontSize:11, color:'#4a7a4a', lineHeight:1.5 },
  // Jornadas
  jornadaCard:  { background:'#ffffff', border:'1px solid #d8ead8', borderRadius:12, padding:'16px', marginBottom:12, boxShadow:'0 1px 4px rgba(0,0,0,.05)', cursor:'pointer' },
  jornadaNum:   { fontSize:11, color:'#1a7a3a', letterSpacing:2, fontWeight:700 },
  jornadaDate:  { fontSize:12, color:'#7aaa7a', marginTop:2 },
  jornadaStats: { display:'flex', gap:8, marginTop:10 },
  jornadaStat:  { background:'#f4f7f4', borderRadius:8, padding:'6px 10px', fontSize:11, color:'#4a7a4a', border:'1px solid #d8ead8' },
  jornadaBanner:{ background:'linear-gradient(135deg,#1a7a3a,#2d9e52)', borderRadius:12, padding:'16px 20px', marginBottom:16, color:'#fff' },
  jornadaBannerN:{ fontSize:13, color:'rgba(255,255,255,.8)', letterSpacing:3 },
  jornadaBannerTitle:{ fontSize:20, fontWeight:700, marginTop:4 },
  closeJornadaBtn:{ width:'100%', marginTop:16, background:'#c04040', border:'2px solid #c04040', color:'#fff', borderRadius:12, padding:'14px', fontSize:14, fontFamily:"'Courier New',monospace", fontWeight:700, cursor:'pointer' },
  // PIN modal
  overlay:      { position:'fixed', inset:0, background:'rgba(0,0,0,.6)', display:'flex', alignItems:'center', justifyContent:'center', zIndex:100, padding:20 },
  modal:        { background:'#ffffff', borderRadius:16, padding:'28px 24px', maxWidth:340, width:'100%', boxShadow:'0 8px 32px rgba(0,0,0,.2)' },
  pinDots:      { display:'flex', gap:12, justifyContent:'center', margin:'20px 0' },
  pinDot:       { width:14, height:14, borderRadius:'50%', background:'#d8ead8', border:'2px solid #a0c8a0' },
  pinDotFilled: { background:'#1a7a3a', border:'2px solid #1a7a3a' },
  pinGrid:      { display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:10, marginTop:8 },
  pinKey:       { background:'#f4f7f4', border:'1px solid #d8ead8', borderRadius:10, padding:'16px', fontSize:20, fontWeight:700, cursor:'pointer', textAlign:'center', fontFamily:"'Courier New',monospace", color:'#1a2e1a' },
  pinKeyDel:    { background:'#fff5f5', border:'1px solid #f0c0c0', color:'#c04040' },
  toast:        { position:'fixed', bottom:28, left:'50%', transform:'translateX(-50%)', color:'#fff', padding:'11px 24px', borderRadius:24, fontWeight:700, fontSize:13, fontFamily:"'Courier New',monospace", zIndex:200, boxShadow:'0 4px 18px rgba(0,0,0,.2)', whiteSpace:'nowrap' },
  lockedBanner: { background:'#f8f0ff', border:'1px solid #d0a0e0', borderRadius:12, padding:'14px 18px', marginBottom:16, display:'flex', alignItems:'center', gap:12, fontSize:13, color:'#5a3a7a' },
};

// --- BADGE ---
function Badge({ rank }) {
  if (rank === 1) return e('span', { style:{fontSize:22} }, '🥇');
  if (rank === 2) return e('span', { style:{fontSize:22} }, '🥈');
  if (rank === 3) return e('span', { style:{fontSize:22} }, '🥉');
  return e('span', { style:S.rankNum }, '#' + rank);
}

// --- PLAYER ROW ---
function PRow({ p, selected, target, absent, onClick }) {
  return e('div', { onClick, style:{ ...S.card, ...(selected?S.cardSel:{}), ...(target?S.cardTarget:{}), ...(absent?S.cardAbsent:{}) } },
    e('div', { style:S.cl },
      e(Badge, { rank:p.rkg }),
      e('div', null,
        e('div', { style:S.pname }, p.name + (absent ? ' 🚫' : '')),
        e('div', { style:S.pid }, p.id)
      )
    ),
    e('div', { style:S.cr },
      e('div', { style:S.pts }, p.pts, e('span', { style:S.ptsl }, 'pts')),
      target && e('div', { style:S.targetLbl }, '⚡ alvo'),
      absent && e('div', { style:S.absentLbl }, 'não compareceu')
    )
  );
}

// --- PIN MODAL ---
function PinModal({ onSuccess, onCancel }) {
  const [pin, setPin] = useState('');
  const [error, setError] = useState(false);

  function press(d) {
    if (pin.length >= 4) return;
    const next = pin + d;
    setPin(next);
    setError(false);
    if (next.length === 4) {
      setTimeout(() => {
        const user = USERS[next];
        if (user) {
          onSuccess(user);
        } else {
          setError(true);
          setPin('');
        }
      }, 200);
    }
  }

  function del() { setPin(p => p.slice(0,-1)); setError(false); }

  const keys = ['1','2','3','4','5','6','7','8','9','','0','⌫'];

  return e('div', { style:S.overlay, onClick: onCancel },
    e('div', { style:S.modal, onClick: ev => ev.stopPropagation() },
      e('div', { style:{textAlign:'center'} },
        e('div', { style:{fontSize:32,marginBottom:8} }, '🔒'),
        e('div', { style:{fontSize:16,fontWeight:700,color:'#1a2e1a'} }, 'Introduz o teu PIN'),
        e('div', { style:{fontSize:12,color:'#7a9a7a',marginTop:4} }, 'Acesso para registar resultados')
      ),
      e('div', { style:S.pinDots },
        ...Array(4).fill(0).map((_,i) =>
          e('div', { key:i, style:{...S.pinDot,...(i < pin.length ? S.pinDotFilled : {})} })
        )
      ),
      error && e('div', { style:{textAlign:'center',color:'#c04040',fontSize:12,marginBottom:8,fontWeight:700} }, 'PIN incorrecto. Tenta novamente.'),
      e('div', { style:S.pinGrid },
        ...keys.map((k,i) =>
          e('button', {
            key:i,
            style:{ ...S.pinKey, ...(k==='⌫'?S.pinKeyDel:{}), ...(k===''?{opacity:0,pointerEvents:'none'}:{}) },
            onClick: k === '⌫' ? del : (k ? () => press(k) : undefined)
          }, k)
        )
      )
    )
  );
}

// --- APP ---
function App() {
  const saved = loadState();

  // Estado principal
  const [players,    setPlayers]    = useState(saved?.players    || PLAYERS_INIT);
  const [history,    setHistory]    = useState(saved?.history    || []);
  const [absences,   setAbsences]   = useState(saved?.absences   || []);
  const [jornada,    setJornada]    = useState(saved?.jornada    || JORNADA_INIT);
  const [jornadaStart, setJornadaStart] = useState(saved?.jornadaStart || dateStr());
  const [pastJornadas, setPastJornadas] = useState(saved?.pastJornadas || []);
  const [lastUpdate, setLastUpdate] = useState(saved?.lastUpdate || '07/05/2026 (quarta-feira)');

  // Auth
  const [currentUser, setCurrentUser] = useState(null);
  const [sessionTime,  setSessionTime]  = useState(null);
  const [showPin,      setShowPin]      = useState(false);

  // UI
  const [tab,       setTab]       = useState('ranking');
  const [myPl,      setMyPl]      = useState(null);
  const [mA,        setMA]        = useState(null);
  const [mB,        setMB]        = useState(null);
  const [winId,     setWinId]     = useState(null);
  const [toast,     setToast]     = useState(null);
  const [resetDlg,  setResetDlg]  = useState(false);
  const [closeJornDlg, setCloseJornDlg] = useState(false);
  const [viewJornada, setViewJornada] = useState(null);

  const sorted = byRkg(players);

  // Persist
  useEffect(() => {
    saveState({ players, history, absences, jornada, jornadaStart, pastJornadas, lastUpdate });
  }, [players, history, absences, jornada, jornadaStart, pastJornadas, lastUpdate]);

  // Session timeout
  useEffect(() => {
    if (!sessionTime) return;
    const t = setTimeout(() => { setCurrentUser(null); setSessionTime(null); showToast('Sessão expirada', '#e0a020'); }, SESSION_TIMEOUT);
    return () => clearTimeout(t);
  }, [sessionTime]);

  const isAdmin = !!currentUser;

  function showToast(msg, col) {
    setToast({ msg, col: col || '#1a7a3a' });
    setTimeout(() => setToast(null), 2800);
  }

  function withAuth(fn) {
    if (isAdmin) { fn(); } else { setShowPin(true); }
  }

  function onPinSuccess(user) {
    setCurrentUser(user);
    setSessionTime(Date.now());
    setShowPin(false);
    showToast('Bem-vindo, ' + user.name + '!', user.color);
  }

  function logout() {
    setCurrentUser(null);
    setSessionTime(null);
    showToast('Sessão terminada', '#7a9a7a');
  }

  function authorLabel() {
    return currentUser ? '[' + currentUser.id + ']' : '[?]';
  }

  // --- MATCH ---
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
      desc = ps[wi].id + ' subiu para #' + lR + ' - ' + ps[li].id + ' baixou para #' + wR;
    } else {
      const nLR = lR + 1;
      ps = ps.map((p,i) => i !== li && p.rkg === nLR ? { ...p, rkg: nLR+1 } : p);
      ps[li] = { ...ps[li], rkg: nLR };
      desc = ps[wi].id + ' mantém #' + wR + ' - ' + ps[li].id + ' desce para #' + nLR;
    }
    ps[wi] = { ...ps[wi], pts: ps[wi].pts + 3 };
    ps[li] = { ...ps[li], pts: ps[li].pts + 1 };
    const entry = { id: Date.now(), type:'match', time: nowStr(), author: authorLabel(),
      winner: winId, loser: losId, wName: ps[wi].name, lName: ps[li].name, desc };
    setPlayers(ps); setHistory(h => [entry,...h]);
    setMA(null); setMB(null); setWinId(null);
    setLastUpdate(nowStr());
    showToast('Resultado registado!'); setTab('ranking');
  }

  // --- ABSENCES ---
  function toggleAbs(id) {
    setAbsences(prev => prev.includes(id) ? prev.filter(x=>x!==id) : [...prev, id]);
  }

  function applyAbs() {
    if (!absences.length) { showToast('Nenhuma falta selecionada','#e0a020'); return; }
    const ps = applyAbsenceRule(players, absences);
    const entry = { id: Date.now(), type:'absence', time: nowStr(), author: authorLabel(),
      absent: [...absences], aNames: absences.map(id => players.find(p=>p.id===id)?.name || id),
      desc: 'Faltas: ' + absences.join(', ') };
    setPlayers(ps); setHistory(h => [entry,...h]); setAbsences([]);
    setLastUpdate(nowStr());
    showToast(entry.absent.length + ' falta(s) processada(s)', '#e07070');
    setTab('ranking');
  }

  // --- FECHAR JORNADA ---
  function closeJornada() {
    const snapshot = {
      num: jornada,
      start: jornadaStart,
      end: dateStr(),
      closedBy: authorLabel(),
      rankingFinal: byRkg(players).map(p => ({ ...p })),
      history: [...history],
      matches: history.filter(x=>x.type==='match').length,
      absenceCount: history.filter(x=>x.type==='absence').reduce((a,x)=>a+(x.absent?.length||0),0),
    };
    const entry = { id: Date.now(), type:'jornada_close', time: nowStr(), author: authorLabel(),
      desc: 'Jornada ' + jornada + ' fechada por ' + authorLabel() };

    const nextJornada = jornada + 1;
    const nextPlayers = byRkg(players).map((p, i) => ({ ...p, pts: 13 - i }));

    setPastJornadas(pj => [snapshot, ...pj]);
    setJornada(nextJornada);
    setJornadaStart(dateStr());
    setPlayers(nextPlayers);
    setHistory(h => [entry, ...h]);
    setLastUpdate(nowStr());
    setCloseJornDlg(false);
    showToast('Jornada ' + jornada + ' fechada! A iniciar Jornada ' + nextJornada, '#1a7a3a');
    setTab('ranking');
  }

  // --- RESET ---
  function doReset() {
    setPlayers(PLAYERS_INIT); setHistory([]); setAbsences([]);
    setJornada(JORNADA_INIT); setJornadaStart(dateStr());
    setPastJornadas([]); setLastUpdate('07/05/2026 (quarta-feira)');
    setMA(null); setMB(null); setWinId(null); setMyPl(null);
    setResetDlg(false); showToast('App reiniciada', '#e07070');
  }

  // --- EXPORT ---
  function doExport() {
    const lines = ['=== TENIS DE MESA - Jornada ' + jornada + ' ===\n'];
    lines.push('CLASSIFICACAO:');
    byRkg(players).forEach(p => lines.push('  #' + p.rkg + '  ' + p.name + '  ' + p.pts + ' pts'));
    lines.push('\nHISTORICO:');
    history.forEach(entry => lines.push('[' + entry.time + '] ' + (entry.author||'') + ' ' + entry.desc));
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([lines.join('\n')], { type:'text/plain' }));
    a.download = 'TenisMesa_J' + jornada + '.txt';
    a.click();
    showToast('Exportado!');
  }

  const targets = myPl ? getTargets(players, myPl) : [];
  const myPlayer = players.find(p => p.id === myPl);

  const ADMIN_TABS = ['match','absence','jornada'];
  const ALL_TABS = [
    ['ranking',   '🏆 Rank'],
    ['challenge', '⚡ Desafios'],
    ['match',     '🎮 Jogo'],
    ['absence',   '🚫 Faltas'],
    ['jornada',   '📅 Jornadas'],
    ['history',   '📜 Historial'],
    ['rules',     '📋 Regras'],
  ];

  function onTabClick(id) {
    if (ADMIN_TABS.includes(id) && !isAdmin) {
      setShowPin(true);
      return;
    }
    setTab(id);
  }

  // ── RENDER ──────────────────────────────────────────────────────────────────
  return e('div', { style:S.root },

    // HEADER
    e('div', { style:S.hdr },
      e('span', { style:{fontSize:34} }, '🏓'),
      e('div', { style:{flex:1} },
        e('div', { style:S.htitle }, 'Ténis de Mesa'),
        e('div', { style:S.hsub }, 'Jornada ' + jornada)
      ),
      e('div', { style:S.hdrBtns },
        isAdmin && e('div', { style:S.userBadge }, currentUser.id + ' 🟢'),
        isAdmin
          ? e('button', { style:S.lockBtn, onClick:logout, title:'Terminar sessão' }, '🔓')
          : e('button', { style:S.lockBtn, onClick:()=>setShowPin(true), title:'Entrar como admin' }, '🔒'),
        e('button', { style:{...S.lockBtn, fontSize:14}, onClick:()=>withAuth(()=>setResetDlg(true)), title:'Reiniciar' }, '↺')
      )
    ),

    // TABS
    e('div', { style:S.tabs },
      ...ALL_TABS.map(([id,lbl]) => {
        const locked = ADMIN_TABS.includes(id) && !isAdmin;
        return e('button', { key:id,
          style:{ ...S.tab, ...(tab===id?S.tabOn:{}), ...(locked?S.tabLocked:{}) },
          onClick: () => onTabClick(id)
        }, lbl + (locked ? ' 🔒' : ''));
      })
    ),

    // CONTEÚDO
    e('div', { style:S.body },

      // ── RANKING ──
      tab === 'ranking' && e('div', null,
        e('div', { style:S.updateBanner },
          e('span', { style:{fontSize:22} }, '🕐'),
          e('div', null,
            e('div', { style:S.updateLabel }, 'Última actualização'),
            e('div', { style:S.updateDate }, lastUpdate)
          )
        ),
        e('div', { style:S.secTitle }, 'Classificação Atual — Jornada ' + jornada),
        ...sorted.map(p => e(PRow, { key:p.id, p, absent:absences.includes(p.id) })),
        e('div', { style:S.savedBadge }, '💾 Guardado automaticamente')
      ),

      // ── DESAFIOS ──
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
            ? myPlayer?.name + ' já está no topo!'
            : myPlayer?.name + ' pode desafiar: ' + targets.map(t=>t.name+' (#'+t.rkg+')').join(', ')
        ),
        e('div', { style:S.priBox },
          e('div', { style:S.priTitle }, 'Lista de Prioridade — Jornada ' + jornada),
          e('div', { style:{display:'flex',flexWrap:'wrap',gap:7,marginTop:8} },
            ...CHALLENGE_PRIORITY_INIT.map((id,i) =>
              e('div', { key:id, style:{...S.chip,...(myPl===id?S.chipOn:{})} }, (i+1)+'. '+id)
            )
          )
        )
      ),

      // ── JOGO (admin) ──
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

      // ── FALTAS (admin) ──
      tab === 'absence' && e('div', null,
        e('div', { style:S.secTitle }, 'Registar Não Comparências'),
        e('div', { style:S.hint }, 'Seleciona quem não compareceu. A regra 13 é aplicada automaticamente.'),
        ...sorted.map(p => {
          const abs = absences.includes(p.id);
          return e('div', { key:p.id, onClick:()=>toggleAbs(p.id), style:{...S.card,...(abs?S.cardAbsent:{})} },
            e('div', { style:S.cl },
              e(Badge, { rank:p.rkg }),
              e('div', null, e('div', { style:S.pname }, p.name), e('div', { style:S.pid }, p.id))
            ),
            e('div', { style:S.cr },
              e('div', { style:S.pts }, p.pts, e('span', { style:S.ptsl }, 'pts')),
              abs ? e('div', { style:S.absentLbl }, '🚫 ausente') : e('div', { style:{fontSize:11,color:'#2a8a2a'} }, '✓ presente')
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

      // ── JORNADAS (admin) ──
      tab === 'jornada' && e('div', null,

        // Jornada actual
        viewJornada === null && e('div', null,
          e('div', { style:S.jornadaBanner },
            e('div', { style:S.jornadaBannerN }, 'JORNADA ACTUAL'),
            e('div', { style:S.jornadaBannerTitle }, 'Jornada ' + jornada),
            e('div', { style:{fontSize:12,color:'rgba(255,255,255,.7)',marginTop:4} }, 'Iniciada em ' + jornadaStart),
            e('div', { style:S.jornadaStats },
              e('div', { style:{...S.jornadaStat,background:'rgba(255,255,255,.2)',color:'#fff',border:'none'} }, history.filter(x=>x.type==='match').length + ' jogos'),
              e('div', { style:{...S.jornadaStat,background:'rgba(255,255,255,.2)',color:'#fff',border:'none'} }, history.filter(x=>x.type==='absence').reduce((a,x)=>a+(x.absent?.length||0),0) + ' faltas')
            )
          ),

          isAdmin && e('button', { style:S.closeJornadaBtn, onClick:()=>setCloseJornDlg(true) },
            '🏁 Fechar Jornada ' + jornada + ' e Iniciar Jornada ' + (jornada+1)
          ),

          pastJornadas.length > 0 && e('div', null,
            e('div', { style:{...S.secTitle,marginTop:24} }, 'Jornadas Anteriores'),
            ...pastJornadas.map(j =>
              e('div', { key:j.num, style:S.jornadaCard, onClick:()=>setViewJornada(j) },
                e('div', { style:{display:'flex',justifyContent:'space-between',alignItems:'center'} },
                  e('div', null,
                    e('div', { style:S.jornadaNum }, 'JORNADA ' + j.num),
                    e('div', { style:S.jornadaDate }, j.start + ' → ' + j.end)
                  ),
                  e('div', { style:{fontSize:12,color:'#7aaa7a'} }, 'ver →')
                ),
                e('div', { style:S.jornadaStats },
                  e('div', { style:S.jornadaStat }, j.matches + ' jogos'),
                  e('div', { style:S.jornadaStat }, j.absenceCount + ' faltas'),
                  e('div', { style:S.jornadaStat }, 'fechada por ' + j.closedBy)
                )
              )
            )
          ),

          pastJornadas.length === 0 && e('div', { style:{...S.hint,marginTop:16} }, 'Ainda não há jornadas fechadas.')
        ),

        // Vista de jornada passada
        viewJornada !== null && e('div', null,
          e('button', { style:{...S.expBtn,marginBottom:16}, onClick:()=>setViewJornada(null) }, '← Voltar'),
          e('div', { style:S.jornadaBanner },
            e('div', { style:S.jornadaBannerN }, 'JORNADA FECHADA'),
            e('div', { style:S.jornadaBannerTitle }, 'Jornada ' + viewJornada.num),
            e('div', { style:{fontSize:12,color:'rgba(255,255,255,.7)',marginTop:4} }, viewJornada.start + ' → ' + viewJornada.end + ' | Fechada por ' + viewJornada.closedBy)
          ),
          e('div', { style:S.secTitle }, 'Ranking Final'),
          ...viewJornada.rankingFinal.map(p =>
            e('div', { key:p.id, style:{...S.card,cursor:'default'} },
              e('div', { style:S.cl }, e(Badge, { rank:p.rkg }), e('div', null, e('div', { style:S.pname }, p.name), e('div', { style:S.pid }, p.id))),
              e('div', { style:S.cr }, e('div', { style:S.pts }, p.pts, e('span', { style:S.ptsl }, 'pts')))
            )
          ),
          e('div', { style:{...S.secTitle,marginTop:24} }, 'Historial'),
          ...viewJornada.history.map(entry =>
            e('div', { key:entry.id, style:{...S.hCard,...(entry.type==='absence'?S.hAbsCard:entry.type==='jornada_close'?S.hJornCard:S.hMatchCard)} },
              e('div', { style:{display:'flex',justifyContent:'space-between'} },
                e('div', { style:S.hTime }, entry.time),
                entry.author && e('div', { style:{...S.hAuthor,color: entry.author==='[JM]'?'#1a7a3a':'#1a5a8a'} }, entry.author)
              ),
              e('div', { style:S.hDesc }, entry.desc)
            )
          )
        )
      ),

      // ── HISTORIAL ──
      tab === 'history' && e('div', null,
        e('div', { style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12} },
          e('div', { style:S.secTitle }, 'Historial — Jornada ' + jornada),
          history.length > 0 && e('button', { style:S.expBtn, onClick:doExport }, '📥 Exportar')
        ),
        history.length === 0 && e('div', { style:S.hint }, 'Ainda não há registos nesta jornada.'),
        ...history.map(entry =>
          e('div', { key:entry.id, style:{...S.hCard,...(entry.type==='absence'?S.hAbsCard:entry.type==='jornada_close'?S.hJornCard:S.hMatchCard)} },
            e('div', { style:{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:4} },
              e('div', { style:S.hTime }, entry.time),
              entry.author && e('div', { style:{...S.hAuthor, color: entry.author==='[JM]'?'#1a7a3a':'#1a5a8a'} }, entry.author)
            ),
            entry.type === 'match' ? e('div', null,
              e('div', { style:S.hMain },
                e('span', { style:{color:'#1a7a3a'} }, '🏆 '+entry.wName),
                e('span', { style:{color:'#9aba9a'} }, ' contra '),
                e('span', { style:{color:'#c04040'} }, entry.lName)
              ),
              e('div', { style:S.hDesc }, entry.desc)
            ) : entry.type === 'absence' ? e('div', null,
              e('div', { style:S.hMain }, e('span', { style:{color:'#c04040'} }, '🚫 Faltas processadas')),
              e('div', { style:S.hDesc }, entry.aNames?.join(', '))
            ) : e('div', null,
              e('div', { style:{...S.hMain,color:'#1a7a3a'} }, '🏁 ' + entry.desc)
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
            e('div', { style:S.stTitle }, 'Resumo da Jornada ' + jornada),
            e('div', { style:S.stGrid },
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, matches.length), e('div', { style:S.stLbl }, 'jogos')),
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, absCnt), e('div', { style:S.stLbl }, 'faltas')),
              e('div', { style:S.stItem }, e('div', { style:S.stVal }, top ? top[0]+'('+top[1]+'V)' : '-'), e('div', { style:S.stLbl }, '+ vitórias'))
            )
          );
        })()
      ),

      // ── REGRAS ──
      tab === 'rules' && e('div', null,
        e('div', { style:S.secTitle }, 'Regras'),
        ...RULES.map(r =>
          e('div', { key:r.n, style:S.ruleCard },
            e('div', { style:S.ruleN }, r.n),
            e('div', null, e('div', { style:S.ruleT }, r.t), e('div', { style:S.ruleD }, r.d))
          )
        )
      )
    ),

    // MODAL PIN
    showPin && e(PinModal, { onSuccess: onPinSuccess, onCancel: ()=>setShowPin(false) }),

    // MODAL FECHAR JORNADA
    closeJornDlg && e('div', { style:S.overlay },
      e('div', { style:S.modal },
        e('div', { style:{fontSize:16,fontWeight:700,color:'#1a7a3a',marginBottom:8} }, '🏁 Fechar Jornada ' + jornada + '?'),
        e('div', { style:{fontSize:12,color:'#3a5a3a',lineHeight:1.6,marginBottom:8} },
          'O ranking actual fica guardado como Jornada ' + jornada + '. A Jornada ' + (jornada+1) + ' inicia com os pontos recalculados.'
        ),
        e('div', { style:{fontSize:11,color:'#7a9a7a',marginBottom:16,padding:'10px',background:'#f0faf2',borderRadius:8} },
          'Esta operação foi iniciada por: ' + (currentUser?.name || '?')
        ),
        e('div', { style:{display:'flex',gap:10} },
          e('button', { style:{...S.confirmBtn,flex:1,marginTop:0,background:'#1a7a3a'}, onClick:closeJornada }, 'Confirmar'),
          e('button', { style:{...S.confirmBtn,flex:1,marginTop:0,background:'#f0f7f0',border:'2px solid #c0dcc0',color:'#2a6a2a'}, onClick:()=>setCloseJornDlg(false) }, 'Cancelar')
        )
      )
    ),

    // MODAL RESET
    resetDlg && e('div', { style:S.overlay },
      e('div', { style:S.modal },
        e('div', { style:{fontSize:16,fontWeight:700,color:'#c04040',marginBottom:8} }, 'Reiniciar App?'),
        e('div', { style:{fontSize:12,color:'#5a3030',lineHeight:1.6} }, 'Todos os dados e jornadas serão apagados permanentemente.'),
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
