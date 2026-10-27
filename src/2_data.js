// ================= game data =================
const ORDER = ['warrior', 'archer', 'mage'];
const CLS = {
  warrior: { n: 'Warrior', spr: 'warrior', hp: 80, dmg: 10, cd: .55, arm: 4, crit: 5, hpPer: 10, dmgPer: 2, weapon: 'sword', atk: 'slash', col: '#f4f4f4',
    evos: ['knight', 'berserker'] },
  archer: { n: 'Archer', spr: 'archer', hp: 55, dmg: 8, cd: .42, arm: 2, crit: 10, hpPer: 7, dmgPer: 1.6, weapon: 'bow', atk: 'arrow', col: '#5fae5f',
    evos: ['ranger', 'sniper'] },
  mage: { n: 'Mage', spr: 'mage', hp: 50, dmg: 12, cd: .8, arm: 1, crit: 5, hpPer: 6, dmgPer: 2.4, weapon: 'staff', atk: 'orb', col: '#7a8cff',
    evos: ['pyro', 'cryo'] },
};
const EVO = {
  knight: { n: 'Knight', spr: 'knight', d: ['+35% life, +8 armor', 'Foes target you more', 'Perfect hits raise a guard that halves the next blow'], hpMul: 1.35, arm: 8, dmgMul: .95, taunt: 3, guard: 1 },
  berserker: { n: 'Berserker', spr: 'berserker', d: ['+25% damage, faster swings', 'Timing bar runs 20% faster', 'Heals 8% of damage; hits harder when hurt'], dmgMul: 1.25, cdMul: .85, hpMul: .9, mark: 1.2, steal: .08, rage: 1 },
  ranger: { n: 'Ranger', spr: 'ranger', d: ['Every shot also hits all other foes for 45%', 'Wide crowd control'], multi: .45, cdMul: 1.05 },
  sniper: { n: 'Sniper', spr: 'sniper', d: ['Perfect hits deal 3.5x', 'Slower shots, tighter perfect zone', '+10% crit'], perfMult: 3.5, cdMul: 1.35, perfZ: .8, crit: 10 },
  pyro: { n: 'Pyromancer', spr: 'pyro', d: ['Blasts set all foes ablaze', 'Burn deals 40% of the hit over 3s'], burn: .4, dmgMul: 1.05 },
  cryo: { n: 'Cryomancer', spr: 'cryo', d: ['Hits chill foes: they attack 40% slower', 'Perfect hits freeze foes for 1.2s'], chill: 1, freeze: 1.2, dmgMul: .9 },
};
const SKILLS = {
  warrior: [
    { k: 'edge', n: 'Keen Edge', d: '+12% damage per rank' },
    { k: 'hide', n: 'Iron Hide', d: '+8% life and +3 armor per rank' },
    { k: 'focus', n: 'Focus', d: '+12% perfect zone per rank' },
    { k: 'cleave', n: 'Cleave', d: 'Perfect hits splash 25% per rank to other foes', req: 'edge' },
    { k: 'wind', n: 'Second Wind', d: 'Regenerate 1% life per second per rank', req: 'hide' },
    { k: 'riposte', n: 'Riposte', d: 'Parries hit back for 60% per rank', req: 'focus' },
  ],
  archer: [
    { k: 'draw', n: 'Quick Draw', d: '8% faster shots per rank' },
    { k: 'eye', n: 'Eagle Eye', d: '+6% crit chance per rank' },
    { k: 'steady', n: 'Steady Aim', d: '+10% good zone per rank' },
    { k: 'volley', n: 'Volley', d: '15% chance per rank to loose a 2nd arrow', req: 'draw' },
    { k: 'head', n: 'Headshot', d: '+25% crit damage per rank', req: 'eye' },
    { k: 'pin', n: 'Pin Down', d: 'Perfect hits delay the foe 0.3s per rank', req: 'steady' },
  ],
  mage: [
    { k: 'arcane', n: 'Arcane Power', d: '+12% damage per rank' },
    { k: 'ward', n: 'Ward', d: '+10% life and +3 armor per rank' },
    { k: 'flow', n: 'Flow', d: '+12% perfect zone per rank' },
    { k: 'chain', n: 'Chain', d: 'Blast splash +15% per rank (base 40%)', req: 'arcane' },
    { k: 'barrier', n: 'Barrier', d: 'Whole party +2 armor per rank', req: 'ward' },
    { k: 'surge', n: 'Surge', d: 'Perfect streak 5+: +10% damage per rank', req: 'flow' },
  ],
};
const SKMAX = 3;
const FOES = {
  slime: { n: 'Slime', spr: 'slime', hp: 1, dmg: .8, per: 2.4, wind: .55, sc: 4 },
  bigslime: { n: 'Big Slime', spr: 'slime', hp: 2.4, dmg: 1.1, per: 2.8, wind: .6, sc: 5 },
  bat: { n: 'Bat', spr: 'bat', hp: .6, dmg: .6, per: 1.4, wind: .35, sc: 4, fly: 1 },
  goblin: { n: 'Goblin', spr: 'goblin', hp: 1, dmg: 1, per: 2.0, wind: .45, sc: 4 },
  gobchief: { n: 'Goblin Chief', spr: 'gobchief', hp: 5, dmg: 1.5, per: 2.6, wind: .7, sc: 5, boss: 1, slam: 3 },
  shroom: { n: 'Shroom', spr: 'shroom', hp: 1.1, dmg: .9, per: 2.2, wind: .5, sc: 4 },
  wolf: { n: 'Wolf', spr: 'wolf', hp: .8, dmg: 1.1, per: 1.3, wind: .35, sc: 4 },
  treant: { n: 'Elder Treant', spr: 'treant', hp: 6, dmg: 1.6, per: 3.0, wind: .8, sc: 5, boss: 1, slam: 2 },
  skel: { n: 'Skeleton', spr: 'skel', hp: 1, dmg: 1, per: 1.8, wind: .45, sc: 4, revive: 1 },
  ghost: { n: 'Ghost', spr: 'ghost', hp: .7, dmg: 1.2, per: 2.0, wind: .45, sc: 4, ghost: 1, fly: 1 },
  darkknight: { n: 'Dark Knight', spr: 'darkknight', hp: 7, dmg: 1.7, per: 2.2, wind: .55, sc: 5, boss: 1, plated: 1, slam: 3, outline: '#5a5a66' },
  shade: { n: 'Shade', spr: 'shade', hp: .8, dmg: 1, per: 1.2, wind: .3, sc: 4, outline: '#5a3d8a', fly: 1 },
  eye: { n: 'Void Eye', spr: 'eye', hp: 1, dmg: .9, per: 2.4, wind: .5, sc: 4, stare: 1, fly: 1, outline: '#5a3d8a' },
  mirror: { n: 'Your Reflection', spr: 'mirror', hp: 9, dmg: 1.8, per: 1.6, wind: .45, sc: 5, boss: 1, mirror: 1, slam: 4, outline: '#d0d0d0' },
};
const FOE_TIPS = { ghost: 'Ghosts: only PERFECT hits land fully', darkknight: 'Plated: GOOD hits do 60%', eye: 'Void Eyes speed up your timing bar', mirror: 'Your misses heal it', skel: 'Skeletons rise once', bat: 'Bats strike on a fast beat', wolf: 'Wolves strike on a fast beat' };
const ACTS = [
  { n: 'Pale Fields', c: '#9fd08a', roman: 'I' },
  { n: 'Ash Woods', c: '#d6a070', roman: 'II' },
  { n: 'Black Keep', c: '#a0a0c8', roman: 'III' },
  { n: 'The Void', c: '#b480ff', roman: 'IV' },
];
const LEVELS = [
  { n: 'Slime Meadow', w: [['slime'], ['slime', 'slime'], ['bigslime']] },
  { n: 'Bat Cave', w: [['bat', 'bat'], ['bat', 'slime', 'bat'], ['bat', 'bat', 'bat']] },
  { n: 'Goblin Camp', w: [['goblin'], ['goblin', 'goblin'], ['goblin', 'gobchief', 'goblin']] },
  { n: 'Spore Grove', w: [['shroom', 'shroom'], ['shroom', 'shroom', 'shroom'], ['shroom', 'wolf', 'shroom']] },
  { n: 'Wolf Den', w: [['wolf'], ['wolf', 'wolf'], ['wolf', 'wolf', 'wolf']] },
  { n: 'Elder Root', w: [['wolf', 'shroom'], ['shroom', 'wolf', 'shroom'], ['treant']] },
  { n: 'Bone Hall', w: [['skel'], ['skel', 'skel'], ['skel', 'skel', 'skel']] },
  { n: 'Haunted Stair', w: [['ghost'], ['ghost', 'skel'], ['ghost', 'ghost', 'ghost']] },
  { n: 'Throne Room', w: [['skel', 'ghost'], ['skel', 'ghost', 'skel'], ['darkknight']] },
  { n: 'Hollow Shore', w: [['shade'], ['shade', 'shade'], ['shade', 'shade', 'shade']] },
  { n: 'Watching Dark', w: [['eye'], ['eye', 'shade'], ['eye', 'eye', 'eye']] },
  { n: 'The Mirror', w: [['shade', 'eye'], ['eye', 'shade', 'eye'], ['mirror']] },
];
const GOBLETS = {
  blue: { n: 'Blue Goblet', c: '#5a8cff', d: 'Below 75% life: party +25% damage for 4s', th: .75 },
  green: { n: 'Green Goblet', c: '#5fd06a', d: 'Below 50% life: party attacks 50% faster for 3s', th: .5 },
  red: { n: 'Red Goblet', c: '#ff5a50', d: 'Below 25% life: party heals 10%/s for 3s', th: .25 },
};

