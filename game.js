'use strict';
/* ============================================================
   ARAMIZDA — Emiran Edition
   Web tabanlı, mobil uyumlu, Among Us tarzı P2P oyun.
   Sunucu yok: PeerJS (WebRTC) ile oda kuran oyuncu host olur.
   ============================================================ */

// ---------- SKİNLER ----------
const SKINS = [
  { img: 'assets/skins/skin1.jpg', color: '#e67e22' },
  { img: 'assets/skins/skin2.jpg', color: '#3498db' },
  { img: 'assets/skins/skin3.jpg', color: '#9b59b6' },
  { img: 'assets/skins/skin4.jpg', color: '#2c3e50' },
  { img: 'assets/skins/skin5.jpg', color: '#27ae60' },
  { img: 'assets/skins/skin6.jpg', color: '#c0392b' },
  { emoji: '🔴', color: '#e74c3c' },
  { emoji: '🟡', color: '#f1c40f' },
  { emoji: '🟢', color: '#2ecc71' },
  { emoji: '🔵', color: '#2980b9' },
  { emoji: '🟣', color: '#8e44ad' },
];
const skinImgs = SKINS.map(s => {
  if (!s.img) return null;
  const im = new Image(); im.src = s.img; return im;
});

// ---------- HARİTA ----------
const ROOMS = [
  { x: 200,  y: 200,  w: 400, h: 340, name: 'Üst Motor' },
  { x: 1200, y: 140,  w: 760, h: 520, name: 'Kafeterya' },
  { x: 2360, y: 200,  w: 400, h: 340, name: 'Silah' },
  { x: 120,  y: 760,  w: 360, h: 440, name: 'Reaktör' },
  { x: 680,  y: 800,  w: 320, h: 300, name: 'Güvenlik' },
  { x: 1140, y: 760,  w: 380, h: 340, name: 'Revir' },
  { x: 1660, y: 760,  w: 380, h: 340, name: 'Yönetim' },
  { x: 2140, y: 780,  w: 300, h: 280, name: 'O2' },
  { x: 2680, y: 720,  w: 360, h: 420, name: 'Navigasyon' },
  { x: 200,  y: 1440, w: 400, h: 340, name: 'Alt Motor' },
  { x: 760,  y: 1440, w: 420, h: 340, name: 'Elektrik' },
  { x: 1360, y: 1400, w: 520, h: 420, name: 'Depo' },
  { x: 2080, y: 1440, w: 420, h: 340, name: 'Kalkanlar' },
  { x: 2660, y: 1460, w: 360, h: 300, name: 'İletişim' },
];
const HALLS = [
  { x: 340,  y: 540,  w: 120, h: 900 },
  { x: 600,  y: 310,  w: 600, h: 120 },
  { x: 1960, y: 310,  w: 400, h: 120 },
  { x: 460,  y: 890,  w: 220, h: 120 },
  { x: 1000, y: 890,  w: 140, h: 120 },
  { x: 1780, y: 660,  w: 120, h: 100 },
  { x: 1280, y: 660,  w: 120, h: 100 },
  { x: 2040, y: 900,  w: 100, h: 120 },
  { x: 2440, y: 880,  w: 240, h: 120 },
  { x: 2480, y: 540,  w: 120, h: 240 },
  { x: 2800, y: 1140, w: 120, h: 320 },
  { x: 2500, y: 1560, w: 160, h: 120 },
  { x: 1880, y: 1560, w: 200, h: 120 },
  { x: 1620, y: 1100, w: 120, h: 300 },
  { x: 1180, y: 1560, w: 180, h: 120 },
  { x: 600,  y: 1560, w: 160, h: 120 },
];
const FLOORS = ROOMS.concat(HALLS);
const SPAWN = { x: 1580, y: 400 };            // Kafeterya
const EMERGENCY_BTN = { x: 1580, y: 400 };
const VENTS = [
  { x: 400,  y: 420,  g: 0 }, { x: 300,  y: 920,  g: 0 }, { x: 400,  y: 1560, g: 0 },
  { x: 820,  y: 940,  g: 1 }, { x: 1300, y: 920,  g: 1 }, { x: 940,  y: 1580, g: 1 },
  { x: 2560, y: 420,  g: 2 }, { x: 2860, y: 920,  g: 2 }, { x: 2320, y: 1580, g: 2 },
];
const FIX_POINTS = { lights: { x: 960, y: 1600, room: 'Elektrik' }, reactor: { x: 240, y: 840, room: 'Reaktör' } };
const TASK_POOL = [
  { id: 1,  x: 900,  y: 1640, type: 'wires',    label: 'Elektrik: Kabloları Bağla' },
  { id: 2,  x: 760,  y: 860,  type: 'wires',    label: 'Güvenlik: Kabloları Bağla' },
  { id: 3,  x: 1320, y: 260,  type: 'download', label: 'Kafeterya: Veri İndir' },
  { id: 4,  x: 2860, y: 820,  type: 'download', label: 'Navigasyon: Rota Yükle' },
  { id: 5,  x: 1860, y: 880,  type: 'keypad',   label: 'Yönetim: Kart Kodunu Gir' },
  { id: 6,  x: 340,  y: 300,  type: 'fuel',     label: 'Üst Motor: Yakıt Doldur' },
  { id: 7,  x: 340,  y: 1660, type: 'fuel',     label: 'Alt Motor: Yakıt Doldur' },
  { id: 8,  x: 2560, y: 300,  type: 'asteroid', label: 'Silah: Asteroitleri Vur' },
  { id: 9,  x: 260,  y: 1120, type: 'keypad',   label: 'Reaktör: Kodu Onayla' },
  { id: 10, x: 2840, y: 1560, type: 'download', label: 'İletişim: Sinyali Aktar' },
  { id: 11, x: 1620, y: 1700, type: 'wires',    label: 'Depo: Kabloları Bağla' },
  { id: 12, x: 2280, y: 1660, type: 'fuel',     label: 'Kalkanlar: Kalkanı Şarjla' },
  { id: 13, x: 2300, y: 860,  type: 'asteroid', label: 'O2: Filtreyi Temizle' },
  { id: 14, x: 1240, y: 860,  type: 'download', label: 'Revir: Tarama Gönder' },
];

// ---------- AYARLAR ----------
const CFG = {
  speed: 260, ghostSpeed: 320, radius: 26,
  killRange: 95, killCooldown: 28, reportRange: 130, useRange: 110,
  tasksPerPlayer: 5, meetingTime: 75, reactorTime: 45,
  visionCrew: 460, visionImp: 700, visionLights: 170, reviveWindow: 30,
};

// ---------- DURUM ----------
const $ = id => document.getElementById(id);
let peer = null, conns = [];            // host: bağlantı listesi | client: [hostConn]
let isHost = false, myId = null, roomCode = '';
let myName = '', mySkin = 0;
let phase = 'home';                     // home|lobby|play|meeting|end
let players = {};                       // id -> {id,name,skin,x,y,dead,inVent,role,tasks,usedEmergency,...}
let bodies = [];                        // {pid,x,y,t}
let myRole = 'crew', myTasks = [], impostorIds = [];
let sab = { lights: false, reactor: false, reactorT: 0 };
let killCd = 0, sabCd = 0, meetState = null, taskBarVal = 0;
let sheriffUsed = false, reviveUsed = false, joy = { dx: 0, dy: 0 };
let cam = { x: SPAWN.x, y: SPAWN.y }, lastT = 0, openTask = null;

