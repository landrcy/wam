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
// Evolution tree: 3 tiers, two paths at every tier. Tier 1 keeps its own base sprite; tiers 2-3 build on it with
// palette shifts and pixel decorations (halo, horns, crown, wings, aura...). Each node also changes moves/bar.
const EVOLV = [5, 9, 13];
const EVO = {
  // ---- warrior ----
  knight: { n: 'Paladin', tier: 1, from: 'warrior', spr: 'knight', atk: 'smite', bar: 'guard', d: ['+35% life, +8 armor, foes target you', 'Bar: hit the blue ward zone to shield the party', 'Perfect hits raise a guard; smites call light'], hpMul: 1.35, arm: 8, dmgMul: .95, taunt: 3, guard: 1, look: {} },
  templar: { n: 'Templar', tier: 2, from: 'knight', d: ['Perfect hits heal the party 4%', '+4 armor'], healP: .04, arm: 4, look: { tint: { W: '#f0ead8', w: '#b8a888' }, cape: '#d8b04a', deco: ['cross'] } },
  crusader: { n: 'Crusader', tier: 3, from: 'templar', d: ['+15% damage, heal +2%', 'Every 6 perfects: holy nova hits all for 1.5x'], dmgMul: 1.15, healP: .02, nova: 6, novaM: 1.5, holy: 1, look: { tint: { W: '#fff4d0', w: '#c8a860' }, cape: '#c8323e', deco: ['cross', 'plume'], aura: '#ffe070' } },
  bastion: { n: 'Bastion', tier: 3, from: 'templar', d: ['+30% life, +10 armor', 'Reflects 40% of damage taken'], hpMul: 1.3, arm: 10, taunt: 5, thorns: .4, look: { tint: { W: '#a8aebc', w: '#5a6070' }, cape: '#2a4fa8', deco: ['cross', 'pauldrons'], aura: '#a6caff' } },
  lightbringer: { n: 'Lightbringer', tier: 2, from: 'knight', d: ['Every 5 perfects: holy nova hits all for 1.8x', 'Smites leave a pillar of light'], nova: 5, novaM: 1.8, holy: 1, dmgMul: 1.05, look: { tint: { W: '#ffe9a0', w: '#c8a040' }, cape: '#f4f4f4', deco: ['halo'] } },
  sunknight: { n: 'Sun Knight', tier: 3, from: 'lightbringer', d: ['Nova every 4 perfects', '+10% damage, +6% crit'], nova: 4, dmgMul: 1.1, crit: 6, look: { tint: { W: '#ffd35a', w: '#c88a20' }, cape: '#ff7a1a', deco: ['halo', 'crown'], aura: '#ffb03a' } },
  seraph: { n: 'Seraph', tier: 3, from: 'lightbringer', d: ['Rises once per fight at 40% life', 'Perfect hits heal the party 3%'], revive: 1, healP: .03, look: { tint: { W: '#ffffff', w: '#c8c8e0' }, cape: '#a6caff', deco: ['halo'], wings: '#f4f4ff', aura: '#ffffff' } },
  berserker: { n: 'Berserker', tier: 1, from: 'warrior', spr: 'berserker', atk: 'spin', bar: 'rage', d: ['+25% damage, faster swings', 'Bar: speeds up with your combo, so does damage', 'Heals 8% of damage; hits harder when hurt'], dmgMul: 1.25, cdMul: .85, hpMul: .9, mark: 1.1, steal: .08, rage: 1, look: {} },
  warlord: { n: 'Warlord', tier: 2, from: 'berserker', d: ['Perfect hits rally the party: +25% damage 2.5s', '+10% damage'], rally: 2.5, dmgMul: 1.1, look: { cape: '#d8b04a', deco: ['horns'] } },
  conqueror: { n: 'Conqueror', tier: 3, from: 'warlord', d: ['Longer rally, +10% crit', 'Perfect hits execute foes under 15%'], rally: 1.5, crit: 10, exec: .15, look: { cape: '#7a1a26', deco: ['horns', 'crown'], aura: '#ffd35a' } },
  warmaster: { n: 'Warmaster', tier: 3, from: 'warlord', d: ['Whirlwind hits every foe for 35%', '15% faster swings'], multi: .35, cdMul: .85, look: { cape: '#3e424e', deco: ['horns', 'pauldrons'], eyes: '#ffb03a' } },
  bloodreaver: { n: 'Bloodreaver', tier: 2, from: 'berserker', d: ['+8% lifesteal', 'Hits bleed for 30% over 3s'], steal: .08, bleed: .3, look: { tint: { W: '#c8a0a0', w: '#7a4a4a' }, cape: '#561620', eyes: '#ff3a3a' } },
  bloodlord: { n: 'Blood Lord', tier: 3, from: 'bloodreaver', d: ['+6% lifesteal, bleed +20%', 'Perfect hits execute foes under 20%'], steal: .06, bleed: .2, exec: .2, look: { tint: { W: '#b07070', w: '#6a2a2a' }, cape: '#c8323e', eyes: '#ff3a3a', deco: ['crown'], aura: '#ff3a3a' } },
  reaper: { n: 'Reaper', tier: 3, from: 'bloodreaver', d: ['Executes foes under 25%', '+15% crit, crits +50%'], exec: .25, crit: 15, critAdd: .5, look: { tint: { W: '#5e5c6e', w: '#1e1c26' }, cape: '#0c0a10', eyes: '#d07aff', deco: ['hood'], aura: '#8a2ad0' } },
  // ---- archer ----
  ranger: { n: 'Ranger', tier: 1, from: 'archer', spr: 'ranger', atk: 'fan', bar: 'twin', d: ['Every shot also hits all other foes for 45%', 'Bar: two perfect zones', 'Fires a fan of arrows'], multi: .45, cdMul: 1.05, look: {} },
  beastmaster: { n: 'Beastmaster', tier: 2, from: 'ranger', d: ['A spirit wolf joins 50% of your attacks', '+10% life'], pet: .5, hpMul: 1.1, look: { cape: '#8a5a30', deco: ['antlers'] } },
  wildlord: { n: 'Wild Lord', tier: 3, from: 'beastmaster', d: ['Wolf joins 80% of attacks', '+20% life'], pet: .3, hpMul: 1.2, look: { cape: '#367632', deco: ['antlers', 'crown'], aura: '#9cff6a' } },
  packleader: { n: 'Packleader', tier: 3, from: 'beastmaster', d: ['Wolf joins 60% of attacks', 'Perfect hits rally the party 1.5s'], pet: .1, rally: 1.5, look: { cape: '#5e5c6e', deco: ['antlers'], eyes: '#ffe070' } },
  windrunner: { n: 'Windrunner', tier: 2, from: 'ranger', d: ['20% faster shots', '15% chance to dodge blows'], cdMul: .8, dodge: .15, look: { cape: '#78d6ee', deco: ['scarf'] } },
  tempest: { n: 'Tempest', tier: 3, from: 'windrunner', d: ['35%: lightning chains to all foes', '10% faster shots'], zap: .35, cdMul: .9, look: { cape: '#4878d6', deco: ['scarf'], aura: '#a6caff', eyes: '#e8ffff' } },
  skyhunter: { n: 'Sky Hunter', tier: 3, from: 'windrunner', d: ['+15% crit, multishot +20%', '+10% dodge'], crit: 15, multi: .2, dodge: .1, look: { cape: '#f4f4f4', deco: ['scarf'], wings: '#e6e6f0' } },
  sniper: { n: 'Assassin', tier: 1, from: 'archer', spr: 'sniper', atk: 'blink', bar: 'snipe', d: ['Perfect hits deal 3.5x, +10% crit', 'Bar: slows down inside the zone, tiny perfect', 'Blinks in for twin dagger strikes'], perfMult: 3.5, cdMul: 1.35, perfZ: .8, crit: 10, look: {} },
  shadowblade: { n: 'Shadowblade', tier: 2, from: 'sniper', d: ['Hits bleed for 35% over 3s', '15% chance to dodge blows'], bleed: .35, dodge: .15, look: { cape: '#1e1c26', deco: ['mask'] } },
  nightstalker: { n: 'Nightstalker', tier: 3, from: 'shadowblade', d: ['Executes foes under 20%', '+10% crit'], exec: .2, crit: 10, look: { cape: '#0c0a10', deco: ['mask', 'hood'], eyes: '#d07aff', aura: '#8a2ad0' } },
  phantom: { n: 'Phantom', tier: 3, from: 'shadowblade', d: ['30% dodge', 'Perfect hits echo for 50%'], dodge: .3, echo: .5, look: { cape: '#b4b4c4', deco: ['mask'], aura: '#e6e6f0', ghost: 1 } },
  deadeye: { n: 'Deadeye', tier: 2, from: 'sniper', atk: 'snipe', d: ['Perfect hits 4.5x, +10% crit', 'Heavy piercing shots'], perfMult: 4.5, crit: 10, look: { cape: '#9a7428', deco: ['patch'] } },
  marksman: { n: 'Marksman', tier: 3, from: 'deadeye', d: ['Perfect hits 5.5x', 'Shots pierce every foe for 50%'], perfMult: 5.5, multi: .5, look: { cape: '#5a3080', deco: ['patch', 'plume'], aura: '#ffe070' } },
  hawkeye: { n: 'Hawkeye', tier: 3, from: 'deadeye', d: ['+20% crit', 'Crits +80%'], crit: 20, critAdd: .8, look: { cape: '#c08a50', deco: ['patch'], eyes: '#ffe070', wings: '#8a5a30' } },
  // ---- mage ----
  pyro: { n: 'Pyromancer', tier: 1, from: 'mage', spr: 'pyro', atk: 'fire', bar: 'heat', d: ['Blasts set all foes ablaze (40% over 3s)', 'Bar: 5 perfects build heat, the next hit erupts', 'Hurls fireballs'], burn: .4, dmgMul: 1.05, look: {} },
  infernalist: { n: 'Infernalist', tier: 2, from: 'pyro', d: ['Burn +30%', 'Every 5 perfects: fire nova 1.6x'], burn: .3, nova: 5, novaM: 1.6, look: { cape: '#a02408', deco: ['horns'], eyes: '#ffb03a' } },
  hellcaller: { n: 'Hellcaller', tier: 3, from: 'infernalist', d: ['Burn +30%', 'Perfect hits execute foes under 10%'], burn: .3, exec: .1, look: { tint: { R: '#3c0e52', r: '#16061e' }, cape: '#3c0e52', deco: ['horns'], eyes: '#d07aff', aura: '#8a2ad0' } },
  cinderlord: { n: 'Cinderlord', tier: 3, from: 'infernalist', d: ['+20% damage', 'Nova every 4 perfects'], dmgMul: 1.2, nova: 4, look: { cape: '#ff7a1a', deco: ['crown'], eyes: '#fff3a8', aura: '#ff7a1a' } },
  phoenix: { n: 'Phoenix', tier: 2, from: 'pyro', d: ['Rises once per fight at 40% life', 'Perfect hits heal the party 2%'], revive: 1, healP: .02, look: { cape: '#ffb03a', wings: '#ff7a1a' } },
  sunflare: { n: 'Sunflare', tier: 3, from: 'phoenix', d: ['+15% damage', 'Every 5 perfects: solar nova 2x'], dmgMul: 1.15, nova: 5, novaM: 2, look: { cape: '#ffe070', wings: '#ffb03a', deco: ['halo'], aura: '#ffe070' } },
  ashborn: { n: 'Ashborn', tier: 3, from: 'phoenix', d: ['Rises twice per fight', '+5% lifesteal'], revive: 1, steal: .05, look: { tint: { R: '#5e5c6e', r: '#363442' }, cape: '#363442', wings: '#5e5c6e', eyes: '#ff7a1a' } },
  cryo: { n: 'Cryomancer', tier: 1, from: 'mage', spr: 'cryo', atk: 'ice', bar: 'frost', d: ['Hits chill foes: they attack 40% slower', 'Bar: a perfect slows the marker for 1.2s', 'Perfect hits freeze foes for 1.2s'], chill: 1, freeze: 1.2, dmgMul: .9, look: {} },
  frostlord: { n: 'Frostlord', tier: 2, from: 'cryo', d: ['Freeze 1.6s, +6 armor', 'Foes act 20% slower'], freeze: 1.6, arm: 6, slow: .2, look: { cape: '#e8ffff', deco: ['crown'] } },
  glacier: { n: 'Glacier King', tier: 3, from: 'frostlord', d: ['+30% life', 'Every 4 perfects the party is shielded'], hpMul: 1.3, shieldAll: 4, look: { cape: '#78d6ee', deco: ['crown', 'pauldrons'], aura: '#a6caff' } },
  blizzard: { n: 'Blizzard', tier: 3, from: 'frostlord', d: ['Blast splash +30%', '30%: ice shards hit all foes'], splashAdd: .3, zap: .3, look: { cape: '#f4f4f4', deco: ['crown'], aura: '#e8ffff', eyes: '#e8ffff' } },
  chrono: { n: 'Chronomancer', tier: 2, from: 'cryo', d: ['Foes act 25% slower', '10% faster casts'], slow: .25, cdMul: .9, look: { cape: '#d8b04a', deco: ['halo'] } },
  timeweaver: { n: 'Timeweaver', tier: 3, from: 'chrono', d: ['Perfect hits echo for 50%', 'Foes act 10% slower'], echo: .5, slow: .1, look: { cape: '#fff0a0', deco: ['halo', 'crown'], aura: '#ffe070' } },
  voidwalker: { n: 'Voidwalker', tier: 3, from: 'chrono', atk: 'void', d: ['+25% damage, +10% crit', 'Casts void bolts'], dmgMul: 1.25, crit: 10, look: { tint: { C: '#46226c', c: '#1c0c2e' }, cape: '#1c0c2e', deco: ['halo'], eyes: '#d07aff', aura: '#8a2ad0' } },
};
function evoLine(c) { const l = []; let e = c && c.evo; while (e && EVO[e]) { l.unshift(e); e = EVO[e].from; } return l; }
function evoRoot(c) { return evoLine(c)[0]; }
function evoNext(c) { const t = c.evo ? EVO[c.evo].tier : 0, par = c.evo || c.id; return Object.keys(EVO).filter(k => EVO[k].from === par && EVO[k].tier === t + 1); }
function canEvolve(c) { const t = c.evo ? EVO[c.evo].tier : 0; return t < 3 && c.lvl >= EVOLV[t]; }
function evoField(c, k, def) { const l = evoLine(c); for (let i = l.length - 1; i >= 0; i--) if (EVO[l[i]][k] != null) return EVO[l[i]][k]; return def; }
function mergeEvo(c) {
  const o = {}, MUL = ['hpMul', 'dmgMul', 'cdMul', 'perfZ', 'mark'], MAX = ['perfMult', 'taunt', 'freeze', 'novaM'], SKIP = ['n', 'tier', 'from', 'spr', 'atk', 'bar', 'd', 'look'];
  for (const k of evoLine(c)) for (const [key, v] of Object.entries(EVO[k])) {
    if (SKIP.includes(key)) continue;
    if (MUL.includes(key)) o[key] = (o[key] || 1) * v; else if (MAX.includes(key)) o[key] = Math.max(o[key] || 0, v);
    else if (key === 'nova') o.nova = o.nova ? Math.min(o.nova, v) : v; else o[key] = (o[key] || 0) + v;
  }
  return o;
}
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
  slime: { n: 'Slime', spr: 'slime', hp: 1, dmg: .8, per: 2.4, wind: .55, sc: 4, atk: 'leap' },
  bigslime: { n: 'Big Slime', spr: 'slime', hp: 2.4, dmg: 1.1, per: 2.8, wind: .6, sc: 5, atk: 'leap' },
  bat: { n: 'Bat', spr: 'bat', hp: .6, dmg: .6, per: 1.4, wind: .35, sc: 4, fly: 1, atk: 'dive' },
  goblin: { n: 'Goblin', spr: 'goblin', hp: 1, dmg: 1, per: 2.0, wind: .45, sc: 4, atk: 'lunge' },
  gobchief: { n: 'Goblin Chief', spr: 'gobchief', hp: 5, dmg: 1.5, per: 2.6, wind: .7, sc: 5, boss: 1, slam: 3 },
  shroom: { n: 'Shroom', spr: 'shroom', hp: 1.1, dmg: .9, per: 2.2, wind: .5, sc: 4, atk: 'shoot', pk: 'spore' },
  wolf: { n: 'Wolf', spr: 'wolf', hp: .8, dmg: 1.1, per: 1.3, wind: .35, sc: 4, atk: 'leap' },
  treant: { n: 'Elder Treant', spr: 'treant', hp: 6, dmg: 1.6, per: 3.0, wind: .8, sc: 5, boss: 1, slam: 2 },
  skel: { n: 'Skeleton', spr: 'skel', hp: 1, dmg: 1, per: 1.8, wind: .45, sc: 4, revive: 1, atk: 'shoot', pk: 'bone' },
  ghost: { n: 'Ghost', spr: 'ghost', hp: .7, dmg: 1.2, per: 2.0, wind: .45, sc: 4, ghost: 1, fly: 1, atk: 'shoot', pk: 'wisp' },
  darkknight: { n: 'Dark Knight', spr: 'darkknight', hp: 7, dmg: 1.7, per: 2.2, wind: .55, sc: 5, boss: 1, plated: 1, slam: 3, outline: '#5a5a66' },
  shade: { n: 'Shade', spr: 'shade', hp: .8, dmg: 1, per: 1.2, wind: .3, sc: 4, outline: '#5a3d8a', fly: 1, atk: 'dive' },
  eye: { n: 'Void Eye', spr: 'eye', hp: 1, dmg: .9, per: 2.4, wind: .5, sc: 4, stare: 1, fly: 1, outline: '#5a3d8a', atk: 'shoot', pk: 'beam' },
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
  { n: 'Slime Meadow', w: [['slime', 'slime'], ['slime', 'slime', 'slime'], ['slime', 'bigslime', 'slime']] },
  { n: 'Bat Cave', w: [['bat', 'slime', 'bat'], ['bat', 'bigslime', 'bat'], ['bat', 'bat', 'bat']] },
  { n: 'Goblin Camp', w: [['goblin', 'goblin'], ['goblin', 'bat', 'goblin'], ['gobchief']] },
  { n: 'Spore Grove', w: [['shroom', 'shroom'], ['shroom', 'wolf', 'shroom'], ['wolf', 'shroom', 'wolf']] },
  { n: 'Wolf Den', w: [['wolf', 'wolf'], ['wolf', 'wolf', 'wolf'], ['wolf', 'shroom', 'wolf']] },
  { n: 'Elder Root', w: [['wolf', 'shroom'], ['shroom', 'wolf', 'shroom'], ['treant']] },
  { n: 'Bone Hall', w: [['skel', 'skel'], ['skel', 'skel', 'skel'], ['skel', 'ghost', 'skel']] },
  { n: 'Haunted Stair', w: [['ghost', 'skel'], ['ghost', 'skel', 'ghost'], ['ghost', 'ghost', 'ghost']] },
  { n: 'Throne Room', w: [['skel', 'ghost'], ['skel', 'ghost', 'skel'], ['darkknight']] },
  { n: 'Hollow Shore', w: [['shade', 'shade'], ['shade', 'eye', 'shade'], ['shade', 'shade', 'shade']] },
  { n: 'Watching Dark', w: [['eye', 'shade'], ['eye', 'shade', 'eye'], ['eye', 'eye', 'eye']] },
  { n: 'The Mirror', w: [['shade', 'eye'], ['eye', 'shade', 'eye'], ['mirror']] },
];
const GOBLETS = {
  blue: { n: 'Blue Goblet', c: '#5a8cff', d: 'Below 75% life: party +25% damage for 4s', th: .75 },
  green: { n: 'Green Goblet', c: '#5fd06a', d: 'Below 50% life: party attacks 50% faster for 3s', th: .5 },
  red: { n: 'Red Goblet', c: '#ff5a50', d: 'Below 25% life: party heals 10%/s for 3s', th: .25 },
};

