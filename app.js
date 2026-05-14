/* ═══════════════════════════════════════════════════════════
   Glice App — Figure Skating PWA
   ═══════════════════════════════════════════════════════════ */

// ─── Action Database ───
const ACTIONS = [
  // 基础滑行
  { id:'fwd',    zh:'前滑', en:'Forward Skating', cat:'basic', emoji:'⛸️' },
  { id:'bwd',    zh:'后滑', en:'Backward Skating', cat:'basic', emoji:'⛸️' },
  { id:'cross',  zh:'交叉步', en:'Crossovers', cat:'basic', emoji:'🔄' },
  { id:'swizzle',zh:'葫芦步', en:'Swizzles', cat:'basic', emoji:'🫘' },
  { id:'stop',   zh:'急停', en:'Hockey Stop', cat:'basic', emoji:'🛑' },
  { id:'t-stop', zh:'T字停', en:'T-Stop', cat:'basic', emoji:'🇹' },
  { id:'glide1', zh:'单脚滑行', en:'One-Foot Glide', cat:'basic', emoji:'🦶' },
  { id:'lunge',  zh:'弓步', en:'Lunge', cat:'basic', emoji:'🏋️' },
  // 跳跃
  { id:'toe1',   zh:'后外点冰一周跳', en:'Single Toeloop', cat:'jump', emoji:'💫' },
  { id:'sal1',   zh:'后内一周跳', en:'Single Salchow', cat:'jump', emoji:'🌀' },
  { id:'loop1',  zh:'后外一周跳', en:'Single Loop', cat:'jump', emoji:'➰' },
  { id:'flip1',  zh:'后内点冰一周跳', en:'Single Flip', cat:'jump', emoji:'🔃' },
  { id:'lutz1',  zh:'后外点冰一周跳', en:'Single Lutz', cat:'jump', emoji:'⚡' },
  { id:'axel1',  zh:'一周半跳', en:'Single Axel', cat:'jump', emoji:'🌟' },
  { id:'waltz',  zh:'华尔兹跳', en:'Waltz Jump', cat:'jump', emoji:'🎵' },
  { id:'toe2',   zh:'后外点冰两周跳', en:'Double Toeloop', cat:'jump', emoji:'💫' },
  { id:'sal2',   zh:'后内两周跳', en:'Double Salchow', cat:'jump', emoji:'🌀' },
  // 旋转
  { id:'us',     zh:'直立转', en:'Upright Spin', cat:'spin', emoji:'🌪️' },
  { id:'sit',    zh:'蹲转', en:'Sit Spin', cat:'spin', emoji:'🪑' },
  { id:'camel',  zh:'燕式转', en:'Camel Spin', cat:'spin', emoji:'🐪' },
  { id:'bspin',  zh:'反身转', en:'Back Spin', cat:'spin', emoji:'🔄' },
  { id:'scratch',zh:'直立联合转', en:'Scratch Spin', cat:'spin', emoji:'✨' },
  { id:'layback',zh:'躬身转', en:'Layback Spin', cat:'spin', emoji:'🌸' },
  // 步法
  { id:'3turn',  zh:'三字转体', en:'Three Turn', cat:'step', emoji:'3️⃣' },
  { id:'mohawk', zh:'莫霍克步', en:'Mohawk', cat:'step', emoji:'🦅' },
  { id:'choctaw',zh:'乔克塔步', en:'Choctaw', cat:'step', emoji:'👣' },
  { id:'rocker', zh:'摇滚步', en:'Rocker', cat:'step', emoji:'🎸' },
  { id:'counter',zh:'反摇滚步', en:'Counter', cat:'step', emoji:'↩️' },
  { id:'bracket',zh:'括弧步', en:'Bracket', cat:'step', emoji:'🔗' },
  { id:'twizzle',zh:'捻转步', en:'Twizzle', cat:'step', emoji:'🌀' },
  // 连接动作
  { id:'spiral', zh:'燕式滑行', en:'Spiral', cat:'connect', emoji:'🦢' },
  { id:'ina',    zh:'伊纳鲍尔', en:'Ina Bauer', cat:'connect', emoji:'🎭' },
  { id:'spread', zh:'大鹏展翅', en:'Spread Eagle', cat:'connect', emoji:'🦅' },
  { id:'hydro',  zh:'落蹲滑行', en:'Hydroblading', cat:'connect', emoji:'💧' },
  { id:'charlotte',zh:'夏洛特螺旋', en:'Charlotte Spiral', cat:'connect', emoji:'🌺' },
];

