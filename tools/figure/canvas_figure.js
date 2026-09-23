/* Print figure of process/<film>/graph.json.
   One column per PlanStep, wrapped into 1 or 2 rows (?rows=). Artifacts of one role fold into a grid /
   row card. Every curve is a resolved input, colored by the PRODUCING step (same color as that step's
   badge). Adjacent steps connect directly; anything farther travels as an orthogonal trunk in the band
   above the row it enters (one lane per producing step, so a producer feeding several steps is one line
   with branches). ?shot=sh_00N highlights that shot's lineage; ?shot=none disables it. */
(async function () {
  const Q = new URLSearchParams(location.search);
  const film = Q.get("film") || "martin";
  const g = await (await fetch(`/process/${film}/graph.json`, { cache: "no-cache" })).json();

  // ---- constants (CSS px; included at \textwidth, so ~1px = 396pt / world width)
  const M = 16, GAP = 16, RAIL_H = 18, LANE = 7, HEAD_GAP = 10, CARD_GAP = 7, ROW_GAP = 22, LEGEND_H = 22;
  const W = { single: 130, rows: 130, media: 130, grid2: 130, grid3: 150, grid4: 196 };
  const PALETTE = ["#2563eb", "#0891b2", "#16a34a", "#7c3aed", "#ea580c", "#4f46e5", "#0d9488", "#b45309", "#9333ea", "#475569", "#65a30d", "#0369a1"];
  const IN_COLOR = "#c98a2e", HI_COLOR = "#e11d48";
  const KCOL = { image: "#3b7ddd", video: "#8b5cf6", audio: "#10b981", text: "#d98a0b", json: "#db2777" };

  const stages = [...g.stages].sort((a, b) => a.order - b.order);
  const stageById = new Map(stages.map(s => [s.id, s]));
  const stageIdx = new Map(stages.map((s, i) => [s.id, i]));
  const colorOf = sid => sid === "Inputs" ? IN_COLOR : PALETTE[(stageIdx.get(sid) - 1 + PALETTE.length) % PALETTE.length];
  const nodeById = new Map(g.nodes.map(n => [n.id, n]));
  const shots = [...new Set(g.nodes.filter(n => n.shot).map(n => n.shot))].sort();
  const HI = Q.get("shot") === "none" ? null : (Q.get("shot") || (shots.length > 1 ? shots[0] : null));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDur = d => { d = Math.round(d); return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`; };
  const fmtKB = b => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  // ---- roles & cards ----------------------------------------------------------------
  function role(n) {
    if (n.final) return "final";
    if (n.preview_only) return "cut";
    if (n.kind === "json") return "json";
    const L = n.label.toLowerCase();
    if (n.kind === "image") return /anchor/.test(L) ? "anchor" : /storyboard|sheet/.test(L) ? "storyboard" : n.shot ? "frame" : "ref";
    if (n.kind === "video") return n.shot ? "clip" : "video";
    if (n.kind === "text") return /prompt/.test(L) ? (n.shot && !/storyboard|anchor/.test(L) ? "shotprompt" : "prompt") : "text";
    if (n.kind === "audio") return "audio";
    return "other";
  }
  const TITLES = { anchor: "anchors", storyboard: "storyboards", ref: "references", frame: "keyframes", clip: "clips",
                   prompt: "image prompts", shotprompt: "shot prompts", audio: "audio tracks" };
  const GRID = new Set(["anchor", "storyboard", "ref", "frame", "clip"]);
  const ROWS = new Set(["prompt", "shotprompt", "audio"]);
  const ORDER = ["ref", "text", "audio", "anchor", "storyboard", "frame", "prompt", "shotprompt", "final", "cut", "clip", "video", "json", "other"];
  const gridCols = n => (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : n === 9 ? 3 : 4);

  const cardOfNode = new Map(), stageCards = new Map();
  for (const s of stages) {
    const by = new Map();
    for (const n of g.nodes.filter(n => n.stage === s.id)) { const r = role(n); if (!by.has(r)) by.set(r, []); by.get(r).push(n); }
    const cards = [];
    for (const r of ORDER) {
      const ns = by.get(r); if (!ns) continue;
      if ((GRID.has(r) || ROWS.has(r)) && ns.length >= 2) cards.push({ type: GRID.has(r) ? "grid" : "rows", role: r, nodes: ns, id: `grp__${s.id}__${r}` });
      else for (const n of ns) cards.push({ type: "single", role: r, nodes: [n], id: n.id });
    }
    for (const c of cards) for (const n of c.nodes) cardOfNode.set(n.id, c);
    stageCards.set(s.id, cards);
  }
  const prefW = c => c.type === "grid" ? ({ 1: W.media, 2: W.grid2, 3: W.grid3, 4: W.grid4 })[gridCols(c.nodes.length)]
                   : c.type === "rows" ? W.rows : (c.nodes[0].kind === "image" || c.nodes[0].kind === "video") ? W.media : W.single;
  const stageW = new Map(stages.map(s => [s.id, Math.max(...stageCards.get(s.id).map(prefW), W.single)]));

  // ---- rows: wrap the columns into 1 or 2 rows of balanced width ----------------------
  const widths = stages.map(s => stageW.get(s.id));
  const totalW = widths.reduce((a, b) => a + b + GAP, -GAP);
  const rowsWanted = +(Q.get("rows")) || (stages.length > 6 ? 2 : 1);
  let split = stages.length;
  if (rowsWanted === 2) { let best = Infinity, acc = 0; for (let i = 1; i < stages.length; i++) { acc += widths[i - 1] + GAP; const d = Math.abs(acc - (totalW - acc)); if (d < best) { best = d; split = i; } } }
  const rowOf = new Map(stages.map((s, i) => [s.id, i < split ? 0 : 1]));
  const rowStages = [stages.slice(0, split), stages.slice(split)].filter(r => r.length);

  // ---- edges → groups (one curve per source card × target step) → trunks ---------------
  const realEdges = g.edges.filter(e => e.type === "step" && !e.inferred);
  const groups = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !stageById.has(e.to)) continue;
    const c = cardOfNode.get(n.id); if (!c) continue;
    const key = `${c.id}→${e.to}`;
    if (!groups.has(key)) {
      const sr = rowOf.get(n.stage), tr = rowOf.get(e.to);
      const adjacent = sr === tr && stageIdx.get(e.to) - stageIdx.get(n.stage) === 1;
      groups.set(key, { card: c, src: n.stage, to: e.to, adjacent, band: adjacent ? -1 : tr, fromAbove: sr < tr, nodes: [] });
    }
    groups.get(key).nodes.push(n);
  }
  // lanes: per band, one lane per producing step; sources from the row above sit nearest that row
  const lanes = [new Map(), new Map()];
  for (const b of [0, 1]) {
    const srcs = [...new Set([...groups.values()].filter(gr => gr.band === b).map(gr => gr.src))];
    srcs.sort((x, y) => (rowOf.get(x) - rowOf.get(y)) || (stageIdx.get(x) - stageIdx.get(y)));
    srcs.forEach((sid, i) => lanes[b].set(sid, i));
  }
  const bandH = b => lanes[b].size ? lanes[b].size * LANE + 10 + (b === 1 && HI ? LANE : 0) : (b === 0 ? 6 : 0);

  // ---- manifest per step (labels ← producing step) -----------------------------------
  const stepNo = sid => (sid === "Inputs" ? "in" : String(stageById.get(sid).order));
  const manifest = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !e.labels) continue;
    const m = manifest.get(e.to) || new Map(); manifest.set(e.to, m);
    for (const l of e.labels) { const r = m.get(l) || { n: 0, from: new Set() }; r.n++; r.from.add(stepNo(n.stage)); m.set(l, r); }
  }

  // ---- DOM ----------------------------------------------------------------------------
  const nodesEl = document.getElementById("nodes"), edgesEl = document.getElementById("edges"), world = document.getElementById("world");
  function headerEl(s, w) {
    const isIn = s.id === "Inputs", isFinal = stageCards.get(s.id).some(c => c.role === "final");
    const el = document.createElement("div");
    el.className = `col-head${isIn ? " is-inputs" : ""}${isFinal ? " is-final" : ""}`;
    el.style.width = w + "px"; el.style.borderTopColor = colorOf(s.id);
    const cnt = g.nodes.filter(n => n.stage === s.id).length;
    const m = manifest.get(s.id);
    const inputs = m ? [...m.entries()].map(([l, r]) => `<span class="tok">${esc(l).replace(/_/g, "_<wbr>")}${r.n > 1 ? "×" + r.n : ""}<span class="src">←${[...r.from].join(",")}</span></span>`).join('<span class="sep">·</span>') : "";
    el.innerHTML = `<div class="ch-top"><span class="ch-badge" style="background:${colorOf(s.id)}">${isIn ? "in" : s.order}</span><span class="ch-agent">${isIn ? "User inputs" : esc(s.agent.replace(/Agent$/, "")).replace(/([a-z])([A-Z])/g, "$1<wbr>$2")}</span></div>
      ${inputs ? `<div class="ch-in">${inputs}</div>` : ""}`;
    return el;
  }
  const mediaAspect = ns => { const r = ns.map(n => (n.w && n.h) ? n.w / n.h : 16 / 9).sort((a, b) => a - b); const med = r[Math.floor(r.length / 2)]; return med >= 1.45 ? "16 / 9" : med >= 1.1 ? "4 / 3" : "1 / 1"; };
  function cardEl(c, w) {
    const el = document.createElement("div"); const n0 = c.nodes[0];
    el.className = `card k-${n0.kind}${c.role === "final" ? " is-final" : ""}`;
    el.style.width = w + "px"; el.dataset.card = c.id;
    let inner = "";
    if (c.type === "grid") {
      const cols = gridCols(c.nodes.length), asp = mediaAspect(c.nodes);
      inner += `<div class="c-grid" style="grid-template-columns:repeat(${cols},1fr)">` + c.nodes.map(n =>
        `<div class="cell${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}" style="aspect-ratio:${asp}"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">${n.shot ? `<span class="tag">${esc(n.shot)}</span>` : ""}</div>`).join("") + `</div>`;
      inner += `<div class="c-body"><div class="c-label"><span class="dot"></span><span class="t">${c.nodes.length} ${TITLES[c.role] || c.role}</span></div></div>`;
    } else if (c.type === "rows") {
      let rows;
      if (c.role === "prompt") {
        const cnt = new Map();
        for (const n of c.nodes) { const k = /anchor/i.test(n.label) ? "anchor prompt" : /storyboard|sheet/i.test(n.label) ? "sheet prompt" : "prompt"; cnt.set(k, (cnt.get(k) || 0) + 1); }
        const summary = [...cnt.entries()].map(([k, v]) => `${v} ${k}${v > 1 ? "s" : ""}`).join(" · ");
        inner += `<div class="c-doc">${esc(summary)}</div><div class="c-body compact"><div class="c-label"><span class="dot"></span><span class="t">${c.nodes.length} ${TITLES[c.role]}</span></div></div>`;
      } else {
        rows = c.nodes.map(n => `<div class="row${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}"><b>${esc(n.shot || n.label)}</b></div>`);
        inner += `<div class="c-rows">${rows.join("")}</div><div class="c-body"><div class="c-label"><span class="dot"></span><span class="t">${c.nodes.length} ${TITLES[c.role] || c.role}</span></div></div>`;
      }
    } else {
      const n = n0, meta = [];
      if (n.kind === "image" || n.kind === "video") {
        if (n.dur) meta.push(fmtDur(n.dur)); if (n.w && n.h) meta.push(`${n.w}×${n.h}`);
        inner += `<div class="c-media${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}" style="aspect-ratio:16 / 9"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">
          ${n.final ? `<span class="pill">final film</span>` : n.preview_only ? `<span class="pill cut">assembled cut</span>` : ""}${n.dur ? `<span class="dur">${fmtDur(n.dur)}</span>` : ""}</div>`;
      } else if (n.kind === "audio") {
        if (n.dur) meta.push(fmtDur(n.dur)); if (n.bytes) meta.push(fmtKB(n.bytes));
        inner += `<div class="c-wave"></div>`;
      } else {
        meta.push(n.kind); if (n.bytes) meta.push(fmtKB(n.bytes));
        inner += `<div class="c-doc">${esc(n.caption || n.excerpt || "")}</div>`;
      }
      const label = n.final ? "final film" : n.preview_only ? "assembled cut" : /agent output$/i.test(n.label) ? "output"
                  : n.label.replace(/^shot prompt /, "prompt ").replace(/^aud /, "");
      inner += `<div class="c-body compact"><div class="c-label"><span class="dot"></span><span class="t">${esc(label)}</span>${n.kind === "audio" && n.dur ? `<span class="m">${fmtDur(n.dur)}</span>` : ""}</div></div>`;
    }
    el.innerHTML = inner; return el;
  }

  // ---- layout -------------------------------------------------------------------------
  const pos = new Map(), headPos = new Map(), bandTop = [0, 0], railY = [0, 0];
  let y = M, worldW = 0;
  rowStages.forEach((rs, r) => {
    railY[r] = y; bandTop[r] = y + RAIL_H;
    const headY = bandTop[r] + bandH(r);
    let x = M, bottom = headY;
    for (const s of rs) {
      const w = stageW.get(s.id);
      const h = headerEl(s, w); h.style.left = x + "px"; h.style.top = headY + "px"; nodesEl.appendChild(h);
      headPos.set(s.id, { x, y: headY, w, h: h.offsetHeight, el: h });
      let cy = headY + h.offsetHeight + HEAD_GAP;
      for (const c of stageCards.get(s.id)) {
        const el = cardEl(c, w); el.style.left = x + "px"; el.style.top = cy + "px"; nodesEl.appendChild(el);
        pos.set(c.id, { x, y: cy, w, h: el.offsetHeight, el }); cy += el.offsetHeight + CARD_GAP;
      }
      bottom = Math.max(bottom, cy - CARD_GAP); x += w + GAP;
    }
    worldW = Math.max(worldW, x - GAP + M);
    // plan rail for this row
    const first = rs[0], last = rs[rs.length - 1];
    const rail = document.createElement("div"); rail.className = "rail"; rail.style.cssText = `left:${M}px;width:${x - GAP - M - 10}px;top:${railY[r] + RAIL_H / 2}px`; nodesEl.appendChild(rail);
    const cap = document.createElement("div"); cap.className = "rail-cap"; cap.style.cssText = `left:${M + 8}px;top:${railY[r] + RAIL_H / 2 - 7}px`;
    const lo = first.id === "Inputs" ? (rs[1] ? rs[1].order : 1) : first.order;
    cap.textContent = r === 0 ? `Director plan · ${stages.length - 1} PlanSteps · steps ${lo}–${last.order} →` : `↳ steps ${lo}–${last.order} →`; nodesEl.appendChild(cap);
    const arr = document.createElement("div"); arr.className = "rail-arrow"; arr.style.cssText = `left:${x - GAP - 10}px;top:${railY[r] + RAIL_H / 2 - 5}px`; nodesEl.appendChild(arr);
    y = bottom + ROW_GAP;
  });
  const maxBottom = y - ROW_GAP;
  const lg = document.createElement("div"); lg.className = "legend"; lg.style.cssText = `left:${M}px;top:${maxBottom + 12}px;width:${worldW - 2 * M}px`;
  const kinds = [...new Set(g.nodes.map(n => n.kind))];
  lg.innerHTML = kinds.map(k => `<span class="lg"><i style="background:${KCOL[k]}"></i>${k}</span>`).join("") +
    `<span class="lg edge"><i></i>input resolved for the step it enters, colored by the producing step</span>` +
    (HI ? `<span class="lg hi"><i></i>lineage of ${esc(HI)}</span>` : "") +
    `<span class="note">${g.nodes.length} artifacts · ${realEdges.length} resolved inputs · header: input label ← producing step</span>`;
  nodesEl.appendChild(lg);
  const worldH = maxBottom + 12 + lg.offsetHeight + M;
  world.style.width = worldW + "px"; world.style.height = worldH + "px";
  edgesEl.setAttribute("width", worldW); edgesEl.setAttribute("height", worldH); edgesEl.style.width = worldW + "px"; edgesEl.style.height = worldH + "px";
  for (const el of nodesEl.querySelectorAll(".rail")) if (parseInt(el.style.width) < worldW - 2 * M - 10) el.style.width = (worldW - 2 * M - 10) + "px";
  for (const el of nodesEl.querySelectorAll(".rail-arrow")) el.style.left = (worldW - M - 10) + "px";

  // ---- edges --------------------------------------------------------------------------
  const NS = "http://www.w3.org/2000/svg";
  const rectOf = el => { const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height }; };
  const path = (d, color, cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); if (cls) p.setAttribute("class", cls); else p.style.stroke = color; edgesEl.appendChild(p); return p; };
  const bez = (a, b) => { const dx = Math.max(24, Math.abs(b.x - a.x) * 0.5); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };
  // orthogonal polyline with rounded corners
  function ortho(pts, r = 5) {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const v1 = { x: Math.sign(p1.x - p0.x), y: Math.sign(p1.y - p0.y) }, v2 = { x: Math.sign(p2.x - p1.x), y: Math.sign(p2.y - p1.y) };
      const l1 = Math.hypot(p1.x - p0.x, p1.y - p0.y), l2 = Math.hypot(p2.x - p1.x, p2.y - p1.y), rr = Math.min(r, l1 / 2, l2 / 2);
      d += ` L${p1.x - v1.x * rr},${p1.y - v1.y * rr} Q${p1.x},${p1.y} ${p1.x + v2.x * rr},${p1.y + v2.y * rr}`;
    }
    const e = pts[pts.length - 1]; d += ` L${e.x},${e.y}`; return d;
  }
  const leftArrivals = new Map(), topArrivals = new Map(), exitSlots = new Map();
  const arriveLeft = sid => { const h = headPos.get(sid), k = leftArrivals.get(sid) || 0; leftArrivals.set(sid, k + 1); return { x: h.x, y: h.y + 10 + k * 8 }; };
  const arriveTop = sid => { const h = headPos.get(sid), k = topArrivals.get(sid) || 0; topArrivals.set(sid, k + 1); return { x: h.x + 12 + Math.min(k * 12, h.w - 24), y: h.y }; };
  const exitOf = card => { const p = pos.get(card.id); return { x: p.x + p.w, y: p.y + Math.min(p.h / 2, 24) }; };
  const gapX = (card, key) => { const col = pos.get(card.id).x; const k = exitSlots.get(col) || 0; exitSlots.set(col, k + 1); return pos.get(card.id).x + pos.get(card.id).w + 4 + (k % 3) * 4; };
  const laneY = (b, sid) => bandTop[b] + 5 + lanes[b].get(sid) * LANE;

  const ordered = [...groups.values()].sort((a, b) => (a.adjacent - b.adjacent) || (stageIdx.get(a.src) - stageIdx.get(b.src)));
  for (const gr of ordered) {
    const color = colorOf(gr.src), a = exitOf(gr.card);
    if (gr.adjacent) { path(bez(a, arriveLeft(gr.to)), color); continue; }
    const ly = laneY(gr.band, gr.src), x1 = gapX(gr.card), b = arriveTop(gr.to);
    path(ortho([a, { x: x1, y: a.y }, { x: x1, y: ly }, { x: b.x, y: ly }, b]), color);
  }

  // ---- lineage of one shot ----------------------------------------------------------------
  if (HI) {
    const elOf = id => nodesEl.querySelector(`[data-node="${id}"]`) || (pos.get(id) && pos.get(id).el);
    const out = el => { const r = rectOf(el); return { x: r.x + r.w, y: r.y + r.h / 2 }; };
    const inn = el => { const r = rectOf(el); return { x: r.x, y: r.y + r.h / 2 }; };
    const hiLane = bandTop[1] + 5 + lanes[1].size * LANE;
    const link = (A, B, fromNode, toNode) => {
      const sr = rowOf.get(nodeById.get(fromNode).stage), tr = rowOf.get(nodeById.get(toNode).stage);
      if (sr === tr) return path(bez(out(A), inn(B)), HI_COLOR, "hi");
      const a = out(A), rb = rectOf(B), x1 = a.x + 6, tx = rb.x + 10;
      return path(ortho([a, { x: x1, y: a.y }, { x: x1, y: hiLane }, { x: tx, y: hiLane }, { x: tx, y: rb.y }]), HI_COLOR, "hi");
    };
    const seen = new Set();
    for (const e of g.edges.filter(e => e.type === "shot" && nodeById.get(e.from)?.shot === HI && nodeById.get(e.to)?.shot === HI)) {
      const A = elOf(e.from), B = elOf(e.to); if (!A || !B) continue;
      const cf = cardOfNode.get(e.from), ct = cardOfNode.get(e.to); if (cf === ct) continue;
      const k = `${cf.id}→${ct.id}`; if (seen.has(k)) continue; seen.add(k);
      link(A, B, e.from, e.to);
    }
    const clip = g.nodes.find(n => n.shot === HI && n.kind === "video"), cut = g.nodes.find(n => n.preview_only);
    if (clip && cut && pos.get(cut.id) && cardOfNode.get(clip.id) !== cardOfNode.get(cut.id)) {
      const a = out(elOf(clip.id)), pc = pos.get(cut.id), b = { x: pc.x + pc.w, y: pc.y + pc.h / 2 };
      path(`M${a.x},${a.y} C${a.x + 22},${a.y} ${b.x + 22},${b.y} ${b.x},${b.y}`, HI_COLOR, "hi");
    }
    // the cut's own resolved edge(s) into later steps, re-drawn on top in the lineage color
    for (const p of [...edgesEl.querySelectorAll("path:not(.hi)")]) { /* no-op: trunks keep their step color */ }
  }

  await Promise.all([...document.images].map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
  for (const im of [...document.images]) {   // embed thumbnails at 3x display size, not the full derivative
    if (!im.naturalWidth) continue;
    const w = Math.max(1, Math.round(im.clientWidth * 3)), h = Math.max(1, Math.round(im.clientHeight * 3));
    if (im.naturalWidth <= w && im.naturalHeight <= h) continue;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const sc = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / sc, sh = h / sc;
    cv.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    cv.style.cssText = "display:block;width:100%;height:100%"; im.replaceWith(cv);
  }
  window.__READY = { w: worldW, h: worldH };
})();
