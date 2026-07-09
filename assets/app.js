/* ============================================================================
   FrameWorkers demo site — shared behaviour (DEMOS data, portfolio filter,
   fake "generation" overlay → player).  Page-aware via <body data-page="…">.
   Dependency-free, offline.  Edit the 5 films in the DEMOS array below.
   ============================================================================ */

/* ============================ EDIT YOUR DEMOS HERE ============================ */
const DEMOS = [
  {
    key:"sorting_hat", title:"The Crown of Ash",
    genre:"3D · Dark Fantasy", cat:"3D",
    prompt:"On the night the castle finally falls, the thousand-year-old Sorting Hat is lowered onto the last trembling first-year — but for the first time in a thousand years it refuses to name a house, sensing the darkness this child will one day become, and the old headmaster quietly lifts it away, leaving the child alone in the emptied hall: the very abandonment that will forge the monster. Stylized 3D cartoon animation (Pixar / DreamWorks look — clearly animated, non-photoreal), with English narration and English dialogue, English subtitles, and distant siege blasts, cracking stone, and foley.",
    src:"videos/sorting_hat.mp4", poster:"posters/sorting_hat.jpg",
  },
  {
    key:"peking", title:"The Empty Stage",
    genre:"3D · 1937 Wartime", cat:"3D",
    prompt:"On the eve of Wuhan's fall in 1937, after his final curtain call of 'Farewell My Concubine,' an old Peking opera master tells his apprentice one last thing. Stylized 3D animation, with Chinese narration and Chinese dialogue, English subtitles, and foley.",
    src:"videos/peking.mp4", poster:"posters/peking.jpg",
  },
  {
    key:"last_train", title:"Paper Boat in the Black Window",
    genre:"2D Anime · Occult", cat:"2D",
    prompt:"On the last midnight train rattling toward the city, a lone teenage exorcist moves down the swaying carriage to bind the vengeful spirit coiled around a sleeping passenger before the terminus — but in the black window-glass she sees the truth, that it is only a drowned child clinging to the one stranger who resembles its mother, and in the seconds before the doors open she must choose whether to seal it away forever or let it ride one more stop. Stylized 2D hand-drawn anime (modern dark-fantasy anime look — clearly hand-drawn, non-photoreal), with Japanese narration and Japanese dialogue, English subtitles, and rattling rails, the hum of failing fluorescents, snapping paper talismans, and foley.",
    src:"videos/last_train.mp4", poster:"posters/last_train.jpg",
  },
  {
    key:"luchen", title:"Shatter",
    genre:"Donghua · Xianxia", cat:"2D",
    prompt:"《Shatter · Episode 1》— a xianxia cultivation short. On a late-Tang night at a ruined mountain-sect outpost, white-haired Lu Chen — the last name left on his clan's sect rolls — can raise only a wick-thin thread of white spirit-energy. On the triennial spirit-test, a green-aura enforcer forces his palm onto the lone jade testing-disc; it flickers and dies. The enforcer brands his spirit-root 'dead ash,' seizes his wrist, and a clash of energies blasts him through the wall — his glass-like spirit-core, webbed with cracks, shatters. But the blow's residual force also slays a bone-jackal demon lurking in the yard, and its cracked, crimson demon-core answers his blood, filling the 'cripple's' palm with a red light that belongs to no orthodox path. Stylized 2D hand-drawn Chinese animation (donghua — clean ink lines, thick painterly color, dark cinematic illustration, non-photoreal, non-3D), Lu Chen's first-person inner monologue and the enforcer's dialogue in Mandarin, Chinese subtitles, and foley.",
    src:"videos/luchen.mp4", poster:"posters/luchen.jpg",
  },
  {
    key:"saiweng", title:"Blessing in Disguise",
    genre:"Ink-wash · Fable", cat:"Ink & Comic",
    prompt:"On the northern frontier below the Great Wall, an old man's prized horse vanishes one night; the neighbors come to console him, and he only says lightly, 'How do you know this isn't a blessing?' Months later the horse returns leading a herd of wild steppe horses — they congratulate him, and he says it may yet be a misfortune; his son, riding the new horse, is thrown and breaks his leg — they console him, and he still says it may yet be a blessing; soon the nomads invade, nine of every ten village youths die in battle, but his lame son is spared conscription, and father and son remain together: four turns of fortune and misfortune intertwined, all passing across the old man's ever-calm face. Traditional Chinese xieyi ink-wash painting (vast negative space, graded ink washes, the breath of a handscroll — hand-painted ink, non-photoreal), a storyteller's Chinese narration over minimal dialogue, English subtitles, with frontier wind, hoofbeats, distant war drums, a lone reed-pipe cry, and foley.",
    src:"videos/saiweng.mp4", poster:"posters/saiweng.jpg",
  },
  {
    key:"sherlock", title:"The Blue Wax at the Keyhole",
    genre:"Graphic-novel · Mystery", cat:"Ink & Comic",
    prompt:"In a gas-lit Victorian study bolted from the inside, a gentleman is found dead and Scotland Yard calls it suicide — but Holmes reads the clues, proves it was murder, and names the killer: the victim's private secretary, who faked the locked room. Richly colored graphic-novel illustration, English dialogue (no narration), English subtitles, and foley.",
    src:"videos/sherlock.mp4", poster:"posters/sherlock.jpg",
  },
  {
    key:"psa", title:"Don't Gamble on a Bite",
    genre:"Explainer · Public Health", cat:"Explainer",
    prompt:"A health-education PSA. After a cat or dog bite or scratch, don't count on luck and don't delay: (1) immediately rinse the wound thoroughly under running water with soap, (2) get to a clinic as soon as possible, (3) let a doctor assess the exposure risk, and (4) complete rabies post-exposure prophylaxis as directed — the vaccine, plus immunoglobulin if needed. Clean, gentle, professional 2D medical-explainer animation (flat, clear shapes, soft blue-green palette, symbolic — no gore, no on-screen text), Chinese narration, Chinese subtitles, and foley.",
    src:"videos/psa.mp4", poster:"posters/psa.jpg",
  },
  {
    key:"tortoise", title:"The Tortoise and the Hare",
    genre:"Storybook · Fable", cat:"Storybook",
    prompt:"Make a gentle illustrated children's bedtime picture book of the classic fable 'The Tortoise and the Hare'. Tell it page by page — one warm, simple read-aloud line per page — in a soft watercolor storybook style, narrated aloud for a young child, with the read-along words shown on screen.",
    src:"videos/tortoise.mp4", poster:"posters/tortoise.jpg",
  },
];