// ================= items =================
const SLOTS = ['weapon', 'helm', 'armor', 'boots', 'ring', 'charm'];
const RAR = [
  { n: 'Plain', c: '#a0a0aa' }, { n: 'Blue', c: '#5a8cff' }, { n: 'Green', c: '#5fd06a' },
  { n: 'Red', c: '#ff5a50' }, { n: 'Ancient', c: '#ffa53a' }, { n: 'White', c: '#ffffff' },
];
const MAT = ['Iron', 'Ash', 'Bone', 'Void'];
const STATN = { dmg: 'dmg', hp: 'life', arm: 'armor', crit: '% crit', spd: '% speed', zone: '% zone' };
const POOL = { weapon: ['dmg', 'spd', 'crit', 'dmg'], helm: ['hp', 'arm', 'crit', 'zone'], armor: ['hp', 'arm', 'hp'], boots: ['spd', 'hp', 'arm'], ring: ['dmg', 'crit', 'hp', 'arm', 'zone'], charm: ['zone', 'spd', 'hp', 'dmg'] };
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
  cls = cls && LOOKS[cls] ? cls : pick(save && save.party ? save.party : ['warrior']);
  const it = { id: save.nextId++, slot, cls, rar, ilvl, mods: {}, look: Math.floor(Math.random() * 1000) };
  it.lk = pickLook(cls, slot, rar); const LK = LOOKS[cls][slot][it.lk];
  if (LK.u) { it.u = LK.u; it.fx = LK.fx; it.rar = Math.max(4, rar); }
  const main = { weapon: 'dmg', helm: 'hp', armor: 'hp', boots: 'spd', ring: 'crit', charm: 'zone' }[slot];
  it.mods[main] = slot === 'helm' ? Math.round(statVal('hp', ilvl, rar) * .6) : statVal(main, ilvl, rar);
  if (slot === 'armor' || slot === 'helm' || slot === 'boots') it.mods.arm = Math.max(1, Math.round(statVal('arm', ilvl, rar) * (slot === 'armor' ? 1 : .5)));
  const extra = [0, 1, 1, 2, 2, 3][rar];
  for (let i = 0; i < extra; i++) { const st = pick(POOL[slot]); it.mods[st] = (it.mods[st] || 0) + statVal(st, ilvl, Math.max(0, rar - 1)); }
  it.name = it.u ? LK.n : MAT[clamp(Math.floor((ilvl - 1) / 3), 0, 3)] + ' ' + LK.n;
  return it;
}
function itemIcon(it) { return it.slot === 'weapon' ? CLS[it.cls].weapon : it.slot; }
function itemScore(it) { if (!it) return 0; const m = it.mods; return (m.dmg || 0) * 3 + (m.hp || 0) * .4 + (m.arm || 0) * 1.5 + (m.crit || 0) * 1.5 + (m.spd || 0) * 1.5 + (m.zone || 0) * 1.2; }
function canUse(it, cid) { return itemCls(it) === cid; }
function modLines(it) { return Object.entries(it.mods).map(([k, v]) => '+' + v + (STATN[k][0] === '%' ? '' : ' ') + STATN[k]); }

