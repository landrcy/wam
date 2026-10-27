// ================= skill constellation =================
// No points: nodes light up on their own at level milestones or boss clears. The only choices are the forks,
// which are the evolution splits (tier 1 at Lv 5, tier 2 at Lv 9, tier 3 at Lv 13). Passive, active and
// timing-bar nodes on a branch unlock only if that branch is the path you took.
const BOSSLV = [2, 5, 8, 11];
const GROW = { // automatic growth per level after 1
  warrior: { hp: .13, dmg: .075, arm: .7, crit: .15, spd: 0 },
  archer: { hp: .09, dmg: .09, arm: .3, crit: .45, spd: 1 },
  mage: { hp: .08, dmg: .1, arm: .35, crit: .2, spd: .5 },
};
function reqMet(c, q) { if (!q) return true; if (q.lvl && c.lvl < q.lvl) return false; if (q.boss != null && !save.cleared[BOSSLV[q.boss]]) return false; return true; }
function reqText(q) { return q.boss != null ? 'Defeat boss ' + (q.boss + 1) : 'Reach Lv ' + q.lvl; }
const treeCache = {};
function buildTree(cls) {
  if (treeCache[cls]) return treeCache[cls];
  const S = SKILLS[cls], K = S.map(s => s.k), N = [], add = n => (N.push(n), n);
  const kind = k => k === K[2] ? 'bar' : (k === K[3] || k === K[5]) ? 'active' : 'passive';
  const sk = (id, k, q, x, y, from, rank = 1) => add({ id, k: kind(k), sk: k, rank, q, x, y, from, ic: k, n: S.find(s => s.k === k).n, d: S.find(s => s.k === k).d.replace(' per rank', '') });
  add({ id: 'root', k: 'root', x: 0, y: 0, ic: null, n: CLS[cls].n, d: 'Grows stronger every level.', from: null });
  sk('t1', K[0], { lvl: 2 }, 0, -38, 'root'); sk('t2', K[1], { lvl: 3 }, 0, -74, 't1'); sk('t3', K[2], { boss: 0 }, 0, -110, 't2');
  const kids = p => Object.keys(EVO).filter(k => EVO[k].from === p);
  const t1 = kids(cls);
  t1.forEach((e1, i) => {
    const X1 = (i ? 1 : -1) * 96;
    add({ id: e1, k: 'evo', evo: e1, tier: 1, q: { lvl: EVOLV[0] }, x: X1, y: -152, from: 't3', ic: 'evo' });
    sk(e1 + 'a', K[3 + i], { lvl: 7 }, X1, -188, e1); sk(e1 + 'b', K[5], { boss: 1 }, X1, -224, e1 + 'a');
    kids(e1).forEach((e2, j) => {
      const X2 = X1 + (j ? 1 : -1) * 46;
      add({ id: e2, k: 'evo', evo: e2, tier: 2, q: { lvl: EVOLV[1] }, x: X2, y: -266, from: e1 + 'b', ic: 'evo' });
      sk(e2 + 'a', K[j], { lvl: 11 }, X2, -302, e2, 2);
      kids(e2).forEach((e3, m) => {
        const X3 = X2 + (m ? 1 : -1) * 22;
        add({ id: e3, k: 'evo', evo: e3, tier: 3, q: { lvl: EVOLV[2] }, x: X3, y: -344 - (m ? 0 : 10), from: e2 + 'a', ic: 'evo' });
        sk(e3 + 'a', K[m ? 2 : 3], { boss: 3 }, X3, -384 - (m ? 0 : 10), e3, 2);
      });
    });
  });
  const by = {}; N.forEach(n => by[n.id] = n);
  return (treeCache[cls] = { N, by });
}
// state of a node for a character: 'own' | 'pick' (fork you can take now) | 'open' (path taken, waiting) | 'lock' | 'seal' (other branch)
function nodeState(c, n) {
  const T = buildTree(c.id), line = evoLine(c);
  if (n.k === 'root') return 'own';
  // which evolution branch does this node live under?
  let p = n, ev = null; while (p) { if (p.evo) { ev = p.evo; break; } p = T.by[p.from]; }
  if (n.k === 'evo') {
    if (line.includes(n.evo)) return 'own';
    const par = EVO[n.evo].from, parOk = par === c.id ? true : line.includes(par);
    if (!parOk || (line.length >= n.tier)) return 'seal';
    const pre = T.by[n.from]; if (pre && pre.k !== 'evo' && !(nodeState(c, pre) === 'own' || pre.q && pre.q.boss != null)) return 'lock';
    return reqMet(c, n.q) ? 'pick' : 'lock';
  }
  if (ev && !line.includes(ev)) { const st = nodeState(c, T.by[ev]); return st === 'seal' ? 'seal' : 'lock'; }
  return reqMet(c, n.q) ? 'own' : 'open';
}
// skill ranks come from lit nodes
function treeSk(c) { const T = buildTree(c.id), o = {}; for (const n of T.N) if (n.sk && nodeState(c, n) === 'own') o[n.sk] = (o[n.sk] || 0) + n.rank; return o; }
function newlyLit(c) { const T = buildTree(c.id); c.seen = c.seen || []; return T.N.filter(n => n.k !== 'root' && nodeState(c, n) === 'own' && !c.seen.includes(n.id)); }
