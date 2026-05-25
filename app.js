/* ═══ Glice App — Main Logic ═══ */

// ─── Runtime state ───
let ACTIONS = [...DEFAULT_ACTIONS];
let db, currentPage = 'training', currentCat = 'all', currentFilter = 'all';
let calYear, calMonth, selectedDate, currentDetailAction = null;
let masteryMap = {}, masteryDateMap = {}, checkinData = [], notesData = [], customActions = [];
let checkinSelected = new Set();

// ─── Duration Picker State ───
let pickerHour = 1, pickerMinute = 0;
const PICKER_ITEM_H = 44;
const HOUR_VALUES = [0, 1, 2, 3, 4, 5];
const MINUTE_VALUES = Array.from({length: 60}, (_, i) => i);

function playTick() {
  try { if (navigator.vibrate) navigator.vibrate(1); } catch(e) {}
}

// ─── IndexedDB ───
const DB_NAME = 'GliceDB', DB_VER = 2;

function openDB() {
  return new Promise((res, rej) => {
    const r = indexedDB.open(DB_NAME, DB_VER);
    r.onupgradeneeded = e => {
      const d = e.target.result;
      if (!d.objectStoreNames.contains('mastery')) d.createObjectStore('mastery', { keyPath:'actionId' });
      if (!d.objectStoreNames.contains('checkins')) {
        const s = d.createObjectStore('checkins', { keyPath:'id', autoIncrement:true });
        s.createIndex('date','date',{unique:false});
      }
      if (!d.objectStoreNames.contains('notes')) {
        const s = d.createObjectStore('notes', { keyPath:'id', autoIncrement:true });
        s.createIndex('actionId','actionId',{unique:false});
      }
      if (!d.objectStoreNames.contains('customActions')) d.createObjectStore('customActions', { keyPath:'id' });
    };
    r.onsuccess = e => { db = e.target.result; res(db); };
    r.onerror = e => rej(e);
  });
}

function dbPut(s, d) { return new Promise((res,rej) => { const t=db.transaction(s,'readwrite'); t.objectStore(s).put(d); t.oncomplete=()=>res(); t.onerror=e=>rej(e); }); }
function dbAdd(s, d) { return new Promise((res,rej) => { const t=db.transaction(s,'readwrite'); t.objectStore(s).add(d); t.oncomplete=()=>res(); t.onerror=e=>rej(e); }); }
function dbGetAll(s) { return new Promise((res,rej) => { const t=db.transaction(s,'readonly'); const r=t.objectStore(s).getAll(); r.onsuccess=()=>res(r.result); r.onerror=e=>rej(e); }); }
function dbDelete(s, k) { return new Promise((res,rej) => { const t=db.transaction(s,'readwrite'); t.objectStore(s).delete(k); t.oncomplete=()=>res(); t.onerror=e=>rej(e); }); }

// ─── Helpers ───
function dateStr(d) { const dd=d||new Date(); return `${dd.getFullYear()}-${String(dd.getMonth()+1).padStart(2,'0')}-${String(dd.getDate()).padStart(2,'0')}`; }
function toast(msg) { const el=document.getElementById('toast'); el.textContent=msg; el.classList.add('show'); setTimeout(()=>el.classList.remove('show'),2200); }
function getActionPracticeDays(id) { const s=new Set(); checkinData.forEach(c=>{if(c.actions.includes(id))s.add(c.date)}); return s.size; }
function getRecentPracticeDays(id, days=30) { const now=new Date(); let c=0; checkinData.forEach(r=>{if(!r.actions.includes(id))return; if((now-new Date(r.date))/864e5<=days)c++;}); return c; }
function findAction(id) { return ACTIONS.find(a=>a.id===id); }
function formatDuration(minutes) {
  const h = Math.floor(minutes / 60), m = minutes % 60;
  if (h === 0 && m === 0) return '0分钟';
  if (h === 0) return `${m}分钟`;
  if (m === 0) return `${h}小时`;
  return `${h}小时 ${String(m).padStart(2,'0')}分`;
}
function updateDurationDisplay() {
  const el = document.getElementById('dur-text');
  if (el) el.textContent = formatDuration(pickerHour * 60 + pickerMinute);
}

