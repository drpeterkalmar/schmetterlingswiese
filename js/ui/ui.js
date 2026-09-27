// Oberfläche: Titel, Profile, Weltkarte, Level-Karte, HUD, Pause, Ergebnis, Garderobe, Album, Abzeichen, Einstellungen
import { WORLDS } from '../game/worlds.js';
import { LEVELS, DIFFS, levelById, levelsOfWorld, dailyLevel, todayStr } from '../game/levels.js';
import { AVATAR_COLORS, ALBUM, BADGES } from '../game/progress.js';
import { CHARACTERS, COLORS, HATS, EXTRAS, PATTERNS, SKINS, TRAILS, SIZES, WINGFORMS, ANTENNAE, EYESTYLES, FUN, PALETTE, SLOT_NAMES, DEFAULT_LOOK, randomLook } from '../actors/characters.js';
import { wingMask, glassWing, skinWing, tintMask, wingIcon } from '../engine/textures.js';
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
    const same = name && name === this.current;
    const g0 = same ? this.root.querySelector('.card .grid') : null;
    const keep = g0 && (name !== 'wardrobe' || this._shownTab === this.wardTab) ? g0.scrollTop : null;
    this.current = name; this.data = data;
    if (!name) { this.root.innerHTML = ''; return; }
    const html = this['s_' + name](data);
    this.root.innerHTML = html;
    if (same) { const sc = this.root.querySelector('.screen'); sc && sc.classList.add('again'); }
    if (keep != null) { const g = this.root.querySelector('.card .grid'); if (g) g.scrollTop = keep; }
    this._shownTab = this.wardTab;
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
      case 'wchar': if (P.isUnlocked('char', v)) { app.selectChar(v); this.show('wardrobe'); } else this.lockMsg('char', v); break;
      case 'wslot': this.colorSlot = v; this.show('wardrobe'); break;
      case 'wpal': app.updateLook({ [this.colorSlot || 'a']: v === 'def' ? null : +v }); this.show('wardrobe'); break;
      case 'wrandcol': { const r = randomLook(P.cur.look.char); app.updateLook({ a: r.a, b: r.b, c: r.c, e: r.e }); this.show('wardrobe'); break; }
      case 'wpreset': { const k = P.cur.look.char, c = COLORS[k][+v]; app.updateLook({ a: c.a, b: c.b ?? DEFAULT_LOOK[k].b, c: c.c, e: null }); this.show('wardrobe'); break; }
      case 'wsize': this.wear('size', v, { size: v }); break;
      case 'wwing': this.wear('wing', v, { wing: v }); break;
      case 'want': this.wear('ant', v, { ant: v }); break;
      case 'weyes': this.wear('eyes', v, { eyes: v }); break;
      case 'wpat': this.wear('pattern', v, { pattern: v, skin: 'none' }); break;
      case 'wskin': this.wear('skin', v, { skin: v }); break;
      case 'what': this.wear('hat', v, { hat: v }); break;
      case 'wextra': this.wear('extra', v, { extra: v }); break;
      case 'wtrail': this.wear('trail', v, { trail: v }); if (v === 'pups' && P.cur.fun.pupsTon !== false) setTimeout(() => app.audio.sfx('pups'), 250); break;
      case 'wfun': if (P.isUnlocked('fun', v)) { P.cur.fun[v] = !P.cur.fun[v]; P.save(); if (P.cur.fun[v]) app.audio.sfx(v); this.show('wardrobe'); } else this.lockMsg('fun', v); break;
      case 'wpupston': P.cur.fun.pupsTon = P.cur.fun.pupsTon === false; P.save(); if (P.cur.fun.pupsTon) app.audio.sfx('pups'); this.show('wardrobe'); break;
      case 'wrandom': { const k = P.cur.look.char; app.updateLook(randomLook(k, (t, id) => P.isUnlocked(t, id))); app.audio.sfx('glitter', 0, { gain: 0.5 }); this.show('wardrobe'); break; }
      case 'wdone': app.toShowcase(); this.show('map'); break;
      case 'surprise': { const r = this.data; app.toShowcase('wardrobe'); this.show('unlock', { list: r.unlocks, i: 0, hasNext: !!r.hasNext }); break; }
      case 'unlwear': case 'unlskip': {
        const d = this.data, u = d.list[d.i];
        if (a === 'unlwear') { app.wearUnlock(u); this.app.audio.sfx('unlock'); }
        if (d.i + 1 < d.list.length) this.show('unlock', { ...d, i: d.i + 1 });
        else { app.setLookFromProfile(); app.toShowcase(); if (d.hasNext) app.nextLevel(); else this.show('map'); }
        break;
      }
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
  // Werkstatt: anziehen (mit Sperr-Prüfung)
  wear(type, id, patch) {
    const P = this.app.progress;
    if (!P.isUnlocked(type, id)) { this.lockMsg(type, id); return; }
    this.app.updateLook(patch); this.show('wardrobe');
  }
  lockMsg(type, id) {
    const P = this.app.progress;
    const u = P.unlockables().find(x => x.type === type && (x.id === id || (type === 'size' && x.id === 'xl')));
    const need = u ? Math.max(1, u.stars - P.stars()) : '?';
    this.toastMenu(`🔒 Noch ${need} ⭐ – sammle Sterne in den Leveln!`);
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
  avatar(p, size) { const ch = CHARACTERS.find(c => c.id === p.look.char); return `<div class="avatar" style="background:${p.color}${size ? `;width:${size}px;height:${size}px` : ''}">${ch ? (ch.icon || ch.emoji) : '🦋'}</div>`; }
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
        <button class="tile" data-a="wardrobe">🎨<span>Werkstatt</span>${P.unseen().length ? '<i class="dot"></i>' : ''}</button>
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
    r.hasNext = !!hasNext;
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
      </div><div>${r.unlocks.map((u, k) => `<div class="unl" style="animation-delay:${1.6 + k * 0.2}s"><span class="e">${this.unlIcon(u)}</span><span>Neu freigeschaltet:<br>${esc(u.name)}</span></div>`).join('')}
      ${r.badges.map((b, k) => `<div class="unl" style="animation-delay:${1.8 + k * 0.2}s"><span class="e">${b.emoji}</span><span>Abzeichen: ${b.name}</span></div>`).join('')}
      </div></div><div class="row cta"><button class="btn soft" data-a="map">🗺️ Karte</button><button class="btn alt" data-a="again">🔄 Nochmal</button>${r.unlocks.length ? `<button class="btn big surprise" data-a="surprise"><i class="gift">🎁</i> Überraschung!</button>` : hasNext ? `<button class="btn big" data-a="next">Weiter ➜</button>` : ''}</div>
    </div></div>`;
  }
  s_fail(d) {
    return `<div class="screen dim"><div class="card col" style="text-align:center"><h2>Oh! 🦋</h2><p style="font-weight:800;font-size:19px">${esc(d.msg)}</p>
      <button class="btn big" data-a="again">🔄 Nochmal versuchen</button><button class="btn soft" data-a="quit">🗺️ Zur Karte</button></div></div>`;
  }
  unlIcon(u) { return u.type === 'skin' ? `<img class="wimg" src="${this.skinIcon(u.id)}" alt="">` : (u.icon || u.emoji); }
  skinIcon(id) { return wingIcon('skin:' + id, () => skinWing(id, 'rund')); }
  wingShapeOf(char, form) {
    const m = { schmetterling: { rund: 'rund', spitz: 'spitz', lang: 'lang' }, einhorn: { rund: 'rund', spitz: 'spitz', lang: 'lang' }, mondfalter: { rund: 'luna', spitz: 'spitz', lang: 'luna' } }[char];
    if (m) return m[form];
    return char === 'drache' ? 'drache' : char === 'katze' ? 'feder' : null;
  }
  patIcon(char, pat, L) {
    const sh = this.wingShapeOf(char, L.wing || 'rund') || 'rund';
    const key = ['pat', char, pat, sh, L.a, L.b, L.c].join(':');
    return wingIcon(key, () => tintMask(wingMask(pat, sh), L.a, L.b, L.c));
  }
  formIcon(char, form, L) {
    const sh = this.wingShapeOf(char, form);
    const st = form === 'lang' ? 'transform:scale(1.12,.86)' : form === 'spitz' && (char === 'drache' || char === 'katze') ? 'transform:scale(1.08,.8)' : '';
    if (sh) {
      const pat = char === 'drache' ? 'membran' : char === 'katze' ? 'feder' : 'verlauf';
      const ca = char === 'katze' ? L.b : L.a, cb = char === 'katze' ? 0xffffff : L.b, cc = char === 'katze' ? 0xc8b8a8 : L.c;
      return `<img class="wimg" style="${st}" src="${wingIcon(['form', sh, pat, ca, cb, cc].join(':'), () => tintMask(wingMask(pat, sh), ca, cb, cc))}" alt="">`;
    }
    const g = char === 'libelle' ? (form === 'spitz' ? 'longtip' : 'long') : form === 'spitz' ? 'tip' : char === 'hummel' ? 'round' : 'bee';
    return `<img class="wimg" style="${st}" src="${wingIcon('glass:' + g, () => glassWing(g))}" alt="">`;
  }
  antIcon(id) {
    const tip = { kugel: '<circle cx="31" cy="11" r="5" fill="#ff7eb6"/>', herz: '<path d="M31 17 C24 12 25 6 29 7 C30 7.3 31 8.5 31 8.5 C31 8.5 32 7.3 33 7 C37 6 38 12 31 17 Z" fill="#ff5f8f"/>',
      stern: '<path d="M31 4 l2 4.6 5 .5 -3.8 3.3 1.1 4.9 -4.3 -2.6 -4.3 2.6 1.1 -4.9 -3.8 -3.3 5 -.5 Z" fill="#ffc02e"/>',
      ringel: '<path d="M27 16 C27 8 36 6 37 12 C38 17 31 18 31 13 C31 11 33 10.5 34 12" stroke="#6a4a7a" stroke-width="2.4" fill="none"/>',
      feder: '<path d="M22 30 L31 8" stroke="#c89a5a" stroke-width="2"/>' + [0, 1, 2, 3, 4].map(i => { const x = 22 + i * 2, y = 28 - i * 4.5, l = 7 - i; return `<path d="M${x} ${y} l${-l} ${-l * 0.4} M${x} ${y} l${l} ${l * 0.3}" stroke="#e0b070" stroke-width="1.6"/>`; }).join('') }[id];
    const stem = id === 'feder' ? '' : `<path d="M20 44 Q18 26 ${id === 'ringel' ? 27 : 31} ${id === 'ringel' ? 16 : 13}" stroke="#6a4a7a" stroke-width="2.4" fill="none"/>`;
    return `<svg class="ico" viewBox="0 0 48 48">${stem}${tip}</svg>`;
  }
  eyeIcon(id) {
    const iris = id === 'stern' ? '<path d="M24 16 l2.4 5 5.4 .6 -4 3.6 1.2 5.3 -5 -2.8 -5 2.8 1.2 -5.3 -4 -3.6 5.4 -.6 Z" fill="#3a2250"/>' : '<circle cx="24" cy="25" r="8" fill="#3a2250"/>';
    const lash = id === 'wimpern' ? '<path d="M31 13 l5 -5 M35 17 l6 -3 M26 11 l2 -6" stroke="#3a2250" stroke-width="2.4" stroke-linecap="round"/>' : '';
    return `<svg class="ico" viewBox="0 0 48 48"><ellipse cx="24" cy="25" rx="13" ry="14" fill="#fff" stroke="#b8a8c8" stroke-width="1.5"/>${iris}<circle cx="20" cy="20" r="3.2" fill="#fff"/>${lash}</svg>`;
  }
  charIcon(ch, px) { return ch.icon ? ch.icon.replace('class="ico"', `class="ico" style="width:${px}px;height:${px}px"`) : `<span style="font-size:${px}px;line-height:1">${ch.emoji}</span>`; }
  s_wardrobe() {
    const P = this.app.progress, p = P.cur, char = p.look.char, L = P.lookOf(p), s = P.stars(), tab = this.wardTab;
    const CH = CHARACTERS.find(c => c.id === char) || CHARACTERS[0];
    const seen = [];
    const item = (o) => `<button class="item ${o.cls || ''} ${o.sel ? 'sel' : ''} ${o.lock ? 'lock' : ''}" data-a="${o.a}" data-v="${o.v}"><span class="ic">${o.ic}</span><span>${esc(o.name)}</span>${o.lock ? `<span class="req">Noch ${o.need} ⭐</span>` : ''}${o.neu ? '<i class="neu">NEU</i>' : ''}</button>`;
    const mk = (type, it, a, sel, ic, cls = '') => {
      const lock = !!it.stars && s < it.stars, neu = !lock && P.isNew(type, it.id);
      if (neu) seen.push(type === 'size' ? 'size:xl' : type + ':' + it.id);
      return item({ a, v: it.id, sel, lock, need: it.stars - s, name: it.name, ic, neu, cls });
    };
    const sec = (t) => `<div class="sec">${t}</div>`;
    let body = '';
    if (tab === 'figur') body = CHARACTERS.map(c => mk('char', c, 'wchar', c.id === char, c.icon || c.emoji)).join('');
    else if (tab === 'farbe') {
      const slot = this.colorSlot || 'a', names = { ...SLOT_NAMES._, ...(SLOT_NAMES[char] || {}) };
      const dot = (k) => k === 'e' && L.e == null ? 'background:conic-gradient(#3a2250 0 25%,#fff 0 50%,#3a2250 0 75%,#fff 0)' : `background:${hexCss(L[k])}`;
      body = `<div class="slots">${['a', 'b', 'c', 'e'].map(k => `<button class="${slot === k ? 'sel' : ''}" data-a="wslot" data-v="${k}"><i style="${dot(k)}"></i>${names[k]}</button>`).join('')}</div>
        <div class="pal">${slot === 'e' ? `<button class="sw def ${L.e == null ? 'sel' : ''}" data-a="wpal" data-v="def" aria-label="Standard">↺</button>` : ''}${PALETTE.map(pc => `<button class="sw ${L[slot] === pc.c ? 'sel' : ''}" data-a="wpal" data-v="${pc.c}" style="background:${hexCss(pc.c)}" aria-label="${pc.name}"></button>`).join('')}</div>
        <button class="btn alt small dice" data-a="wrandcol">🎲 Zufallsfarben</button>
        ${sec('Farb-Ideen')}${COLORS[char].map((c, i) => item({ a: 'wpreset', v: i, sel: L.a === c.a && L.c === c.c, name: c.name, ic: `<div class="swatch" style="background:linear-gradient(135deg,${hexCss(c.a)},${hexCss(c.b ?? DEFAULT_LOOK[char].b)})"></div>` })).join('')}`;
    } else if (tab === 'form') {
      body = sec('Größe') + SIZES.map(z => mk('size', z, 'wsize', L.size === z.id, this.charIcon(CH, Math.round(16 + z.k * 28)), 'opt')).join('')
        + sec('Flügelform') + WINGFORMS.map(f => item({ a: 'wwing', v: f.id, sel: L.wing === f.id, name: f.name, ic: this.formIcon(char, f.id, L), cls: 'opt' })).join('')
        + (CH.antennae ? sec('Fühler') + ANTENNAE.map(f => item({ a: 'want', v: f.id, sel: L.ant === f.id, name: f.name, ic: this.antIcon(f.id), cls: 'opt' })).join('') : '')
        + sec('Augen') + EYESTYLES.map(f => item({ a: 'weyes', v: f.id, sel: L.eyes === f.id, name: f.name, ic: this.eyeIcon(f.id), cls: 'opt' })).join('');
    } else if (tab === 'fluegel') {
      body = (CH.patterns ? sec('Muster') + PATTERNS.map(pt => item({ a: 'wpat', v: pt.id, sel: L.pattern === pt.id && L.skin === 'none', name: pt.name, ic: `<img class="wimg" src="${this.patIcon(char, pt.id, L)}" alt="">` })).join('') : '')
        + sec('Verrückte Flügel') + SKINS.map(sk => mk('skin', sk, 'wskin', L.skin === sk.id, sk.id === 'none' ? (CH.patterns ? `<img class="wimg" src="${this.patIcon(char, L.pattern, L)}" alt="">` : this.formIcon(char, L.wing, L)) : `<img class="wimg" src="${this.skinIcon(sk.id)}" alt="">`)).join('');
    } else if (tab === 'hut') {
      body = sec('Hüte') + HATS.map(h => mk('hat', h, 'what', L.hat === h.id, h.icon || h.emoji)).join('')
        + sec('Extras') + EXTRAS.map(h => mk('extra', h, 'wextra', L.extra === h.id, h.icon || h.emoji)).join('');
    } else { // Spur
      body = sec('Spuren') + TRAILS.map(t => mk('trail', t, 'wtrail', L.trail === t.id, t.emoji)).join('')
        + sec('Spaß') + FUN.map(f => mk('fun', f, 'wfun', !!p.fun[f.id], f.icon || f.emoji)).join('')
        + (P.isUnlocked('trail', 'pups') ? item({ a: 'wpupston', v: 'x', sel: p.fun.pupsTon !== false, name: p.fun.pupsTon !== false ? 'Pups-Ton an' : 'Pups-Ton aus', ic: p.fun.pupsTon !== false ? '🔊' : '🔇' }) : '');
    }
    this.after = () => P.markSeen(seen);
    const dot = (t) => { const u = P.unseen(); const map = { char: 'figur', size: 'form', skin: 'fluegel', hat: 'hut', extra: 'hut', trail: 'spur', fun: 'spur' }; return u.some(x => map[x.type] === t) && t !== tab ? '<i class="tdot"></i>' : ''; };
    const tabs = [['figur', '🦋', 'Figur'], ['farbe', '🎨', 'Farbe'], ['form', '✂️', 'Form'], ['fluegel', '✨', 'Flügel'], ['hut', '🎩', 'Hut'], ['spur', '🌈', 'Spur']];
    return `<div class="screen" id="wardrobe"><div class="card">
      <div class="whead"><h2>Werkstatt</h2><button class="round dice" data-a="wrandom" aria-label="Zufalls-Outfit">🎲</button><div class="chip">⭐ ${s}</div></div>
      <div class="tabs">${tabs.map(([k, e, n]) => `<button data-a="wtab" data-v="${k}" class="${tab === k ? 'sel' : ''}"><b>${e}</b>${n}${dot(k)}</button>`).join('')}</div>
      <div class="grid">${body}</div>
      <div class="row" style="margin-top:12px"><button class="btn big" data-a="wdone">Fertig ✓</button></div></div></div>`;
  }
  // Freischalt-Moment: Konfetti-Karte mit 3D-Vorschau (Figur oben im Bild trägt das Neue schon)
  s_unlock(d) {
    const u = d.list[d.i], app = this.app;
    this.after = () => { app.previewUnlock(u); app.audio.sfx('fanfare', 0, { gain: 0.7 }); app.haptics.buzz('unlock'); };
    const cols = ['#ff6f9a', '#ffd84a', '#6fd0ff', '#9cf07a', '#c08cff', '#ff9a3c'];
    const conf = Array.from({ length: 28 }, (_, i) => `<i style="left:${(i * 37) % 100}%;background:${cols[i % cols.length]};animation-delay:${(i % 7) * 0.18}s;animation-duration:${2.2 + (i % 5) * 0.35}s"></i>`).join('');
    const verb = u.type === 'fun' ? 'Gleich einschalten ✓' : u.type === 'char' ? 'Gleich losfliegen ✓' : 'Gleich anziehen ✓';
    return `<div class="screen" id="unlock"><div class="confetti">${conf}</div><div class="card">
      <div class="neutitle">🎉 NEU freigeschaltet!</div>
      <div class="unlitem"><span class="e">${this.unlIcon(u)}</span><div><b>${esc(u.name)}</b><small>${u.kind} · ${u.stars} ⭐</small></div></div>
      <div class="row"><button class="btn soft" data-a="unlskip">Später</button><button class="btn big" data-a="unlwear">${verb}</button></div>
      ${d.list.length > 1 ? `<div class="small">${d.i + 1} von ${d.list.length}</div>` : ''}</div></div>`;
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
      <div class="small">Schmetterlingswiese 2.2 · Build ${BUILD} · offline spielbar</div></div></div>`;
  }
  s_help() {
    return `<div class="screen dim"><div class="card"><h2>❓ So wird gespielt</h2>
      <div class="tasklist">
        <div>👈👉 Links oder rechts <b>halten</b> = drehen</div>
        <div>☝️ Mitte oben halten = steigen · Mitte unten = sinken</div>
        <div>👆 Finger liegen lassen und hoch/runter schieben = steigen/sinken – auch beim Drehen!</div>
        <div>🛬 Über einem Leuchtring unten halten = landen, oben halten = abheben</div>
        <div>🌀 Jedes geschaffte Teilziel = Freuden-Schraube · 🤸 Aufgabe fertig = Sieger-Looping mit Feuerwerk</div>
        <div>🔥 Schnell hintereinander sammeln = Kombo!</div>
        <div>⌨️ Tastatur: Pfeile/WASD · P = Pause</div>
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
