/* Print figure of process/<film>/graph.json — v3.
   Top: the Director side (user brief → Director → its PlanSteps with intents, plus the inputs each step
   actually resolved). Bottom: one column per PlanStep with the artifacts it produced (media as
   thumbnails, text/JSON as chips) and the resolved-input curves, colored by producing step.
   ?shot=sh_00N highlights that shot's lineage (?shot=none disables). Single-row layout. */
(async function () {
  const Q = new URLSearchParams(location.search);
  const film = Q.get("film") || "little_calf";
  const g = await (await fetch(`/process/${film}/graph.json`, { cache: "no-cache" })).json();

  const M = 12, GAP = 10, HEAD_GAP = 8, CARD_GAP = 6, LANE = 7, BAND_MIN = 18, SECTION_GAP = 14;
  const W = { text: 108, kfs: 232, media: 148 };
  const PALETTE = ["#2563eb", "#0891b2", "#16a34a", "#7c3aed", "#ea580c", "#4f46e5", "#0d9488", "#b45309", "#9333ea", "#475569", "#65a30d", "#0369a1"];
  const IN_COLOR = "#c98a2e", HI_COLOR = "#e11d48";
  const KCOL = { image: "#3b7ddd", video: "#8b5cf6", audio: "#10b981", text: "#d98a0b", json: "#db2777" };

  // the exporter may attach the site's published mp4 next to the run's own compositor output: keep the run's
  {
    const last = [...g.stages].sort((a, b) => a.order - b.order).slice(-1)[0].id;
    const site = g.nodes.find(n => n.id === "final_film" && n.stage === last);
    const own = g.nodes.find(n => n.stage === last && n.kind === "video" && n.id !== "final_film");
    if (site && own) { g.nodes = g.nodes.filter(n => n !== site); own.final = true; own.preview_only = false; g.edges = g.edges.filter(e => e.from !== site.id && e.to !== site.id); }
  }
  const stages = [...g.stages].sort((a, b) => a.order - b.order);
  const steps = stages.filter(s => s.id !== "Inputs");
  const stageById = new Map(stages.map(s => [s.id, s]));
  const stageIdx = new Map(stages.map((s, i) => [s.id, i]));
  const colorOf = sid => sid === "Inputs" ? IN_COLOR : PALETTE[(stageById.get(sid).order - 1) % PALETTE.length];
  const nodeById = new Map(g.nodes.map(n => [n.id, n]));
  const shots = [...new Set(g.nodes.filter(n => n.shot).map(n => n.shot))].sort();
  const HI = Q.get("shot") === "none" ? null : (Q.get("shot") || (shots.length > 1 ? shots[Math.min(1, shots.length - 1)] : null));
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDur = d => { d = Math.round(d); return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`; };
  const fmtKB = b => b >= 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1024))} KB`;
  const short = s => esc(s.replace(/Agent$/, ""));

  // ---- roles → cards ---------------------------------------------------------------------
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
  const MEDIA = new Set(["ref", "anchor", "storyboard", "frame", "clip", "cut", "video", "final"]);
  const TITLES = { anchor: "identity anchors", storyboard: "storyboard sheets", ref: "reference images", frame: "keyframes", clip: "shot clips",
                   prompt: "image prompts", shotprompt: "shot prompts", audio: "audio tracks", json: "JSON outputs", text: "text files" };
  const ORDER = ["ref", "anchor", "storyboard", "frame", "final", "cut", "clip", "video", "audio", "text", "prompt", "shotprompt", "json", "other"];
  const gridCols = n => (n <= 3 ? n : n === 4 ? 2 : n <= 6 ? 3 : n === 9 ? 3 : 4);
  const cardOfNode = new Map(), stageCards = new Map();
  for (const s of stages) {
    const by = new Map();
    for (const n of g.nodes.filter(n => n.stage === s.id)) { const r = role(n); if (!by.has(r)) by.set(r, []); by.get(r).push(n); }
    const cards = [];
    for (const r of ORDER) {
      const ns = by.get(r); if (!ns) continue;
      if (MEDIA.has(r)) {
        if (ns.length >= 2 && r !== "final" && r !== "cut") cards.push({ type: "grid", role: r, nodes: ns, id: `grp__${s.id}__${r}` });
        else for (const n of ns) cards.push({ type: "media", role: r, nodes: [n], id: n.id });
      } else if (r === "audio") {
        for (const n of ns) cards.push({ type: "audio", role: r, nodes: [n], id: n.id });
      } else if (ns.length >= 2 && r !== "json") {
        cards.push({ type: "chip", role: r, nodes: ns, id: `grp__${s.id}__${r}` });
      } else for (const n of ns) cards.push({ type: "chip", role: r, nodes: [n], id: n.id });
    }
    for (const c of cards) for (const n of c.nodes) cardOfNode.set(n.id, c);
    stageCards.set(s.id, cards);
  }
  const stageW = new Map(stages.map(s => {
    const cs = stageCards.get(s.id);
    const hasGrid = cs.some(c => c.type === "grid" && c.nodes.length >= 6), hasMedia = cs.some(c => c.type === "grid" || c.type === "media");
    return [s.id, hasGrid ? W.kfs : hasMedia ? W.media : W.text];
  }));

  // ---- resolved inputs → groups, manifest -----------------------------------------------------
  const realEdges = g.edges.filter(e => e.type === "step" && !e.inferred);
  const groups = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !stageById.has(e.to)) continue;
    const c = cardOfNode.get(n.id); if (!c) continue;
    const key = `${c.id}→${e.to}`;
    if (!groups.has(key)) groups.set(key, { card: c, src: n.stage, to: e.to, adjacent: stageIdx.get(e.to) - stageIdx.get(n.stage) === 1, nodes: [] });
    groups.get(key).nodes.push(n);
  }
  const laneSrcs = [...new Set([...groups.values()].filter(gr => !gr.adjacent && stageById.has(gr.src) && (gr.src !== "Inputs" || g.nodes.some(n => n.stage === "Inputs" && ["image", "video", "audio"].includes(n.kind)))).map(gr => gr.src))].sort((a, b) => stageIdx.get(a) - stageIdx.get(b));
  const lanes = new Map(laneSrcs.map((sid, i) => [sid, i]));
  const bandH = Math.max(BAND_MIN, laneSrcs.length * LANE + 10);
  const stepNo = sid => (sid === "Inputs" ? "in" : String(stageById.get(sid).order));
  const manifest = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !e.labels) continue;
    const m = manifest.get(e.to) || new Map(); manifest.set(e.to, m);
    for (const l of e.labels) { const r = m.get(l) || { n: 0, from: new Set() }; r.n++; r.from.add(stepNo(n.stage)); m.set(l, r); }
  }
  const manifestHtml = sid => { const m = manifest.get(sid); if (!m) return ""; return [...m.entries()].map(([l, r]) =>
    `<span class="tok">${esc(l).replace(/_/g, "_<wbr>")}${r.n > 1 ? "×" + r.n : ""}<span class="src">←${[...r.from].map(x => x === "in" ? "in" : x).join(",")}</span></span>`).join(' <span class="sep">·</span> '); };

  // ---- DOM helpers ---------------------------------------------------------------------------
  const nodesEl = document.getElementById("nodes"), edgesEl = document.getElementById("edges"), world = document.getElementById("world");
  const div = (cls, css, html) => { const el = document.createElement("div"); el.className = cls; if (css) el.style.cssText = css; if (html != null) el.innerHTML = html; nodesEl.appendChild(el); return el; };
  const badge = (sid, extra = "") => `<span class="badge${extra}" style="background:${colorOf(sid)}">${sid === "Inputs" ? "in" : stageById.get(sid).order}</span>`;

  // ---- world width from the canvas columns ----------------------------------------------------
  const inputsHasMedia = g.nodes.some(n => n.stage === "Inputs" && ["image", "video", "audio"].includes(n.kind));
  const cols = stages.filter(s => s.id !== "Inputs" || inputsHasMedia);
  const shown = new Set(cols.map(s => s.id));
  const worldW = cols.reduce((a, s) => a + stageW.get(s.id), 0) + (cols.length - 1) * GAP + 2 * M;

  // ---- 1. Director panel ---------------------------------------------------------------------
  let y = M;
  const briefW = 300, dirX = M + briefW + 26, dirW = worldW - dirX - M;
  const brief = div("panel brief", `left:${M}px;top:${y}px;width:${briefW}px`,
    `<div class="p-title">${badge("Inputs")} User brief</div><div class="p-text">${esc(g.prompt || "")}</div>`);
  const plan = g.plan || { steps: steps.map(s => ({ agent_id: s.agent, intent: "" })) };
  const catalogNote = plan.source === "replay" ? `re-planned from the same brief with the Director's core prompt (${esc(plan.model || "")}); ${plan.chain_match ? "identical to the executed chain" : "differs from the executed chain"}` : "as recorded during the run";
  const director = div("panel director", `left:${dirX}px;top:${y}px;width:${dirW}px`,
    `<div class="p-title"><span class="badge dir">D</span> Director</div>
     <div class="p-text">Reads the brief and the catalog of sub-agent descriptors, then plans the whole pipeline up front as <b>${plan.steps.length} PlanSteps</b> on the Plan Stack${plan.chain_match ? " (one layer; no replan was needed)" : ""}. The Assistant executes them in order; each column below is one step.</div>
     <div class="p-note">Plan ${catalogNote}.</div>`);
  const arrow = div("p-arrow", `left:${M + briefW + 6}px;top:${y + 22}px`, "→");
  y += Math.max(brief.offsetHeight, director.offsetHeight) + 8;
  // plan table
  const rowsHtml = plan.steps.map((st, i) => {
    const s = steps[i]; const sid = s ? s.id : null;
    return `<div class="prow"><div class="pc-badge">${sid ? badge(sid) : `<span class="badge" style="background:#999">${i + 1}</span>`}</div>
      <div class="pc-agent">${short(st.agent_id).replace(/([a-z])([A-Z])/g, "$1<wbr>$2")}</div>
      <div class="pc-intent">${esc(st.intent || "")}</div>
      <div class="pc-in">${sid ? manifestHtml(sid) : ""}</div></div>`;
  }).join("");
  const table = div("plan", `left:${M}px;top:${y}px;width:${worldW - 2 * M}px`,
    `<div class="prow head"><div class="pc-badge">#</div><div class="pc-agent">PlanStep → sub-agent</div><div class="pc-intent">Director's intent for the step</div><div class="pc-in">resolved inputs (label ← step)</div></div>${rowsHtml}`);
  y += table.offsetHeight + SECTION_GAP;

  // ---- 2. canvas: one column per stage -----------------------------------------------------------
  const railY = y; y += 16;
  const bandTop = y; const headY = bandTop + bandH;
  const pos = new Map(), headPos = new Map();
  let x = M, bottom = headY;
  const mediaAspect = ns => { const r = ns.map(n => (n.w && n.h) ? n.w / n.h : 16 / 9).sort((a, b) => a - b); const med = r[Math.floor(r.length / 2)]; return med >= 1.45 ? "16 / 9" : med >= 1.1 ? "4 / 3" : "1 / 1"; };
  for (const s of cols) {
    const w = stageW.get(s.id), isIn = s.id === "Inputs";
    const h = div(`col-head${isIn ? " is-inputs" : ""}${stageCards.get(s.id).some(c => c.role === "final") ? " is-final" : ""}`,
      `left:${x}px;top:${headY}px;width:${w}px;border-top-color:${colorOf(s.id)}`,
      `${badge(s.id)}<span class="ch-agent">${isIn ? "User inputs" : short(s.agent).replace(/([a-z])([A-Z])/g, "$1<wbr>$2")}</span>`);
    headPos.set(s.id, { x, y: headY, w, h: h.offsetHeight, el: h });
    let cy = headY + h.offsetHeight + HEAD_GAP;
    for (const c of stageCards.get(s.id)) {
      let el;
      if (c.type === "grid") {
        const n0 = c.nodes[0], gc = gridCols(c.nodes.length), asp = mediaAspect(c.nodes);
        el = div(`card k-${n0.kind}`, `left:${x}px;top:${cy}px;width:${w}px`,
          `<div class="c-grid" style="grid-template-columns:repeat(${gc},1fr)">` + c.nodes.map(n =>
            `<div class="cell${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}" style="aspect-ratio:${asp}"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">${n.shot ? `<span class="tag">${esc(n.shot)}</span>` : ""}</div>`).join("") +
          `</div><div class="c-label"><span class="dot"></span>${c.nodes.length} ${TITLES[c.role] || c.role}</div>`);
      } else if (c.type === "media") {
        const n = c.nodes[0];
        el = div(`card k-${n.kind}${n.final ? " is-final" : ""}`, `left:${x}px;top:${cy}px;width:${w}px`,
          `<div class="c-media${n.shot && n.shot === HI ? " hi" : ""}" data-node="${esc(n.id)}" style="aspect-ratio:16 / 9"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">
             ${n.final ? `<span class="pill">final film</span>` : n.preview_only ? `<span class="pill cut">assembled cut</span>` : ""}${n.dur ? `<span class="dur">${fmtDur(n.dur)}</span>` : ""}</div>
           <div class="c-label"><span class="dot"></span>${esc(n.final ? "final film" : n.preview_only ? "assembled cut" : n.label)}</div>`);
      } else if (c.type === "audio") {
        const n = c.nodes[0];
        el = div(`card k-audio`, `left:${x}px;top:${cy}px;width:${w}px`,
          `<div class="c-wave" data-node="${esc(n.id)}">${n.dur ? `<span class="dur">${fmtDur(n.dur)}</span>` : ""}</div><div class="c-label"><span class="dot"></span>${esc(n.label.replace(/^aud /, ""))}</div>`);
      } else { // chip
        const n0 = c.nodes[0]; let label, meta = "";
        if (c.nodes.length > 1) label = `${c.nodes.length} ${TITLES[c.role] || c.role}`;
        else if (/agent output$/i.test(n0.label)) { label = n0.kind === "json" ? "output JSON" : n0.label; meta = n0.bytes ? fmtKB(n0.bytes) : ""; }
        else { label = n0.label.replace(/^shot prompt /, "prompt "); meta = n0.bytes ? fmtKB(n0.bytes) : ""; }
        el = div(`chip k-${n0.kind}`, `left:${x}px;top:${cy}px;width:${w}px`,
          `<span class="dot"></span><span class="t">${esc(label)}</span>`);
        if (c.nodes.length === 1) el.dataset.node = n0.id;
      }
      el.dataset.card = c.id;
      pos.set(c.id, { x, y: cy, w, h: el.offsetHeight, el }); cy += el.offsetHeight + CARD_GAP;
    }
    bottom = Math.max(bottom, cy - CARD_GAP); x += w + GAP;
  }
  // rail between plan and canvas
  div("rail", `left:${M}px;width:${worldW - 2 * M - 10}px;top:${railY + 8}px`);
  div("rail-cap", `left:${M + 8}px;top:${railY + 1}px`, "Assistant executes the Plan Stack in order · one column per PlanStep · every artifact it persisted");
  div("rail-arrow", `left:${worldW - M - 10}px;top:${railY + 3}px`);

  // ---- 3. legend + world size -------------------------------------------------------------------
  const kinds = [...new Set(g.nodes.map(n => n.kind))];
  const lg = div("legend", `left:${M}px;top:${bottom + 10}px;width:${worldW - 2 * M}px`,
    kinds.map(k => `<span class="lg"><i style="background:${KCOL[k]}"></i>${k}</span>`).join("") +
    `<span class="lg edge"><i></i>input resolved for the step it enters, colored by the producing step</span>` +
    (HI ? `<span class="lg hi"><i></i>lineage of ${esc(HI)}</span>` : "") +
    `<span class="note">${g.nodes.length} artifacts · ${realEdges.length} resolved inputs${g.notes && /replay/i.test(g.notes.join(" ")) ? " · connections from replaying the Assistant's resolver over the archived Workspace" : ""}</span>`);
  const worldH = bottom + 10 + lg.offsetHeight + M;
  world.style.width = worldW + "px"; world.style.height = worldH + "px";
  edgesEl.setAttribute("width", worldW); edgesEl.setAttribute("height", worldH); edgesEl.style.width = worldW + "px"; edgesEl.style.height = worldH + "px";

  // ---- 4. edges --------------------------------------------------------------------------------
  const NS = "http://www.w3.org/2000/svg";
  const rectOf = el => { const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height }; };
  const path = (d, color, cls) => { const p = document.createElementNS(NS, "path"); p.setAttribute("d", d); if (cls) p.setAttribute("class", cls); else p.style.stroke = color; edgesEl.appendChild(p); return p; };
  const bez = (a, b) => { const dx = Math.max(20, Math.abs(b.x - a.x) * 0.5); return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`; };
  function ortho(pts, r = 5) {
    let d = `M${pts[0].x},${pts[0].y}`;
    for (let i = 1; i < pts.length - 1; i++) {
      const p0 = pts[i - 1], p1 = pts[i], p2 = pts[i + 1];
      const v1 = { x: Math.sign(p1.x - p0.x), y: Math.sign(p1.y - p0.y) }, v2 = { x: Math.sign(p2.x - p1.x), y: Math.sign(p2.y - p1.y) };
      const rr = Math.min(r, Math.hypot(p1.x - p0.x, p1.y - p0.y) / 2, Math.hypot(p2.x - p1.x, p2.y - p1.y) / 2);
      d += ` L${p1.x - v1.x * rr},${p1.y - v1.y * rr} Q${p1.x},${p1.y} ${p1.x + v2.x * rr},${p1.y + v2.y * rr}`;
    }
    const e = pts[pts.length - 1]; return d + ` L${e.x},${e.y}`;
  }
  const leftArr = new Map(), topArr = new Map(), exitSlots = new Map();
  const arriveLeft = sid => { const h = headPos.get(sid), k = leftArr.get(sid) || 0; leftArr.set(sid, k + 1); return { x: h.x, y: h.y + 8 + k * 7 }; };
  const arriveTop = sid => { const h = headPos.get(sid), k = topArr.get(sid) || 0; topArr.set(sid, k + 1); return { x: h.x + 10 + Math.min(k * 10, h.w - 20), y: h.y }; };
  const exitOf = card => { const p = pos.get(card.id); return { x: p.x + p.w, y: p.y + Math.min(p.h / 2, 20) }; };
  const gapX = card => { const p = pos.get(card.id), k = exitSlots.get(p.x) || 0; exitSlots.set(p.x, k + 1); return p.x + p.w + 3 + (k % 2) * 4; };
  const ordered = [...groups.values()].filter(gr => shown.has(gr.src) && shown.has(gr.to)).sort((a, b) => (a.adjacent - b.adjacent) || (stageIdx.get(a.src) - stageIdx.get(b.src)));
  for (const gr of ordered) {
    const color = colorOf(gr.src), a = exitOf(gr.card);
    if (gr.adjacent) { path(bez(a, arriveLeft(gr.to)), color); continue; }
    const ly = bandTop + 5 + lanes.get(gr.src) * LANE, x1 = gapX(gr.card), b = arriveTop(gr.to);
    path(ortho([a, { x: x1, y: a.y }, { x: x1, y: ly }, { x: b.x, y: ly }, b]), color);
  }
  if (HI) {
    const elOf = id => nodesEl.querySelector(`[data-node="${id}"]`) || (cardOfNode.get(id) && pos.get(cardOfNode.get(id).id) && pos.get(cardOfNode.get(id).id).el);
    const out = el => { const r = rectOf(el); return { x: r.x + r.w, y: r.y + r.h / 2 }; };
    const inn = el => { const r = rectOf(el); return { x: r.x, y: r.y + r.h / 2 }; };
    const seen = new Set();
    for (const e of g.edges.filter(e => e.type === "shot" && nodeById.get(e.from)?.shot === HI && nodeById.get(e.to)?.shot === HI)) {
      const cf = cardOfNode.get(e.from), ct = cardOfNode.get(e.to); if (!cf || !ct || cf === ct) continue;
      if (cf.role === "prompt" || ct.role === "prompt") continue;                       // image-prompt text is not part of the visual lineage
      if (Math.abs(stageIdx.get(nodeById.get(e.to).stage) - stageIdx.get(nodeById.get(e.from).stage)) !== 1) continue; // adjacent columns only
      const k = `${cf.id}→${ct.id}`; if (seen.has(k)) continue; seen.add(k);
      const A = elOf(e.from), B = elOf(e.to);
      if (A && B) { const a = out(A), b = inn(B), gx = (a.x + b.x) / 2; path(ortho([a, { x: gx, y: a.y }, { x: gx, y: b.y }, b], 4), HI_COLOR, "hi"); }
    }
    const clip = g.nodes.find(n => n.shot === HI && n.kind === "video"), cut = g.nodes.find(n => n.preview_only);
    if (clip && cut && pos.get(cut.id) && cardOfNode.get(clip.id) !== cardOfNode.get(cut.id)) {
      const a = out(elOf(clip.id)), pc = pos.get(cut.id), b = { x: pc.x + pc.w, y: pc.y + pc.h / 2 };
      path(`M${a.x},${a.y} C${a.x + 18},${a.y} ${b.x + 18},${b.y} ${b.x},${b.y}`, HI_COLOR, "hi");
    }
  }

  // ---- 5. thumbnails at 3x display size, then ready ------------------------------------------------
  await Promise.all([...document.images].map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));
  for (const im of [...document.images]) {
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