const rnd = n => Math.floor(Math.random() * n);
const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
const CODE_CHARS = 'ABCDEFGHJKLMNPRSTUVYZ23456789';
const makeCode = () => Array.from({ length: 5 }, () => CODE_CHARS[rnd(CODE_CHARS.length)]).join('');
const peerId = code => 'emiran-aramizda-' + code;

// ---------- EKRAN YÖNETİMİ ----------
function show(name) {
  document.querySelectorAll('.screen').forEach(s => s.classList.remove('active'));
  $('screen-' + name).classList.add('active');
}

// ---------- ANA MENÜ ----------
const skinRow = $('skin-row');
SKINS.forEach((s, i) => {
  const d = document.createElement('div');
  d.className = 'skin-opt' + (i === 0 ? ' sel' : '');
  if (s.img) d.style.backgroundImage = `url(${s.img})`;
  else { d.textContent = s.emoji; d.style.background = '#0b0e1a'; }
  d.onclick = () => {
    mySkin = i;
    skinRow.querySelectorAll('.skin-opt').forEach(e => e.classList.remove('sel'));
    d.classList.add('sel');
  };
  skinRow.appendChild(d);
});

function getName() {
  myName = $('inp-name').value.trim() || 'Oyuncu' + rnd(99);
  localStorage.setItem('aramizda-name', myName);
  return myName;
}
$('inp-name').value = localStorage.getItem('aramizda-name') || '';
// Davet linkiyle gelenler için kodu otomatik doldur
const urlCode = new URLSearchParams(location.search).get('oda');
if (urlCode) $('inp-code').value = urlCode.toUpperCase();

$('btn-create').onclick = () => {
  getName();
  roomCode = makeCode();
  status('Oda kuruluyor...');
  peer = new Peer(peerId(roomCode));
  peer.on('open', () => {
    isHost = true; myId = 'P0';
    players = { P0: newPlayer('P0', myName, mySkin) };
    peer.on('connection', onHostConnection);
    enterLobby();
  });
  peer.on('error', e => status('Hata: ' + e.type + ' — tekrar dene'));
};

$('btn-join').onclick = () => {
  getName();
  const code = $('inp-code').value.trim().toUpperCase();
  if (code.length !== 5) return status('5 haneli oda kodunu gir');
  roomCode = code;
  status('Odaya bağlanılıyor...');
  peer = new Peer();
  peer.on('open', () => {
    const c = peer.connect(peerId(code), { reliable: true });
    c.on('open', () => {
      conns = [c];
      c.send({ t: 'hello', name: myName, skin: mySkin });
      c.on('data', d => onClientData(d));
      c.on('close', () => { alert('Host ile bağlantı koptu.'); location.reload(); });
    });
    setTimeout(() => { if (phase === 'home') status('Oda bulunamadı. Kodu kontrol et.'); }, 8000);
  });
  peer.on('error', e => status(e.type === 'peer-unavailable' ? 'Oda bulunamadı!' : 'Hata: ' + e.type));
};
const status = m => $('home-status').textContent = m;

function newPlayer(id, name, skin) {
  return { id, name, skin, x: SPAWN.x + rnd(200) - 100, y: SPAWN.y + rnd(120) - 60,
           dead: false, inVent: false, usedEmergency: false, doneTasks: [] };
}

// ---------- HOST: BAĞLANTI ----------
function onHostConnection(c) {
  c.on('data', d => onHostData(c, d));
  c.on('close', () => {
    const pid = c._pid;
    if (pid && players[pid]) {
      delete players[pid];
      conns = conns.filter(x => x !== c);
      if (phase === 'lobby') syncLobby();
      else if (phase === 'play' || phase === 'meeting') { broadcast({ t: 'left', pid }); checkWin(); }
    }
  });
}
let nextPid = 1;
function onHostData(c, d) {
  const pid = c._pid;
  switch (d.t) {
    case 'hello': {
      if (phase !== 'lobby' || Object.keys(players).length >= 10) { c.send({ t: 'full' }); return; }
      const id = 'P' + (nextPid++);
      c._pid = id; conns.push(c);
      players[id] = newPlayer(id, String(d.name).slice(0, 12), d.skin | 0);
      c.send({ t: 'joined', you: id, code: roomCode });
      syncLobby();
      break;
    }
    case 'pos': if (players[pid]) { players[pid].x = d.x; players[pid].y = d.y; players[pid].inVent = !!d.v; } break;
    case 'kill':     hostKill(pid, d.target); break;
    case 'report':   hostMeeting(pid, d.body ? 'body' : 'emergency', d.body); break;
    case 'taskdone': hostTaskDone(pid, d.id); break;
    case 'chat':     hostChat(pid, d.msg); break;
    case 'vote':     hostVote(pid, d.target); break;
    case 'sab':      hostSabotage(pid, d.kind); break;
    case 'fix':      hostFix(pid, d.kind); break;
    case 'revive':   hostRevive(pid, d.body); break;
    case 'sheriff':  hostSheriff(pid, d.target); break;
  }
}
function broadcast(msg, exceptPid) {
  conns.forEach(c => { if (c.open && c._pid !== exceptPid) c.send(msg); });
}

// ---------- LOBİ ----------
function enterLobby() {
  phase = 'lobby';
  show('lobby');
  $('lobby-code').textContent = roomCode;
  $('btn-start').style.display = isHost ? '' : 'none';
  renderLobby();
}
function syncLobby() {
  broadcast({ t: 'lobby', players: lobbyList() });
  renderLobby();
}
const lobbyList = () => Object.values(players).map(p => ({ id: p.id, name: p.name, skin: p.skin }));
function renderLobby(list) {
  const ps = list || lobbyList();
  const div = $('lobby-players'); div.innerHTML = '';
  ps.forEach(p => {
    const el = document.createElement('div');
    el.className = 'lobby-p' + (p.id === 'P0' ? ' host' : '');
    const s = SKINS[p.skin];
    el.innerHTML = `<div class="av" style="${s.img ? `background-image:url(${s.img})` : ''}">${s.img ? '' : s.emoji}</div>
                    <span>${esc(p.name)}${p.id === myId ? ' (sen)' : ''}</span>`;
    div.appendChild(el);
  });
  if (isHost) {
    const n = ps.length;
    $('btn-start').disabled = n < 2;
    $('lobby-info').textContent = n < 4
      ? `${n} oyuncu — ideali 4+, test için 2 yeter.` : `${n} oyuncu hazır. ${n >= 7 ? '2 impostor olacak.' : '1 impostor olacak.'}`;
  }
}
const esc = s => String(s).replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c]));

$('btn-share').onclick = async () => {
  const url = `${location.origin}${location.pathname}?oda=${roomCode}`;
  const text = `Aramızda oynayalım! 🔪 Oda kodu: ${roomCode}\n${url}`;
  try {
    if (navigator.share) await navigator.share({ text });
    else { await navigator.clipboard.writeText(text); $('btn-share').textContent = '✅ Kopyalandı!'; }
  } catch (_) {}
};
$('btn-leave').onclick = () => location.reload();

