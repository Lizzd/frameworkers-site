/* Paper figure v5 — "plan first, one module per agent" (after the paper's sample-run figure).
   Director band: user brief → Plan Thinking (the Director's PlanSteps: agent_id + intent) → Plan Stack chain.
   Assistant band: one tinted module per PlanStep (tint = that step's colour in the Plan Stack) listing the input
   labels it resolved from the Workspace (←n = producing step) and every artifact it persisted. Text-only steps show
   an excerpt of their real output. ?shot=sh_00N traces one shot in red (?shot=none disables); ?w= world width. */
(async function () {
  const Q = new URLSearchParams(location.search);
  const film = Q.get("film") || "little_calf";
  const WORLD_W = +(Q.get("w")) || 880;
  const g = await (await fetch(`/process/${film}/graph.json`, { cache: "no-cache" })).json();
  try { await Promise.all(["400", "600", "700", "800"].map(w => document.fonts.load(`${w} 12px InterFig`))); } catch (e) { /* fall back */ }

  const COLORS = ["#2563eb", "#0d9488", "#d97706", "#7c3aed", "#16a34a", "#db2777", "#0891b2", "#9333ea", "#65a30d", "#475569"];
  const IN_COLOR = "#a16207";
  const mix = (hex, a) => { const n = parseInt(hex.slice(1), 16), f = c => Math.round(c * a + 255 * (1 - a)); return `rgb(${f(n >> 16 & 255)},${f(n >> 8 & 255)},${f(n & 255)})`; };
  const esc = s => String(s ?? "").replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
  const fmtDur = d => { d = Math.round(d); return `${Math.floor(d / 60)}:${String(d % 60).padStart(2, "0")}`; };
  const camel = s => s.replace(/([a-z])([A-Z])/g, "$1<wbr>$2");
  const short = a => String(a).replace(/Agent$/, "");
  const ICON = {
    image: `<svg viewBox="0 0 16 16"><rect x="1.5" y="2.5" width="13" height="11" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><circle cx="5.5" cy="6" r="1.3" fill="currentColor"/><path d="M2.5 12.5l3.8-4 2.6 2.6 1.8-1.8 2.8 3.2" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/></svg>`,
    video: `<svg viewBox="0 0 16 16"><rect x="1.5" y="3" width="13" height="10" rx="1.5" fill="none" stroke="currentColor" stroke-width="1.4"/><path d="M6.5 5.8v4.4l3.8-2.2z" fill="currentColor"/></svg>`,
    text: `<svg viewBox="0 0 16 16"><path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M5.5 7.5h5M5.5 10h5M5.5 12.5h3" stroke="currentColor" stroke-width="1.2"/></svg>`,
    json: `<svg viewBox="0 0 16 16"><path d="M3.5 1.5h6l3 3v10h-9z" fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"/><path d="M7 7c-1 0-1 .6-1 1.2s0 1.2-.8 1.3c.8.1.8.7.8 1.3S6 12 7 12M9 7c1 0 1 .6 1 1.2s0 1.2.8 1.3c-.8.1-.8.7-.8 1.3S10 12 9 12" fill="none" stroke="currentColor" stroke-width="1.1"/></svg>`,
    audio: `<svg viewBox="0 0 16 16"><path d="M2 8h1.5M4.5 5v6M7 3v10M9.5 5.5v5M12 7v2M14 8h.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round"/></svg>`,
  };

  { // keep the run's own compositor output as the final film when the exporter also attached the published mp4
    const last = [...g.stages].sort((a, b) => a.order - b.order).slice(-1)[0].id;
    const site = g.nodes.find(n => n.id === "final_film" && n.stage === last);
    const own = g.nodes.find(n => n.stage === last && n.kind === "video" && n.id !== "final_film");
    if (site && own) { g.nodes = g.nodes.filter(n => n !== site); own.final = true; own.preview_only = false; g.edges = g.edges.filter(e => e.from !== site.id && e.to !== site.id); }
  }
  const stages = [...g.stages].sort((a, b) => a.order - b.order);
  const steps = stages.filter(s => s.id !== "Inputs");
  const stageById = new Map(stages.map(s => [s.id, s]));
  const colorOf = sid => sid === "Inputs" ? IN_COLOR : COLORS[(stageById.get(sid).order - 1) % COLORS.length];
  const nodeById = new Map(g.nodes.map(n => [n.id, n]));
  const shots = [...new Set(g.nodes.filter(n => n.shot).map(n => n.shot))].sort();
  const HI = Q.get("shot") === "none" ? null : (Q.get("shot") || (shots.length > 1 ? shots[Math.min(1, shots.length - 1)] : null));
  const badge = (sid, cls = "") => `<span class="badge${cls}" style="background:${colorOf(sid)}">${sid === "Inputs" ? "in" : stageById.get(sid).order}</span>`;

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
  const THUMB_ROLES = ["storyboard", "frame", "anchor", "ref", "clip", "video"];
  const VL = { storyboard: "storyboards", frame: "keyframes", anchor: "anchors", ref: "references", clip: "shot clips", video: "video" };
  const groupsOf = sid => {
    const by = new Map();
    for (const n of g.nodes.filter(n => n.stage === sid)) { const r = role(n); if (!by.has(r)) by.set(r, []); by.get(r).push(n); }
    return by;
  };
  const isTextOnly = sid => [...groupsOf(sid).keys()].every(r => ["json", "text", "prompt", "shotprompt", "other"].includes(r));

  // inputs each step resolved (label ← producing step)
  const realEdges = g.edges.filter(e => e.type === "step" && !e.inferred);
  const manifest = new Map();
  for (const e of realEdges) {
    const n = nodeById.get(e.from); if (!n || !e.labels) continue;
    const m = manifest.get(e.to) || new Map(); manifest.set(e.to, m);
    for (const l of e.labels) { const r = m.get(l) || { n: 0, from: new Set() }; r.n++; r.from.add(n.stage); m.set(l, r); }
  }
  const manifestHtml = sid => { const m = manifest.get(sid); if (!m) return ""; return [...m.entries()].map(([l, r]) =>
    `<span class="inchip">${esc(l).replace(/_/g, "_<wbr>")}${r.n > 1 ? `&thinsp;×${r.n}` : ""}&thinsp;←${[...r.from].map(f => badge(f, " sm")).join("")}</span>`).join(""); };

  const getJSON = async f => { try { const d = await (await fetch("/" + f)).json(); return d.content || d; } catch (e) { return null; } };
  const getText = async f => { try { return await (await fetch("/" + f)).text(); } catch (e) { return ""; } };
  const chip = (kind, label) => `<span class="chip">${ICON[kind] || ""}${esc(label)}</span>`;

  // story JSON (for shot timing and the narrative excerpt)
  const storyStep = steps.find(s => /Narrative|Explainer|Advertisement|Travelogue|NewsBroadcast|Adaptation|Story/.test(s.agent));
  const storyNode = storyStep && g.nodes.find(n => n.stage === storyStep.id && n.kind === "json");
  const story = storyNode ? await getJSON(storyNode.file) : null;
  const shotRange = (() => { if (!story || !HI) return null; let t = 0; for (const s of story.shots || []) { const d = +s.duration_s || 0; if (s.shot_id === HI) return [t, t + d]; t += d; } return null; })();

  // ---------- module bodies ----------
  const thumb = (n, extra = "") => `<div class="th${n.shot && n.shot === HI ? " hi" : ""}${extra}"><img src="/${esc(n.kind === "video" ? (n.poster || "") : n.file)}" alt="">` +
    `${n.shot ? `<span class="tag">${esc(n.shot)}</span>` : ""}${n.kind === "video" && n.dur ? `<span class="dur">${fmtDur(n.dur)}</span>` : ""}</div>`;

  async function textBody(s) {
    const json = g.nodes.find(n => n.stage === s.id && n.kind === "json");
    const by = groupsOf(s.id);
    if (s === storyStep && story) {
      const nch = (story.characters || []).length, nloc = (story.locations || []).length, ns = (story.shots || []).length;
      const durs = [...new Set((story.shots || []).map(x => +x.duration_s))];
      const hiShot = (story.shots || []).find(x => x.shot_id === HI);
      return `<div class="ex"><div class="ex-t"><span>“${esc(story.title || "")}”</span><span class="ex-src">${ICON.json}story JSON</span></div><div class="ex-p">${esc(story.logline || "")}</div>
          <div class="ex-m">${nch} characters · ${nloc} locations · ${ns} shots${durs.length === 1 ? ` × ${durs[0]} s` : ""}</div></div>
        ${hiShot ? `<div class="ex hi"><span class="ex-k">${esc(HI)}</span> ${esc(hiShot.narrative_purpose || "")}</div>` : ""}`;
    }
    if (/ShotPrompt/.test(s.agent)) {
      const pn = (by.get("shotprompt") || []).find(n => n.shot === HI) || (by.get("shotprompt") || [])[0];
      const txt = pn ? await getText(pn.file) : "";
      const sec = {}; let cur = null;
      for (const line of txt.split("\n")) { const m = line.match(/^\[(.+?)\]\s*$/); if (m) { cur = m[1]; sec[cur] = []; } else if (cur && line.trim()) sec[cur].push(line.trim()); }
      const first = k => (sec[k] || [])[0] || "";
      const style = (first("风格").match(/^[\x20-\x7E]+/) || [""])[0].replace(/[,，\s]+$/, "");
      const panels = (((sec["参考图"] || []).join(" ").match(/(\d+)\s*个分格/)) || [])[1];
      const beats = (sec["镜头"] || []).filter(l => /^镜头\d/.test(l)).length;
      const dia = (sec["对白"] || []).map(l => l.match(/([A-Za-z_]+)[：:]\s*[“"]([^”"]+)[”"]/)).filter(Boolean).map(m => `${m[1]}: “${m[2]}”`);
      const foley = (sec["音效"] || []).length;
      const noText = /无字幕/.test((sec["约束"] || []).join(""));
      const nsec = Object.keys(sec).length;
      const lines = [
        style && `<b>Style</b> ${esc(style)}`,
        `<b>Reference</b> storyboard sheet${panels ? `, ${panels} panels` : ""}`,
        (beats || foley) && `${beats ? `<b>Camera</b> ${beats} beats` : ""}${beats && foley ? " · " : ""}${foley ? `<b>Foley</b> ${foley} cues` : ""}`,
        dia.length && `<b>Dialogue</b> ${esc(dia.join("  "))}`,
        noText && `<b>Constraints</b> no on-screen text or subtitles`,
      ].filter(Boolean);
      const nPrompts = (by.get("shotprompt") || []).length;
      return `<div class="ex${pn && pn.shot === HI ? " hi" : ""}"><div class="ex-k">${esc(pn ? pn.shot : "")} prompt${nPrompts ? ` (1 of ${nPrompts})` : ""} · ${nsec} sections, abridged</div>${lines.map(l => `<div>${l}</div>`).join("")}</div>`;
    }
    if (/Transcription/.test(s.agent) && json) {
      const t = await getJSON(json.file); const segs = (t && t.segments) || [];
      const rows = segs.slice(0, 8).map(x => { const hi = shotRange && x.start_time >= shotRange[0] && x.start_time < shotRange[1];
        return `<div class="cue${hi ? " hi" : ""}"><span class="tc">${fmtDur(x.start_time)}</span>${esc(x.text)}</div>`; }).join("");
      return `<div class="ex cues"><div class="ex-src2">${ICON.json}subtitle JSON · ${segs.length} timed segments</div>${rows}</div>`;
    }
    return `<div class="ex">${esc((json && json.caption) || "")}</div>`;
  }

  async function mediaBody(s) {
    const by = groupsOf(s.id); let html = "", chips = [];
    for (const r of THUMB_ROLES) {
      const ns = by.get(r); if (!ns) continue;
      html += `<div class="grp"><div class="vl">${VL[r]}</div><div class="thumbs">${ns.map(n => thumb(n)).join("")}</div></div>`;
    }
    const fin = (by.get("final") || [])[0];
    if (fin) {
      const comp = g.nodes.find(n => n.stage === s.id && n.kind === "json");
      const cj = comp ? await getJSON(comp.file) : null, p = (cj && cj.plan) || {};
      const facts = [];
      if (p.output_resolution) facts.push(`${esc(p.output_resolution.replace("x", "×"))}${p.output_fps ? ` · ${p.output_fps} fps` : ""}`);
      if (p.subtitle_style && p.subtitle_style.burn_in) facts.push(`${p.subtitle_language === "en" ? "English s" : "S"}ubtitles burned in`);
      if (p.color_grade) facts.push("colour grade " + Object.entries(p.color_grade).filter(([, v]) => v).map(([k, v]) => `${k} ${v > 0 ? "+" : ""}${v}`).join(", "));
      html += `<div class="final"><div class="th big${fin.shot === HI ? " hi" : ""}"><img src="/${esc(fin.poster || "")}" alt=""><span class="pill">final film</span>${fin.dur ? `<span class="dur">${fmtDur(fin.dur)}</span>` : ""}</div>
        <div class="facts">${facts.map(f => `<div>${f}</div>`).join("")}</div></div>`;
    }
    const cut = (by.get("cut") || [])[0]; if (cut) chips.push(chip("video", `assembled cut${cut.dur ? " · " + fmtDur(cut.dur) : ""}`));
    const pr = by.get("prompt"); if (pr) chips.push(chip("text", `${pr.length} image prompts`));
    for (const a of by.get("audio") || []) chips.push(chip("audio", a.label));
    if (chips.length) html += `<div class="chips">${chips.join("")}</div>`;
    return html;
  }

  // ---------- DOM ----------
  const world = document.getElementById("world"), nodesEl = document.getElementById("nodes"), svg = document.getElementById("edges");
  world.style.width = WORLD_W + "px";
  const plan = g.plan || { steps: steps.map(s => ({ agent_id: s.agent, intent: "" })) };
  const planRows = plan.steps.map((st, i) => { const sid = steps[i] ? steps[i].id : null; const c = sid ? colorOf(sid) : "#6b7280";
    return `<div class="entry"><span class="k">"agent_id":</span> <span class="a" style="color:${c}">"${esc(st.agent_id)}"</span>, <span class="k">"intent":</span> "${esc(st.intent)}"</div>`; }).join("");
  const pills = steps.map((s, i) => `${i ? '<span class="arr">→</span>' : ""}<span class="pill" style="background:${mix(colorOf(s.id), .14)};border-color:${mix(colorOf(s.id), .6)}">${badge(s.id)}${esc(short(s.agent))}</span>`).join("");
  let html = `<div class="band dir" id="band-dir">
      <div class="band-title"><b>Director</b><span>reads the brief and the sub-agent catalog, then plans the whole pipeline up front</span></div>
      <div class="dir-top"><div class="card brief" id="brief"><h4>User brief</h4><p id="brief-p">${esc(g.prompt || "")}</p></div>
        <div class="card plan" id="plan"><span class="tab">Plan Thinking</span><h4>${plan.steps.length} PlanSteps</h4>${planRows}</div></div>
      <div class="stack"><span class="vlabel">Plan Stack</span>${pills}</div>
    </div>
    <div class="gap-v"></div>
    <div class="band as" id="band-as">
      <div class="band-title"><b>Assistant</b><span>runs each PlanStep: resolves its inputs from the Workspace (<i>in</i>: label ← producing step), runs the sub-agent, persists the artifacts</span></div>
      <div class="rows" id="rows">`;
  // pair a text-only step with the media step that follows it
  const mods = steps.map(s => ({ s, textOnly: isTextOnly(s.id) }));
  const rowsDef = []; for (let i = 0; i < mods.length;) { if (mods[i].textOnly && mods[i + 1] && !mods[i + 1].textOnly) { rowsDef.push([mods[i], mods[i + 1]]); i += 2; } else { rowsDef.push([mods[i]]); i += 1; } }
  for (const row of rowsDef) {
    html += `<div class="row">`;
    for (const m of row) {
      const s = m.s, c = colorOf(s.id), cls = row.length === 2 ? (m.textOnly ? "narrow" : "wide") : "full";
      const body = m.textOnly ? await textBody(s) : await mediaBody(s);
      const ins = manifestHtml(s.id);
      html += `<div class="mod ${cls}" data-stage="${esc(s.id)}" style="background:${mix(c, .075)};border-color:${mix(c, .6)}">
        <div class="mod-h" style="background:${mix(c, .17)}">${badge(s.id)}<span>${camel(short(s.agent))} Agent</span></div>
        ${ins ? `<div class="mod-in"><span class="lab">in</span>${ins}</div>` : ""}<div class="mod-b">${body}</div></div>`;
    }
    html += `</div>`;
  }
  html += `</div></div>`;
  const kinds = [...new Set(g.nodes.map(n => n.kind))].filter(k => ICON[k]);
  html += `<div class="legend">${kinds.map(k => `<span class="lg">${ICON[k]}${k === "json" ? "JSON" : k}</span>`).join("")}
    <span class="lg">${badge(steps[0].id, " sm")} ← producing step</span><span class="lg">each step also stores a JSON record</span>${HI ? `<span class="lg"><i class="hibox"></i>shot ${esc(HI)} through story, storyboard, prompt, clip and subtitles</span>` : ""}
    </div>`;   // the replay provenance is stated in the paper caption
  nodesEl.innerHTML = html;

  // brief: clamp to the Plan Thinking card's height
  { const b = document.getElementById("brief-p"), planEl = document.getElementById("plan"), briefEl = document.getElementById("brief");
    const lh = parseFloat(getComputedStyle(b).lineHeight) || 16; const avail = planEl.offsetHeight - (briefEl.offsetHeight - b.offsetHeight);
    const lines = Math.max(2, Math.floor(avail / lh)); b.style.webkitLineClamp = String(lines); b.style.maxHeight = (lines * lh) + "px"; }

  await Promise.all([...document.images].map(im => im.complete ? null : new Promise(r => { im.onload = im.onerror = r; })));

  // ---------- flow arrows ----------
  const W = world.offsetWidth, H = world.offsetHeight;
  svg.setAttribute("width", W); svg.setAttribute("height", H); svg.style.width = W + "px"; svg.style.height = H + "px";
  svg.innerHTML = `<defs><marker id="ah" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse"><path d="M0,0 L10,5 L0,10 z" fill="#6b7280"/></marker></defs>`;
  const R = el => { const r = el.getBoundingClientRect(), w = world.getBoundingClientRect(); return { x: r.left - w.left, y: r.top - w.top, w: r.width, h: r.height }; };
  const P = d => { const p = document.createElementNS("http://www.w3.org/2000/svg", "path"); p.setAttribute("d", d); p.setAttribute("marker-end", "url(#ah)"); svg.appendChild(p); };
  { const b = R(document.getElementById("brief")), p = R(document.getElementById("plan")); const y = b.y + b.h / 2; P(`M${b.x + b.w + 3},${y} L${p.x - 3},${y}`); }
  { const d = R(document.getElementById("band-dir")), a = R(document.getElementById("band-as")); const x = d.x + d.w / 2; P(`M${x},${d.y + d.h + 1} L${x},${a.y - 2}`); }
  const modEls = [...document.querySelectorAll(".mod")];
  for (let i = 0; i + 1 < modEls.length; i++) {
    const a = R(modEls[i]), b = R(modEls[i + 1]);
    if (Math.abs(a.y - b.y) < 2) { const y = a.y + 14; P(`M${a.x + a.w + 3},${y} L${b.x - 3},${y}`); }       // same row: header to header
    else { const ym = (a.y + a.h + b.y) / 2, xa = a.x + a.w / 2, xb = b.x + b.w / 2; P(`M${xa},${a.y + a.h + 1} L${xa},${ym} L${xb},${ym} L${xb},${b.y - 2}`); }
  }

  // ---------- thumbnails at 3x display size (keeps the PDF small) ----------
  for (const im of [...document.images]) {
    if (!im.naturalWidth) continue;
    const w = Math.max(1, Math.round(im.clientWidth * 3)), h = Math.max(1, Math.round(im.clientHeight * 3));
    if (im.naturalWidth <= w && im.naturalHeight <= h) continue;
    const cv = document.createElement("canvas"); cv.width = w; cv.height = h;
    const sc = Math.max(w / im.naturalWidth, h / im.naturalHeight), sw = w / sc, sh = h / sc;
    cv.getContext("2d").drawImage(im, (im.naturalWidth - sw) / 2, (im.naturalHeight - sh) / 2, sw, sh, 0, 0, w, h);
    cv.style.cssText = "display:block;width:100%;height:100%"; im.replaceWith(cv);
  }
  window.__READY = { w: world.offsetWidth, h: world.offsetHeight };
})();
