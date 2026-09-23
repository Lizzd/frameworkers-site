/* Lays out process/<film>/graph.json as a print figure: one column per agent step, artifacts of one
   role folded into a grid / row card, real resolved inputs drawn as kind-colored curves into the
   consuming step's header (which lists the InputLabels they filled), one shot's lineage in red. */
(async function () {
  const Q = new URLSearchParams(location.search);
  const film = Q.get("film") || "martin";
  const g = await (await fetch(`/process/${film}/graph.json`, { cache: "no-cache" })).json();

  // ---- constants (CSS px; the PDF is later included at \textwidth, so ~1px = 0.46pt)
  const M = 12, GAP = 18, RAIL_H = 20, BUS_LANE = 5, HEAD_GAP = 10, CARD_GAP = 7, LEGEND_H = 22;
  const W = { single: 110, rows: 130, grid2: 126, grid3: 130, grid4: 180, media: 126 };

  const stages = [...g.stages].sort((a, b) => a.order - b.order);
  const stageById = new Map(stages.map(s => [s.id, s]));
  const nodeById = new Map(g.nodes.map(n => [n.id, n]));
  const shots = [...new Set(g.nodes.filter(n => n.shot).map(n => n.shot))].sort();
  const HI = Q.get("shot") || shots[0] || null;

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
  const TITLES = { anchor: "anchors", storyboard: "storyboards", ref: "references", frame: "keyframes",
                   clip: "clips", prompt: "image prompts", shotprompt: "shot prompts", audio: "audio tracks" };
  const GRID = new Set(["anchor", "storyboard", "ref", "frame", "clip"]);
  const ROWS = new Set(["prompt", "shotprompt", "audio"]);
  const ORDER = ["ref", "text", "anchor", "storyboard", "frame", "prompt", "shotprompt", "final", "cut", "clip", "video", "audio", "json", "other"];
  const gridCols = n => (n <= 4 ? 2 : n <= 6 ? 3 : n === 9 ? 3 : 4);

  const cardOfNode = new Map();
  const stageCards = new Map();
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
  const prefW = c => c.type === "grid" ? ({ 2: W.grid2, 3: W.grid3, 4: W.grid4 })[gridCols(c.nodes.length)]
                   : c.type === "rows" ? W.rows : (c.nodes[0].kind === "image" || c.nodes[0].kind === "video") ? W.media : W.single;
  const stageW = new Map(stages.map(s => [s.id, Math.max(...stageCards.get(s.id).map(prefW), W.single)]));

  // ---- input manifest per stage (from real step edges) --------------------------------
  const stepNo = s => (s.id === "Inputs" ? "in" : String(s.order));
  const manifest = new Map(); // stage id -> Map(label -> {n, from:Set})
  const realEdges = g.edges.filter(e => e.type === "step" && !e.inferred);
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !e.labels) continue;
    const m = manifest.get(e.to) || new Map(); manifest.set(e.to, m);
    for (const l of e.labels) { const r = m.get(l) || { n: 0, from: new Set() }; r.n++; r.from.add(stepNo(stageById.get(n.stage))); m.set(l, r); }
  }
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDur = d => { d = Math.round(d); return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`; };
  const fmtKB = b => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;

  // ---- DOM ----------------------------------------------------------------------------
  const nodesEl = document.getElementById("nodes"), edgesEl = document.getElementById("edges"), world = document.getElementById("world");
  function headerEl(s, w) {
    const isIn = s.id === "Inputs", isFinal = stageCards.get(s.id).some(c => c.role === "final");
    const el = document.createElement("div");
    el.className = `col-head${isIn ? " is-inputs" : ""}${isFinal ? " is-final" : ""}`;
    el.style.width = w + "px";
    const cnt = g.nodes.filter(n => n.stage === s.id).length;
    const m = manifest.get(s.id);
    const inputs = m ? [...m.entries()].map(([l, r]) => `<span class="tok">${esc(l).replace(/_/g, "_<wbr>")}${r.n > 1 ? "×" + r.n : ""}<span class="src">←${[...r.from].join(",")}</span></span>`).join("") : "";
    el.innerHTML = `<div class="ch-top"><span class="ch-badge">${isIn ? "in" : s.order}</span><span class="ch-agent">${isIn ? "User inputs" : esc(s.agent.replace(/Agent$/, "")).replace(/([a-z])([A-Z])/g, "$1<wbr>$2")}</span></div>
      <div class="ch-sub">${cnt} artifact${cnt === 1 ? "" : "s"}${isIn ? " · the brief and its reference images" : ""}</div>
      ${inputs ? `<div class="ch-in">${inputs}</div>` : ""}`;
    return el;
  }
  function mediaAspect(ns) { const r = ns.map(n => (n.w && n.h) ? n.w / n.h : 16 / 9).sort((a, b) => a - b); const med = r[Math.floor(r.length / 2)]; return med >= 1.45 ? "16 / 9" : med >= 1.1 ? "4 / 3" : "1 / 1"; }
  function cardEl(c, w) {
    const el = document.createElement("div");
    const n0 = c.nodes[0];
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
        for (const n of c.nodes) { const k = /anchor/i.test(n.label) ? "anchor prompts" : /storyboard|sheet/i.test(n.label) ? "sheet prompts" : "prompts"; cnt.set(k, (cnt.get(k) || 0) + 1); }
        rows = [...cnt.entries()].map(([k, v]) => `<div class="row"><b>${v}</b> ${k}</div>`);
      } else {
        rows = c.nodes.map(n => `<div class="row${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}"><b>${esc(n.shot || n.label)}</b>${n.shot ? "" : ""}</div>`);
      }
      inner += `<div class="c-rows">${rows.join("")}</div>`;
      inner += `<div class="c-body"><div class="c-label"><span class="dot"></span><span class="t">${c.nodes.length} ${TITLES[c.role] || c.role}</span></div></div>`;
    } else {
      const n = n0, meta = [];
      if (n.kind === "image" || n.kind === "video") {
        if (n.dur) meta.push(fmtDur(n.dur)); if (n.w && n.h) meta.push(`${n.w}×${n.h}`);
        inner += `<div class="c-media" style="aspect-ratio:16 / 9"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">
          ${n.final ? `<span class="pill">final film</span>` : n.preview_only ? `<span class="pill cut">assembled cut</span>` : ""}${n.dur ? `<span class="dur">${fmtDur(n.dur)}</span>` : ""}</div>`;
      } else {
        meta.push(n.kind); if (n.bytes) meta.push(fmtKB(n.bytes));
        inner += `<div class="c-doc">${esc(n.caption || n.excerpt || "")}</div>`;
      }
      const label = n.final ? "final film" : n.preview_only ? "assembled cut" : /agent output$/i.test(n.label) ? "output" : n.label;
      inner += `<div class="c-body"><div class="c-label"><span class="dot"></span><span class="t">${esc(label)}</span></div><div class="c-meta">${esc(meta.join(" · "))}</div></div>`;
    }
    el.innerHTML = inner;
    return el;
  }

  // ---- layout -------------------------------------------------------------------------
  const longEdges = [];
  const stageIdx = new Map(stages.map((s, i) => [s.id, i]));
  for (const e of realEdges) { const n = nodeById.get(e.from); if (!n) continue; if (stageIdx.get(e.to) - stageIdx.get(n.stage) > 1) longEdges.push(e); }
  const busGroups = new Map(); // (card,to) -> lane
  for (const e of longEdges) { const key = `${cardOfNode.get(e.from).id}→${e.to}`; if (!busGroups.has(key)) busGroups.set(key, busGroups.size); }
  const BUS_H = busGroups.size ? busGroups.size * BUS_LANE + 8 : 0;
  const headY = M + RAIL_H + BUS_H;

  let x = M; const pos = new Map(); const headPos = new Map(); let maxBottom = 0;
  for (const s of stages) {
    const w = stageW.get(s.id);
    const h = headerEl(s, w); h.style.left = x + "px"; h.style.top = headY + "px"; nodesEl.appendChild(h);
    const hh = h.offsetHeight; headPos.set(s.id, { x, y: headY, w, h: hh });
    let y = headY + hh + HEAD_GAP;
    for (const c of stageCards.get(s.id)) {
      const el = cardEl(c, w); el.style.left = x + "px"; el.style.top = y + "px"; nodesEl.appendChild(el);
      const ch = el.offsetHeight; pos.set(c.id, { x, y, w, h: ch, el }); y += ch + CARD_GAP;
    }
    maxBottom = Math.max(maxBottom, y - CARD_GAP);
    x += w + GAP;
  }

  const worldW = x - GAP + M, worldH = maxBottom + 10 + LEGEND_H + M;
  world.style.width = worldW + "px"; world.style.height = worldH + "px";
  edgesEl.setAttribute("width", worldW); edgesEl.setAttribute("height", worldH); edgesEl.style.width = worldW + "px"; edgesEl.style.height = worldH + "px";

  // plan rail
  const rail = document.createElement("div"); rail.className = "rail"; rail.style.cssText = `left:${M}px;right:auto;width:${worldW - 2 * M - 10}px;top:${M + RAIL_H / 2}px`; nodesEl.appendChild(rail);
  const cap = document.createElement("div"); cap.className = "rail-cap"; cap.style.cssText = `left:${M + 8}px;top:${M + RAIL_H / 2 - 7}px`;
  const layers = new Set(); // graph.json has no layer info; the dump we render from is one layer
  cap.textContent = `Director plan · ${stages.length - 1} PlanSteps · executed left → right`; nodesEl.appendChild(cap);
  const arr = document.createElement("div"); arr.className = "rail-arrow"; arr.style.cssText = `left:${worldW - M - 10}px;top:${M + RAIL_H / 2 - 5}px`; nodesEl.appendChild(arr);

  // ---- edges --------------------------------------------------------------------------
  const KCOL = { image: "#3b7ddd", video: "#8b5cf6", audio: "#10b981", text: "#d98a0b", json: "#db2777" };
  const NS = "http://www.w3.org/2000/svg";
  const rectOf = el => { const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height }; };
  const arrivals = new Map();
  function arrive(sid) { const p = headPos.get(sid); const k = arrivals.get(sid) || 0; arrivals.set(sid, k + 1); return { x: p.x, y: p.y + 8 + (k * 6) % Math.max(6, p.h - 16) }; }
  function bez(a, b) { const dx = Math.max(24, (b.x - a.x) * 0.5); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; }
  function busPath(a, b, laneY) { // out of the card, up into the bus band, across, down into the header
    const r = 14, x1 = a.x + 10, x2 = b.x - 10;
    return `M${a.x},${a.y} L${x1 - r},${a.y} Q${x1},${a.y} ${x1},${a.y - r} L${x1},${laneY + r} Q${x1},${laneY} ${x1 + r},${laneY} L${x2 - r},${laneY} Q${x2},${laneY} ${x2},${laneY + r} L${x2},${b.y - r} Q${x2},${b.y} ${x2 + r},${b.y} L${b.x},${b.y}`;
  }
  const drawn = new Set(); const hiCards = new Set();
  const groups = new Map(); // one curve per (source card, target stage)
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n) continue; const c = cardOfNode.get(n.id); if (!c) continue;
    const key = `${c.id}→${e.to}`; if (!groups.has(key)) groups.set(key, { card: c, to: e.to, kind: n.kind, long: stageIdx.get(e.to) - stageIdx.get(n.stage) > 1, nodes: [] });
    groups.get(key).nodes.push(n);
  }
  // draw short edges first, long (bus) edges after; highlighted lineage on top
  const ordered = [...groups.values()].sort((a, b) => (a.long - b.long) || (pos.get(a.card.id).y - pos.get(b.card.id).y));
  for (const gr of ordered) {
    const p = pos.get(gr.card.id); const a = { x: p.x + p.w, y: p.y + Math.min(p.h / 2, 26) };
    const b = arrive(gr.to);
    const path = document.createElementNS(NS, "path");
    const isHiCut = HI && gr.card.role === "cut"; // the assembled cut carries the highlighted shot into the compositor
    if (gr.long) { const lane = busGroups.get(`${gr.card.id}→${gr.to}`); const laneY = M + RAIL_H + 4 + lane * BUS_LANE; path.setAttribute("d", busPath(a, b, laneY)); }
    else path.setAttribute("d", bez(a, b));
    path.setAttribute("stroke", KCOL[gr.kind] || "#8d95ab");
    if (isHiCut) path.classList.add("hi");
    edgesEl.appendChild(path);
  }
  // lineage of the highlighted shot: node-level shot edges + clip → assembled cut
  if (HI) {
    const elOf = id => nodesEl.querySelector(`[data-node="${id}"]`) || (pos.get(id) && pos.get(id).el);
    const out = el => { const r = rectOf(el); return { x: r.x + r.w, y: r.y + r.h / 2 }; };
    const inn = el => { const r = rectOf(el); return { x: r.x, y: r.y + r.h / 2 }; };
    const shotEdges = g.edges.filter(e => e.type === "shot" && nodeById.get(e.from)?.shot === HI && nodeById.get(e.to)?.shot === HI);
    const seen = new Set();
    for (const e of shotEdges) {
      const A = elOf(e.from), B = elOf(e.to); if (!A || !B) continue;
      const k = `${cardOfNode.get(e.from).id}→${cardOfNode.get(e.to).id}`; if (seen.has(k) || cardOfNode.get(e.from) === cardOfNode.get(e.to)) continue; seen.add(k);
      const path = document.createElementNS(NS, "path"); path.setAttribute("d", bez(out(A), inn(B))); path.classList.add("hi"); edgesEl.appendChild(path);
    }
    const clip = g.nodes.find(n => n.shot === HI && n.kind === "video"), cut = g.nodes.find(n => n.preview_only);
    if (clip && cut && pos.get(cut.id)) {
      const A = elOf(clip.id), pc = pos.get(cut.id); const a = out(A), b = { x: pc.x + pc.w, y: pc.y + pc.h / 2 };
      // same column: hook out to the right and back into the cut card's right edge
      const d = `M${a.x},${a.y} C${a.x + 22},${a.y} ${b.x + 22},${b.y} ${b.x},${b.y}`;
      const path = document.createElementNS(NS, "path"); path.setAttribute("d", d); path.classList.add("hi"); edgesEl.appendChild(path);
    }
  }

  // ---- legend -------------------------------------------------------------------------
  const lg = document.createElement("div"); lg.className = "legend"; lg.style.cssText = `left:${M}px;top:${maxBottom + 12}px`;
  const kinds = [...new Set(g.nodes.map(n => n.kind))];
  lg.innerHTML = kinds.map(k => `<span class="lg"><i style="background:${KCOL[k]}"></i>${k}</span>`).join("") +
    `<span class="lg edge"><i></i>input resolved from the Workspace at run time (colored by source)</span>` +
    (HI ? `<span class="lg hi"><i></i>lineage of ${esc(HI)}</span>` : "") +
    `<span class="note">${g.nodes.length} artifacts · ${realEdges.length} resolved inputs · header lists each step's InputLabels ← producing step</span>`;
  nodesEl.appendChild(lg);

  await Promise.all([...document.images].map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
  // keep the PDF small: redraw every thumbnail into a canvas at 3x its displayed size (cover-cropped),
  // so Chromium embeds a bitmap of that size instead of the full 1280px derivative
  for (const im of [...document.images]) {
    if (!im.naturalWidth) continue;
    const w = Math.max(1, Math.round(im.clientWidth * 3)), h = Math.max(1, Math.round(im.clientHeight * 3));
    if (im.naturalWidth <= w && im.naturalHeight <= h) continue;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const sc = Math.max(w / im.naturalWidth, h / im.naturalHeight);
    const sw = w / sc, sh = h / sc;
    cv.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    cv.style.cssText = "display:block;width:100%;height:100%"; im.replaceWith(cv);
  }
  window.__READY = { w: worldW, h: worldH };
})();