// ---------- OYUN BAŞLATMA (HOST) ----------
$('btn-start').onclick = () => {
  const ids = Object.keys(players);
  if (ids.length < 2) return;
  const shuffled = [...ids].sort(() => Math.random() - 0.5);
  const impCount = ids.length >= 7 ? 2 : 1;
  impostorIds = shuffled.slice(0, impCount);
  const rest = shuffled.slice(impCount);
  const roles = {};
  ids.forEach(id => roles[id] = 'crew');
  impostorIds.forEach(id => roles[id] = 'impostor');
  if (rest.length >= 2) roles[rest[0]] = 'doctor';
  if (rest.length >= 3) roles[rest[1]] = 'sheriff';

  const taskAssign = {};
  ids.forEach(id => {
    const pool = [...TASK_POOL].sort(() => Math.random() - 0.5);
    taskAssign[id] = pool.slice(0, CFG.tasksPerPlayer).map(t => t.id);
    players[id].tasks = roles[id] === 'impostor' ? [] : taskAssign[id];
    players[id].role = roles[id];
    players[id].dead = false; players[id].doneTasks = []; players[id].usedEmergency = false;
    players[id].x = SPAWN.x + rnd(240) - 120; players[id].y = SPAWN.y + rnd(140) - 70;
  });
  bodies = []; sab = { lights: false, reactor: false, reactorT: 0 };

  conns.forEach(c => {
    const id = c._pid; if (!players[id]) return;
    c.send({ t: 'start', role: roles[id],
             imps: roles[id] === 'impostor' ? impostorIds : [],
             tasks: taskAssign[id],
             ps: lobbyList() });
  });
  startGameLocal(roles['P0'], roles['P0'] === 'impostor' ? impostorIds : [], taskAssign['P0'], lobbyList());
  hostLoop();
};

function startGameLocal(role, imps, taskIds, ps) {
  phase = 'play';
  myRole = role; impostorIds = imps; sheriffUsed = false; reviveUsed = false;
  killCd = CFG.killCooldown / 2; sabCd = 10; taskBarVal = 0; bodies = [];
  sab = { lights: false, reactor: false, reactorT: 0 };
  if (!isHost) {
    players = {};
    ps.forEach(p => players[p.id] = newPlayer(p.id, p.name, p.skin));
  }
  myTasks = (role === 'impostor' ? [] : taskIds).map(id => TASK_POOL.find(t => t.id === id));
  const me = players[myId];
  cam.x = me.x; cam.y = me.y;
  const roleNames = { crew: '👨‍🚀 MÜRETTEBAT', impostor: '🔪 IMPOSTOR', doctor: '💉 DOKTOR', sheriff: '🔫 ŞERİF' };
  const roleDesc = {
    crew: 'Görevleri bitir, impostoru bul!',
    impostor: 'Herkesi öldür, yakalanma! Vent + sabotaj kullanabilirsin.',
    doctor: 'Görev yap + taze cesetleri diriltebilirsin (1 kez).',
    sheriff: 'Görev yap + 1 kurşunun var. Impostoru vur — ama yanlış kişiyi vurursan SEN ölürsün!',
  };
  $('role-banner').textContent = roleNames[role];
  $('role-banner').style.color = role === 'impostor' ? '#ff4757' : role === 'doctor' ? '#2ed573' : role === 'sheriff' ? '#ffa502' : '#7bed9f';
  show('game');
  showToast(roleNames[role] + '\n' + roleDesc[role], 4000);
  renderTaskList();
  requestAnimationFrame(frame);
}

// ---------- HOST OYUN DÖNGÜSÜ ----------
let hostTimer = null, snapTimer = null;
function hostLoop() {
  clearInterval(hostTimer); clearInterval(snapTimer);
  snapTimer = setInterval(() => {
    if (phase !== 'play') return;
    const snap = {
      t: 'snap',
      ps: Object.values(players).map(p => [p.id, Math.round(p.x), Math.round(p.y), p.dead ? 1 : 0, p.inVent ? 1 : 0]),
      bd: bodies.map(b => [b.pid, Math.round(b.x), Math.round(b.y)]),
      bar: taskBarVal,
      sab: [sab.lights ? 1 : 0, sab.reactor ? 1 : 0, Math.ceil(sab.reactorT)],
    };
    broadcast(snap);
    applySnap(snap);
  }, 100);
  hostTimer = setInterval(() => {
    if (phase !== 'play') return;
    if (sab.reactor) {
      sab.reactorT -= 0.5;
      if (sab.reactorT <= 0) endGame('impostor', 'Reaktör patladı! 💥');
    }
  }, 500);
}

function hostKill(killerId, targetId) {
  const k = players[killerId], v = players[targetId];
  if (!k || !v || k.dead || v.dead || !impostorIds.includes(killerId)) return;
  if (dist(k, v) > CFG.killRange * 1.6) return;
  v.dead = true;
  bodies.push({ pid: targetId, x: v.x, y: v.y, t: Date.now() });
  sendTo(targetId, { t: 'youdied' });
  if (targetId === myId) onYouDied();
  checkWin();
}
function hostSheriff(shId, targetId) {
  const s = players[shId], v = players[targetId];
  if (!s || !v || s.dead || v.dead || s.role !== 'sheriff' || s.shotUsed) return;
  s.shotUsed = true;
  const victim = impostorIds.includes(targetId) ? targetId : shId;
  const vp = players[victim];
  vp.dead = true;
  bodies.push({ pid: victim, x: vp.x, y: vp.y, t: Date.now() });
  sendTo(victim, { t: 'youdied' });
  if (victim === myId) onYouDied();
  broadcast({ t: 'gunshot' }); playBeep(180, 0.3);
  checkWin();
}
function hostRevive(docId, bodyPid) {
  const doc = players[docId];
  if (!doc || doc.dead || doc.role !== 'doctor' || doc.reviveUsed) return;
  const bi = bodies.findIndex(b => b.pid === bodyPid);
  if (bi < 0 || Date.now() - bodies[bi].t > CFG.reviveWindow * 1000) return;
  if (dist(doc, bodies[bi]) > CFG.useRange * 1.6) return;
  doc.reviveUsed = true;
  bodies.splice(bi, 1);
  const p = players[bodyPid];
  p.dead = false;
  broadcast({ t: 'revived', pid: bodyPid });
  onRevived(bodyPid);
  checkWin();
}
function hostTaskDone(pid, taskId) {
  const p = players[pid];
  if (!p || p.role === 'impostor' || p.doneTasks.includes(taskId)) return;
  p.doneTasks.push(taskId);
  let total = 0, done = 0;
  Object.values(players).forEach(q => {
    if (q.role === 'impostor') return;
    total += (q.tasks || []).length; done += q.doneTasks.length;
  });
  taskBarVal = total ? done / total : 0;
  if (taskBarVal >= 1) endGame('crew', 'Tüm görevler tamamlandı! 🛠️');
}
function hostSabotage(pid, kind) {
  if (!impostorIds.includes(pid) || sab.lights || sab.reactor) return;
  if (kind === 'lights') sab.lights = true;
  if (kind === 'reactor') { sab.reactor = true; sab.reactorT = CFG.reactorTime; }
  broadcast({ t: 'sabinfo', kind }); onSabInfo(kind);
}
function hostFix(pid, kind) {
  const p = players[pid];
  if (!p || p.dead) return;
  const fp = FIX_POINTS[kind];
  if (!fp || dist(p, fp) > CFG.useRange * 1.6) return;
  if (kind === 'lights') sab.lights = false;
  if (kind === 'reactor') { sab.reactor = false; sab.reactorT = 0; }
}

