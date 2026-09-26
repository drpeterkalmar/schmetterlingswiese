// Oberfläche: Titel, Profile, Weltkarte, Level-Karte, HUD, Pause, Ergebnis, Garderobe, Album, Abzeichen, Einstellungen
import { WORLDS } from '../game/worlds.js';
import { LEVELS, DIFFS, levelById, levelsOfWorld, dailyLevel, todayStr } from '../game/levels.js';
import { AVATAR_COLORS, ALBUM, BADGES } from '../game/progress.js';
import { CHARACTERS, COLORS, HATS, PATTERNS } from '../actors/characters.js';
import { BUILD } from '../build.js';

const WGRAD = { wiese: 'linear-gradient(160deg,#8ee39a,#5db4ea)', sonne: 'linear-gradient(160deg,#ffd45a,#ff9460)', teich: 'linear-gradient(160deg,#5fd6c8,#5a92e8)', kirsch: 'linear-gradient(160deg,#ffa6cc,#b48cf0)', abend: 'linear-gradient(160deg,#3e4396,#9a62b4)' };
const esc = (s) => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const starsHtml = (n, max = 3) => `<span class="stars">${Array.from({ length: max }, (_, i) => `<span class="${i < n ? '' : 'off'}">⭐</span>`).join('')}</span>`;
const hexCss = (h) => '#' + h.toString(16).padStart(6, '0');
const TASKTXT = {
  collect: (c) => `💧 Sammle ${c.n} Nektartropfen${c.overWater ? ' über dem Teich' : ''}`,
  fireflies: (c) => `✨ Fange ${c.n} Glühwürmchen`,
  blossoms: (c) => `🌸 Fange ${c.n} fallende Kirschblüten`,
  rings: (c) => `⭕ Fliege durch ${c.n} Ringe – der Reihe nach`,
  land: (c) => `🛬 Lande auf ${c.n} ${c.on === 'lily' ? 'Seerosen' : c.on === 'sunflower' ? 'Sonnenblumen' : 'Mondblumen'} und nasche Nektar`,
  visit: (c) => `💞 Besuche ${c.n} Tierbabys`,
  deliver: (c) => `🍓 Bring ${c.n} Tierbabys eine Beere`,
  stunts: (c) => `🤸 ${[c.loop ? `${c.loop} Looping${c.loop > 1 ? 's' : ''}` : '', c.roll ? `${c.roll} Schraube${c.roll > 1 ? 'n' : ''}` : ''].filter(Boolean).join(' und ')}`,
  race: (c) => `🏁 Gewinne das Wettfliegen gegen ${c.rival === 'libelle' ? 'Lilli Libelle' : 'Flora Falter'}`,
};

