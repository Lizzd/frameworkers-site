#!/usr/bin/env python3
"""
Export per-film "creation process" packs for process.html.

    python tools/export_process.py                # all films in SOURCES
    python tools/export_process.py martin sorting_hat
    python tools/export_process.py --force ...    # re-encode derivatives even if present

For every film key this writes

    process/<key>/graph.json        nodes (every asset the run produced) + stages (one per
                                    agent step) + edges (which asset each step consumed)
    process/<key>/media/*           downscaled derivatives: images -> JPEG <=1280px,
                                    videos -> 360p H.264, audio -> 96k MP3, text/json copied

Sources are read from the FrameWorkers checkout and are never modified.  The final film
itself is NOT copied: graph.json points at the videos/<key>.mp4 already served by the site.

Two source layouts are understood:

  * "workspace"  a Director run — <ws>/global_memory.md is the artifact index (caption,
                 producer agent_id + step_id, path, mime).  If a sibling run_*/04_executions.json
                 exists (dumped by scripts/run_e2e_with_uploaded_image.py) the edges are the
                 REAL resolved inputs of each step; otherwise they are inferred from the agents'
                 input contracts and flagged inferred=true (drawn dashed).
  * "subrun"     an early sub_agents/pipeline.py run dir (user_goal.txt / story.json /
                 keyframes.json / prompts / videos / narration).  Edges are structural — that
                 pipeline is a fixed sequence — and flagged structural.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import os
import re
import shutil
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

from PIL import Image

SITE = Path(__file__).resolve().parent.parent
FW = Path(os.environ.get("FW_ROOT", Path.home() / "FrameWorkers"))
OUT = SITE / "process"

IMG_MAX = 1280
IMG_Q = 82
VID_H = 360
VID_CRF = 28
POSTER_W = 480
AUD_KBPS = 96

# ----------------------------------------------------------------------------- sources
# key -> (type, path relative to FW, exact) ; exact=False means the site's final mp4 is a
# re-encode/trim of this workspace's compositor output (matched by duration, not bytes).
# Internal bookkeeping only — nothing about it is written to graph.json or shown on the page.
SOURCES: dict[str, tuple[str, str, bool]] = {
    # early cine chain (sub_agents/pipeline.py)
    "sorting_hat":   ("subrun", "sub_agents/runs/sorting_hat_last_01", True),
    "peking":        ("subrun", "sub_agents/runs/peking_opera_1937_3d", True),
    "last_train":    ("subrun", "sub_agents/runs/last_train_anime_01", True),
    "luchen":        ("subrun", "sub_agents/runs/luchen_shatter_01_v5", True),
    "saiweng":       ("subrun", "sub_agents/runs/saiweng_lost_horse_01", True),
    "sherlock":      ("subrun", "sub_agents/runs/sherlock_locked_study_03", True),
    "psa":           ("subrun", "sub_agents/runs/rabies_psa_01", True),
    # Director workspaces
    "space_blockade":    ("workspace", "Runtime/kfsheet_topic17_outputs/workspace_global_20260715_025252", True),
    "tech_anchor":       ("workspace", "Runtime/topic12_anchor/workspace_global_20260730_121744", True),
    "octopus":           ("workspace", "Runtime/topic13_podcast/workspace_global_20260727_173842", True),
    "bridge":            ("workspace", "Runtime/topic14_bridge/workspace_global_20260803_172357", False),
    "vents":             ("workspace", "Runtime/topic16_vents/workspace_global_20260803_120643", False),
    "ember_oak":         ("workspace", "Runtime/topic19_coffee_ad/workspace_global_20260720_183931", True),
    "martin":            ("workspace", "Runtime/topic21_martin/workspace_global_20260722_200009", True),
    "northspur":         ("workspace", "Runtime/topic22_northspur/workspace_global_20260803_123754", False),
    "kurve":             ("workspace", "Runtime/topic24_kurve_ad/workspace_global_20260721_103757", True),
    "iceland_aerial":    ("workspace", "Runtime/topic26_iceland/workspace_global_20260728_143920", True),
    "ugly_duckling":     ("workspace", "Runtime/topic28_ugly_duckling/workspace_global_20260720_102704", True),
    "magi":              ("workspace", "Runtime/topic37_magi/workspace_global_20260722_100641", False),
    "reel_travel":       ("workspace", "Runtime/topic42_highlight/workspace_global_20260803_115220", False),
    "restored_newsreel": ("workspace", "Runtime/topic43_restore/workspace_global_20260727_185647", False),
    "kestrel":           ("workspace", "Runtime/topic44_kestrel/workspace_global_20260804_125051", False),
    "video_extend":      ("workspace", "Runtime/video_extend_lasttrain2_outputs/workspace_global_20260713_114256", True),
    "orpheus":           ("workspace", "Runtime/orpheus_nanopro_outputs/workspace_global_20260711_124855", True),
    "poem_recital":      ("workspace", "Runtime/topic10_fixed_outputs/workspace_global_20260711_123603", True),
    "tortoise":          ("workspace", "Runtime/storybook_e2e_outputs/workspace_global_20260709_154842", True),
    "little_calf":       ("workspace", "Runtime/topic45_little_calf_en/workspace_global_20260911_130430", True),
}

# Inferred input contracts, used ONLY when no 04_executions.json exists for a workspace.
# consumer agent (substring match) -> list of (producer agent substring | "Inputs", kind filter | None)
INFERRED_INPUTS: list[tuple[str, list[tuple[str, str | None]]]] = [
    ("IntakeImage",   [("Inputs", "image")]),
    ("IntakeVideo",   [("Inputs", "video")]),
    ("IntakeAudio",   [("Inputs", "audio")]),
    ("BriefEnricher", [("Inputs", "json"), ("Inputs", "text"), ("Intake", "json")]),
    ("KeyframeSheet", [("BriefEnricher", "json"), ("Narrative", "json"), ("Explainer", "json"), ("Advertisement", "json"),
                       ("Travelogue", "json"), ("NewsBroadcast", "json"), ("Adaptation", "json"), ("Inputs", "image")]),
    ("ShotPrompt",    [("KeyframeSheet", "json"), ("KeyframeSheet", "image"), ("Narrative", "json"), ("Explainer", "json"),
                       ("Advertisement", "json"), ("Travelogue", "json"), ("NewsBroadcast", "json"), ("Adaptation", "json")]),
    ("ClipAgent",     [("ShotPrompt", "text"), ("KeyframeSheet", "image")]),
    ("Illustration",  [("Narration", "json"), ("Storybook", "json"), ("Inputs", "image")]),
    ("Voiceover",     [("Explainer", "json"), ("Advertisement", "json"), ("NewsBroadcast", "json"), ("Travelogue", "json")]),
    ("Narrator",      [("Narration", "json"), ("Storybook", "json"), ("Inputs", "audio")]),
    ("Music",         [("Narration", "json"), ("Storybook", "json")]),
    ("Ambience",      [("Narration", "json"), ("Storybook", "json")]),
    ("VideoAnalysis", [("IntakeVideo", "json"), ("Inputs", "video")]),
    ("Highlight",     [("VideoAnalysis", "json"), ("Inputs", "video"), ("Inputs", "json")]),
    ("Upscale",       [("Inputs", "video")]),
    ("VideoExtend",   [("Inputs", "video"), ("IntakeVideo", "json")]),
    ("Transcription", [("ClipAgent", "video"), ("Narrator", "audio"), ("Voiceover", "audio"), ("Highlight", "video"), ("Upscale", "video")]),
    ("AudioMix",      [("Narrator", "audio"), ("Voiceover", "audio"), ("Music", "audio"), ("Ambience", "audio"),
                       ("Inputs", "audio"), ("ClipAgent", "video"), ("Highlight", "video")]),
    ("Compositor",    [("ClipAgent", "video"), ("Highlight", "video"), ("Upscale", "video"), ("Illustration", "image"),
                       ("AudioMix", "audio"), ("Narrator", "audio"), ("Transcription", "json"), ("Inputs", "image")]),
    # brains (any brain consumes the enriched brief, else the raw brief + intake descriptions)
    ("Narrative",     [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
    ("Explainer",     [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
    ("Advertisement", [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
    ("Travelogue",    [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
    ("NewsBroadcast", [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
    ("Adaptation",    [("BriefEnricher", "json"), ("Inputs", "json"), ("Inputs", "text"), ("Intake", "json")]),
    ("NarrationAgent",[("BriefEnricher", "json"), ("Inputs", "json"), ("Inputs", "text"), ("Intake", "json")]),
    ("Storybook",     [("BriefEnricher", "json"), ("Inputs", "json"), ("Intake", "json")]),
]

SHOT_RE = re.compile(r"(sh_\d{3})")


# ----------------------------------------------------------------------------- helpers
def log(*a):
    print("[export]", *a, flush=True)


def md5(p: Path) -> str:
    h = hashlib.md5()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def run(cmd: list[str]) -> str:
    return subprocess.run(cmd, check=True, capture_output=True, text=True).stdout


def ffprobe(p: Path) -> dict:
    out = run(["ffprobe", "-v", "error", "-show_entries", "stream=width,height,codec_type",
               "-show_entries", "format=duration", "-of", "json", str(p)])
    j = json.loads(out)
    w = h = None
    for s in j.get("streams", []):
        if s.get("codec_type") == "video" and s.get("width"):
            w, h = s["width"], s["height"]
            break
    dur = float(j.get("format", {}).get("duration") or 0)
    return {"w": w, "h": h, "dur": round(dur, 2)}


def kind_of(mime: str, name: str) -> str:
    n = name.lower()
    if mime.startswith("image/") or n.endswith((".png", ".jpg", ".jpeg", ".webp")):
        return "image"
    if mime.startswith("video/") or n.endswith((".mp4", ".mov", ".webm")):
        return "video"
    if mime.startswith("audio/") or n.endswith((".wav", ".mp3", ".m4a", ".ogg")):
        return "audio"
    if mime == "application/json" or n.endswith(".json"):
        return "json"
    return "text"


def slug(s: str) -> str:
    return re.sub(r"[^a-z0-9]+", "_", s.lower()).strip("_") or "asset"


def clean_stem(name: str) -> str:
    stem = Path(name).stem
    stem = re.sub(r"^step_\d+_[0-9a-f]{6,}_", "", stem)      # workspace artifact prefix
    stem = re.sub(r"^\d{8}_\d{6}_\d+_", "", stem)            # upload timestamp prefix
    stem = re.sub(r"^brief_\d{8}_\d{6}_\d+$", "creative_brief", stem)
    stem = re.sub(r"^img_", "", stem)
    return stem


def pretty_label(stem: str) -> str:
    m = re.match(r"^(\w+?)agent_exec_\d+$", stem)
    if m:
        return f"{m.group(1).capitalize()} output"
    return stem.replace("_", " ")


def excerpt_of(kind: str, p: Path, limit: int = 320) -> str:
    try:
        if kind == "json":
            d = json.loads(p.read_text(encoding="utf-8"))
            d = d.get("content", d) if isinstance(d, dict) else d
            s = json.dumps(d, ensure_ascii=False)
        elif kind == "text":
            s = p.read_text(encoding="utf-8", errors="replace")
        else:
            return ""
    except Exception:
        return ""
    s = re.sub(r"\s+", " ", s).strip()
    return s[:limit] + ("…" if len(s) > limit else "")


class Deriver:
    """Writes downscaled derivatives into process/<key>/media (idempotent)."""

    def __init__(self, media_dir: Path, force: bool):
        self.dir = media_dir
        self.force = force
        self.dir.mkdir(parents=True, exist_ok=True)

    def _fresh(self, dst: Path) -> bool:
        return dst.exists() and dst.stat().st_size > 0 and not self.force

    def image(self, src: Path, nid: str) -> tuple[str, int, int]:
        dst = self.dir / f"{nid}.jpg"
        with Image.open(src) as im:
            w, h = im.size
            if not self._fresh(dst):
                im2 = im.convert("RGB")
                im2.thumbnail((IMG_MAX, IMG_MAX))
                im2.save(dst, "JPEG", quality=IMG_Q, optimize=True)
        return dst.name, w, h

    def poster(self, src: Path, nid: str, at: float = 0.5) -> str:
        dst = self.dir / f"{nid}_poster.jpg"
        if not self._fresh(dst):
            run(["ffmpeg", "-v", "error", "-y", "-ss", str(at), "-i", str(src), "-frames:v", "1",
                 "-vf", f"scale={POSTER_W}:-2", "-q:v", "4", str(dst)])
        return dst.name

    def video(self, src: Path, nid: str) -> str:
        dst = self.dir / f"{nid}.mp4"
        if not self._fresh(dst):
            run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vf", f"scale=-2:{VID_H}",
                 "-c:v", "libx264", "-crf", str(VID_CRF), "-preset", "medium", "-pix_fmt", "yuv420p",
                 "-c:a", "aac", "-b:a", "64k", "-movflags", "+faststart", str(dst)])
        return dst.name

    def audio(self, src: Path, nid: str) -> str:
        dst = self.dir / f"{nid}.mp3"
        if not self._fresh(dst):
            run(["ffmpeg", "-v", "error", "-y", "-i", str(src), "-vn", "-c:a", "libmp3lame",
                 "-b:a", f"{AUD_KBPS}k", str(dst)])
        return dst.name

    def text(self, src: Path, nid: str, kind: str) -> str:
        ext = ".json" if kind == "json" else (src.suffix if src.suffix in (".txt", ".srt", ".md", ".ass") else ".txt")
        dst = self.dir / f"{nid}{ext}"
        if not self._fresh(dst):
            if kind == "json":
                try:
                    d = json.loads(src.read_text(encoding="utf-8"))
                    dst.write_text(json.dumps(d, ensure_ascii=False, indent=2), encoding="utf-8")
                except Exception:
                    shutil.copyfile(src, dst)
            else:
                shutil.copyfile(src, dst)
        return dst.name


# ----------------------------------------------------------------------------- graph builder
class Graph:
    def __init__(self, key: str, demo: dict, source: tuple[str, str, bool], force: bool):
        self.key = key
        self.demo = demo
        self.stype, self.spath, self.exact = source
        self.src_root = FW / self.spath
        self.out = OUT / key
        self.der = Deriver(self.out / "media", force)
        self.stages: list[dict] = []
        self.nodes: list[dict] = []
        self.edges: list[dict] = []
        self.notes: list[str] = []
        self._ids: set[str] = set()
        self._by_basename: dict[str, str] = {}
        self.final_md5 = md5(SITE / demo["src"])
        self.final_node: str | None = None

    # -- primitives
    def stage(self, sid: str, agent: str, label: str, step: str = "") -> dict:
        for s in self.stages:
            if s["id"] == sid:
                return s
        s = {"id": sid, "agent": agent, "label": label, "step": step, "order": len(self.stages)}
        self.stages.append(s)
        return s

    def _nid(self, base: str) -> str:
        nid, k = base, 2
        while nid in self._ids:
            nid = f"{base}_{k}"
            k += 1
        self._ids.add(nid)
        return nid

    def node(self, path: Path, stage_id: str, *, mime: str = "", caption: str = "", label: str | None = None,
             scope: str = "", force_kind: str | None = None, thumb_only: bool = False) -> dict | None:
        if not path.is_file():
            log(f"  skip missing {path.name}")
            return None
        kind = force_kind or kind_of(mime, path.name)
        stem = clean_stem(path.name)
        nid = self._nid(slug(label or stem))
        n: dict = {
            "id": nid, "stage": stage_id, "kind": kind,
            "label": label or pretty_label(stem),
            "src_name": path.name, "bytes": path.stat().st_size,
            "caption": caption, "scope": scope,
        }
        m = SHOT_RE.search(path.name) or SHOT_RE.search(caption)
        if m:
            n["shot"] = m.group(1)
        rel = f"process/{self.key}/media/"
        try:
            if kind == "video" and md5(path) == self.final_md5:
                # this IS the delivered film: reuse the site's copy, don't duplicate bytes
                info = ffprobe(path)
                n.update({"file": self.demo["src"], "poster": self.demo["poster"], "final": True, **info})
                self.final_node = nid
            elif kind == "video":
                info = ffprobe(path)
                n.update(info)
                n["poster"] = rel + self.der.poster(path, nid)
                if not thumb_only:
                    n["file"] = rel + self.der.video(path, nid)
                else:
                    n["preview_only"] = True
            elif kind == "image":
                name, w, h = self.der.image(path, nid)
                n.update({"file": rel + name, "w": w, "h": h})
            elif kind == "audio":
                n["file"] = rel + self.der.audio(path, nid)
                n["dur"] = ffprobe(path)["dur"]
            else:
                n["file"] = rel + self.der.text(path, nid, kind)
                n["excerpt"] = excerpt_of(kind, path)
        except subprocess.CalledProcessError as e:
            log(f"  derivative failed for {path.name}: {e.stderr[:200] if e.stderr else e}")
            return None
        self.nodes.append(n)
        self._by_basename[path.name] = nid
        return n

    def sort_nodes(self):
        korder = {"image": 0, "video": 1, "audio": 2, "text": 3, "json": 4}
        stage_order = {s["id"]: s["order"] for s in self.stages}
        self.nodes.sort(key=lambda n: (stage_order.get(n["stage"], 99), 1 if n.get("shot") else 0,
                                       n.get("shot", ""), korder.get(n["kind"], 9), n["label"]))

    def edge(self, frm: str, to: str, etype: str, inferred: bool = False, label: str | None = None):
        """One connection; `label` is the consumer's InputLabel this artifact was resolved under
        (only known for real executions), kept as a list because one artifact can fill several labels."""
        key = (frm, to)
        for e in self.edges:
            if (e["from"], e["to"]) == key:
                if label and label not in e.setdefault("labels", []):
                    e["labels"].append(label)
                return
        e = {"from": frm, "to": to, "type": etype, "inferred": inferred}
        if label:
            e["labels"] = [label]
        self.edges.append(e)

    def shot_edges(self, from_stage: str, to_stage: str, inferred: bool):
        """node→node edges between two stages for assets that carry the same shot id."""
        src = [n for n in self.nodes if n["stage"] == from_stage and n.get("shot")]
        dst = [n for n in self.nodes if n["stage"] == to_stage and n.get("shot")]
        for a in src:
            for b in dst:
                if a["shot"] == b["shot"]:
                    self.edge(a["id"], b["id"], "shot", inferred)

    # -- writers
    def write(self):
        for s in self.stages:
            s["n"] = sum(1 for n in self.nodes if n["stage"] == s["id"])
        if self.final_node is None:
            # no byte-identical video in the run: attach the site's film to the last stage
            last = self.stages[-1]["id"]
            n = {"id": "final_film", "stage": last, "kind": "video", "label": "final film",
                 "file": self.demo["src"], "poster": self.demo["poster"], "final": True,
                 "caption": "Delivered film as published on this site.", "src_name": Path(self.demo["src"]).name}
            n.update(ffprobe(SITE / self.demo["src"]))
            self.nodes.append(n)
            self.final_node = "final_film"
            self.stages[-1]["n"] += 1
        g = {
            "key": self.key, "title": self.demo["title"], "genre": self.demo.get("genre", ""),
            "cat": self.demo.get("cat", ""), "prompt": self.demo.get("prompt_en") or self.demo.get("prompt", ""),
            "source": {"type": self.stype, "path": self.spath},
            "generated_at": datetime.now(timezone.utc).isoformat(timespec="seconds"),
            "stages": self.stages, "nodes": self.nodes, "edges": self.edges,
            "final": self.final_node, "notes": self.notes,
        }
        (self.out / "graph.json").write_text(json.dumps(g, ensure_ascii=False, indent=1), encoding="utf-8")
        total = sum(f.stat().st_size for f in (self.out / "media").glob("*"))
        log(f"  {self.key}: {len(self.stages)} stages, {len(self.nodes)} nodes, {len(self.edges)} edges, "
            f"media {total/1e6:.1f} MB")


# ----------------------------------------------------------------------------- workspace source
def load_global_memory(ws: Path) -> list[dict]:
    txt = (ws / "global_memory.md").read_text(encoding="utf-8")
    i, j = txt.index("```json") + 7, txt.rindex("```")
    return json.loads(txt[i:j])


def load_executions(ws: Path) -> list[dict]:
    """All execution records from sibling run_*/resume_* dumps that belong to this workspace."""
    execs: list[dict] = []
    for f in sorted(ws.parent.glob("*/04_executions.json")):
        try:
            d = json.loads(f.read_text(encoding="utf-8"))
        except Exception:
            continue
        for _sid, lst in d.items():
            for e in lst or []:
                paths = json.dumps(e.get("inputs") or {})
                if ws.name in paths:
                    execs.append(e)
    return execs


def build_workspace(g: Graph):
    ws = g.src_root
    entries = load_global_memory(ws)
    inputs_stage = g.stage("Inputs", "user", "Inputs")

    # 1. nodes, one per persisted artifact, stage = producing agent step
    for e in entries:
        agent, step = e["agent_id"], e.get("step_id") or ""
        if agent == "user":
            sid = "Inputs"
        else:
            sid = f"{agent}__{step}"
            g.stage(sid, agent, agent.replace("Agent", ""), step)
        for a in e["artifacts"]:
            p = Path(a["path"])
            if not p.is_absolute() or not p.exists():
                # workspace may have moved: re-root under ws
                tail = str(a["path"]).split(ws.name + "/", 1)[-1]
                p = ws / tail
            kind = kind_of(a.get("mime", ""), p.name)
            stem = clean_stem(p.name).lower()
            big = kind == "video" and any(t in stem for t in ("final", "reel", "narrated", "main", "assembled"))
            label = f"{agent} output" if re.match(r"^\w+agent_exec_\d+$", stem) else None
            g.node(p, sid, mime=a.get("mime", ""), caption=a.get("caption", ""), scope=a.get("scope", ""),
                   label=label, thumb_only=big)
    g.sort_nodes()

    # 2. edges
    execs = load_executions(ws)
    if execs:
        seen_stage_pairs: set[tuple[str, str]] = set()
        for e in execs:
            sid = f"{e['agent_id']}__{e.get('step_id','')}"
            if not any(s["id"] == sid for s in g.stages):
                continue
            ra = (e.get("inputs") or {}).get("resolved_artifacts") or {}
            for _label, v in ra.items():
                for item in (v if isinstance(v, list) else [v]):
                    p = item.get("path") if isinstance(item, dict) else None
                    if not p:
                        continue
                    nid = g._by_basename.get(Path(p).name)
                    if nid:
                        g.edge(nid, sid, "step", False, label=_label)
                        src_stage = next(n["stage"] for n in g.nodes if n["id"] == nid)
                        seen_stage_pairs.add((src_stage, sid))
        for a, b in seen_stage_pairs:
            g.shot_edges(a, b, False)
        g.notes.append("Connections are the actual inputs each agent step resolved at run time.")
    else:
        stage_by_agent = [(s["agent"], s["id"]) for s in g.stages]
        for consumer, wants in INFERRED_INPUTS:
            targets = [sid for agent, sid in stage_by_agent if consumer in agent]
            for tsid in targets:
                t_order = next(s["order"] for s in g.stages if s["id"] == tsid)
                for prod, kind in wants:
                    for agent, psid in stage_by_agent:
                        if psid == tsid:
                            continue
                        if prod == "Inputs" and psid != "Inputs":
                            continue
                        if prod != "Inputs" and prod not in agent:
                            continue
                        p_order = next(s["order"] for s in g.stages if s["id"] == psid)
                        if p_order >= t_order:
                            continue
                        for n in g.nodes:
                            if n["stage"] == psid and (kind is None or n["kind"] == kind):
                                g.edge(n["id"], tsid, "step", True)
                        g.shot_edges(psid, tsid, True)
        g.notes.append("No execution log was archived for this run: connections are inferred from each "
                       "agent's declared input contract (dashed).")


# ----------------------------------------------------------------------------- subrun source
def build_subrun(g: Graph):
    r = g.src_root
    g.stage("Inputs", "user", "Inputs")
    g.stage("Story", "StoryAgent", "Story")
    g.stage("Keyframes", "KeyframeSheetAgent", "Keyframe sheet")
    g.stage("ShotPrompts", "ShotPromptAgent", "Shot prompts")
    g.stage("Clips", "ClipAgent", "Clips")
    has_narr = (r / "narration").is_dir()
    if has_narr:
        g.stage("Narration", "NarratorAgent", "Narration")
    g.stage("Final", "CompositorAgent", "Final cut")

    goal = g.node(r / "user_goal.txt", "Inputs", label="user goal", force_kind="text",
                  caption="The user's instruction, verbatim.")
    story = g.node(r / "story.json", "Story", label="story", force_kind="json",
                   caption="Story: logline, characters, locations, shot list with panel beats.")
    if goal and story:
        g.edge(goal["id"], "Story", "structural")

    kf = json.loads((r / "keyframes.json").read_text(encoding="utf-8"))
    for group, role in (("character_anchors", "character"), ("location_anchors", "location"), ("prop_anchors", "prop")):
        for name, p in (kf.get(group) or {}).items():
            pp = Path(p)
            if not pp.exists():
                pp = r / "keyframes" / "anchors" / pp.name
            g.node(pp, "Keyframes", label=f"{name} anchor", force_kind="image",
                   caption=f"Identity reference card for {role} {name} — shared by every storyboard and clip.")
    style = kf.get("style_anchor_path") or (r / "keyframes" / "anchors" / "_style.png")
    if style and Path(style).exists():
        g.node(Path(style), "Keyframes", label="style anchor", force_kind="image",
               caption="Visual style anchor for the whole film.")
    # storyboard prompts are text inside keyframes.json → materialise as .txt beside the derivative
    tmp = g.out / "media"
    for sh, sv in sorted((kf.get("shot_visuals") or {}).items()):
        sb = Path(sv.get("storyboard_image_path") or "")
        if not sb.exists():
            sb = r / "keyframes" / "shots" / f"{sh}_storyboard.png"
        g.node(sb, "Keyframes", label=f"{sh} storyboard", force_kind="image",
               caption=f"Storyboard sheet for {sh}: {len(sv.get('panel_composition_notes') or [])} panels, one per beat.")
        prompt = sv.get("storyboard_prompt")
        if prompt:
            tp = tmp / f"_src_{sh}_storyboard_prompt.txt"
            tp.write_text(prompt, encoding="utf-8")
            n = g.node(tp, "Keyframes", label=f"{sh} storyboard prompt", force_kind="text",
                       caption=f"Image prompt that produced the {sh} storyboard sheet.")
            tp.unlink(missing_ok=True)
            if n:
                n["src_name"] = f"keyframes.json#shot_visuals.{sh}.storyboard_prompt"
    for extra in ("image_prompts/anchors", "image_prompts/shots"):
        for tp in sorted((r / extra).glob("*.txt")) if (r / extra).is_dir() else []:
            g.node(tp, "Keyframes", label=f"{tp.stem} prompt", force_kind="text",
                   caption="Image prompt used for this keyframe asset.")
    if story:
        g.edge(story["id"], "Keyframes", "structural")

    pdir = r / "prompts" if (r / "prompts").is_dir() else r / "video_prompts"
    for tp in sorted(pdir.glob("sh_*.txt")) if pdir.is_dir() else []:
        g.node(tp, "ShotPrompts", label=f"{tp.stem} video prompt", force_kind="text",
               caption=f"Video-generation prompt for {tp.stem}: motion, camera, timing per beat.")
    if story:
        g.edge(story["id"], "ShotPrompts", "structural")
    for n in [n for n in g.nodes if n["stage"] == "Keyframes" and n["kind"] == "image"]:
        g.edge(n["id"], "ShotPrompts", "structural")

    for vp in sorted((r / "videos").glob("sh_*.mp4")) if (r / "videos").is_dir() else []:
        if "_2k" in vp.stem:
            continue
        g.node(vp, "Clips", label=f"{vp.stem} clip", force_kind="video",
               caption=f"Rendered clip for {vp.stem} (Seedance, native foley).")
    for n in [n for n in g.nodes if n["stage"] in ("ShotPrompts", "Keyframes") and n["kind"] in ("image", "text")]:
        g.edge(n["id"], "Clips", "structural")
    g.shot_edges("Keyframes", "Clips", False)
    g.shot_edges("ShotPrompts", "Clips", False)
    if has_narr:
        nj = r / "narration" / "narration.json"
        g.node(nj, "Narration", label="narration cues", force_kind="json",
               caption="Narration plan: voice, delivery instructions, timed cues per shot.")
        for wav in sorted((r / "narration" / "lines").glob("*.wav")) if (r / "narration" / "lines").is_dir() else []:
            if wav.stem.endswith("_fit"):
                continue
            g.node(wav, "Narration", label=f"line {wav.stem}", force_kind="audio",
                   caption="Synthesised narration line (TTS).")
        srt = r / "narration" / "narration.srt"
        if srt.exists():
            g.node(srt, "Narration", label="subtitles", force_kind="text", caption="Subtitle track (SRT).")
        if story:
            g.edge(story["id"], "Narration", "structural")
        for n in [n for n in g.nodes if n["stage"] == "Clips"]:
            g.edge(n["id"], "Narration", "structural")

    # final: whichever file matches the site's mp4 byte-for-byte
    candidates = [r / "videos" / "final.mp4", r / "narration" / "main_narrated_subbed.mp4",
                  r / "subtitle" / "main_narrated_subbed.mp4", r / "subtitle" / "final_480p_corrected.mp4"]
    for c in candidates:
        if c.exists() and md5(c) == g.final_md5:
            g.node(c, "Final", label="final film", force_kind="video",
                   caption="Delivered film: clips + narration + subtitles + mix.")
            break
    for n in [n for n in g.nodes if n["stage"] in ("Clips", "Narration")]:
        g.edge(n["id"], "Final", "structural")
    g.sort_nodes()
    g.notes.append("Early cine-chain run: the sequence Story → Keyframes → Shot prompts → Clips → Narration → Final "
                   "is fixed, so connections are structural.")


# ----------------------------------------------------------------------------- demos (from app.js)
def load_demos() -> dict[str, dict]:
    js = (SITE / "assets" / "app.js").read_text(encoding="utf-8")
    body = js[js.index("const DEMOS = [") + len("const DEMOS = "):]
    body = body[: body.index("\n];") + 2]
    demos: dict[str, dict] = {}
    for block in re.split(r"\n  \{\n", body)[1:]:
        d: dict = {}
        for fld in ("key", "title", "genre", "cat", "src", "poster", "prompt", "prompt_en"):
            m = re.search(rf'\b{fld}:"((?:[^"\\]|\\.)*)"', block)
            if m:
                v = m.group(1).replace('\\"', '"').replace("\\n", "\n")
                d[fld] = re.sub(r"\\u([0-9a-fA-F]{4})", lambda mm: chr(int(mm.group(1), 16)), v)
        if d.get("key"):
            demos[d["key"]] = d
    return demos


# ----------------------------------------------------------------------------- main
def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("keys", nargs="*")
    ap.add_argument("--force", action="store_true", help="re-encode derivatives even if present")
    args = ap.parse_args()
    demos = load_demos()
    keys = args.keys or list(SOURCES)
    ok, bad = [], []
    for key in keys:
        if key not in SOURCES:
            log(f"{key}: no source mapping, skipped"); bad.append(key); continue
        if key not in demos:
            log(f"{key}: not in app.js DEMOS, skipped"); bad.append(key); continue
        stype, spath, _ = SOURCES[key]
        if not (FW / spath).exists():
            log(f"{key}: source {spath} missing, skipped"); bad.append(key); continue
        log(f"{key} ← {spath}")
        g = Graph(key, demos[key], SOURCES[key], args.force)
        try:
            (build_workspace if stype == "workspace" else build_subrun)(g)
            g.write()
            ok.append(key)
        except Exception as e:  # keep going for the batch, report at the end
            import traceback; traceback.print_exc()
            log(f"{key}: FAILED {e}"); bad.append(key)
    # MERGE, never replace: this ran as `export_process.py little_calf` and wrote
    # an index holding that one film, silently dropping the other 26 — every one
    # of their process pages would have 404'd on the next deploy (caught in
    # review on 2026-09-11, one command before it went live). A single-film
    # rebuild must leave every other film's entry alone.
    idx_path = OUT / "index.json"
    idx: dict = {}
    if idx_path.exists():
        try:
            idx = json.loads(idx_path.read_text(encoding="utf-8"))
        except json.JSONDecodeError as e:
            log(f"WARNING: {idx_path} is not valid JSON ({e}); rebuilding from this run only")
            idx = {}
    idx.update(
        {k: {"nodes": len(json.loads((OUT / k / "graph.json").read_text())["nodes"])} for k in ok}
    )
    # Drop entries whose pack is gone, so a deleted film does not linger as a
    # broken link — but only ever by checking the filesystem, never by assuming
    # this run covered every film.
    for k in [k for k in idx if not (OUT / k / "graph.json").exists()]:
        log(f"index: dropping {k} (no process/{k}/graph.json)")
        idx.pop(k)
    idx_path.write_text(json.dumps(dict(sorted(idx.items())), indent=1), encoding="utf-8")
    log(f"index: {len(idx)} film(s)")
    log(f"done: {len(ok)} ok, {len(bad)} failed {bad if bad else ''}")
    return 0 if not bad else 1


if __name__ == "__main__":
    sys.exit(main())