// ---------- TOPLANTI (HOST) ----------
let meetTimer = null;
function hostMeeting(byId, reason, bodyPid) {
  if (phase !== 'play') return;
  const p = players[byId];
  if (!p || p.dead) return;
  if (reason === 'body') {
    const b = bodies.find(x => x.pid === bodyPid);
    if (!b || dist(p, b) > CFG.reportRange * 1.6) return;
  } else {
    if (p.usedEmergency || sab.reactor) return;
    if (dist(p, EMERGENCY_BTN) > CFG.useRange * 1.6) return;
    p.usedEmergency = true;
  }
  bodies = [];
  sab.lights = false; sab.reactor = false;
  Object.values(players).forEach(q => { q.inVent = false; });
  meetState = { votes: {}, ends: Date.now() + CFG.meetingTime * 1000, reason, by: byId, body: bodyPid };
  const msg = { t: 'meeting', reason, by: byId, body: bodyPid || null,
                ps: Object.values(players).map(q => ({ id: q.id, name: q.name, skin: q.skin, dead: q.dead })),
                secs: CFG.meetingTime };
  broadcast(msg); onMeeting(msg);
  clearTimeout(meetTimer);
  meetTimer = setTimeout(finishVote, CFG.meetingTime * 1000);
}
function hostChat(pid, msg) {
  const p = players[pid];
  if (!p || phase !== 'meeting') return;
  const m = { t: 'chat', from: p.name, ghost: p.dead, msg: String(msg).slice(0, 80) };
  if (p.dead) { // hayalet sohbeti sadece ölülere
    conns.forEach(c => { if (c.open && players[c._pid] && players[c._pid].dead) c.send(m); });
    if (players[myId].dead) onChat(m);
  } else { broadcast(m); onChat(m); }
}
function hostVote(pid, target) {
  const p = players[pid];
  if (!p || p.dead || !meetState || meetState.votes[pid] !== undefined) return;
  meetState.votes[pid] = target; // target: pid veya 'skip'
  const m = { t: 'voted', pid, count: Object.keys(meetState.votes).length };
  broadcast(m); onVoted(m);
  const aliveCount = Object.values(players).filter(q => !q.dead).length;
  if (Object.keys(meetState.votes).length >= aliveCount) { clearTimeout(meetTimer); finishVote(); }
}
function finishVote() {
  if (!meetState) return;
  const tally = {};
  Object.values(meetState.votes).forEach(v => tally[v] = (tally[v] || 0) + 1);
  let best = null, bestN = 0, tie = false;
  Object.entries(tally).forEach(([k, n]) => {
    if (n > bestN) { best = k; bestN = n; tie = false; }
    else if (n === bestN) tie = true;
  });
  let ejected = null;
  if (best && best !== 'skip' && !tie) {
    ejected = best;
    players[ejected].dead = true;
    sendTo(ejected, { t: 'youdied' });
    if (ejected === myId) setTimeout(onYouDied, 100);
  }
  const wasImp = ejected ? impostorIds.includes(ejected) : false;
  const m = { t: 'eject', ejected, name: ejected ? players[ejected].name : null, wasImp, tie };
  meetState = null;
  broadcast(m); onEject(m);
  setTimeout(() => {
    if (phase !== 'end') {
      Object.values(players).forEach((q, i) => { q.x = SPAWN.x + (i % 5) * 70 - 140; q.y = SPAWN.y + Math.floor(i / 5) * 80 - 40; });
      if (!checkWin()) { phase = 'play'; broadcast({ t: 'resume' }); onResume(); }
    }
  }, 3500);
}
function checkWin() {
  if (phase === 'end') return true;
  const alive = Object.values(players).filter(p => !p.dead);
  const aliveImps = alive.filter(p => impostorIds.includes(p.id)).length;
  const aliveCrew = alive.length - aliveImps;
  if (aliveImps === 0) { endGame('crew', 'Tüm impostorlar elendi! 🎉'); return true; }
  if (aliveImps >= aliveCrew) { endGame('impostor', 'Impostorlar çoğunluğu ele geçirdi! 🔪'); return true; }
  return false;
}
function endGame(winner, why) {
  if (phase === 'end') return;
  phase = 'end';
  clearTimeout(meetTimer);
  const m = { t: 'end', winner, why, imps: impostorIds.map(id => players[id] ? players[id].name : '?') };
  broadcast(m); onEnd(m);
}
function sendTo(pid, msg) {
  const c = conns.find(x => x._pid === pid);
  if (c && c.open) c.send(msg);
}

// ---------- CLIENT: VERİ ----------
function onClientData(d) {
  switch (d.t) {
    case 'joined': myId = d.you; roomCode = d.code; enterLobby(); break;
    case 'full': status('Oda dolu veya oyun başladı.'); break;
    case 'lobby': {
      players = {};
      d.players.forEach(p => players[p.id] = newPlayer(p.id, p.name, p.skin));
      if (phase !== 'lobby') enterLobby(); else renderLobby(d.players);
      break;
    }
    case 'start':  startGameLocal(d.role, d.imps, d.tasks, d.ps); break;
    case 'snap':   applySnap(d); break;
    case 'youdied': onYouDied(); break;
    case 'revived': onRevived(d.pid); break;
    case 'meeting': onMeeting(d); break;
    case 'chat':   onChat(d); break;
    case 'voted':  onVoted(d); break;
    case 'eject':  onEject(d); break;
    case 'resume': onResume(); break;
    case 'sabinfo': onSabInfo(d.kind); break;
    case 'gunshot': playBeep(180, 0.3); break;
    case 'left':   delete players[d.pid]; break;
    case 'end':    onEnd(d); break;
  }
}
function applySnap(d) {
  d.ps.forEach(([id, x, y, dead, v]) => {
    const p = players[id]; if (!p) return;
    if (id === myId) { p.dead = !!dead; return; } // kendi pozisyonum lokal
    p.tx = x; p.ty = y; p.dead = !!dead; p.inVent = !!v;
    if (p.tx !== undefined && dist(p, { x, y }) > 400) { p.x = x; p.y = y; }
  });
  bodies = d.bd.map(([pid, x, y]) => ({ pid, x, y, t: bodies.find(b => b.pid === pid)?.t || Date.now() }));
  taskBarVal = d.bar;
  if (!isHost) { sab.lights = !!d.sab[0]; sab.reactor = !!d.sab[1]; sab.reactorT = d.sab[2]; }
  $('taskbar').style.setProperty('--p', Math.round(taskBarVal * 100) + '%');
}