// ================= save =================
const SAVE_KEY = 'wam_save_v1';
let save = null;
function newChar(id, lvl) {
  return { id, lvl, xp: 0, sk: {}, seen: [], evo: null, gear: { weapon: null, helm: null, armor: null, boots: null, ring: null, charm: null } };
}
function newSave() {
  save = { v: 1, unlocked: 0, cleared: Array(12).fill(false), sel: 0, perfects: 0, bestStreak: 0, kills: 0, party: ['warrior'], active: 'warrior',
    chars: { warrior: newChar('warrior', 1) }, inv: [], scrap: 0, goblets: [], act4: false, mute: false, nextId: 1, bestLvl: 1, tut: false, started: false, autoScrap: false, autoEquip: false };
  save.cls = null; giveStarter('warrior');
  return save;
}
// the one hero of this save: chosen on the class select screen and locked
function giveStarter(id) {
  save.chars = { [id]: newChar(id, 1) }; save.party = [id]; save.active = id;
  const sw = makeItem(1, 'weapon', id); sw.rar = 0; sw.mods = { dmg: 2 }; sw.look = 0; sw.lk = 0; sw.name = { warrior: 'Iron Shortsword', archer: 'Ash Shortbow', mage: 'Oak Wand' }[id]; save.chars[id].gear.weapon = sw;
}
function chooseClass(id) {
  const m = save.mute; newSave(); save.mute = m; giveStarter(id); save.cls = id; save.started = true; persist();
}
function loadSave() {
  try { const s = JSON.parse(localStorage.getItem(SAVE_KEY)); if (s && s.v === 1 && s.chars) { save = s; for (const id in s.chars) for (const sl of SLOTS) if (s.chars[id].gear[sl] === undefined) s.chars[id].gear[sl] = null; if (s.autoScrap === undefined) s.autoScrap = false; if (s.autoEquip === undefined) s.autoEquip = false;
      for (const id in s.chars) { const c = s.chars[id]; delete c.st; delete c.stp; delete c.sp; c.seen = c.seen || []; for (const sl of SLOTS) { const it = c.gear[sl]; if (it && !it.cls) it.cls = id; } }
      for (const it of s.inv) if (!it.cls) it.cls = pick(s.party);
      // solo migration: keep one hero (the warrior if present), scrap gear for the others
      if (s.cls === undefined) { s.cls = s.chars.warrior ? 'warrior' : s.party[0]; s.started = true; }
      if (s.cls) {
        for (const id of Object.keys(s.chars)) if (id !== s.cls) delete s.chars[id];
        s.party = [s.cls]; s.active = s.cls;
        s.inv = s.inv.filter(it => { if (it.cls === s.cls) return true; s.scrap += it.rar + 1; return false; });
      }
      return true; } } catch (e) {}
  newSave(); return false;
}
function persist() { try { localStorage.setItem(SAVE_KEY, JSON.stringify(save)); } catch (e) {} }
const xpNeed = l => Math.round(10 + 6 * l * l);
function addChar(id) {
  return; // solo: no recruits
  const lvl = Math.max(1, save.chars.warrior.lvl - 1);
  const c = newChar(id, lvl); save.chars[id] = c; save.party.push(id);
  const w = makeItem(Math.max(1, save.bestLvl - 1), 'weapon', id); w.rar = 1; c.gear.weapon = w;
}
const actsBeaten = () => [2, 5, 8].filter(li => save.cleared[li]).length;
function act4Ready() { return actsBeaten() >= 3; } // the secret act opens once Acts I, II and III are each beaten
function levelOpen(li) { return li < 9 || save.act4; } // every level of Acts I-III is open from the start