// ================= items =================
const SLOTS = ['weapon', 'armor', 'ring', 'charm'];
const RAR = [
  { n: 'Plain', c: '#a0a0aa' }, { n: 'Blue', c: '#5a8cff' }, { n: 'Green', c: '#5fd06a' },
  { n: 'Red', c: '#ff5a50' }, { n: 'Ancient', c: '#ffa53a' }, { n: 'White', c: '#ffffff' },
];
const MAT = ['Iron', 'Ash', 'Bone', 'Void'];
const STATN = { dmg: 'dmg', hp: 'life', arm: 'armor', crit: '% crit', spd: '% speed', zone: '% zone' };
const POOL = { weapon: ['dmg', 'spd', 'crit', 'dmg'], armor: ['hp', 'arm', 'hp'], ring: ['dmg', 'crit', 'hp', 'arm', 'zone'], charm: ['zone', 'spd', 'hp', 'dmg'] };
function statVal(st, ilvl, rar) {
  const m = 1 + rar * 0.22;
  switch (st) {
    case 'dmg': return Math.max(1, Math.round((1.5 + ilvl * 1.25) * m));
    case 'hp': return Math.round((8 + ilvl * 6) * m);
    case 'arm': return Math.max(1, Math.round((1 + ilvl * .7) * m));
    case 'crit': return 2 + rar + Math.floor(ilvl / 4);
    case 'spd': return 3 + rar * 2 + Math.floor(ilvl / 4);
    case 'zone': return 4 + rar * 3 + Math.floor(ilvl / 4);
  }
}
function rollRarity(minR = 0, bonus = 0) {
  const w = [52, 26, 12, 6, 3, 1]; let tot = 0; const ww = w.map((x, i) => i < minR ? 0 : x * (1 + bonus * i)); ww.forEach(x => tot += x);
  let r = Math.random() * tot; for (let i = 0; i < 6; i++) { r -= ww[i]; if (r <= 0) return i; } return 0;
}
function makeItem(ilvl, slot, cls, minR = 0, bonus = 0) {
  slot = slot || pick(SLOTS);
  const rar = rollRarity(minR, bonus);
  const it = { id: save.nextId++, slot, cls: slot === 'weapon' ? cls : null, rar, ilvl, mods: {} };
  const main = { weapon: 'dmg', armor: 'hp', ring: 'crit', charm: 'zone' }[slot];
  it.mods[main] = statVal(main, ilvl, rar);
  if (slot === 'armor') it.mods.arm = statVal('arm', ilvl, rar);
  const extra = [0, 1, 1, 2, 2, 3][rar];
  for (let i = 0; i < extra; i++) { const st = pick(POOL[slot]); it.mods[st] = (it.mods[st] || 0) + statVal(st, ilvl, Math.max(0, rar - 1)); }
  const base = slot === 'weapon' ? { sword: 'Sword', bow: 'Bow', staff: 'Staff' }[CLS[cls].weapon] : { armor: 'Armor', ring: 'Ring', charm: 'Charm' }[slot];
  it.name = MAT[clamp(Math.floor((ilvl - 1) / 3), 0, 3)] + ' ' + base;
  return it;
}
function itemIcon(it) { return it.slot === 'weapon' ? CLS[it.cls].weapon : it.slot; }
function itemScore(it) { if (!it) return 0; const m = it.mods; return (m.dmg || 0) * 3 + (m.hp || 0) * .4 + (m.arm || 0) * 1.5 + (m.crit || 0) * 1.5 + (m.spd || 0) * 1.5 + (m.zone || 0) * 1.2; }
function canUse(it, cid) { return it.slot !== 'weapon' || it.cls === cid; }
function modLines(it) { return Object.entries(it.mods).map(([k, v]) => '+' + v + (STATN[k][0] === '%' ? '' : ' ') + STATN[k]); }