// ---------- OLAY TEPKİLERİ (her iki taraf) ----------
function onYouDied() {
  playBeep(120, 0.4);
  showToast('💀 ÖLDÜN!\nHayalet oldun — görevlerine devam edebilirsin.', 3000);
}
function onRevived(pid) {
  if (pid === myId) showToast('💉 DOKTOR SENİ DİRİLTTİ!', 3000);
  playBeep(600, 0.2);
}
function onSabInfo(kind) {
  if (!isHost) { if (kind === 'lights') sab.lights = true; if (kind === 'reactor') { sab.reactor = true; sab.reactorT = CFG.reactorTime; } }
  playBeep(220, 0.5);
}
function onMeeting(d) {
  phase = 'meeting';
  closeTaskModal();
  const me = players[myId];
  Object.values(players).forEach((q, i) => { q.x = SPAWN.x + (i % 5) * 70 - 140; q.y = SPAWN.y; q.tx = q.x; q.ty = q.y; });
  meetUI(d);
  playBeep(440, 0.6);
}
let meetSecsLeft = 0, meetTicker = null, myVote = null;
function meetUI(d) {
  show('meeting');
  $('meeting-title').textContent = d.reason === 'body' ? '🚨 CESET BULUNDU!' : '🔔 ACİL TOPLANTI';
  const by = d.ps.find(p => p.id === d.by);
  const bodyP = d.body ? d.ps.find(p => p.id === d.body) : null;
  $('chat-box').innerHTML = `<div class="gh">📢 ${esc(by?.name || '?')} ${d.reason === 'body' ? `${esc(bodyP?.name || '?')}'in cesedini buldu!` : 'acil toplantı çağırdı!'}</div>`;
  myVote = null;
  const wrap = $('meeting-players'); wrap.innerHTML = '';
  d.ps.forEach(p => {
    const s = SKINS[p.skin];
    const el = document.createElement('div');
    el.className = 'vote-card' + (p.dead ? ' dead' : '');
    el.innerHTML = `<div class="av" style="${s.img ? `background-image:url(${s.img})` : ''}">${s.img ? '' : s.emoji}</div>
                    <span>${esc(p.name)}</span><span class="tally" id="tally-${p.id}"></span>`;
    if (!p.dead) el.onclick = () => castVote(p.id, el);
    wrap.appendChild(el);
  });
  const skip = document.createElement('div');
  skip.className = 'vote-card skip';
  skip.innerHTML = '⏭️ Pas Geç';
  skip.onclick = () => castVote('skip', skip);
  wrap.appendChild(skip);
  meetSecsLeft = d.secs;
  clearInterval(meetTicker);
  meetTicker = setInterval(() => {
    meetSecsLeft--;
    $('meeting-timer').textContent = `Oylama bitimine: ${Math.max(0, meetSecsLeft)} sn`;
    if (meetSecsLeft <= 0) clearInterval(meetTicker);
  }, 1000);
}
function castVote(target, el) {
  if (myVote !== null || players[myId].dead) return;
  myVote = target;
  document.querySelectorAll('.vote-card').forEach(e => e.classList.remove('voted-me'));
  el.classList.add('voted-me');
  action({ t: 'vote', target });
}
function onVoted(d) {
  const p = players[d.pid];
  if (p) addChat(`<span class="gh">🗳️ ${esc(p.name)} oyunu kullandı (${d.count})</span>`);
}
function onChat(d) {
  addChat(`${d.ghost ? '<span class="gh">👻 ' : ''}<b>${esc(d.from)}:</b> ${esc(d.msg)}${d.ghost ? '</span>' : ''}`);
}
function addChat(html) {
  const box = $('chat-box');
  const div = document.createElement('div');
  div.innerHTML = html;
  box.appendChild(div);
  box.scrollTop = box.scrollHeight;
}
$('chat-send').onclick = sendChat;
$('chat-input').addEventListener('keydown', e => { if (e.key === 'Enter') sendChat(); });
function sendChat() {
  const v = $('chat-input').value.trim();
  if (!v) return;
  $('chat-input').value = '';
  action({ t: 'chat', msg: v });
}
function onEject(d) {
  clearInterval(meetTicker);
  show('result');
  $('btn-back-lobby').style.display = 'none';
  $('result-text').innerHTML = d.ejected
    ? `${esc(d.name)} fırlatıldı.<span class="sub">${d.wasImp ? '✅ Impostordu!' : '❌ Impostor DEĞİLDİ...'}</span>`
    : `Kimse fırlatılmadı.<span class="sub">${d.tie ? 'Oylar eşit çıktı.' : 'Çoğunluk pas geçti.'}</span>`;
}
function onResume() {
  phase = 'play';
  show('game');
  renderTaskList();
  requestAnimationFrame(frame);
}
function onEnd(d) {
  phase = 'end';
  clearInterval(meetTicker);
  show('result');
  const crewWin = d.winner === 'crew';
  $('result-text').innerHTML =
    `<span style="color:${crewWin ? '#2ed573' : '#ff4757'}">${crewWin ? '🛠️ MÜRETTEBAT KAZANDI!' : '🔪 IMPOSTORLAR KAZANDI!'}</span>` +
    `<span class="sub">${esc(d.why)}<br>Impostor(lar): ${d.imps.map(esc).join(', ')}</span>`;
  $('btn-back-lobby').style.display = '';
}
$('btn-back-lobby').onclick = () => {
  if (isHost) { broadcast({ t: 'lobby', players: lobbyList() }); enterLobby(); syncLobby(); }
  else enterLobby();
};

// ---------- AKSİYON GÖNDERİMİ ----------
function action(msg) {
  if (isHost) onHostData({ _pid: myId }, msg);
  else if (conns[0] && conns[0].open) conns[0].send(msg);
}

// ---------- OYUN DÖNGÜSÜ / RENDER ----------
const canvas = $('game-canvas'), ctx = canvas.getContext('2d');
function resize() { canvas.width = innerWidth * devicePixelRatio; canvas.height = innerHeight * devicePixelRatio; }
addEventListener('resize', resize); resize();

let posTicker = setInterval(() => {
  if (phase !== 'play' || !players[myId]) return;
  const me = players[myId];
  if (!isHost) action({ t: 'pos', x: Math.round(me.x), y: Math.round(me.y), v: me.inVent ? 1 : 0 });
}, 100);

function walkable(x, y) {
  const r = CFG.radius - 6;
  const pts = [[x - r, y], [x + r, y], [x, y - r], [x, y + r]];
  return pts.every(([px, py]) => FLOORS.some(f => px >= f.x && px <= f.x + f.w && py >= f.y && py <= f.y + f.h));
}

function frame(t) {
  if (phase !== 'play') return;
  const dt = Math.min(0.05, (t - lastT) / 1000 || 0.016);
  lastT = t;
  const me = players[myId];
  if (me) {
    // hareket
    const sp = me.dead ? CFG.ghostSpeed : CFG.speed;
    if (!me.inVent && (joy.dx || joy.dy)) {
      const nx = me.x + joy.dx * sp * dt, ny = me.y + joy.dy * sp * dt;
      if (me.dead) { me.x = Math.max(0, Math.min(3160, nx)); me.y = Math.max(0, Math.min(1900, ny)); }
      else {
        if (walkable(nx, me.y)) me.x = nx;
        if (walkable(me.x, ny)) me.y = ny;
      }
    }
    cam.x += (me.x - cam.x) * 0.12;
    cam.y += (me.y - cam.y) * 0.12;
    killCd = Math.max(0, killCd - dt);
    sabCd = Math.max(0, sabCd - dt);
  }
  // diğer oyuncular interpolasyon
  Object.values(players).forEach(p => {
    if (p.id === myId || p.tx === undefined) return;
    p.x += (p.tx - p.x) * 0.25;
    p.y += (p.ty - p.y) * 0.25;
  });
  draw();
  updateHUD();
  requestAnimationFrame(frame);
}

