/* Print figure of process/<film>/graph.json — v4 ("one row per PlanStep").
   Top: user brief → Director. Then one row per PlanStep: the Director's intent (+ the input labels the
   Assistant resolved) on the left, every artifact the step persisted on the right (media as thumbnails,
   text/JSON as chips). Step-to-step connections are arcs in the left margin, colored by the producing step.
   ?shot=sh_00N outlines that shot's storyboard/clip in red (?shot=none disables). */
(async function () {
  const Q = new URLSearchParams(location.search);
  const film = Q.get("film") || "little_calf";
  const g = await (await fetch(`/process/${film}/graph.json`, { cache: "no-cache" })).json();

  const M = 12, SECTION_GAP = 10;
  const PALETTE = ["#2563eb", "#0891b2", "#16a34a", "#7c3aed", "#ea580c", "#4f46e5", "#0d9488", "#b45309", "#9333ea", "#475569", "#65a30d", "#0369a1"];
  const IN_COLOR = "#c98a2e";
  const KCOL = { image: "#3b7ddd", video: "#8b5cf6", audio: "#10b981", text: "#d98a0b", json: "#db2777" };
  const WORLD_W = +(Q.get("w")) || 900;

  {  // keep the run's own compositor output as the final film when the exporter also attached the published mp4
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
  const short = s => esc(s.replace(/Agent$/, ""));
  const camel = s => s.replace(/([a-z])([A-Z])/g, "$1<wbr>$2");

  // ---- roles → artifact groups per step -----------------------------------------------------------
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
  const ORDER = ["ref", "storyboard", "anchor", "frame", "final", "cut", "clip", "video", "audio", "text", "prompt", "shotprompt", "json", "other"];
  const CELL_W = { storyboard: 118, frame: 118, ref: 96, anchor: 78, clip: 78, cut: 118, final: 200, video: 118 };
  const groupsOf = sid => {
    const by = new Map();
    for (const n of g.nodes.filter(n => n.stage === sid)) { const r = role(n); if (!by.has(r)) by.set(r, []); by.get(r).push(n); }
    return ORDER.filter(r => by.has(r)).map(r => ({ role: r, nodes: by.get(r) }));
  };

  // ---- connections: one arc per (producing step → consuming step) ----------------------------------------
  const realEdges = g.edges.filter(e => e.type === "step" && !e.inferred);
  const pairs = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !stageById.has(e.to) || n.stage === e.to || n.stage === "Inputs") continue;
    const key = `${n.stage}→${e.to}`; if (!pairs.has(key)) pairs.set(key, { src: n.stage, to: e.to });
  }
  const rowIdx = new Map(steps.map((s, i) => [s.id, i]));
  const spanOf = p => Math.abs(rowIdx.get(p.to) - rowIdx.get(p.src));
  const maxSpan = Math.max(1, ...[...pairs.values()].map(spanOf));
  const ARC_BASE = 7, ARC_STEP = 7, ARC_W = ARC_BASE + ARC_STEP * maxSpan + 14;
  const stepNo = sid => (sid === "Inputs" ? "in" : String(stageById.get(sid).order));
  const manifest = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !e.labels) continue;
    const m = manifest.get(e.to) || new Map(); manifest.set(e.to, m);
    for (const l of e.labels) { const r = m.get(l) || { n: 0, from: new Set() }; r.n++; r.from.add(stepNo(n.stage)); m.set(l, r); }
  }
  const manifestHtml = sid => { const m = manifest.get(sid); if (!m) return ""; return [...m.entries()].map(([l, r]) =>
    `<span class="tok">${esc(l).replace(/_/g, "_<wbr>")}${r.n > 1 ? "×" + r.n : ""}<span class="src">←${[...r.from].join(",")}</span></span>`).join(' <span class="sep">·</span> '); };

  // ---- DOM ------------------------------------------------------------------------------------------
  const nodesEl = document.getElementById("nodes"), edgesEl = document.getElementById("edges"), world = document.getElementById("world");
  const div = (cls, css, html) => { const el = document.createElement("div"); el.className = cls; if (css) el.style.cssText = css; if (html != null) el.innerHTML = html; nodesEl.appendChild(el); return el; };
  const badge = sid => `<span class="badge" style="background:${colorOf(sid)}">${sid === "Inputs" ? "in" : stageById.get(sid).order}</span>`;
  const worldW = WORLD_W;

  // 1. brief → Director
  let y = M;
  const briefW = 290, dirX = M + briefW + 24, dirW = worldW - dirX - M;
  const plan = g.plan || { steps: steps.map(s => ({ agent_id: s.agent, intent: "" })) };
  const intentOf = new Map(plan.steps.map((st, i) => [steps[i] ? steps[i].id : `#${i}`, st.intent || ""]));
  const brief = div("panel brief", `left:${M}px;top:${y}px;width:${briefW}px`,
    `<div class="p-title">${badge("Inputs")} User brief</div><div class="p-text">${esc(g.prompt || "")}</div>`);
  const planNote = plan.source === "replay" ? `Plan re-derived from the same brief with the Director's core prompt (${esc(plan.model || "")}); ${plan.chain_match ? "identical to the executed chain" : "differs from the executed chain"}.` : "Plan as recorded during the run.";
  const director = div("panel director", `left:${dirX}px;top:${y}px;width:${dirW}px`,
    `<div class="p-title"><span class="badge dir">D</span> Director</div>
     <div class="p-text">Reads the brief and the sub-agent catalog, then plans the whole pipeline up front: <b>${steps.length} PlanSteps</b> on the Plan Stack${plan.chain_match ? " (one layer, no replan)" : ""}. The Assistant executes them in order; one row per step below.</div>
     <div class="p-note">${planNote}</div>`);
  div("p-arrow", `left:${M + briefW + 6}px;top:${y + 22}px`, "→");
  y += Math.max(brief.offsetHeight, director.offsetHeight) + SECTION_GAP;

  // 2. one row per PlanStep
  const uploads = g.nodes.filter(n => n.stage === "Inputs" && ["image", "video", "audio"].includes(n.kind));
  const tableX = M + ARC_W, tableW = worldW - tableX - M;
  const artW = tableW - 22 - 300 - 3 * 8 - 20;   // badge + plan column + gaps + padding → width left for artifacts
  const groupHtml = (gr) => {
    const r = gr.role, ns = gr.nodes;
    if (MEDIA.has(r)) {
      const per = CELL_W[r] || 100, n = ns.length;
      const cols = n <= 6 ? n : Math.max(1, Math.min(n, Math.floor((artW + 4) / (per + 4))));
      const w = Math.min(artW, cols * per + (cols - 1) * 4 + 6);
      const hi = n0 => n0.shot && n0.shot === HI ? " hi" : "";
      return `<div class="ag" style="width:${w}px"><div class="ag-grid" style="grid-template-columns:repeat(${cols},1fr)">` +
        ns.map(n0 => `<div class="cell${hi(n0)}" style="aspect-ratio:16 / 9"><img src="/${esc(n0.kind === "video" ? (n0.poster || "") : n0.file)}" alt="">` +
          `${n0.shot ? `<span class="tag">${esc(n0.shot)}</span>` : ""}${n0.final ? `<span class="pill">final film</span>` : n0.preview_only ? `<span class="pill cut">assembled cut</span>` : ""}${n0.dur ? `<span class="dur">${fmtDur(n0.dur)}</span>` : ""}</div>`).join("") +
        `</div><div class="ag-label"><span class="dot" style="background:${KCOL[ns[0].kind]}"></span>${n === 1 ? esc(ns[0].final ? "final film" : ns[0].preview_only ? "assembled cut" : ns[0].label) : `${n} ${TITLES[r] || r}`}</div></div>`;
    }
    if (r === "audio") return ns.map(n0 => `<div class="ag audio" style="width:150px"><div class="c-wave">${n0.dur ? `<span class="dur">${fmtDur(n0.dur)}</span>` : ""}</div><div class="ag-label"><span class="dot" style="background:${KCOL.audio}"></span>${esc(n0.label.replace(/^aud /, ""))}</div></div>`).join("");
    const label = ns.length > 1 ? `${ns.length} ${TITLES[r] || r}` : /agent output$/i.test(ns[0].label) ? (ns[0].kind === "json" ? "output JSON" : ns[0].label) : ns[0].label.replace(/^shot prompt /, "prompt ");
    return `<span class="chip"><span class="dot" style="background:${KCOL[ns[0].kind]}"></span>${esc(label)}</span>`;
  };
  const rows = steps.map(s => {
    const grs = groupsOf(s.id), textOnly = grs.every(gr => !MEDIA.has(gr.role) && gr.role !== "audio");
    const planHtml = `<div class="sc-agent">${camel(short(s.agent))}</div><div class="sc-intent">${esc(intentOf.get(s.id) || "")}${textOnly ? " " + grs.map(groupHtml).join(" ") : ""}</div>${manifest.get(s.id) ? `<div class="sc-in">${manifestHtml(s.id)}</div>` : ""}`;
    return `<div class="srow${textOnly ? " textonly" : ""}" data-stage="${esc(s.id)}">
      <div class="sc-badge">${badge(s.id)}</div>
      <div class="sc-plan">${planHtml}</div>${textOnly ? "" : `<div class="sc-art">${grs.map(groupHtml).join("")}</div>`}</div>`;
  }).join("");
  const uploadsRow = uploads.length ? `<div class="srow inputs"><div class="sc-badge">${badge("Inputs")}</div><div class="sc-plan"><div class="sc-agent">User uploads</div><div class="sc-intent">Files attached to the brief, registered in the Workspace before planning.</div></div><div class="sc-art">${groupsOf("Inputs").filter(gr => MEDIA.has(gr.role) || gr.role === "audio").map(groupHtml).join("")}</div></div>` : "";
  const table = div("steps", `left:${tableX}px;top:${y}px;width:${tableW}px`,
    `<div class="srow head"><div class="sc-badge">#</div><div class="sc-plan">PlanStep · Director's intent · <span class="mono">resolved inputs (label ← producing step)</span></div><div class="sc-art">Artifacts the Assistant persisted to the Workspace</div></div>${uploadsRow}${rows}`);
  y += table.offsetHeight;

  // 3. legend, world size
  const kinds = [...new Set(g.nodes.map(n => n.kind))];
  const lg = div("legend", `left:${M}px;top:${y + 8}px;width:${worldW - 2 * M}px`,
    kinds.map(k => `<span class="lg"><i style="background:${KCOL[k]}"></i>${k}</span>`).join("") +
    `<span class="lg edge"><i></i>arc = the later step consumed an artifact of the earlier one (resolved by the Assistant), colored by the producing step, dot at the consumer</span>` +
    (HI ? `<span class="lg hibox"><i></i>shot ${esc(HI)} through the pipeline</span>` : "") +
    `<span class="note">${g.nodes.length} artifacts · ${realEdges.length} resolved inputs · ${pairs.size} step-to-step connections${g.notes && /replay/i.test(g.notes.join(" ")) ? " · connections from replaying the Assistant's resolver over the archived Workspace" : ""}</span>`);
  const worldH = y + 8 + lg.offsetHeight + M;
  world.style.width = worldW + "px"; world.style.height = worldH + "px";
  edgesEl.setAttribute("width", worldW); edgesEl.setAttribute("height", worldH); edgesEl.style.width = worldW + "px"; edgesEl.style.height = worldH + "px";

  // 4. arcs in the left margin
  const NS = "http://www.w3.org/2000/svg";
  const rectOf = el => { const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height }; };
  const badgeY = new Map([...table.querySelectorAll(".srow[data-stage]")].map(r => { const b = rectOf(r.querySelector(".badge")); return [r.dataset.stage, b.y + b.h / 2]; }));
  const x0 = tableX - 4;
  const sorted = [...pairs.values()].sort((a, b) => spanOf(b) - spanOf(a));
  for (const p of sorted) {
    const y1 = badgeY.get(p.src), y2 = badgeY.get(p.to); if (y1 == null || y2 == null) continue;
    const h = ARC_BASE + ARC_STEP * spanOf(p), color = colorOf(p.src);
    const path = document.createElementNS(NS, "path"); path.setAttribute("d", `M${x0},${y1} C${x0 - h},${y1} ${x0 - h},${y2} ${x0},${y2}`); path.style.stroke = color; edgesEl.appendChild(path);
    const dot = document.createElementNS(NS, "circle"); dot.setAttribute("cx", x0); dot.setAttribute("cy", y2); dot.setAttribute("r", 2.6); dot.style.fill = color; edgesEl.appendChild(dot);
  }

  // 5. thumbnails at 3x display size, then ready
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