export class UI {
  constructor(app) {
    this.app = app;
    this.root = document.getElementById('ui');
    this.current = null;
    this.el = { tasks: document.getElementById('tasks'), timer: document.getElementById('timer'), combo: document.getElementById('combo'), hint: document.getElementById('hint'), toast: document.getElementById('toast'), count: document.getElementById('count') };
    this.root.addEventListener('click', (e) => this.onClick(e));
    this.root.addEventListener('input', (e) => this.onInput(e));
    this.loadK = 0; this.newColor = AVATAR_COLORS[0]; this.wardTab = 'figur';
  }
  // ------------------------------------------------------------ Navigation
  show(name, data) {
    this.current = name; this.data = data;
    if (!name) { this.root.innerHTML = ''; return; }
    const html = this['s_' + name](data);
    this.root.innerHTML = html;
    this.after && this.after(); this.after = null;
  }
  tap() { this.app.audio.sfx('tap'); this.app.haptics.buzz('ui'); }
  onClick(e) {
    const b = e.target.closest('[data-a]'); if (!b) return;
    const a = b.dataset.a, v = b.dataset.v;
    const app = this.app, P = app.progress;
    if (a !== 'noop') this.tap();
    switch (a) {
      case 'start': if (P.profiles.length === 0) this.show('newprofile'); else if (P.profiles.length === 1 && P.cur) this.show('map'); else this.show('profiles'); break;
      case 'profiles': this.show('profiles'); break;
      case 'pick': P.select(v); app.setLookFromProfile(); app.menuWorld(P.cur.lastWorld || 'wiese'); this.show('map'); break;
      case 'newp': this.newColor = AVATAR_COLORS[P.profiles.length % AVATAR_COLORS.length]; this.show('newprofile'); break;
      case 'ncol': this.newColor = v; this.root.querySelectorAll('.colors button').forEach(x => x.classList.toggle('sel', x.dataset.v === v)); break;
      case 'create': {
        const inp = this.root.querySelector('input.name'); const nm = (inp && inp.value || '').trim();
        if (!nm) { inp && inp.focus(); return; }
        P.create(nm, this.newColor); app.setLookFromProfile(); this.app.audio.sfx('unlock'); this.show('map'); break;
      }
      case 'editp': this.show('editprofile', { id: v }); break;
      case 'rename': { const inp = this.root.querySelector('input.name'); P.rename(v, inp.value); this.show('profiles'); break; }
      case 'delp': this.show('confirmdel', { id: v }); break;
      case 'delyes': P.remove(v); this.show(P.profiles.length ? 'profiles' : 'newprofile'); break;
      case 'map': app.toShowcase(); this.show('map'); break;
      case 'diff': app.setDiff(v); this.show('map'); break;
      case 'level': if (P.unlocked(v)) this.show('levelcard', { id: v }); else this.toastMenu('🔒 Schaffe zuerst das Level davor!'); break;
      case 'daily': this.show('levelcard', { id: dailyLevel().id }); break;
      case 'go': app.startLevel(v); break;
      case 'resume': app.resume(); break;
      case 'restart': app.restart(); break;
      case 'quit': app.quit(); break;
      case 'next': app.toShowcase(); app.nextLevel(); break;
      case 'again': app.restart(); break;
      case 'wardrobe': app.toShowcase('wardrobe'); this.show('wardrobe'); break;
      case 'wtab': this.wardTab = v; this.show('wardrobe'); break;
      case 'wchar': if (P.isUnlocked('char', v)) { app.updateLook({ look: { char: v } }); this.show('wardrobe'); } else this.lockMsg('char', v); break;
      case 'wcolor': { const k = P.cur.look.char; if (P.isUnlocked('color', k + ':' + v)) { app.updateLook({ color: +v }); this.show('wardrobe'); } else this.lockMsg('color', k + ':' + v); break; }
      case 'wpat': if (P.isUnlocked('pattern', v)) { app.updateLook({ look: { pattern: v } }); this.show('wardrobe'); } else this.lockMsg('pattern', v); break;
      case 'what': if (P.isUnlocked('hat', v)) { app.updateLook({ look: { hat: v } }); this.show('wardrobe'); } else this.lockMsg('hat', v); break;
      case 'wdone': app.toShowcase(); this.show('map'); break;
      case 'album': this.show('album'); break;
      case 'fact': { const e = ALBUM.find(x => x.id === v); const f = this.root.querySelector('.fact'); if (f && e) f.innerHTML = P.cur.album[v] ? `${e.emoji} <b>${e.name}</b><br>${e.fact}` : '❓ Noch nicht entdeckt – halte die Augen offen!'; break; }
      case 'badges': this.show('badges'); break;
      case 'settings': this.prev = this.current; this.show('settings'); break;
      case 'setback': this.show(this.prev === 'pause' ? 'pause' : 'map'); break;
      case 'tog': { const s = app.settings; app.setSetting(v, !s[v] ? (v === 'haptics' ? true : 0.8) : (v === 'haptics' ? false : 0)); if (v === 'haptics' && app.settings.haptics) app.haptics.buzz('star'); this.show('settings'); break; }
      case 'ctl': app.setSetting('control', v); this.show('settings'); break;
      case 'qual': app.setSetting('quality', v === 'auto' ? 'auto' : +v); this.show('settings'); break;
      case 'help': this.show('help'); break;
      case 'helpback': this.show('settings'); break;
    }
  }
  onInput(e) {
    const t = e.target;
    if (t.dataset.vol) { this.app.setSetting(t.dataset.vol, +t.value / 100); if (t.dataset.vol === 'sfx') this.app.audio.sfx('tap'); }
  }
  lockMsg(type, id) {
    const u = this.app.progress.unlockables().find(x => x.type === type && x.id === id);
    const need = u ? u.stars : (CHARACTERS.find(c => c.id === id) || {}).stars;
    this.toastMenu(`🔒 Freischalten mit ${need} ⭐ (du hast ${this.app.progress.stars()})`);
    this.app.audio.sfx('back');
  }
  toastMenu(txt) {
    let t = this.root.querySelector('.mtoast');
    if (!t) { t = document.createElement('div'); t.className = 'mtoast'; t.style.cssText = 'position:absolute;left:50%;bottom:calc(var(--sb) + 24px);transform:translateX(-50%);background:#fff;border-radius:999px;padding:12px 20px;font-weight:900;box-shadow:0 8px 24px rgba(60,30,90,.25);z-index:30;white-space:nowrap;max-width:94vw;overflow:hidden;text-overflow:ellipsis'; this.root.appendChild(t); }
    t.textContent = txt; clearTimeout(this._mt); this._mt = setTimeout(() => t.remove(), 2400);
  }