// ─── Navigation ───
function switchPage(page) {
  currentPage = page;
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-'+page).classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
  const nb = document.querySelector(`.nav-btn[data-page="${page}"]`);
  if (nb) nb.classList.add('active');
  if (page==='training') renderCalendar();
  if (page==='library') renderLibrary();
  if (page==='achievements') renderAchievements();
}

// ─── Library ───
function renderLibrary() {
  const grid = document.getElementById('action-grid');
  const tabs = document.getElementById('cat-tabs');
  tabs.innerHTML = CATEGORIES.map(c=>`<button class="cat-tab ${c.id===currentCat?'active':''}" onclick="setCat('${c.id}')">${c.label}</button>`).join('');
  document.querySelectorAll('.filter-pill').forEach(p=>p.classList.toggle('active',p.dataset.filter===currentFilter));

  let acts = currentCat === 'all' ? ACTIONS : ACTIONS.filter(a => a.cat === currentCat);

  if (currentFilter === 'learning') acts = acts.filter(a => masteryMap[a.id] === 'learning' || masteryMap[a.id] === 'mastered');
  else if (currentFilter === 'unlearned') acts = acts.filter(a => !masteryMap[a.id] || masteryMap[a.id] === 'unlearned');
  else if (currentFilter === 'mastered') acts = acts.filter(a => masteryMap[a.id] === 'mastered');

  if (!acts.length) { grid.innerHTML='<div class="empty-state" style="grid-column:1/-1"><div class="empty-icon">❄️</div><p>暂无匹配的动作</p></div>'; return; }

  grid.innerHTML = acts.map(a => {
    const m=masteryMap[a.id]||'unlearned', days=getActionPracticeDays(a.id);
    const badge = a.custom ? '<span class="custom-badge">自定义</span>' : '';
    return `<div class="card action-card" onclick="openDetail('${a.id}')">
      <div class="card-top"><span class="emoji-icon">${a.emoji}</span><span class="mastery-dot ${m}"></span></div>
      <div><div class="action-name-zh">${a.zh}</div><div class="action-name-en">${a.en}</div></div>
      <div class="card-bottom"><span class="practice-count">${days>0?days+' 天练习':''}</span>${badge}</div>
    </div>`;
  }).join('');
}
function setCat(c) { currentCat=c; renderLibrary(); }
function setFilter(f) { currentFilter=f; renderLibrary(); }

// ─── Custom Action ───
async function addCustomAction() {
  const zh=document.getElementById('ca-zh').value.trim();
  const en=document.getElementById('ca-en').value.trim();
  const cat=document.getElementById('ca-cat').value;
  const emoji=document.getElementById('ca-emoji').value.trim()||'⭐';
  if(!zh){toast('请输入动作名称');return;}
  const id='custom-'+Date.now();
  const a={id,zh,en:en||zh,cat,emoji,custom:true};
  await dbPut('customActions',a);
  customActions.push(a);
  ACTIONS.push(a);
  document.getElementById('ca-zh').value='';
  document.getElementById('ca-en').value='';
  document.getElementById('ca-emoji').value='';
  toast('✅ 自定义动作已添加');
  renderLibrary();
}