// which films appear in the Home "Featured films" row (keys, visually diverse)
const FEATURED = ["sorting_hat","luchen","sherlock"];

// fake "generation" overlay length, ms (0 = jump straight to playback)
const FAKE_GENERATE_MS = 2600;

// The plan the Director composes depends on the input/goal — different film TYPES
// run different agent chains (grounded in the real runs):
//   cinematic = Story → Keyframe Sheet → Shot Prompt → Clip(Seedance) → Audio+Compositor
//   explainer = Explainer → Keyframe Sheet → Shot Prompt → Clip → Narration+Compositor
//   storybook = Storybook → Illustration → Narrator → Compositor  (no Seedance clips)
const STAGE_SETS = {
  cinematic: [
    "Director · planning this pipeline",
    "Story · characters, world & beats",
    "Keyframe Sheet · identity anchors & storyboards",
    "Shot Prompt · cinematic per-shot direction",
    "Clip · rendering shots (Seedance 2.0, native foley)",
    "Audio + Compositor · voice, score, mix & final cut",
  ],
  explainer: [
    "Director · planning this pipeline",
    "Explainer · grounded script & shot plan",
    "Keyframe Sheet · style anchors & storyboards",
    "Shot Prompt · per-shot direction",
    "Clip · rendering shots (Seedance 2.0)",
    "Narration + Compositor · scripted voice-over, subtitles & cut",
  ],
  storybook: [
    "Director · planning this pipeline",
    "Storybook · page-by-page read-aloud script",
    "Illustration · watercolor picture-book pages",
    "Narrator · read-aloud voice-over",
    "Compositor · slideshow, read-along captions & mix",
  ],
};
function stagesFor(d){
  if (d && d.cat === "Storybook") return STAGE_SETS.storybook;
  if (d && d.cat === "Explainer") return STAGE_SETS.explainer;
  return STAGE_SETS.cinematic;
}
/* ============================================================================= */

const PLAY_SVG  = '<svg viewBox="0 0 24 24"><path d="M8 5v14l11-7z"/></svg>';
const CHECK_SVG = '<svg viewBox="0 0 24 24"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z"/></svg>';
const ARROW_SVG = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12h14M13 6l6 6-6 6"/></svg>';

const $ = (id)=>document.getElementById(id);
const byKey = (k)=>DEMOS.find(d=>d.key===k);
const esc = (s)=>String(s).replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));

/* ---------------------------------------------------------------- generation */
let genTimers = [];
function clearGenTimers(){ genTimers.forEach(clearTimeout); genTimers = []; }

function ensureGenOverlay(){
  if ($("gen")) return;
  const el = document.createElement("div");
  el.className = "gen"; el.id = "gen"; el.setAttribute("aria-hidden","true");
  el.innerHTML = `
    <div class="gen-card">
      <div class="glow"></div>
      <div class="gen-h"><span class="spinner"></span><span>Directing your film…</span></div>
      <div class="gen-sub" id="genSub">Reading your intent…</div>
      <div class="bar"><i id="barFill"></i></div>
      <ul class="stages" id="stages"></ul>
      <div class="gen-note">This is the plan the Director composed for this prompt — different inputs get a different plan and crew.</div>
    </div>`;
  document.body.appendChild(el);
}