// ================= stats =================
function calcStats(c) {
  const C = CLS[c.id], E = mergeEvo(c), r = k => c.sk[k] || 0, FX = {};
  const G = GROW[c.id], L1 = c.lvl - 1; c.sk = treeSk(c);
  let hp = C.hp * (1 + G.hp * L1), dmg = C.dmg * (1 + G.dmg * L1);
  let spd = G.spd * L1, arm = C.arm + Math.floor(G.arm * L1), crit = C.crit + Math.floor(G.crit * L1), zone = 0;
  for (const s of SLOTS) { const it = c.gear[s]; if (!it) continue; const m = it.mods; if (it.fx) for (const [k, v] of Object.entries(it.fx)) FX[k] = (FX[k] || 0) + v; hp += m.hp || 0; dmg += m.dmg || 0; spd += m.spd || 0; arm += m.arm || 0; crit += m.crit || 0; zone += m.zone || 0; }
  const o = { perfMult: E.perfMult || TUNE.perfectMult, perfZ: 1, goodZ: 1, cdMul: E.cdMul || 1, critDmg: 1.5, mark: E.mark || 1 };
  if (c.id === 'warrior') { dmg *= 1 + .12 * r('edge'); hp *= 1 + .08 * r('hide'); arm += 3 * r('hide'); o.perfZ *= 1 + .12 * r('focus'); o.cleave = .25 * r('cleave'); o.regen = .01 * r('wind'); o.riposte = .6 * r('riposte'); }
  if (c.id === 'archer') { o.cdMul *= 1 - .08 * r('draw'); crit += 6 * r('eye'); o.goodZ *= 1 + .1 * r('steady'); o.volley = .15 * r('volley'); o.critDmg += .25 * r('head'); o.pin = .3 * r('pin'); }
  if (c.id === 'mage') { dmg *= 1 + .12 * r('arcane'); hp *= 1 + .1 * r('ward'); arm += 3 * r('ward'); o.perfZ *= 1 + .12 * r('flow'); o.splash = .4 + .15 * r('chain'); o.barrier = 2 * r('barrier'); o.surge = .1 * r('surge'); }
  hp *= E.hpMul || 1; dmg *= E.dmgMul || 1; arm += E.arm || 0; crit += E.crit || 0; o.perfZ *= E.perfZ || 1;
  Object.assign(o, { taunt: E.taunt || 1, guard: E.guard, steal: E.steal, rage: E.rage, multi: E.multi, burn: E.burn, chill: E.chill, freeze: E.freeze,
    healP: E.healP, exec: E.exec, nova: E.nova, novaM: E.novaM || 1.5, rally: E.rally, pet: E.pet, zap: E.zap, bleed: E.bleed, thorns: E.thorns, shieldAll: E.shieldAll, revive: E.revive, slow: E.slow, echo: E.echo, dodge: E.dodge, holy: E.holy });
  o.critDmg += E.critAdd || 0; if (o.splash != null) o.splash += E.splashAdd || 0;
  // unique item effects stack on top
  for (const [k, v] of Object.entries(FX)) { if (k === 'perfMult') o.perfMult += v; else if (k === 'perfZ') o.perfZ *= 1 + v; else if (k === 'splash') o.splash = (o.splash || 0) + v; else if (k === 'volley') o.volley = (o.volley || 0) + v; else if (k === 'aegis') o.aegis = 1; else o[k] = (o[k] || 0) + v; }
  if (FX.chill) { o.chill = 1; o.freeze = Math.max(o.freeze || 0, .6); }
  o.hp = Math.round(hp); o.dmg = Math.round(dmg * 10) / 10; o.cd = C.cd * o.cdMul / (1 + spd / 100); o.arm = Math.round(arm); o.crit = Math.min(75, crit); o.zone = zone;
  return o;
}
function charSpr(c) { const r = evoRoot(c); return r ? EVO[r].spr : CLS[c.id].spr; }
function charName(c) { return c.evo ? EVO[c.evo].n : CLS[c.id].n; }
function giveXp(amount) {
  const ups = [];
  for (const id of save.party) {
    const c = save.chars[id]; c.xp += amount;
    while (c.xp >= xpNeed(c.lvl)) { c.xp -= xpNeed(c.lvl); c.lvl++; ups.push(id); }
  }
  return ups;
}