// ─── Calendar ───
function renderCalendar() {
  const now=new Date();
  if(!calYear){calYear=now.getFullYear();calMonth=now.getMonth();}
  if(!selectedDate) selectedDate=dateStr(now);
  document.getElementById('cal-month').textContent=`${calYear}年${calMonth+1}月`;

  const grid=document.getElementById('cal-grid');
  const first=new Date(calYear,calMonth,1), startDay=first.getDay();
  const dim=new Date(calYear,calMonth+1,0).getDate(), today=dateStr(now);
  const recordDates=new Set(checkinData.map(c=>c.date));
  const labels=['日','一','二','三','四','五','六'];
  let h=labels.map(l=>`<div class="day-label">${l}</div>`).join('');
  const pd=new Date(calYear,calMonth,0).getDate();
  for(let i=startDay-1;i>=0;i--) h+=`<div class="day-cell other-month">${pd-i}</div>`;
  for(let d=1;d<=dim;d++){
    const ds=`${calYear}-${String(calMonth+1).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
    const cls=['day-cell',ds===today?'today':'',ds===selectedDate?'selected':'',recordDates.has(ds)?'has-record':''].filter(Boolean).join(' ');
    h+=`<div class="${cls}" onclick="selectDay('${ds}')">${d}</div>`;
  }
  const rem=(7-(startDay+dim)%7)%7;
  for(let i=1;i<=rem;i++) h+=`<div class="day-cell other-month">${i}</div>`;
  grid.innerHTML=h;
  renderDayDetail();
  renderCheckinPanel();
}
function selectDay(ds){selectedDate=ds;renderCalendar();}
function calPrev(){calMonth--;if(calMonth<0){calMonth=11;calYear--;}renderCalendar();}
function calNext(){calMonth++;if(calMonth>11){calMonth=0;calYear++;}renderCalendar();}

function renderDayDetail() {
  const el=document.getElementById('day-detail');
  const checkin=checkinData.find(c=>c.date===selectedDate);
  if(!checkin || !checkin.actions.length){el.innerHTML=`<h4>📅 ${selectedDate}</h4><p style="color:var(--text-muted);font-size:0.78rem">当日暂无练习记录</p>`;return;}
  const tags=checkin.actions.map(id=>{const a=findAction(id);return a?`<span class="day-action-tag">${a.emoji} ${a.zh}<span class="tag-remove" onclick="removeDayAction('${id}')">✕</span></span>`:''}).join('');
  let durText = checkin.duration ? ` · ⏱️ ${formatDuration(checkin.duration)}` : '';
  el.innerHTML=`<h4>📅 ${selectedDate} · ${checkin.actions.length}个动作${durText}</h4><div class="day-action-list">${tags}</div>`;
}

// ─── Checkin with × delete ───
let justSaved = false;

function renderCheckinPanel() {
  const el=document.getElementById('checkin-actions');
  if (!justSaved) {
    checkinSelected.clear();
    const checkin = checkinData.find(c=>c.date===selectedDate);
    if(checkin) {
      checkin.actions.forEach(a=>checkinSelected.add(a));
      if(checkin.duration) {
        pickerHour = Math.floor(checkin.duration / 60);
        pickerMinute = checkin.duration % 60;
      } else {
        pickerHour = 1; pickerMinute = 0;
      }
    } else {
      pickerHour = 1; pickerMinute = 0;
    }
  } else {
    checkinSelected.clear();
    pickerHour = 1; pickerMinute = 0;
    justSaved = false;
  }
  updateDurationDisplay();
  el.innerHTML = ACTIONS.map(a=>{
    const ck=checkinSelected.has(a.id)?'checked':'';
    return `<button class="checkin-chip ${ck}" data-id="${a.id}" onclick="toggleCheckin('${a.id}',this)">
      ${a.emoji} ${a.zh}<span class="chip-remove" onclick="event.stopPropagation();removeCheckin('${a.id}',this.parentElement)">✕</span>
    </button>`;
  }).join('');
}
function toggleCheckin(id,btn){
  if(checkinSelected.has(id)){checkinSelected.delete(id);btn.classList.remove('checked');}
  else{checkinSelected.add(id);btn.classList.add('checked');}
  renderDayDetail_live();
}
function removeCheckin(id,btn){checkinSelected.delete(id);btn.classList.remove('checked');renderDayDetail_live();}
function removeDayAction(id){
  checkinSelected.delete(id);
  const chip=document.querySelector(`.checkin-chip[data-id="${id}"]`);
  if(chip) chip.classList.remove('checked');
  renderDayDetail_live();
}
function renderDayDetail_live(){
  const el=document.getElementById('day-detail');
  if(!checkinSelected.size){el.innerHTML=`<h4>📅 ${selectedDate}</h4><p style="color:var(--text-muted);font-size:0.78rem">当日暂无练习记录</p>`;return;}
  const tags=[...checkinSelected].map(id=>{const a=findAction(id);return a?`<span class="day-action-tag">${a.emoji} ${a.zh}<span class="tag-remove" onclick="removeDayAction('${id}')">✕</span></span>`:''}).join('');
  const durVal = pickerHour * 60 + pickerMinute;
  const durText = durVal > 0 ? ` · ⏱️ ${formatDuration(durVal)}` : '';
  el.innerHTML=`<h4>📅 ${selectedDate} · ${checkinSelected.size}个动作${durText}</h4><div class="day-action-list">${tags}</div>`;
}

async function saveCheckin() {
  if(!checkinSelected.size){toast('请先勾选练习动作');return;}
  const durVal = pickerHour * 60 + pickerMinute;
  const savedActions = [...checkinSelected];
  const all=await dbGetAll('checkins');
  for(const c of all){if(c.date===selectedDate)await dbDelete('checkins',c.id);}
  await dbAdd('checkins',{date:selectedDate,actions:savedActions, duration:durVal});
  for(const id of savedActions){
    if(!masteryMap[id]||masteryMap[id]==='unlearned'){masteryMap[id]='learning';await dbPut('mastery',{actionId:id,level:'learning'});}
  }
  checkinData=await dbGetAll('checkins');
  for(const id of savedActions){
    if(masteryMap[id]!=='mastered' && getActionPracticeDays(id)>=10){
      masteryMap[id]='mastered'; masteryDateMap[id]=selectedDate;
      await dbPut('mastery',{actionId:id,level:'mastered',masteredDate:selectedDate});
    }
  }
  toast('✅ 打卡成功！');
  justSaved = true;
  renderCalendar();
}

// ─── Detail ───
function buildTimeline(actionId) {
  const m = masteryMap[actionId] || 'unlearned';
  const practices = checkinData
    .filter(c => c.actions.includes(actionId))
    .map(c => c.date)
    .sort();

  if (practices.length === 0) {
    return '<div class="empty-state"><p style="font-size:0.78rem">还没有练习记录，开始你的第一次练习吧</p></div>';
  }

  // Determine which practice triggered mastery
  let masteryIndex = -1;
  let standaloneMasteryDate = null;
  if (m === 'mastered') {
    const mDate = masteryDateMap[actionId];
    if (mDate) {
      const pIdx = practices.indexOf(mDate);
      if (pIdx !== -1) {
        masteryIndex = pIdx;
      } else {
        standaloneMasteryDate = mDate;
        for (let i = practices.length - 1; i >= 0; i--) {
          if (practices[i] < mDate) { masteryIndex = i; break; }
        }
      }
    } else {
      masteryIndex = practices.length >= 10 ? 9 : practices.length - 1;
    }
  }

  const milestones = new Set([1, 5, 10, 15, 20, 30, 50, 100]);
  const events = [];

  practices.forEach((date, i) => {
    const num = i + 1;
    const isFirst = i === 0;
    const isMasteryPractice = (i === masteryIndex && !standaloneMasteryDate);
    const isAfterMastery = (masteryIndex >= 0 && i > masteryIndex) || (standaloneMasteryDate && date > standaloneMasteryDate);
    const isMilestone = milestones.has(num);

    let type, label;
    if (isMasteryPractice) {
      type = 'mastered'; label = '🏅 已熟练';
    } else if (isFirst) {
      type = 'first'; label = '✨ 首次练习';
    } else if (isAfterMastery) {
      type = 'post-mastery'; label = isMilestone ? `第 ${num} 次练习` : `练习 #${num}`;
    } else {
      type = isMilestone ? 'milestone' : 'compact'; label = isMilestone ? `第 ${num} 次练习` : `练习 #${num}`;
    }
    events.push({ date, type, label, sortKey: num });
  });

  if (standaloneMasteryDate || (m === 'mastered' && practices.length === 0)) {
    const d = standaloneMasteryDate || masteryDateMap[actionId] || dateStr();
    events.push({ date: d, type: 'mastered', label: '🏅 已熟练', sortKey: 99999 });
  }

  // Sort newest first
  events.sort((a, b) => {
    if (a.date !== b.date) return b.date.localeCompare(a.date);
    return b.sortKey - a.sortKey;
  });

  const timelineCls = m === 'mastered' ? 'timeline' : 'timeline no-mastery';
  const html = events.map((e, i) => {
    const delay = `animation-delay:${i * 0.04}s`;
    return `<div class="timeline-item ${e.type}" style="${delay}">
      <div class="timeline-dot"></div>
      <div class="timeline-content">
        <div class="timeline-label">${e.label}</div>
        <div class="timeline-date">${e.date}</div>
      </div>
    </div>`;
  }).join('');

  return `<div class="${timelineCls}">${html}</div>`;
}
function openDetail(actionId) {
  currentDetailAction=actionId;
  const a=findAction(actionId); if(!a)return;
  const m=masteryMap[a.id]||'unlearned', td=getActionPracticeDays(a.id), rd=getRecentPracticeDays(a.id);
  const catL=CATEGORIES.find(c=>c.id===a.cat)?.label||'';
  const medal=td>=10;
  const delBtn=a.custom?`<button class="btn-secondary" style="margin-top:12px;color:#EF5350;border-color:#EF5350" onclick="deleteCustomAction('${a.id}')">删除此自定义动作</button>`:'';

  document.getElementById('detail-content').innerHTML=`
    <button class="detail-back" onclick="closeDetail()">‹ 返回</button>
    <div class="detail-header">
      <div class="detail-emoji">${a.emoji}</div>
      <h2>${a.zh}</h2>
      <div class="detail-en">${a.en}</div>
      <span class="detail-category">${catL}</span>
      ${medal?'<div style="margin-top:8px;font-size:1.1rem">🏅 肌肉记忆勋章</div>':''}
    </div>
    <div class="mastery-selector">
      <button class="mastery-option ${m==='unlearned'?'active-unlearned':''}" onclick="setMastery('${a.id}','unlearned')"><span class="mastery-dot unlearned"></span>未开始</button>
      <button class="mastery-option ${m==='learning'?'active-learning':''}" onclick="setMastery('${a.id}','learning')"><span class="mastery-dot learning"></span>学习中</button>
      <button class="mastery-option ${m==='mastered'?'active-mastered':''}" onclick="setMastery('${a.id}','mastered')"><span class="mastery-dot mastered"></span>已熟练</button>
    </div>
    <div class="stats-row">
      <div class="stat-box"><div class="stat-val">${td}</div><div class="stat-label">累计练习天数</div></div>
      <div class="stat-box"><div class="stat-val">${rd}</div><div class="stat-label">近30天练习</div></div>
    </div>
    <div class="timeline-section">
      <h3>📅 练习时间轴</h3>
      ${buildTimeline(a.id)}
    </div>
    <div class="notes-section">
      <h3>📝 练习笔记</h3>
      <div class="note-input-row">
        <textarea id="note-input" placeholder="记录你的感悟、教练评语…" rows="2"></textarea>
        <button class="mic-btn" id="mic-btn" onclick="toggleSpeech()">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><line x1="12" y1="19" x2="12" y2="23"/><line x1="8" y1="23" x2="16" y2="23"/></svg>
        </button>
      </div>
      <button class="btn-primary" onclick="saveNote()" style="margin-top:8px;margin-bottom:16px">保存笔记</button>
      <div id="notes-list"></div>
    </div>
    ${delBtn}`;
  renderNotes(actionId);
  document.querySelectorAll('.page').forEach(p=>p.classList.remove('active'));
  document.getElementById('page-detail').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.remove('active'));
}
function closeDetail(){switchPage('library');}