const CATEGORIES = [
  { id:'all', label:'全部' },
  { id:'basic', label:'基础滑行' },
  { id:'jump', label:'跳跃' },
  { id:'spin', label:'旋转' },
  { id:'step', label:'步法' },
  { id:'connect', label:'连接动作' },
];

// ─── IndexedDB ───
const DB_NAME = 'GliceDB';
const DB_VER = 1;
let db;

function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VER);
    req.onupgradeneeded = (e) => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('mastery')) {
        d.createObjectStore('mastery', { keyPath: 'actionId' });
      }
      if (!d.objectStoreNames.contains('checkins')) {
        const s = d.createObjectStore('checkins', { keyPath: 'id', autoIncrement: true });
        s.createIndex('date', 'date', { unique: false });
      }
      if (!d.objectStoreNames.contains('notes')) {
        const s = d.createObjectStore('notes', { keyPath: 'id', autoIncrement: true });
        s.createIndex('actionId', 'actionId', { unique: false });
      }
    };
    req.onsuccess = (e) => { db = e.target.result; resolve(db); };
    req.onerror = (e) => reject(e);
  });
}

function dbPut(store, data) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).put(data);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

function dbGetAll(store) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

function dbGet(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readonly');
    const req = tx.objectStore(store).get(key);
    req.onsuccess = () => resolve(req.result);
    req.onerror = (e) => reject(e);
  });
}

function dbDelete(store, key) {
  return new Promise((resolve, reject) => {
    const tx = db.transaction(store, 'readwrite');
    tx.objectStore(store).delete(key);
    tx.oncomplete = () => resolve();
    tx.onerror = (e) => reject(e);
  });
}

// ─── State ───
let currentPage = 'training';
let currentCat = 'all';
let currentFilter = 'all'; // all, learning, unlearned
let calYear, calMonth, selectedDate;
let currentDetailAction = null;
let masteryMap = {};   // actionId -> 'unlearned' | 'learning' | 'mastered'
let checkinData = [];  // [{date, actions:[]}]
let notesData = [];

// ─── Helpers ───
function dateStr(d) {
  const dd = d || new Date();
  return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`;
}

function toast(msg) {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.classList.add('show');
  setTimeout(() => el.classList.remove('show'), 2200);
}

function getActionPracticeDays(actionId) {
  const dates = new Set();
  checkinData.forEach(c => { if (c.actions.includes(actionId)) dates.add(c.date); });
  return dates.size;
}

function getRecentPracticeDays(actionId, days=30) {
  const now = new Date();
  let count = 0;
  checkinData.forEach(c => {
    if (!c.actions.includes(actionId)) return;
    const diff = (now - new Date(c.date)) / 86400000;
    if (diff <= days) count++;
  });
  return count;
}

// ─── Navigation ───
function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-' + page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
  document.querySelector(`.nav-btn[data-page="${page}"]`).classList.add('active');

  if (page === 'training') renderCalendar();
  if (page === 'library') renderLibrary();
  if (page === 'achievements') renderAchievements();
}

// ─── Library ───
function renderLibrary() {
  const grid = document.getElementById('action-grid');
  const tabs = document.getElementById('cat-tabs');

  // Category tabs
  tabs.innerHTML = CATEGORIES.map(c =>
    `<button class="cat-tab ${c.id===currentCat?'active':''}" onclick="setCat('${c.id}')">${c.label}</button>`
  ).join('');

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(p => {
    p.classList.toggle('active', p.dataset.filter === currentFilter);
  });

  let actions = currentCat === 'all' ? ACTIONS : ACTIONS.filter(a => a.cat === currentCat);

  if (currentFilter === 'learning') {
    actions = actions.filter(a => masteryMap[a.id] === 'learning' || masteryMap[a.id] === 'mastered');
  } else if (currentFilter === 'unlearned') {
    actions = actions.filter(a => !masteryMap[a.id] || masteryMap[a.id] === 'unlearned');
  }

  if (actions.length === 0) {
    grid.innerHTML = `<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">❄️</div><p>暂无匹配的动作</p></div>`;
    return;
  }

  grid.innerHTML = actions.map(a => {
    const m = masteryMap[a.id] || 'unlearned';
    const days = getActionPracticeDays(a.id);
    return `<div class="card action-card" onclick="openDetail('${a.id}')">
      <div class="card-top">
        <span class="emoji-icon">${a.emoji}</span>
        <span class="mastery-dot ${m}"></span>
      </div>
      <div>
        <div class="action-name-zh">${a.zh}</div>
        <div class="action-name-en">${a.en}</div>
      </div>
      <div class="card-bottom">
        <span class="practice-count">${days > 0 ? days + ' 天练习' : ''}</span>
      </div>
    </div>`;
  }).join('');
}