function runGeneration(stages, done){
  ensureGenOverlay();
  if (FAKE_GENERATE_MS <= 0){ done(); return; }
  const gen = $("gen"), barFill = $("barFill"), genSub = $("genSub"), stagesEl = $("stages");
  // rebuild the stage list for THIS film's plan (varies by film type)
  stagesEl.innerHTML = stages.map(s=>`<li><span class="tick">${CHECK_SVG}</span><span>${s}</span></li>`).join("");
  const stageItems = [...stagesEl.children];
  gen.classList.add("on"); gen.setAttribute("aria-hidden","false");
  barFill.style.width = "0%";
  genSub.textContent = "Reading your intent…";
  const n = stageItems.length, step = FAKE_GENERATE_MS / n;
  for (let k=0;k<n;k++){
    genTimers.push(setTimeout(()=>{
      stageItems.forEach((li,idx)=>{ li.classList.toggle("done", idx<k); li.classList.toggle("active", idx===k); });
      genSub.textContent = stages[k];
      barFill.style.width = Math.round(((k+1)/n)*100) + "%";
    }, Math.round(step*k)));
  }
  genTimers.push(setTimeout(()=>{
    stageItems.forEach(li=>{li.classList.remove("active");li.classList.add("done");});
    barFill.style.width = "100%"; genSub.textContent = "Done — rolling film";
  }, FAKE_GENERATE_MS - 120));
  genTimers.push(setTimeout(()=>{
    gen.classList.remove("on"); gen.setAttribute("aria-hidden","true"); done();
  }, FAKE_GENERATE_MS));
}

/* ------------------------------------------------------------------- portfolio */
function filmCard(d){
  return `
    <button class="film-card" data-key="${d.key}" aria-label="Generate: ${esc(d.title)}">
      <div class="ph" style="background-image:url('${d.poster}')">
        <span class="cat">${esc(d.cat)}</span>
        <span class="play-fab">${PLAY_SVG}</span>
      </div>
      <div class="body">
        <div class="ttl">${esc(d.title)}</div>
        <div class="desc">${esc(d.prompt)}</div>
        <div class="go">Generate this film ${ARROW_SVG}</div>
      </div>
    </button>`;
}

function initPortfolio(){
  const grid = $("grid"), filtersEl = $("filters");
  const player = $("player"), video = $("video");
  if (!grid) return;

  // filters
  const cats = ["All", ...[...new Set(DEMOS.map(d=>d.cat))]];
  let active = "All";
  filtersEl.innerHTML = cats.map((c,i)=>
    `<button class="pill${i===0?' active':''}" data-cat="${c}">${esc(c)}</button>`).join("");
  filtersEl.addEventListener("click", e=>{
    const b = e.target.closest(".pill"); if(!b) return;
    active = b.dataset.cat;
    [...filtersEl.children].forEach(p=>p.classList.toggle("active", p.dataset.cat===active));
    renderGrid();
  });
  function renderGrid(){
    const list = active==="All" ? DEMOS : DEMOS.filter(d=>d.cat===active);
    grid.innerHTML = list.map(filmCard).join("");
  }
  renderGrid();

  grid.addEventListener("click", e=>{
    const b = e.target.closest(".film-card"); if(!b) return;
    play(b.dataset.key);
  });

  function showList(on){
    $("portfolio-head").style.display = on ? "" : "none";
    filtersEl.style.display = on ? "" : "none";
    grid.style.display = on ? "" : "none";
    player.classList.toggle("on", !on);
  }
  function play(key){
    const d = byKey(key); if(!d) return;
    runGeneration(stagesFor(d), ()=>{
      $("pgenre").textContent = d.genre;
      $("ptitle").textContent = d.title;
      $("pprompt").textContent = d.prompt;
      video.src = d.src; video.poster = d.poster; video.muted = false;
      showList(false);
      window.scrollTo({top:0, behavior:"smooth"});
      video.load();
      const p = video.play(); if (p && p.catch) p.catch(()=>{});
    });
  }
  function back(){
    clearGenTimers();
    video.pause(); video.removeAttribute("src"); video.load();
    showList(true);
    window.scrollTo({top:0, behavior:"smooth"});
  }
  $("back").addEventListener("click", back);
  $("replay").addEventListener("click", ()=>{ video.currentTime=0; video.play(); });
  document.addEventListener("keydown", e=>{ if(e.key==="Escape" && player.classList.contains("on")) back(); });

  // deep-link from Home: films.html?play=<key>
  const want = new URLSearchParams(location.search).get("play");
  if (want && byKey(want)) play(want);
}

/* -------------------------------------------------------------------- home */
function initHome(){
  const wrap = $("featured"); if (!wrap) return;
  wrap.innerHTML = FEATURED.map(k=>byKey(k)).filter(Boolean).map(d=>`
    <a class="work-card" href="films.html?play=${d.key}" aria-label="${esc(d.title)}">
      <div class="ph" style="background-image:url('${d.poster}')">
        <span class="play-fab">${PLAY_SVG}</span>
        <div class="meta"><span class="cat">${esc(d.cat)}</span><div class="ttl">${esc(d.title)}</div></div>
      </div>
    </a>`).join("");
}

/* -------------------------------------------------------------------- boot */
document.addEventListener("DOMContentLoaded", ()=>{
  const page = document.body.dataset.page;
  if (page === "home") initHome();
  if (page === "films") initPortfolio();
});