async function setMastery(id,lv){
  masteryMap[id]=lv;
  const record = {actionId:id, level:lv};
  if (lv === 'mastered') {
    record.masteredDate = selectedDate || dateStr();
    masteryDateMap[id] = record.masteredDate;
  } else {
    delete masteryDateMap[id];
  }
  await dbPut('mastery', record);
  openDetail(id);
  toast(lv==='mastered'?'💜 已熟练':lv==='learning'?'🔹 学习中':'⚪ 重置');
}

async function deleteCustomAction(id){
  await dbDelete('customActions',id);
  customActions=customActions.filter(a=>a.id!==id);
  ACTIONS=ACTIONS.filter(a=>a.id!==id);
  toast('已删除自定义动作');
  switchPage('library');
}

// ─── Notes ───
let editingNoteId = null;
async function renderNotes(id){
  const list=document.getElementById('notes-list');
  const notes=notesData.filter(n=>n.actionId===id).sort((a,b)=>b.id-a.id);
  if(!notes.length){list.innerHTML='<div class="empty-state"><p style="font-size:0.78rem">还没有笔记，记录你的第一条感悟吧</p></div>';return;}
  list.innerHTML=notes.map(n=>{
    if (editingNoteId === n.id) {
      return `<div class="note-item edit-mode">
        <div style="display:flex;gap:8px;margin-bottom:8px;">
          <input type="date" id="edit-note-date-${n.id}" value="${n.date}" style="flex:1;font-size:16px;padding:6px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--bg-deep);color:var(--text-primary);font-family:var(--font-body);">
        </div>
        <textarea id="edit-note-text-${n.id}" style="width:100%;font-size:16px;padding:8px;border:1px solid var(--border);border-radius:var(--r-sm);background:var(--bg-deep);color:var(--text-primary);font-family:var(--font-body);resize:none;" rows="3">${n.text}</textarea>
        <div style="display:flex;gap:8px;margin-top:8px;">
          <button class="note-edit-btn delete" onclick="deleteNote(${n.id})">删除</button>
          <button class="note-edit-btn cancel" onclick="cancelEditNote()">取消</button>
          <button class="note-edit-btn save" onclick="updateNote(${n.id})">保存</button>
        </div>
      </div>`;
    }
    return `<div class="note-item" onclick="startEditNote(${n.id})" style="cursor:pointer;">
      <div class="note-date">${n.date}</div>
      <div class="note-text">${n.text}</div>
    </div>`;
  }).join('');
}
function startEditNote(id) { editingNoteId = id; renderNotes(currentDetailAction); }
function cancelEditNote() { editingNoteId = null; renderNotes(currentDetailAction); }
async function updateNote(id) {
  const newDate = document.getElementById(`edit-note-date-${id}`).value;
  const newText = document.getElementById(`edit-note-text-${id}`).value.trim();
  if(!newText){toast('请输入笔记内容');return;}
  const note = notesData.find(n=>n.id===id);
  if(note) {
    note.date = newDate || note.date;
    note.text = newText;
    await dbPut('notes', note);
  }
  editingNoteId = null;
  renderNotes(currentDetailAction);
  toast('📝 笔记已更新');
}
async function saveNote(){
  const input=document.getElementById('note-input'),text=input.value.trim();
  if(!text){toast('请输入笔记内容');return;}
  await dbAdd('notes',{actionId:currentDetailAction,text,date:selectedDate || dateStr()});
  notesData=await dbGetAll('notes');input.value='';
  renderNotes(currentDetailAction);toast('📝 笔记已保存');
}
async function deleteNote(id){await dbDelete('notes',id);notesData=await dbGetAll('notes');renderNotes(currentDetailAction);}