// ================= save =================
const SAVE_KEY = 'wam_save_v1';
let save = null;
function newChar(id, lvl) {
  return { id, lvl, xp: 0, sp: lvl - 1, stp: (lvl - 1) * 2, st: { dmg: 0, life: 0, spd: 0 }, sk: {}, evo: null, gear: { weapon: null, armor: null, ring: null, charm: null } };
}
function newSave() {
  save = { v: 1, unlocked: 0, cleared: Array(12).fill(false), sel: 0, perfects: 0, bestStreak: 0, kills: 0, party: ['warrior'], active: 'warrior',
    chars: { warrior: newChar('warrior', 1) }, inv: [], scrap: 0, goblets: [], act4: false, mute: false, nextId: 1, bestLvl: 1, tut: false, started: false };
  const sw = makeItem(1, 'weapon', 'warrior'); sw.rar = 0; sw.mods = { dmg: 2 }; save.chars.warrior.gear.weapon = sw;
  return save;
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1 && s.chars) { save = s; return true; } } catch (e) {}
  newSave(); return false;
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const xpNeed = l => Math.round(10 + 6 * l * l);
function addChar(id) {
  if (save.party.includes(id)) return;
  const lvl = Math.max(1, save.chars.warrior.lvl - 1);
  const c = newChar(id, lvl); save.chars[id] = c; save.party.push(id);
  const w = makeItem(Math.max(1, save.bestLvl - 1), 'weapon', id); w.rar = 1; c.gear.weapon = w;
}
function act4Ready() { return save.cleared[8] && save.perfects >= TUNE.act4Perfects; }
function levelOpen(li) { return li <= save.unlocked && (li < 9 || save.act4); }