function draw() {
  const W = canvas.width, H = canvas.height, s = devicePixelRatio;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#05070f';
  ctx.fillRect(0, 0, W, H);
  ctx.setTransform(s, 0, 0, s, W / 2 - cam.x * s, H / 2 - cam.y * s);

  // zemin
  FLOORS.forEach(f => {
    ctx.fillStyle = '#1d2440';
    ctx.fillRect(f.x, f.y, f.w, f.h);
  });
  ROOMS.forEach(f => {
    ctx.fillStyle = '#232b4d';
    ctx.fillRect(f.x + 8, f.y + 8, f.w - 16, f.h - 16);
    ctx.strokeStyle = '#3a4472'; ctx.lineWidth = 4;
    ctx.strokeRect(f.x, f.y, f.w, f.h);
    ctx.fillStyle = '#69739f'; ctx.font = 'bold 26px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(f.name, f.x + f.w / 2, f.y + 34);
  });

  // acil buton
  ctx.fillStyle = '#8b1e28'; ctx.beginPath(); ctx.arc(EMERGENCY_BTN.x, EMERGENCY_BTN.y, 30, 0, 7); ctx.fill();
  ctx.fillStyle = '#ff4757'; ctx.beginPath(); ctx.arc(EMERGENCY_BTN.x, EMERGENCY_BTN.y, 20, 0, 7); ctx.fill();

  // ventler (impostor ve hayaletler görür, diğerleri de görür ama kullanamaz)
  VENTS.forEach(v => {
    ctx.fillStyle = '#11152b'; ctx.beginPath(); ctx.ellipse(v.x, v.y, 30, 20, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = '#3a4472'; ctx.lineWidth = 3; ctx.stroke();
  });

  // görev noktaları
  const me = players[myId];
  TASK_POOL.forEach(tp => {
    const mine = myTasks.some(t => t && t.id === tp.id) && me && !me.doneTasks?.includes?.(tp.id) && !myDone(tp.id);
    ctx.fillStyle = mine ? '#f1c40f' : '#3a4472';
    ctx.fillRect(tp.x - 14, tp.y - 14, 28, 28);
    ctx.strokeStyle = '#0b0e1a'; ctx.strokeRect(tp.x - 14, tp.y - 14, 28, 28);
    if (mine) { ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 20px sans-serif'; ctx.fillText('!', tp.x, tp.y - 22); }
  });

  // sabotaj fix noktaları
  if (sab.lights) drawFix(FIX_POINTS.lights);
  if (sab.reactor) drawFix(FIX_POINTS.reactor);

  // cesetler
  bodies.forEach(b => {
    const p = players[b.pid];
    const col = p ? SKINS[p.skin].color : '#999';
    ctx.save(); ctx.translate(b.x, b.y); ctx.rotate(1.2);
    drawBean(0, 0, col, null, 0.9);
    ctx.restore();
    ctx.fillStyle = '#ff4757'; ctx.font = 'bold 22px sans-serif'; ctx.fillText('💀', b.x, b.y - 40);
  });

  // oyuncular
  const meDead = me && me.dead;
  Object.values(players).forEach(p => {
    if (p.dead && !meDead && p.id !== myId) return;   // hayaletleri sadece ölüler görür
    if (p.inVent && p.id !== myId) return;
    ctx.globalAlpha = p.dead ? 0.45 : 1;
    drawBean(p.x, p.y, SKINS[p.skin].color, skinImgs[p.skin], 1, SKINS[p.skin].emoji);
    ctx.globalAlpha = 1;
    ctx.fillStyle = p.dead ? '#8a92b8' : '#fff';
    ctx.font = 'bold 18px sans-serif'; ctx.textAlign = 'center';
    ctx.fillText(p.name + (p.id === myId ? ' (sen)' : ''), p.x, p.y - 58);
  });

  // görüş karartması
  if (me && !me.dead) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    let vr = myRole === 'impostor' ? CFG.visionImp : (sab.lights ? CFG.visionLights : CFG.visionCrew);
    vr *= devicePixelRatio;
    const g = ctx.createRadialGradient(W / 2, H / 2, vr * 0.55, W / 2, H / 2, vr);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.93)');
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
  }
}
function drawFix(fp) {
  ctx.strokeStyle = '#ff4757'; ctx.lineWidth = 4;
  ctx.strokeRect(fp.x - 26, fp.y - 26, 52, 52);
  ctx.fillStyle = '#ff4757'; ctx.font = 'bold 30px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText('⚠️', fp.x, fp.y + 10);
}
function drawBean(x, y, color, img, scale = 1, emoji) {
  ctx.save(); ctx.translate(x, y); ctx.scale(scale, scale);
  // gövde (fasulye)
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.ellipse(0, 12, 24, 30, 0, 0, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(0,0,0,0.4)'; ctx.lineWidth = 3; ctx.stroke();
  // sırt çantası
  ctx.fillStyle = color;
  ctx.fillRect(-32, 0, 10, 26);
  // kafa: fotoğraf veya emoji
  if (img && img.complete && img.naturalWidth) {
    ctx.beginPath(); ctx.arc(0, -22, 24, 0, 7); ctx.closePath();
    ctx.save(); ctx.clip();
    ctx.drawImage(img, -24, -46, 48, 48);
    ctx.restore();
    ctx.beginPath(); ctx.arc(0, -22, 24, 0, 7);
    ctx.strokeStyle = '#0b0e1a'; ctx.lineWidth = 3; ctx.stroke();
  } else {
    ctx.fillStyle = color;
    ctx.beginPath(); ctx.arc(0, -22, 22, 0, 7); ctx.fill(); ctx.stroke();
    // vizör
    ctx.fillStyle = '#9fd8e8';
    ctx.beginPath(); ctx.ellipse(8, -24, 14, 9, 0, 0, 7); ctx.fill();
  }
  ctx.restore();
}
function myDone(taskId) {
  const me = players[myId];
  return me && me.doneTasks && me.doneTasks.includes(taskId);
}

// ---------- HUD ----------
let toastTimer = null;
function showToast(text, ms) {
  let el = $('toast');
  if (!el) {
    el = document.createElement('div'); el.id = 'toast';
    el.style.cssText = 'position:fixed;top:30%;left:50%;transform:translateX(-50%);background:#151a2ef0;padding:16px 24px;border-radius:14px;font-weight:800;text-align:center;white-space:pre-line;z-index:99;max-width:86vw;font-size:15px;';
    document.body.appendChild(el);
  }
  el.textContent = text; el.style.display = 'block';
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.style.display = 'none', ms || 2500);
}
function renderTaskList() {
  const el = $('task-list');
  if (myRole === 'impostor') {
    el.innerHTML = '🔪 <b>Sahte görev yap, kimse anlamasın</b>';
    return;
  }
  el.innerHTML = myTasks.map(t =>
    `<div class="${myDone(t.id) ? 'done' : ''}">▫️ ${esc(t.label)}</div>`).join('');
}
function nearest(list, from, range) {
  let best = null, bd = range;
  list.forEach(o => { const d = dist(from, o); if (d < bd) { bd = d; best = o; } });
  return best;
}
function updateHUD() {
  const me = players[myId];
  if (!me) return;
  const alive = !me.dead;
  const nearBody = nearest(bodies, me, CFG.reportRange);
  const myTaskPts = myTasks.filter(t => t && !myDone(t.id));
  const nearTask = alive || me.dead ? nearest(myTaskPts, me, CFG.useRange) : null;
  const nearBtn = dist(me, EMERGENCY_BTN) < CFG.useRange;
  const nearVent = nearest(VENTS, me, CFG.useRange);
  const nearFixL = sab.lights && dist(me, FIX_POINTS.lights) < CFG.useRange;
  const nearFixR = sab.reactor && dist(me, FIX_POINTS.reactor) < CFG.useRange;
  const others = Object.values(players).filter(p => p.id !== myId && !p.dead && !p.inVent);
  const nearVictim = nearest(others, me, CFG.killRange);

  // KULLAN (vent içindeyken ÇIK olur)
  const useB = $('btn-use');
  const canUse = me.inVent || nearTask || nearFixL || nearFixR || (alive && nearBtn && !me.usedEmergency && !sab.reactor);
  useB.classList.toggle('show', !!canUse);
  useB.querySelector('span').textContent = me.inVent ? 'ÇIK' : 'KULLAN';
  useB.onclick = () => {
    if (me.inVent) { me.inVent = false; return; }
    if (nearFixL) return action({ t: 'fix', kind: 'lights' });
    if (nearFixR) return action({ t: 'fix', kind: 'reactor' });
    if (nearTask) return openTaskModal(nearTask);
    if (nearBtn) return action({ t: 'report', body: null });
  };

  // RAPOR
  const repB = $('btn-report');
  repB.classList.toggle('show', alive && !!nearBody);
  repB.onclick = () => nearBody && action({ t: 'report', body: nearBody.pid });

  // IMPOSTOR butonları
  const isImp = myRole === 'impostor' && alive;
  const killB = $('btn-kill');
  killB.classList.toggle('show', isImp);
  killB.disabled = !nearVictim || killCd > 0;
  killB.querySelector('span').textContent = killCd > 0 ? Math.ceil(killCd) + 's' : 'ÖLDÜR';
  killB.onclick = () => {
    if (nearVictim && killCd <= 0) {
      action({ t: 'kill', target: nearVictim.id });
      killCd = CFG.killCooldown;
      playBeep(150, 0.25);
    }
  };
  // VENT: dışarıdaysan girersin, içindeysen gruptaki sıradaki vente atlarsın (ÇIK = KULLAN butonu)
  const ventB = $('btn-vent');
  ventB.classList.toggle('show', isImp && (!!nearVent || me.inVent));
  ventB.querySelector('span').textContent = me.inVent ? 'ATLA' : 'VENT';
  ventB.onclick = () => {
    if (me.inVent) {
      const v = nearest(VENTS, me, 60);
      if (v) {
        const group = VENTS.filter(o => o.g === v.g);
        const nv = group[(group.indexOf(v) + 1) % group.length];
        me.x = nv.x; me.y = nv.y;
      }
    } else if (nearVent) { me.inVent = true; me.x = nearVent.x; me.y = nearVent.y; }
  };
  const sabB = $('btn-sabotage');
  sabB.classList.toggle('show', isImp);
  sabB.disabled = sab.lights || sab.reactor || sabCd > 0;
  sabB.onclick = () => $('sabotage-menu').classList.remove('hidden');

  // DOKTOR
  const revB = $('btn-revive');
  const canRev = myRole === 'doctor' && alive && !reviveUsed && nearBody &&
                 Date.now() - nearBody.t < CFG.reviveWindow * 1000;
  revB.classList.toggle('show', myRole === 'doctor' && alive && !reviveUsed && !!nearBody);
  revB.disabled = !canRev;
  revB.onclick = () => {
    if (canRev) { action({ t: 'revive', body: nearBody.pid }); reviveUsed = true; }
  };

  // ŞERİF
  const shB = $('btn-shoot');
  shB.classList.toggle('show', myRole === 'sheriff' && alive && !sheriffUsed);
  shB.disabled = !nearVictim;
  shB.onclick = () => {
    if (nearVictim && !sheriffUsed) { sheriffUsed = true; action({ t: 'sheriff', target: nearVictim.id }); }
  };

  // sabotaj banner
  $('sab-banner').textContent = sab.reactor ? `☢️ REAKTÖR: ${Math.ceil(sab.reactorT)} sn — Reaktöre koş!`
    : sab.lights ? '💡 IŞIKLAR KAPALI — Elektriğe git!' : '';
}
$('sab-lights').onclick = () => { action({ t: 'sab', kind: 'lights' }); sabCd = 30; $('sabotage-menu').classList.add('hidden'); };
$('sab-reactor').onclick = () => { action({ t: 'sab', kind: 'reactor' }); sabCd = 30; $('sabotage-menu').classList.add('hidden'); };
$('sab-close').onclick = () => $('sabotage-menu').classList.add('hidden');