// ─── Speech ───
let recognition=null, isRecording=false;
function toggleSpeech(){
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;
  if(!SR){toast('浏览器不支持语音识别');return;}
  const btn=document.getElementById('mic-btn');
  if(isRecording&&recognition){recognition.stop();return;}
  recognition=new SR();recognition.lang='zh-CN';recognition.continuous=false;recognition.interimResults=false;
  recognition.onstart=()=>{isRecording=true;btn.classList.add('recording');};
  recognition.onresult=e=>{const t=e.results[0][0].transcript;const inp=document.getElementById('note-input');inp.value+=(inp.value?' ':'')+t;};
  recognition.onend=()=>{isRecording=false;btn.classList.remove('recording');};
  recognition.onerror=e=>{isRecording=false;btn.classList.remove('recording');if(e.error!=='no-speech')toast('语音识别出错');};
  recognition.start();
}

// ─── Achievements ───
function renderAchievements(){
  const monthlyActions=new Set();
  const tm=dateStr().substring(0,7);
  let md=0;
  let monthDuration=0;
  let totalDuration=0;
  
  checkinData.forEach(c=>{
    const d = c.duration || 0;
    totalDuration += d;
    if(c.date.startsWith(tm)){
      md++;
      monthDuration += d;
      c.actions.forEach(a=>monthlyActions.add(a));
    }
  });

  const ac={};
  checkinData.filter(c=>c.date.startsWith(tm)).forEach(c=>c.actions.forEach(a=>{ac[a]=(ac[a]||0)+1}));
  const top=Object.entries(ac).sort((a,b)=>b[1]-a[1])[0];
  const topA=top?findAction(top[0]):null;
  
  let newLearnCount=0;
  monthlyActions.forEach(id=>{
    const allDates=checkinData.filter(c=>c.actions.includes(id)).map(c=>c.date).sort();
    if(allDates.length>0 && allDates[0].startsWith(tm)) newLearnCount++;
  });
  const mc2=Object.values(masteryMap).filter(v=>v==='mastered').length;

  document.getElementById('report-content').innerHTML=`
    <div class="report-stats">
      <div class="report-stat"><div class="big-num">${md}</div><div class="label">本月上冰天数</div></div>
      <div class="report-stat"><div class="big-num">${(monthDuration/60).toFixed(1)}</div><div class="label">本月上冰(小时)</div></div>
      <div class="report-stat"><div class="big-num">${newLearnCount}</div><div class="label">本月新学</div></div>
      <div class="report-stat"><div class="big-num">${mc2}</div><div class="label">已熟练</div></div>
    </div>
    ${topA?`<p style="text-align:center;margin-top:14px;color:var(--text-secondary);font-size:0.82rem">🏆 本月之星：<strong>${topA.emoji} ${topA.zh}</strong>（${top[1]}次）</p>`:'<p style="text-align:center;margin-top:14px;color:var(--text-muted);font-size:0.78rem">本月暂无练习记录</p>'}
  `;

  const totalTimeEl = document.getElementById('total-ice-time');
  if (totalTimeEl) totalTimeEl.textContent = (totalDuration/60).toFixed(1) + ' 小时';

  document.getElementById('medal-grid').innerHTML=ACTIONS.map(a=>{
    const td=getActionPracticeDays(a.id),earned=td>=10;
    return `<div class="medal-item ${earned?'earned':''}"><div class="medal-icon">${earned?'🏅':'🔒'}</div><div class="medal-name">${a.zh}</div><div class="medal-progress">${td}/10次</div></div>`;
  }).join('');
}