// ================= stats =================
function calcStats(c) {
  const C = CLS[c.id], E = c.evo ? EVO[c.evo] : {}, r = k => c.sk[k] || 0;
  let hp = C.hp * (1 + .1 * (c.lvl - 1)) + c.st.life * C.hpPer;
  let dmg = C.dmg * (1 + .08 * (c.lvl - 1)) + c.st.dmg * C.dmgPer;
  let spd = c.st.spd * 4, arm = C.arm, crit = C.crit, zone = 0;
  for (const s of SLOTS) { const it = c.gear[s]; if (!it) continue; const m = it.mods; hp += m.hp || 0; dmg += m.dmg || 0; spd += m.spd || 0; arm += m.arm || 0; crit += m.crit || 0; zone += m.zone || 0; }
  const o = { perfMult: E.perfMult || TUNE.perfectMult, perfZ: 1, goodZ: 1, cdMul: E.cdMul || 1, critDmg: 1.5, mark: E.mark || 1 };
  if (c.id === 'warrior') { dmg *= 1 + .12 * r('edge'); hp *= 1 + .08 * r('hide'); arm += 3 * r('hide'); o.perfZ *= 1 + .12 * r('focus'); o.cleave = .25 * r('cleave'); o.regen = .01 * r('wind'); o.riposte = .6 * r('riposte'); }
  if (c.id === 'archer') { o.cdMul *= 1 - .08 * r('draw'); crit += 6 * r('eye'); o.goodZ *= 1 + .1 * r('steady'); o.volley = .15 * r('volley'); o.critDmg += .25 * r('head'); o.pin = .3 * r('pin'); }
  if (c.id === 'mage') { dmg *= 1 + .12 * r('arcane'); hp *= 1 + .1 * r('ward'); arm += 3 * r('ward'); o.perfZ *= 1 + .12 * r('flow'); o.splash = .4 + .15 * r('chain'); o.barrier = 2 * r('barrier'); o.surge = .1 * r('surge'); }
  hp *= E.hpMul || 1; dmg *= E.dmgMul || 1; arm += E.arm || 0; crit += E.crit || 0; o.perfZ *= E.perfZ || 1;
  Object.assign(o, { taunt: E.taunt || 1, guard: E.guard, steal: E.steal, rage: E.rage, multi: E.multi, burn: E.burn, chill: E.chill, freeze: E.freeze });
  o.hp = Math.round(hp); o.dmg = Math.round(dmg * 10) / 10; o.cd = C.cd * o.cdMul / (1 + spd / 100); o.arm = Math.round(arm); o.crit = Math.min(75, crit); o.zone = zone;
  return o;
}
function charSpr(c) { return c.evo ? EVO[c.evo].spr : CLS[c.id].spr; }
function charName(c) { return c.evo ? EVO[c.evo].n : CLS[c.id].n; }
function giveXp(amount) {
  const ups = [];
  for (const id of save.party) {
    const c = save.chars[id]; c.xp += amount;
    while (c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; c.sp += 1; c.stp += 2; ups.push(id); }
  }
  return ups;
}