// ---------- JOYSTICK ----------
const joyEl = $('joystick'), stick = $('stick');
let joyTouch = null;
function joyStart(e) {
  const t = e.changedTouches ? e.changedTouches[0] : e;
  joyTouch = t.identifier ?? 'mouse';
  joyMove(e);
}
function joyMove(e) {
  if (joyTouch === null) return;
  const t = e.changedTouches ? [...e.changedTouches].find(x => x.identifier === joyTouch) : e;
  if (!t) return;
  const r = joyEl.getBoundingClientRect();
  let dx = t.clientX - (r.left + r.width / 2), dy = t.clientY - (r.top + r.height / 2);
  const m = Math.hypot(dx, dy), max = r.width / 2;
  if (m > max) { dx = dx / m * max; dy = dy / m * max; }
  stick.style.left = (r.width / 2 - 22 + dx) + 'px';
  stick.style.top = (r.height / 2 - 22 + dy) + 'px';
  const dead = 8;
  joy.dx = m > dead ? dx / max : 0;
  joy.dy = m > dead ? dy / max : 0;
}
function joyEnd(e) {
  if (e.changedTouches && ![...e.changedTouches].some(x => x.identifier === joyTouch)) return;
  joyTouch = null; joy.dx = 0; joy.dy = 0;
  stick.style.left = '38px'; stick.style.top = '38px';
}
joyEl.addEventListener('touchstart', joyStart, { passive: true });
joyEl.addEventListener('touchmove', joyMove, { passive: true });
joyEl.addEventListener('touchend', joyEnd);
joyEl.addEventListener('mousedown', e => { joyStart(e); const mm = ev => joyMove(ev), mu = ev => { joyEnd(ev); removeEventListener('mousemove', mm); removeEventListener('mouseup', mu); }; addEventListener('mousemove', mm); addEventListener('mouseup', mu); });