// ─── Duration Picker ───
function openDurationPicker() {
  populatePickerColumns();
  const overlay = document.getElementById('duration-picker-overlay');
  overlay.classList.add('show');
  setTimeout(() => {
    document.getElementById('hour-scroll').scrollTop = HOUR_VALUES.indexOf(pickerHour) * PICKER_ITEM_H;
    document.getElementById('minute-scroll').scrollTop = MINUTE_VALUES.indexOf(pickerMinute) * PICKER_ITEM_H;
  }, 60);
}
function closeDurationPicker() {
  document.getElementById('duration-picker-overlay').classList.remove('show');
}
function confirmDuration() {
  updateDurationDisplay();
  closeDurationPicker();
  renderDayDetail_live();
}
function populatePickerColumns() {
  const hourScroll = document.getElementById('hour-scroll');
  const minuteScroll = document.getElementById('minute-scroll');
  hourScroll.innerHTML = generatePickerItems(HOUR_VALUES);
  minuteScroll.innerHTML = generatePickerItems(MINUTE_VALUES);
  setupPickerScroll(hourScroll, HOUR_VALUES, 'hour');
  setupPickerScroll(minuteScroll, MINUTE_VALUES, 'minute');
}
function generatePickerItems(values) {
  let html = '';
  for (let i = 0; i < 2; i++) html += '<div class="picker-item picker-pad"></div>';
  values.forEach(v => {
    html += `<div class="picker-item" data-value="${v}">${String(v).padStart(2, '0')}</div>`;
  });
  for (let i = 0; i < 2; i++) html += '<div class="picker-item picker-pad"></div>';
  return html;
}
function setupPickerScroll(el, values, type) {
  let scrollTimer, lastIndex = -1;
  el.onscroll = () => {
    const index = Math.round(el.scrollTop / PICKER_ITEM_H);
    const clamped = Math.max(0, Math.min(values.length - 1, index));
    if (clamped !== lastIndex) {
      lastIndex = clamped;
      playTick();
    }
    clearTimeout(scrollTimer);
    scrollTimer = setTimeout(() => {
      if (type === 'hour') pickerHour = values[clamped];
      else pickerMinute = values[clamped];
    }, 100);
  };
}

// ─── Init ───
async function init(){
  await openDB();
  const ml=await dbGetAll('mastery');ml.forEach(m=>{masteryMap[m.actionId]=m.level; if(m.masteredDate) masteryDateMap[m.actionId]=m.masteredDate;});
  checkinData=await dbGetAll('checkins');
  notesData=await dbGetAll('notes');
  customActions=await dbGetAll('customActions');
  customActions.forEach(a=>{a.custom=true;ACTIONS.push(a);});
  document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>switchPage(b.dataset.page)));
  document.querySelectorAll('.filter-pill').forEach(p=>p.addEventListener('click',()=>setFilter(p.dataset.filter)));
  switchPage('training');
}

if('serviceWorker' in navigator) navigator.serviceWorker.register('/sw.js').catch(()=>{});
document.addEventListener('DOMContentLoaded', init);