function setCat(cat) {
  currentCat = cat;
  renderLibrary();
}

function setFilter(f) {
  currentFilter = f;
  renderLibrary();
}

// ─── Calendar ───
function renderCalendar() {
  const now = new Date();
  if (!calYear) { calYear = now.getFullYear(); calMonth = now.getMonth(); }
  if (!selectedDate) selectedDate = dateStr(now);

  const nav = document.getElementById('cal-month');
  nav.textContent = `${calYear}年${calMonth + 1}月`;

  const grid = document.getElementById('cal-grid');
  const first = new Date(calYear, calMonth, 1);
  const startDay = first.getDay();
  const daysInMonth = new Date(calYear, calMonth + 1, 0).getDate();
  const today = dateStr(now);

  // Dates with records
  const recordDates = new Set(checkinData.map(c => c.date));

  const labels = ['日','一','二','三','四','五','六'];
  let html = labels.map(l => `<div class="day-label">${l}</div>`).join('');

  // Previous month fill
  const prevDays = new Date(calYear, calMonth, 0).getDate();
  for (let i = startDay - 1; i >= 0; i--) {
    html += `<div class="day-cell other-month">${prevDays - i}</div>`;
  }

  for (let d = 1; d <= daysInMonth; d++) {
    const ds = `${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls = [
      'day-cell',
      ds === today ? 'today' : '',
      ds === selectedDate ? 'selected' : '',
      recordDates.has(ds) ? 'has-record' : '',
    ].filter(Boolean).join(' ');
    html += `<div class="${cls}" onclick="selectDay('${ds}')">${d}</div>`;
  }

  // Next month fill
  const totalCells = startDay + daysInMonth;
  const remaining = (7 - totalCells % 7) % 7;
  for (let i = 1; i <= remaining; i++) {
    html += `<div class="day-cell other-month">${i}</div>`;
  }

  grid.innerHTML = html;
  renderDayDetail();
  renderCheckinPanel();
}

function selectDay(ds) {
  selectedDate = ds;
  renderCalendar();
}

function calPrev() { calMonth--; if (calMonth < 0) { calMonth = 11; calYear--; } renderCalendar(); }
function calNext() { calMonth++; if (calMonth > 11) { calMonth = 0; calYear++; } renderCalendar(); }

function renderDayDetail() {
  const el = document.getElementById('day-detail');
  const record = checkinData.filter(c => c.date === selectedDate);
  const actionIds = new Set();
  record.forEach(c => c.actions.forEach(a => actionIds.add(a)));

  if (actionIds.size === 0) {
    el.innerHTML = `<h4>📅 ${selectedDate}</h4><p style="color:var(--text-muted);font-size:0.8rem;">当日暂无练习记录</p>`;
    return;
  }

  const tags = [...actionIds].map(id => {
    const a = ACTIONS.find(x => x.id === id);
    return a ? `<span class="day-action-tag">${a.emoji} ${a.zh}</span>` : '';
  }).join('');

  el.innerHTML = `<h4>📅 ${selectedDate} · ${actionIds.size}个动作</h4><div class="day-action-list">${tags}</div>`;
}

// ─── Checkin ───
let checkinSelected = new Set();

function renderCheckinPanel() {
  const el = document.getElementById('checkin-actions');
  checkinSelected.clear();

  // Pre-check actions already recorded today
  const todayRecords = checkinData.filter(c => c.date === selectedDate);
  todayRecords.forEach(c => c.actions.forEach(a => checkinSelected.add(a)));

  el.innerHTML = ACTIONS.map(a => {
    const checked = checkinSelected.has(a.id) ? 'checked' : '';
    return `<button class="checkin-chip ${checked}" data-id="${a.id}" onclick="toggleCheckin('${a.id}', this)">
      ${a.emoji} ${a.zh}
    </button>`;
  }).join('');
}

function toggleCheckin(id, btn) {
  if (checkinSelected.has(id)) {
    checkinSelected.delete(id);
    btn.classList.remove('checked');
  } else {
    checkinSelected.add(id);
    btn.classList.add('checked');
  }
}

async function saveCheckin() {
  if (checkinSelected.size === 0) { toast('请先勾选练习动作'); return; }

  // Remove old records for this date
  const allCheckins = await dbGetAll('checkins');
  for (const c of allCheckins) {
    if (c.date === selectedDate) await dbDelete('checkins', c.id);
  }

  // Save new record
  await dbPut('checkins', { date: selectedDate, actions: [...checkinSelected] });

  // Auto-update mastery: if unlearned and practiced, set to learning
  for (const id of checkinSelected) {
    if (!masteryMap[id] || masteryMap[id] === 'unlearned') {
      masteryMap[id] = 'learning';
      await dbPut('mastery', { actionId: id, level: 'learning' });
    }
  }

  checkinData = await dbGetAll('checkins');
  toast('✅ 打卡成功！');
  renderCalendar();
}

// ─── Detail Page ───
function openDetail(actionId) {
  currentDetailAction = actionId;
  const a = ACTIONS.find(x => x.id === actionId);
  if (!a) return;

  const m = masteryMap[a.id] || 'unlearned';
  const totalDays = getActionPracticeDays(a.id);
  const recentDays = getRecentPracticeDays(a.id);
  const catLabel = CATEGORIES.find(c => c.id === a.cat)?.label || '';

  // Check medal
  const hasMedal = totalDays >= 100 && recentDays > 0;

  document.getElementById('detail-content').innerHTML = `
    <button class="detail-back" onclick="closeDetail()">‹ 返回</button>
    <div class="detail-header">
      <div class="detail-emoji">${a.emoji}</div>
      <h2>${a.zh}</h2>
      <div class="detail-en">${a.en}</div>
      <span class="detail-category">${catLabel}</span>
      ${hasMedal ? '<div style="margin-top:8px;font-size:1.2rem">🏅 肌肉记忆勋章</div>' : ''}
    </div>

    <div class="mastery-selector">
      <button class="mastery-option ${m==='unlearned'?'active-unlearned':''}" onclick="setMastery('${a.id}','unlearned')">
        <span class="mastery-dot unlearned"></span> 未开始
      </button>
      <button class="mastery-option ${m==='learning'?'active-learning':''}" onclick="setMastery('${a.id}','learning')">
        <span class="mastery-dot learning"></span> 学习中
      </button>
      <button class="mastery-option ${m==='mastered'?'active-mastered':''}" onclick="setMastery('${a.id}','mastered')">
        <span class="mastery-dot mastered"></span> 已熟练
      </button>
    </div>

    <div class="stats-row">
      <div class="stat-box"><div class="stat-val">${totalDays}</div><div class="stat-label">累计练习天数</div></div>
      <div class="stat-box"><div class="stat-val">${recentDays}</div><div class="stat-label">近30天练习</div></div>
    </div>

    <div class="notes-section">
      <h3>📝 练习笔记</h3>
      <div class="note-input-row">
        <textarea id="note-input" placeholder="记录你的感悟、教练评语…" rows="2"></textarea>
        <button class="mic-btn" id="mic-btn" onclick="toggleSpeech()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
            <path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/>
            <line x1="8" y1="23" x2="16" y2="23"/>
          </svg>
        </button>
      </div>
      <button class="btn-primary" onclick="saveNote()" style="margin-top:8px;margin-bottom:16px;">保存笔记</button>
      <div id="notes-list"></div>
    </div>
  `;

  renderNotes(actionId);

  // Show detail page
  document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
}

function closeDetail() {
  switchPage(currentPage === 'detail' ? 'library' : currentPage);
}

async function setMastery(actionId, level) {
  masteryMap[actionId] = level;
  await dbPut('mastery', { actionId, level });
  openDetail(actionId);
  toast(level === 'mastered' ? '💜 标记为已熟练' : level === 'learning' ? '🔹 开始学习' : '⚪ 重置状态');
}

// ─── Notes ───
async function renderNotes(actionId) {
  const list = document.getElementById('notes-list');
  const notes = notesData.filter(n => n.actionId === actionId).sort((a, b) => b.id - a.id);

  if (notes.length === 0) {
    list.innerHTML = '<div class="empty-state"><p style="font-size:0.8rem;">还没有笔记，记录你的第一条感悟吧</p></div>';
    return;
  }

  list.innerHTML = notes.map(n => `
    <div class="note-item">
      <button class="note-delete" onclick="deleteNote(${n.id})">删除</button>
      <div class="note-date">${n.date}</div>
      <div class="note-text">${n.text}</div>
    </div>
  `).join('');
}

async function saveNote() {
  const input = document.getElementById('note-input');
  const text = input.value.trim();
  if (!text) { toast('请输入笔记内容'); return; }

  const note = { actionId: currentDetailAction, text, date: dateStr() };
  await dbPut('notes', note);
  notesData = await dbGetAll('notes');
  input.value = '';
  renderNotes(currentDetailAction);
  toast('📝 笔记已保存');
}

async function deleteNote(id) {
  await dbDelete('notes', id);
  notesData = await dbGetAll('notes');
  renderNotes(currentDetailAction);
}

// ─── Speech Recognition ───
let recognition = null;
let isRecording = false;

function toggleSpeech() {
  const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRec) { toast('浏览器不支持语音识别'); return; }

  const btn = document.getElementById('mic-btn');

  if (isRecording && recognition) {
    recognition.stop();
    return;
  }

  recognition = new SpeechRec();
  recognition.lang = 'zh-CN';
  recognition.continuous = false;
  recognition.interimResults = false;

  recognition.onstart = () => {
    isRecording = true;
    btn.classList.add('recording');
  };

  recognition.onresult = (e) => {
    const transcript = e.results[0][0].transcript;
    const input = document.getElementById('note-input');
    input.value += (input.value ? ' ' : '') + transcript;
  };

  recognition.onend = () => {
    isRecording = false;
    btn.classList.remove('recording');
  };

  recognition.onerror = (e) => {
    isRecording = false;
    btn.classList.remove('recording');
    if (e.error !== 'no-speech') toast('语音识别出错: ' + e.error);
  };

  recognition.start();
}

// ─── Achievements ───
function renderAchievements() {
  // Monthly report
  const now = new Date();
  const thisMonth = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}`;
  const monthCheckins = checkinData.filter(c => c.date.startsWith(thisMonth));
  const monthDays = new Set(monthCheckins.map(c => c.date)).size;

  // Most practiced action this month
  const actionCount = {};
  monthCheckins.forEach(c => c.actions.forEach(a => {
    actionCount[a] = (actionCount[a] || 0) + 1;
  }));
  const topAction = Object.entries(actionCount).sort((a,b) => b[1]-a[1])[0];
  const topActionInfo = topAction ? ACTIONS.find(a => a.id === topAction[0]) : null;

  // Learning count
  const learningCount = Object.values(masteryMap).filter(v => v === 'learning').length;
  const masteredCount = Object.values(masteryMap).filter(v => v === 'mastered').length;

  document.getElementById('report-content').innerHTML = `
    <div class="report-stats">
      <div class="report-stat"><div class="big-num">${monthDays}</div><div class="label">本月上冰天数</div></div>
      <div class="report-stat"><div class="big-num">${Object.keys(actionCount).length}</div><div class="label">本月练习动作数</div></div>
      <div class="report-stat"><div class="big-num">${learningCount}</div><div class="label">学习中</div></div>
      <div class="report-stat"><div class="big-num">${masteredCount}</div><div class="label">已熟练</div></div>
    </div>
    ${topActionInfo ? `<p style="text-align:center;margin-top:16px;color:var(--text-secondary);font-size:0.85rem;">
      🏆 本月之星：<strong>${topActionInfo.emoji} ${topActionInfo.zh}</strong>（${topAction[1]}次）
    </p>` : '<p style="text-align:center;margin-top:16px;color:var(--text-muted);font-size:0.8rem;">本月暂无练习记录</p>'}
  `;

  // Medal wall
  const medalGrid = document.getElementById('medal-grid');
  medalGrid.innerHTML = ACTIONS.map(a => {
    const totalDays = getActionPracticeDays(a.id);
    const recentDays = getRecentPracticeDays(a.id);
    const earned = totalDays >= 100 && recentDays > 0;
    const progress = Math.min(100, Math.round(totalDays / 100 * 100));
    return `<div class="medal-item ${earned ? 'earned' : ''}">
      <div class="medal-icon">${earned ? '🏅' : '🔒'}</div>
      <div class="medal-name">${a.zh}</div>
      <div class="medal-progress">${totalDays}/100天</div>
    </div>`;
  }).join('');
}

// ─── Init ───
async function init() {
  await openDB();

  // Load data
  const masteryList = await dbGetAll('mastery');
  masteryList.forEach(m => { masteryMap[m.actionId] = m.level; });
  checkinData = await dbGetAll('checkins');
  notesData = await dbGetAll('notes');

  // Set up navigation
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => switchPage(btn.dataset.page));
  });

  // Filter pills
  document.querySelectorAll('.filter-pill').forEach(p => {
    p.addEventListener('click', () => setFilter(p.dataset.filter));
  });

  switchPage('training');
}

// ─── Register Service Worker ───
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js').catch(() => {});
}

document.addEventListener('DOMContentLoaded', init);