  // ------------------------------------------------------------ Screens
  s_title() {
    const k = this.loadK;
    return `<div class="screen" id="title" data-a="start">
      <div class="logo"><div class="bfly">🦋</div><div class="t1">Schmetterlings&shy;wiese</div><div class="t2">Fliegen · Sammeln · Tierbabys besuchen</div></div>
      <div class="bottom"><div class="tapgo">👆 Tippe, um loszufliegen!</div>
      <div class="loadbar" style="${k >= 1 ? 'opacity:0' : ''}"><div style="width:${Math.round(k * 100)}%"></div></div>
      <div class="loadtxt" style="${k >= 1 ? 'opacity:0' : ''}">🎵 Klänge werden gezaubert … ${Math.round(k * 100)} %</div></div>
    </div>`;
  }
  loadProgress(k) {
    this.loadK = k;
    if (this.current !== 'title') return;
    const b = this.root.querySelector('.loadbar > div'), t = this.root.querySelector('.loadtxt');
    if (b) b.style.width = Math.round(k * 100) + '%';
    if (t) t.textContent = `🎵 Klänge werden gezaubert … ${Math.round(k * 100)} %`;
    if (k >= 1) { this.root.querySelectorAll('.loadbar,.loadtxt').forEach(e => { e.style.transition = 'opacity .6s'; e.style.opacity = '0'; }); }
  }
  avatar(p, size) { const ch = CHARACTERS.find(c => c.id === p.look.char); return `<div class="avatar" style="background:${p.color}${size ? `;width:${size}px;height:${size}px` : ''}">${ch ? ch.emoji : '🦋'}</div>`; }
  s_profiles() {
    const P = this.app.progress;
    return `<div class="screen dim"><div class="card"><h2>Wer fliegt heute? 🦋</h2>
      <div class="profiles">${P.profiles.map(p => `<div class="pcard" data-a="pick" data-v="${p.id}">${this.avatar(p)}<div class="nm">${esc(p.name)}</div><div class="st">⭐ ${P.stars(p)}</div><button class="edit" data-a="editp" data-v="${p.id}" aria-label="Bearbeiten">✏️</button></div>`).join('')}
      ${P.profiles.length < 6 ? `<button class="pcard new" data-a="newp">＋<span>Neues Profil</span></button>` : ''}</div></div></div>`;
  }
  s_newprofile() {
    const P = this.app.progress;
    this.after = () => { const i = this.root.querySelector('input.name'); i && i.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); this.root.querySelector('[data-a=create]').click(); } }); };
    return `<div class="screen dim"><div class="card col"><h2>Wie heißt du? ✨</h2>
      <input class="name" maxlength="14" placeholder="Dein Name" autocomplete="off" enterkeyhint="done">
      <div class="colors">${AVATAR_COLORS.map(c => `<button data-a="ncol" data-v="${c}" class="${c === this.newColor ? 'sel' : ''}" style="background:${c}" aria-label="Farbe"></button>`).join('')}</div>
      <button class="btn big" data-a="create">Los geht's! 🦋</button>
      ${P.profiles.length ? `<button class="btn soft small" data-a="profiles">Zurück</button>` : ''}</div></div>`;
  }
  s_editprofile(d) {
    const p = this.app.progress.profiles.find(q => q.id === d.id);
    return `<div class="screen dim"><div class="card col"><h2>Profil ✏️</h2>
      <input class="name" maxlength="14" value="${esc(p.name)}">
      <button class="btn" data-a="rename" data-v="${p.id}">Speichern</button>
      <button class="btn soft small" data-a="delp" data-v="${p.id}">🗑️ Profil löschen</button>
      <button class="btn soft small" data-a="profiles">Zurück</button></div></div>`;
  }
  s_confirmdel(d) {
    const p = this.app.progress.profiles.find(q => q.id === d.id);
    return `<div class="screen dim"><div class="card col"><h2>Wirklich löschen? 🥺</h2><p style="text-align:center;font-weight:800">Alle Sterne von <b>${esc(p.name)}</b> gehen verloren.</p>
      <button class="btn" data-a="delyes" data-v="${p.id}">Ja, löschen</button><button class="btn alt" data-a="profiles">Nein, behalten</button></div></div>`;
  }
  s_map() {
    const app = this.app, P = app.progress, p = P.cur;
    if (!p) return this.s_profiles();
    const diff = app.diff;
    const total = P.stars();
    const worlds = WORLDS.map((w, wi) => {
      const lv = levelsOfWorld(w.id);
      const open = P.unlocked(lv[0].id);
      return `<div class="wcard" style="background:${WGRAD[w.id]}"><div class="whead"><div class="we">${w.emoji}</div><h3>${w.name}</h3><div class="tod">Welt ${wi + 1} · ${w.tod}</div></div>
        <div class="lv">${lv.map((l, i) => { const u = P.unlocked(l.id); return `<button class="lvbtn ${u ? '' : 'locked'}" data-a="level" data-v="${l.id}"><span class="n">${u ? i + 1 : '🔒'}</span><span class="nm">${l.name}</span>${starsHtml(P.levelStars(l.id, diff))}</button>`; }).join('')}</div>
        ${open ? '' : `<div class="wlock">🔒<div>Schaffe die Welt davor!</div></div>`}</div>`;
    }).join('');
    const lastW = WORLDS.findIndex(w => w.id === (p.lastWorld || 'wiese'));
    this.after = () => { const ws = this.root.querySelector('.worlds'); const c = ws && ws.children[Math.max(0, lastW)]; if (c) ws.scrollLeft = c.offsetLeft - (ws.clientWidth - c.clientWidth) / 2; };
    return `<div class="screen" id="map">
      <div class="maptop"><button class="who" data-a="profiles">${this.avatar(p)}<span>${esc(p.name)}</span></button><div class="chip">⭐ ${total}</div><div class="spacer"></div><button class="round" data-a="settings" aria-label="Einstellungen">⚙️</button>
      <div class="seg">${Object.values(DIFFS).map(d => `<button data-a="diff" data-v="${d.id}" class="${d.id === diff ? 'sel' : ''}">${d.emoji} ${d.name}</button>`).join('')}</div></div>
      <div class="worlds">${worlds}</div>
      <div class="mapbar">
        <button class="tile" data-a="wardrobe">🎒<span>Garderobe</span></button>
        <button class="tile" data-a="daily">📅<span>Tagesaufgabe</span>${P.dailyDone() ? '' : '<i class="dot"></i>'}</button>
        <button class="tile" data-a="album">📖<span>Album</span></button>
        <button class="tile" data-a="badges">🏅<span>Abzeichen</span></button>
      </div></div>`;
  }
  s_levelcard(d) {
    const app = this.app, lvl = levelById(d.id), w = WORLDS.find(x => x.id === lvl.world), D = DIFFS[app.diff];
    const par = Math.round(lvl.par * D.par);
    const third = D.id === 'schwer' ? '🔥 Schaffe eine große Kombo' : '⭐ Finde den versteckten Glitzerstern';
    const got = app.progress.levelStars(lvl.id, D.id);
    app.menuWorld(lvl.world);
    return `<div class="screen dim"><div class="card wide"><div class="lvgrid"><div>
      <div class="lvhead"><div class="big">${lvl.daily ? '📅' : w.emoji}</div><h2>${lvl.name}</h2><div class="small">${w.name} · ${D.emoji} ${D.name}${lvl.daily ? ' · ' + todayStr() : ''}</div></div>
      <div class="tasklist">${lvl.tasks.map(t => `<div>${TASKTXT[t.type](t)}</div>`).join('')}</div></div><div>
      <div class="goals"><div>⭐ Aufgabe schaffen</div><div>⭐ Schneller als ${par} Sekunden</div><div>${third}</div>${D.timeLimit ? `<div>⏱️ Zeitlimit: ${Math.round(lvl.par * 1.5)} Sekunden</div>` : '<div>🌱 Kein Zeitdruck – lass dir Zeit!</div>'}</div>
      ${got ? `<p class="small">Bisher: ${starsHtml(got)}</p>` : ''}</div></div>
      <div class="row cta"><button class="btn soft" data-a="map">Zurück</button><button class="btn big" data-a="go" data-v="${lvl.id}">Los! 🦋</button></div>
    </div></div>`;
  }
  s_pause() {
    return `<div class="screen dim"><div class="card col"><h2>Pause ☕</h2>
      <button class="btn big" data-a="resume">▶️ Weiterfliegen</button>
      <button class="btn alt" data-a="restart">🔄 Neu starten</button>
      <button class="btn soft" data-a="settings">⚙️ Einstellungen</button>
      <button class="btn soft" data-a="quit">🗺️ Zur Karte</button></div></div>`;
  }
  s_result(r) {
    const lvl = r.level;
    const i = LEVELS.findIndex(l => l.id === lvl.id);
    const hasNext = !lvl.daily && LEVELS[i + 1];
    this.after = () => {
      const spans = this.root.querySelectorAll('.bigstars span');
      for (let k = 0; k < r.stars; k++) setTimeout(() => { spans[k] && spans[k].classList.add('on'); this.app.audio.sfx('star' + k); this.app.haptics.buzz('star'); }, 450 + k * 520);
      if (r.unlocks.length || r.badges.length) setTimeout(() => { this.app.audio.sfx('unlock'); this.app.haptics.buzz('unlock'); }, 600 + r.stars * 520);
    };
    const cheer = ['Toll gemacht!', 'Super geflogen!', 'Wunderbar!', 'Du bist ein Flug-Profi!'][r.stars] || 'Geschafft!';
    return `<div class="screen dim"><div class="card wide" style="text-align:center"><div class="lvgrid"><div>
      <h2>${lvl.daily ? '📅 Tagesaufgabe geschafft!' : cheer} 🎉</h2>
      <div class="bigstars"><span>⭐</span><span>⭐</span><span>⭐</span></div>
      <div class="facts"><div>⏱️ ${r.time.toFixed(1).replace('.', ',')} s ${r.time <= r.par ? '✅' : `(Ziel ${r.par} s)`}</div><div>🔥 Kombo ${r.maxCombo}${r.diff === 'schwer' ? ` / ${r.comboReq}` : ''}</div>${r.diff !== 'schwer' ? `<div>⭐ Glitzerstern ${r.bonus ? '✅' : '❌'}</div>` : ''}</div>
      </div><div>${r.unlocks.map((u, k) => `<div class="unl" style="animation-delay:${1.6 + k * 0.2}s"><span class="e">${u.icon || u.emoji}</span><span>Neu freigeschaltet:<br>${u.name}</span></div>`).join('')}
      ${r.badges.map((b, k) => `<div class="unl" style="animation-delay:${1.8 + k * 0.2}s"><span class="e">${b.emoji}</span><span>Abzeichen: ${b.name}</span></div>`).join('')}
      </div></div><div class="row cta"><button class="btn soft" data-a="map">🗺️ Karte</button><button class="btn alt" data-a="again">🔄 Nochmal</button>${hasNext ? `<button class="btn big" data-a="next">Weiter ➜</button>` : ''}</div>
    </div></div>`;
  }
  s_fail(d) {
    return `<div class="screen dim"><div class="card col" style="text-align:center"><h2>Oh! 🦋</h2><p style="font-weight:800;font-size:19px">${esc(d.msg)}</p>
      <button class="btn big" data-a="again">🔄 Nochmal versuchen</button><button class="btn soft" data-a="quit">🗺️ Zur Karte</button></div></div>`;
  }
  s_wardrobe() {
    const P = this.app.progress, p = P.cur, L = p.look, s = P.stars(), tab = this.wardTab;
    const item = (sel, lock, a, v, inner, req) => `<button class="item ${sel ? 'sel' : ''} ${lock ? 'lock' : ''}" data-a="${a}" data-v="${v}">${inner}${lock ? `<span class="req">${req} ⭐</span>` : ''}</button>`;
    let body = '';
    if (tab === 'figur') body = CHARACTERS.map(c => item(L.char === c.id, s < c.stars, 'wchar', c.id, `${c.emoji}<span>${c.name}</span>`, c.stars)).join('');
    if (tab === 'farbe') body = COLORS[L.char].map((c, i) => item((L.color[L.char] || 0) === i, s < c.stars, 'wcolor', i, `<div class="swatch" style="background:linear-gradient(135deg,${hexCss(c.a)},${hexCss(c.b ?? c.a)})"></div><span>${c.name}</span>`, c.stars)).join('');
    if (tab === 'muster') body = PATTERNS.map(pt => item(L.pattern === pt.id, s < pt.stars, 'wpat', pt.id, `🦋<span>${pt.name}</span>`, pt.stars)).join('');
    if (tab === 'hut') body = HATS.map(h => item(L.hat === h.id, s < h.stars, 'what', h.id, `${h.icon || h.emoji}<span>${h.name}</span>`, h.stars)).join('');
    const tabs = [['figur', '🦋', 'Figur'], ['farbe', '🎨', 'Farbe'], ...(L.char === 'schmetterling' ? [['muster', '✨', 'Muster']] : []), ['hut', '👒', 'Hut']];
    return `<div class="screen" id="wardrobe"><div class="card">
      <div class="row" style="justify-content:space-between;margin-bottom:8px"><h2 style="margin:0">Garderobe</h2><div class="chip">⭐ ${s}</div></div>
      <div class="tabs">${tabs.map(([k, e, n]) => `<button data-a="wtab" data-v="${k}" class="${tab === k ? 'sel' : ''}"><b>${e}</b>${n}</button>`).join('')}</div>
      <div class="grid">${body}</div>
      <div class="row" style="margin-top:12px"><button class="btn big" data-a="wdone">Fertig ✓</button></div></div></div>`;
  }
  s_album() {
    const p = this.app.progress.cur;
    const n = Object.keys(p.album).length;
    return `<div class="screen dim"><div class="card album"><h2>📖 Sammelalbum <span class="small">${n}/${ALBUM.length}</span></h2>
      <div class="grid">${ALBUM.map(e => `<button class="item ${p.album[e.id] ? '' : 'unk'}" data-a="fact" data-v="${e.id}">${p.album[e.id] ? e.emoji : '❓'}<span>${p.album[e.id] ? e.name : '???'}</span></button>`).join('')}</div>
      <div class="fact">Tippe auf ein Bild! Neue Seiten entdeckst du beim Fliegen.</div>
      <div class="row cta"><button class="btn" data-a="map">Zurück</button></div></div></div>`;
  }
  s_badges() {
    const p = this.app.progress.cur;
    this.app.progress.checkBadges(); this.app.progress.save();
    return `<div class="screen dim"><div class="card"><h2>🏅 Abzeichen</h2>
      <div class="grid">${BADGES.map(b => `<div class="item badge ${p.badges[b.id] ? '' : 'off'}">${b.emoji}<span>${b.name}</span><span style="font-weight:700">${b.desc}</span></div>`).join('')}</div>
      <div class="row cta"><button class="btn" data-a="map">Zurück</button></div></div></div>`;
  }
  s_settings() {
    const s = this.app.settings, r = this.app.renderer;
    const q = s.quality;
    return `<div class="screen dim"><div class="card col wide"><h2>⚙️ Einstellungen</h2><div class="setgrid">
      <div class="set"><span>🎵 Musik</span><input type="range" min="0" max="100" value="${Math.round(s.music * 100)}" data-vol="music"><button class="toggle ${s.music > 0 ? 'on' : ''}" data-a="tog" data-v="music" aria-label="Musik an/aus"></button></div>
      <div class="set"><span>🔔 Effekte</span><input type="range" min="0" max="100" value="${Math.round(s.sfx * 100)}" data-vol="sfx"><button class="toggle ${s.sfx > 0 ? 'on' : ''}" data-a="tog" data-v="sfx" aria-label="Effekte an/aus"></button></div>
      <div class="set"><span>📳 Vibration</span><button class="toggle ${s.haptics ? 'on' : ''}" data-a="tog" data-v="haptics" aria-label="Vibration an/aus"></button></div>
      <div class="set stack"><span>👆 Steuerung</span><div class="opts"><button data-a="ctl" data-v="zones" class="${s.control === 'zones' ? 'sel' : ''}">Tippen & Halten</button><button data-a="ctl" data-v="stick" class="${s.control === 'stick' ? 'sel' : ''}">Joystick</button></div></div>
      <div class="set stack"><span>✨ Grafik</span><div class="opts">${[['auto', 'Auto'], ['0', 'Niedrig'], ['1', 'Mittel'], ['2', 'Hoch']].map(([v, n]) => `<button data-a="qual" data-v="${v}" class="${String(q) === v ? 'sel' : ''}">${n}</button>`).join('')}</div></div>
      </div><div class="small">Jetzt: ${r.q.name} · ${this.app.fps} fps</div>
      <button class="btn alt small" data-a="help">❓ So wird gespielt</button>
      <div class="row cta"><button class="btn" data-a="setback">Fertig ✓</button></div>
      <div class="small">Schmetterlingswiese 2.0 · Build ${BUILD} · offline spielbar</div></div></div>`;
  }
  s_help() {
    return `<div class="screen dim"><div class="card"><h2>❓ So wird gespielt</h2>
      <div class="tasklist">
        <div>👈👉 Links oder rechts <b>halten</b> = drehen</div>
        <div>☝️ Mitte oben halten = steigen · Mitte unten = sinken</div>
        <div>🛬 Über einem Leuchtring unten halten = landen, oben halten = abheben</div>
        <div>🤸 Looping & 🌀 Schraube: Knöpfe unten</div>
        <div>🔥 Schnell hintereinander sammeln = Kombo!</div>
        <div>⌨️ Tastatur: Pfeile/WASD · Leertaste = Looping · Shift = Schraube · P = Pause</div>
      </div>
      <div class="row cta"><button class="btn" data-a="helpback">Alles klar!</button></div></div></div>`;
  }

  // ------------------------------------------------------------ HUD
  hudTasks(tasks) {
    const html = tasks.map(t => `<div class="chip ${t.done ? 'done' : ''}">${t.done ? '<span class="ic">✅</span>' : t.detail ? '' : `<span class="ic">${t.icon}</span>`}${t.detail ? t.detail() : `${Math.min(t.cur, t.max)}/${t.max}`}</div>`).join('');
    if (html !== this._lastTasks) {
      this.el.tasks.innerHTML = html; this._lastTasks = html;
      this.el.tasks.querySelectorAll('.chip').forEach(c => { c.classList.add('pop'); });
    }
  }
  hudTime(t, limit, par) {
    const s = limit ? Math.max(0, Math.ceil(limit - t)) : Math.floor(t);
    const txt = limit ? `⏳ ${s}` : `⏱️ ${s}`;
    if (txt !== this._lastTime) { this.el.timer.textContent = txt; this._lastTime = txt; this.el.timer.classList.toggle('warn', !!limit && s <= 10); }
  }
  combo(n) {
    const el = this.el.combo;
    if (n >= 2) { el.textContent = `${n}er-Kombo! ${n >= 10 ? '🌈' : n >= 5 ? '🔥' : '✨'}`; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
    else el.classList.remove('show');
  }
  hint(txt, dur = 4200) {
    const el = this.el.hint; el.textContent = txt; el.classList.add('show');
    clearTimeout(this._ht); this._ht = setTimeout(() => el.classList.remove('show'), dur);
  }
  toast(txt, dur = 2400) {
    const el = this.el.toast; el.textContent = txt; el.classList.add('show');
    clearTimeout(this._tt); this._tt = setTimeout(() => el.classList.remove('show'), dur);
  }
  hideHints() { this.el.hint.classList.remove('show'); this.el.toast.classList.remove('show'); this.el.combo.classList.remove('show'); }
  countdown(v) { const el = this.el.count; el.textContent = v; el.classList.remove('show'); void el.offsetWidth; el.classList.add('show'); }
}