// klavye (masaüstü testi için)
const keys = {};
addEventListener('keydown', e => { keys[e.key.toLowerCase()] = true; updKeys(); });
addEventListener('keyup', e => { keys[e.key.toLowerCase()] = false; updKeys(); });
function updKeys() {
  let dx = 0, dy = 0;
  if (keys['w'] || keys['arrowup']) dy -= 1;
  if (keys['s'] || keys['arrowdown']) dy += 1;
  if (keys['a'] || keys['arrowleft']) dx -= 1;
  if (keys['d'] || keys['arrowright']) dx += 1;
  const m = Math.hypot(dx, dy) || 1;
  if (dx || dy) { joy.dx = dx / m; joy.dy = dy / m; }
  else if (joyTouch === null) { joy.dx = 0; joy.dy = 0; }
}

// ---------- GÖREV MİNİ OYUNLARI ----------
function openTaskModal(task) {
  openTask = task;
  const box = $('task-box');
  box.innerHTML = `<h3>${esc(task.label)}</h3>`;
  $('task-modal').classList.remove('hidden');
  const games = { wires: gameWires, download: gameDownload, keypad: gameKeypad, fuel: gameFuel, asteroid: gameAsteroid };
  games[task.type](box, () => {
    action({ t: 'taskdone', id: task.id });
    const me = players[myId];
    if (me) { me.doneTasks = me.doneTasks || []; me.doneTasks.push(task.id); }
    closeTaskModal();
    renderTaskList();
    playBeep(700, 0.15);
    showToast('✅ Görev tamam!', 1200);
  });
  const cancel = document.createElement('button');
  cancel.className = 'btn small'; cancel.textContent = 'Kapat';
  cancel.onclick = closeTaskModal;
  box.appendChild(cancel);
}
function closeTaskModal() { $('task-modal').classList.add('hidden'); openTask = null; }

function gameWires(box, done) {
  const colors = ['#e74c3c', '#f1c40f', '#3498db', '#e91e8c'];
  const left = [...colors].sort(() => Math.random() - 0.5);
  const right = [...colors].sort(() => Math.random() - 0.5);
  const area = document.createElement('div'); area.className = 'wire-area';
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg'); svg.classList.add('wire-svg');
  svg.setAttribute('width', '100%'); svg.setAttribute('height', '100%');
  const colL = document.createElement('div'); colL.className = 'wire-col';
  const colR = document.createElement('div'); colR.className = 'wire-col';
  let sel = null, doneCount = 0;
  left.forEach(c => {
    const n = document.createElement('div'); n.className = 'wire-node'; n.style.background = c;
    n.onclick = () => { if (n.classList.contains('done')) return;
      colL.querySelectorAll('.wire-node').forEach(e => e.classList.remove('sel'));
      n.classList.add('sel'); sel = { el: n, c }; };
    colL.appendChild(n);
  });
  right.forEach(c => {
    const n = document.createElement('div'); n.className = 'wire-node'; n.style.background = c;
    n.onclick = () => {
      if (!sel || n.classList.contains('done')) return;
      if (sel.c === c) {
        sel.el.classList.add('done'); sel.el.classList.remove('sel'); n.classList.add('done');
        const r1 = sel.el.getBoundingClientRect(), r2 = n.getBoundingClientRect(), ra = area.getBoundingClientRect();
        const ln = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        ln.setAttribute('x1', r1.right - ra.left); ln.setAttribute('y1', r1.top + 22 - ra.top);
        ln.setAttribute('x2', r2.left - ra.left);  ln.setAttribute('y2', r2.top + 22 - ra.top);
        ln.setAttribute('stroke', c); ln.setAttribute('stroke-width', '6');
        svg.appendChild(ln);
        sel = null;
        if (++doneCount === 4) setTimeout(done, 300);
      } else { sel.el.classList.remove('sel'); sel = null; playBeep(200, 0.1); }
    };
    colR.appendChild(n);
  });
  area.append(colL, svg, colR);
  box.appendChild(area);
}
function gameDownload(box, done) {
  const p = document.createElement('div'); p.className = 'prog'; p.innerHTML = '<i></i>';
  const b = document.createElement('button'); b.className = 'hold-btn'; b.textContent = '⬇️';
  const info = document.createElement('p'); info.textContent = 'Basılı tut...';
  let v = 0, iv = null;
  const start = () => { iv = setInterval(() => { v += 2; p.firstChild.style.width = v + '%'; if (v >= 100) { clearInterval(iv); done(); } }, 80); };
  const stop = () => clearInterval(iv);
  b.addEventListener('touchstart', e => { e.preventDefault(); start(); });
  b.addEventListener('touchend', stop);
  b.addEventListener('mousedown', start);
  b.addEventListener('mouseup', stop);
  box.append(info, p, b);
}
const gameFuel = gameDownload; // aynı mekanik, farklı etiket
function gameKeypad(box, done) {
  const code = String(1000 + rnd(9000));
  const disp = document.createElement('div'); disp.className = 'code-disp'; disp.textContent = code;
  const entry = document.createElement('div'); entry.className = 'code-disp'; entry.textContent = '';
  const pad = document.createElement('div'); pad.className = 'keypad';
  const info = document.createElement('p'); info.textContent = 'Kodu ezberle ve gir:';
  setTimeout(() => disp.textContent = '····', 2500);
  let cur = '';
  [1,2,3,4,5,6,7,8,9,'←',0,'✓'].forEach(k => {
    const b = document.createElement('button'); b.textContent = k;
    b.onclick = () => {
      if (k === '←') cur = cur.slice(0, -1);
      else if (k === '✓') {
        if (cur === code) done();
        else { cur = ''; entry.style.color = '#ff4757'; setTimeout(() => entry.style.color = '', 400); playBeep(200, 0.15); }
      } else if (cur.length < 4) cur += k;
      entry.textContent = cur.padEnd(4, '·');
    };
    pad.appendChild(b);
  });
  box.append(info, disp, entry, pad);
}
function gameAsteroid(box, done) {
  const area = document.createElement('div'); area.className = 'ast-area';
  const info = document.createElement('p'); info.textContent = 'Asteroitlere dokun! (8)';
  let hits = 0;
  const spawn = () => {
    if (hits >= 8) return;
    const a = document.createElement('div'); a.className = 'ast'; a.textContent = '☄️';
    a.style.left = rnd(80) + '%'; a.style.top = rnd(75) + '%';
    a.onclick = () => { a.remove(); hits++; info.textContent = `Asteroitlere dokun! (${8 - hits})`; playBeep(500, 0.06);
      if (hits >= 8) setTimeout(done, 200); else spawn(); };
    area.appendChild(a);
    setTimeout(() => { if (a.parentNode) { a.remove(); spawn(); } }, 1800);
  };
  spawn(); spawn();
  box.append(info, area);
}

// ---------- SES ----------
let audioCtx = null;
function playBeep(freq, dur) {
  try {
    audioCtx = audioCtx || new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(), g = audioCtx.createGain();
    o.frequency.value = freq; o.type = 'square';
    g.gain.value = 0.06;
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    o.connect(g); g.connect(audioCtx.destination);
    o.start(); o.stop(audioCtx.currentTime + dur);
  } catch (_) {}
}
