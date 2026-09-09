/* ============================================================================
   FrameWorkers — creation-process canvas (process.html)
   Loads process/<key>/graph.json and lays it out as one column per agent step:
   a header card, then every asset that step produced.  Connections are the
   inputs each step consumed (node → column header) plus per-shot links between
   assets that share a shot id (node → node).  Pan / zoom / fit, click → lightbox.
   Dependency-free.
   ============================================================================ */
(() => {
  const $ = (id) => document.getElementById(id);
  const esc = (s) => String(s ?? "").replace(/[&<>"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
  const fmtDur = (s) => { if (!s && s !== 0) return ""; s = Math.round(s); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; };
  const fmtBytes = (b) => !b ? "" : b > 1e6 ? `${(b/1e6).toFixed(1)} MB` : `${Math.round(b/1e3)} KB`;
  const PLAY = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';

  // layout constants (world units = CSS px at zoom 1)
  const NODE_W = 236, COL_GAP = 150, NODE_GAP = 16, HEAD_H = 62, HEAD_GAP = 22, PAD = 80;
  const DOC_H = 150, AUDIO_H = 118;
  const SUB_GAP = 18;            // gap between sub-columns of one busy stage
  const MAX_COL_H = 8 * 190;     // a stage taller than this wraps into extra sub-columns

  const key = new URLSearchParams(location.search).get("film");
  if (!key) { $("pc-title").textContent = "No film selected"; return; }
  $("pc-play").href = `films.html?play=${encodeURIComponent(key)}`;

  fetch(`process/${key}/graph.json`, { cache: "no-cache" })
    .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
    .then(build)
    .catch(() => { $("pc-title").textContent = "Creation process not available for this film yet"; });

  function build(g) {
    document.title = `FrameWorkers — ${g.title} · creation process`;
    $("pc-title").textContent = g.title;
    $("pc-genre").textContent = `Creation process · ${g.genre || g.cat || ""}`;
    const notes = $("pc-notes");
    notes.innerHTML = (g.notes || []).map(n => `<div>${esc(n)}</div>`).join("") +
      `<span class="src"><b>${g.nodes.length}</b> assets · <b>${g.stages.length}</b> agent steps · source ${esc(g.source?.path || "")}</span>`;

    // ---- geometry -----------------------------------------------------------
    const nodesEl = $("nodes"), edgesEl = $("edges"), world = $("world"), stage = $("stage");
    const byId = new Map(g.nodes.map(n => [n.id, n]));
    const pos = new Map();      // id -> {x,y,w,h}
    const stagePos = new Map(); // stage id -> {x,y,w,h}
    const colY = [];            // running y per sub-column while packing a stage

    const nodeH = (n) => {
      if (n.kind === "image" || n.kind === "video") {
        const w = n.w || 16, h = n.h || 9;
        const mh = Math.round(NODE_W * Math.min(1.25, Math.max(0.42, h / w)));
        return mh + 52;
      }
      if (n.kind === "audio") return AUDIO_H;
      return DOC_H;
    };

    let x = PAD;
    const stages = [...g.stages].sort((a, b) => a.order - b.order);
    const frag = document.createDocumentFragment();
    for (const s of stages) {
      const list = g.nodes.filter(n => n.stage === s.id);
      // pack this stage's assets into as few sub-columns as keep it under MAX_COL_H
      const heights = list.map(nodeH);
      const total = heights.reduce((a, b) => a + b + NODE_GAP, 0);
      const cols = Math.max(1, Math.ceil(total / MAX_COL_H));
      const perCol = Math.ceil(list.length / cols);
      const stageW = cols * NODE_W + (cols - 1) * SUB_GAP;
      const y0 = PAD;
      stagePos.set(s.id, { x, y: y0, w: stageW, h: HEAD_H });
      const isInputs = s.id === "Inputs", isFinal = list.some(n => n.final);
      const head = document.createElement("div");
      head.className = `col-head${isInputs ? " is-inputs" : ""}${isFinal ? " is-final" : ""}`;
      head.style.cssText = `left:${x}px;top:${y0}px;width:${stageW}px;height:${HEAD_H}px`;
      head.dataset.stage = s.id;
      head.innerHTML = `<div class="ch-agent">${esc(isInputs ? "User inputs" : s.agent)}</div>
        <div class="ch-sub"><span>${esc(isInputs ? "what the pipeline was given" : s.label + " agent")}</span>
        ${s.step ? `<span class="ch-step">${esc(s.step.replace(/_[0-9a-f]{6,}$/, ""))}</span>` : ""}<span class="ch-n">${list.length} asset${list.length === 1 ? "" : "s"}</span></div>`;
      frag.appendChild(head);
      list.forEach((n, i) => {
        const c = Math.floor(i / perCol);
        const cx = x + c * (NODE_W + SUB_GAP);
        if (i % perCol === 0) colY[c] = y0 + HEAD_H + HEAD_GAP;
        const h = heights[i];
        pos.set(n.id, { x: cx, y: colY[c], w: NODE_W, h });
        frag.appendChild(renderNode(n, cx, colY[c], h));
        colY[c] += h + NODE_GAP;
      });
      x += stageW + COL_GAP;
    }
    nodesEl.appendChild(frag);
    const worldW = x - COL_GAP + PAD;
    const worldH = Math.max(...[...pos.values()].map(p => p.y + p.h), PAD) + PAD;
    edgesEl.setAttribute("width", worldW); edgesEl.setAttribute("height", worldH);
    edgesEl.style.width = worldW + "px"; edgesEl.style.height = worldH + "px";

    // ---- edges ------------------------------------------------------------------
    const inCount = new Map();
    const anchor = (id, side) => {
      const p = pos.get(id) || stagePos.get(id);
      if (!p) return null;
      if (side === "out") return { x: p.x + p.w, y: p.y + Math.min(p.h / 2, 40) };
      // spread arrivals along the target's left edge so they don't collapse into one point
      const k = (inCount.get(id) || 0); inCount.set(id, k + 1);
      const span = Math.min(p.h - 12, 44), yy = p.y + 6 + ((k * 7) % span);
      return { x: p.x, y: yy };
    };
    const path = (a, b) => {
      const dx = Math.max(60, (b.x - a.x) * 0.5);
      return `M${a.x},${a.y} C${a.x + dx},${a.y} ${b.x - dx},${b.y} ${b.x},${b.y}`;
    };
    const edgeEls = [];
    for (const e of g.edges) {
      const a = anchor(e.from, "out"), b = anchor(e.to, "in");
      if (!a || !b) continue;
      const p = document.createElementNS("http://www.w3.org/2000/svg", "path");
      p.setAttribute("d", path(a, b));
      p.setAttribute("class", `${e.type}${e.inferred ? " inferred" : ""}`);
      p.dataset.from = e.from; p.dataset.to = e.to;
      edgesEl.appendChild(p); edgeEls.push(p);
    }
    // hover a node: highlight everything wired to it
    const touches = (id) => new Set(edgeEls.filter(p => p.dataset.from === id || p.dataset.to === id)
      .flatMap(p => [p.dataset.from, p.dataset.to]));
    nodesEl.addEventListener("mouseover", (ev) => {
      const el = ev.target.closest(".node,.col-head"); if (!el) return;
      const id = el.dataset.id || el.dataset.stage;
      const related = touches(id);
      if (!related.size) return;
      edgesEl.classList.add("focus");
      edgeEls.forEach(p => p.classList.toggle("hi", p.dataset.from === id || p.dataset.to === id));
      nodesEl.querySelectorAll(".node").forEach(nd => nd.classList.toggle("hi", related.has(nd.dataset.id) && nd.dataset.id !== id));
    });
    nodesEl.addEventListener("mouseout", (ev) => {
      if (ev.target.closest(".node,.col-head") && !ev.relatedTarget?.closest?.(".node,.col-head")) {
        edgesEl.classList.remove("focus");
        edgeEls.forEach(p => p.classList.remove("hi"));
        nodesEl.querySelectorAll(".node.hi").forEach(nd => nd.classList.remove("hi"));
      }
    });

    // ---- pan / zoom ---------------------------------------------------------------
    let tx = 0, ty = 0, z = 1;
    const apply = () => { world.style.transform = `translate(${tx}px,${ty}px) scale(${z})`; $("hud-zoom").textContent = Math.round(z * 100) + "%"; };
    const fit = () => {
      const r = stage.getBoundingClientRect();
      z = Math.min(1, (r.width - 40) / worldW, (r.height - 40) / worldH);
      z = Math.max(0.08, z);
      tx = (r.width - worldW * z) / 2; ty = Math.max(20, (r.height - worldH * z) / 2);
      apply();
    };
    const zoomAt = (factor, cx, cy) => {
      const nz = Math.min(3, Math.max(0.08, z * factor));
      tx = cx - (cx - tx) * (nz / z); ty = cy - (cy - ty) * (nz / z); z = nz; apply();
    };
    stage.addEventListener("wheel", (ev) => {
      ev.preventDefault();
      const r = stage.getBoundingClientRect();
      const f = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0015));
      zoomAt(f, ev.clientX - r.left, ev.clientY - r.top);
    }, { passive: false });
    let drag = null;
    stage.addEventListener("pointerdown", (ev) => {
      if (ev.button !== 0 || ev.target.closest(".proc-hud,.proc-tip,.proc-notes")) return;
      // remember the pressed node here: with pointer capture the pointerup target is the stage itself
      drag = { x: ev.clientX, y: ev.clientY, tx, ty, moved: false, el: ev.target.closest(".node") };
      stage.classList.add("dragging"); stage.setPointerCapture(ev.pointerId);
    });
    stage.addEventListener("pointermove", (ev) => {
      if (!drag) return;
      const dx = ev.clientX - drag.x, dy = ev.clientY - drag.y;
      if (Math.abs(dx) + Math.abs(dy) > 3) drag.moved = true;
      tx = drag.tx + dx; ty = drag.ty + dy; apply();
    });
    const endDrag = (ev) => {
      if (!drag) return;
      const { moved, el } = drag; drag = null; stage.classList.remove("dragging");
      if (!moved && el) openModal(byId.get(el.dataset.id), g);
    };
    stage.addEventListener("pointerup", endDrag);
    stage.addEventListener("pointercancel", () => { drag = null; stage.classList.remove("dragging"); });
    // touch pinch
    let pinch = null;
    stage.addEventListener("touchstart", (ev) => { if (ev.touches.length === 2) pinch = { d: dist(ev.touches), z }; }, { passive: true });
    stage.addEventListener("touchmove", (ev) => {
      if (pinch && ev.touches.length === 2) {
        const r = stage.getBoundingClientRect();
        const cx = (ev.touches[0].clientX + ev.touches[1].clientX) / 2 - r.left, cy = (ev.touches[0].clientY + ev.touches[1].clientY) / 2 - r.top;
        const nz = Math.min(3, Math.max(0.08, pinch.z * dist(ev.touches) / pinch.d));
        tx = cx - (cx - tx) * (nz / z); ty = cy - (cy - ty) * (nz / z); z = nz; apply();
      }
    }, { passive: true });
    stage.addEventListener("touchend", () => { pinch = null; });
    const dist = (t) => Math.hypot(t[0].clientX - t[1].clientX, t[0].clientY - t[1].clientY);

    $("hud-plus").addEventListener("click", () => { const r = stage.getBoundingClientRect(); zoomAt(1.25, r.width / 2, r.height / 2); });
    $("hud-minus").addEventListener("click", () => { const r = stage.getBoundingClientRect(); zoomAt(0.8, r.width / 2, r.height / 2); });
    $("hud-fit").addEventListener("click", fit);
    $("hud-edges").addEventListener("click", (ev) => {
      const b = ev.currentTarget, on = b.getAttribute("aria-pressed") !== "true";
      b.setAttribute("aria-pressed", String(on)); edgesEl.classList.toggle("hidden", !on);
    });
    $("tip-x").addEventListener("click", () => $("tip").classList.add("off"));
    setTimeout(() => $("tip").classList.add("off"), 9000);
    window.addEventListener("resize", fit);
    document.addEventListener("keydown", (ev) => {
      if (ev.key === "Escape") closeModal();
      if (ev.key === "f" || ev.key === "F") fit();
      if (ev.key === "+" || ev.key === "=") $("hud-plus").click();
      if (ev.key === "-") $("hud-minus").click();
    });
    fit();
  }

  // ---- node card -------------------------------------------------------------------
  function renderNode(n, x, y, h) {
    const el = document.createElement("div");
    el.className = `node k-${n.kind}${n.final ? " is-final" : ""}`;
    el.style.cssText = `left:${x}px;top:${y}px;width:${NODE_W}px;height:${h}px`;
    el.dataset.id = n.id;
    const meta = [];
    if (n.w && n.h) meta.push(`${n.w} × ${n.h}`);
    if (n.dur) meta.push(fmtDur(n.dur));
    if (n.bytes && n.kind !== "image") meta.push(fmtBytes(n.bytes));
    if (n.shot && !/sh_\d{3}/.test(n.label)) meta.push(n.shot);
    let media = "";
    if (n.kind === "image") {
      media = `<div class="n-media" style="height:${h - 52}px"><img src="${esc(n.file)}" alt="${esc(n.label)}" loading="lazy" decoding="async"></div>`;
    } else if (n.kind === "video") {
      media = `<div class="n-media" style="height:${h - 52}px"><img src="${esc(n.poster || "")}" alt="" loading="lazy" decoding="async">
        ${n.final ? '<span class="n-final">Final film</span>' : (n.preview_only ? '<span class="n-preview">assembled cut</span>' : "")}
        ${n.file ? `<span class="n-play">${PLAY}</span>` : ""}${n.dur ? `<span class="n-dur">${fmtDur(n.dur)}</span>` : ""}</div>`;
    } else if (n.kind === "audio") {
      media = `<div class="n-wave" aria-hidden="true"></div>`;
    } else {
      media = `<div class="n-doc">${esc(n.excerpt || n.caption || "")}</div>`;
    }
    el.innerHTML = `${media}<div class="n-body"><div class="n-label"><span class="dot"></span><span class="t">${esc(n.label)}</span></div>
      <div class="n-meta">${esc(meta.join(" · ") || n.kind)}</div></div>`;
    return el;
  }

  // ---- lightbox --------------------------------------------------------------------
  const modal = $("modal");
  function openModal(n, g) {
    if (!n) return;
    const s = g.stages.find(s => s.id === n.stage);
    $("mm-stage").textContent = s ? (s.id === "Inputs" ? "User input" : `${s.agent}${s.step ? " · " + s.step.replace(/_[0-9a-f]{6,}$/, "") : ""}`) : "";
    $("mm-title").textContent = n.label;
    $("mm-caption").textContent = n.caption || "";
    const facts = [];
    facts.push(["kind", n.kind]);
    if (n.w && n.h) facts.push(["size", `${n.w} × ${n.h}`]);
    if (n.dur) facts.push(["duration", fmtDur(n.dur)]);
    if (n.bytes) facts.push(["original", fmtBytes(n.bytes)]);
    if (n.shot) facts.push(["shot", n.shot]);
    if (n.scope) facts.push(["scope", n.scope]);
    if (n.src_name) facts.push(["file", n.src_name]);
    $("mm-facts").innerHTML = facts.map(([k, v]) => `<dt>${esc(k)}</dt><dd>${esc(v)}</dd>`).join("");
    const open = $("mm-open"); open.href = n.file || "#"; open.style.display = n.file ? "" : "none";
    const m = $("modal-media"); m.innerHTML = "";
    if (n.kind === "image") m.innerHTML = `<img src="${esc(n.file)}" alt="${esc(n.label)}">`;
    else if (n.kind === "video" && n.file) m.innerHTML = `<video src="${esc(n.file)}" poster="${esc(n.poster || "")}" controls autoplay playsinline></video>`;
    else if (n.kind === "video") m.innerHTML = `<img src="${esc(n.poster || "")}" alt="">`;
    else if (n.kind === "audio") m.innerHTML = `<audio src="${esc(n.file)}" controls autoplay></audio>`;
    else {
      m.innerHTML = `<pre>Loading…</pre>`;
      fetch(n.file).then(r => r.text()).then(t => { m.firstChild.textContent = t; }).catch(() => { m.firstChild.textContent = "(could not load file)"; });
    }
    modal.classList.add("on"); modal.setAttribute("aria-hidden", "false");
  }
  function closeModal() {
    if (!modal.classList.contains("on")) return;
    modal.classList.remove("on"); modal.setAttribute("aria-hidden", "true");
    $("modal-media").innerHTML = "";
  }
  $("modal-x").addEventListener("click", closeModal);
  modal.addEventListener("click", (ev) => { if (ev.target === modal) closeModal(); });
})();
