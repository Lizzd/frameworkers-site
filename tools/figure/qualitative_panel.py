#!/usr/bin/env python3
"""Two-panel qualitative figure for the paper (fig:vis).

(a) the existing main-benchmark strip (vis.pdf: S-Agent / UniVA / Ours on character, prop, scene) rasterised;
(b) a story-level strip built here on the SAME grid as (a) — its frame columns, row band, title band are
measured from the rasterised (a), the typeface is (a)'s (Inter Regular 46 px at 3000 px width) — with
MovieAgent / Anim-Director / Ours on one story per subclass. Frames are hand-picked timestamps (as in (a)),
centre-cropped to (a)'s 4:3 frames, with red boxes on the drifting entity.

    python tools/figure/qualitative_panel.py [--out qualitative_both.pdf]
"""
from __future__ import annotations
import argparse, re, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FW = Path.home() / "FrameWorkers"
BENCH = FW / "comparisons/story_bench"
VIS_PDF = FW / "overleaf/iclr2027/figs/vis.pdf"
INTER = "/scratch/zhendong_li/tools/fonts/Inter[opsz,wght].ttf"
def inter(size, weight="Regular"):
    f = ImageFont.truetype(INTER, size)
    try: f.set_variation_by_name(weight)
    except Exception: pass
    return f
W = 3000
VIDEO = {"MovieAgent": lambda c: BENCH / f"movieagent/{c}_real/gemini_ROICtrl_HunyuanVideo_I2V/video/final_video.mp4",
         "Anim-Director": lambda c: BENCH / f"anim_director/{c}_real/code/result/video/0/0.mp4",
         "Ours": lambda c: BENCH / f"frameworkers/{c}/{c}_fw_veo.mp4"}
SYSTEMS = ["MovieAgent", "Anim-Director", "Ours"]
SUBCLASS = ["Character Consistency", "Prop Consistency", "Scene Consistency"]

# one story per subclass; per system the four timestamps (s) shown, chosen so the drifting entity is visible
COLUMNS = [
    # character: Sofia, a three-year-old girl — drawn as a boy / a girl / a boy (MovieAgent) and as a girl / an adult woman (Anim-Director)
    ("TS32", {"MovieAgent": [2, 10, 26, 42], "Anim-Director": [2, 10, 26, 34], "Ours": [6, 18, 22, 42]}),
    # prop: Tim's scissors and the paper the two children cut — the paper becomes a ribbon / a pink sheet and the scissors change size
    # (Anim-Director); no scissors at all and the picture becomes a cardboard robot (MovieAgent); ours: the same red scissors throughout
    ("TS170", {"MovieAgent": [8, 18, 26, 36], "Anim-Director": [14, 18, 26, 36], "Ours": [2, 14, 22, 30]}),
    # scene: the little bird's tree — green forest / autumn forest (MovieAgent); meadow / cracked desert / dusk field / pale field (Anim-Director)
    ("TS63", {"MovieAgent": [2, 18, 34, 42], "Anim-Director": [6, 22, 30, 42], "Ours": [2, 14, 30, 42]}),
]
# red boxes, fractional coords in the ORIGINAL 16:9 frame, keyed by (case, system, timestamp)
BOXES = {
    ("TS32", "MovieAgent", 2): [(0.30, 0.20, 0.56, 0.97)], ("TS32", "MovieAgent", 10): [(0.06, 0.08, 0.62, 0.97)], ("TS32", "MovieAgent", 42): [(0.24, 0.08, 0.68, 0.97)],
    ("TS32", "Anim-Director", 2): [(0.10, 0.22, 0.46, 0.97)], ("TS32", "Anim-Director", 10): [(0.36, 0.12, 0.64, 0.97)],
    ("TS32", "Anim-Director", 26): [(0.49, 0.30, 0.71, 0.95)], ("TS32", "Anim-Director", 34): [(0.60, 0.18, 0.86, 0.97)],
    ("TS170", "MovieAgent", 8): [(0.28, 0.58, 0.64, 0.95)], ("TS170", "MovieAgent", 26): [(0.04, 0.10, 0.42, 0.98)],
    ("TS170", "Anim-Director", 14): [(0.27, 0.60, 0.53, 0.92)], ("TS170", "Anim-Director", 18): [(0.28, 0.32, 0.72, 0.78)], ("TS170", "Anim-Director", 26): [(0.35, 0.45, 0.72, 0.80)],
}

def runs(mask, minlen):
    out, start = [], None
    for i, v in enumerate(mask):
        if v and start is None: start = i
        if not v and start is not None:
            if i - start >= minlen: out.append((start, i))
            start = None
    if start is not None and len(mask) - start >= minlen: out.append((start, len(mask)))
    return out

def measure(pa):
    im = np.asarray(pa.convert("RGB")).astype(int); nonwhite = im.sum(axis=2) < 720
    rows = runs(nonwhite.mean(axis=1) > 0.5, 40); y0, y1 = rows[0][0], rows[-1][1]
    groups = runs(nonwhite[y0:y1].mean(axis=0) > 0.5, 30)
    title = runs(nonwhite[:y0].mean(axis=1) > 0.002, 5)
    return {"y0": y0, "y1": y1, "groups": groups, "title": (title[0][0], title[-1][1]) if title else (8, 56)}

def frame(p, t, w, h, tmp):
    dst = tmp / f"{p.parent.name}_{p.stem}_{t:.2f}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(p), "-frames:v", "1",
                    "-vf", f"crop=min(iw\\,ih*{w}/{h}):ih,scale={w}:{h}", str(dst)], capture_output=True)
    return Image.open(dst).convert("RGB")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--out", default=str(Path(__file__).parent / "qualitative_both.pdf"))
    a = ap.parse_args(); tmp = Path(tempfile.mkdtemp(prefix="qpanel_"))
    subprocess.run(["pdftoppm", "-png", "-r", "300", "-scale-to-x", str(W), "-scale-to-y", "-1", str(VIS_PDF), str(tmp / "a")], check=True)
    pa = Image.open(next(tmp.glob("a*.png"))).convert("RGB")
    m = measure(pa); fh = (m["y1"] - m["y0"] - 4) // 3; groups = m["groups"]; t0, _ = m["title"]
    f_title = inter(46); f_panel = inter(44, "SemiBold")
    pb = Image.new("RGB", (W, m["y1"]), "white"); d = ImageDraw.Draw(pb)
    for gi, (case, picks) in enumerate(COLUMNS[:len(groups)]):
        gx0, gx1 = groups[gi]; fw = (gx1 - gx0 - 6) // 4
        bb = d.textbbox((0, 0), SUBCLASS[gi], font=f_title)
        d.text(((gx0 + gx1 - (bb[2] - bb[0])) / 2 - bb[0], t0 - bb[1]), SUBCLASS[gi], fill="black", font=f_title)
        for ri, name in enumerate(SYSTEMS):
            y = m["y0"] + ri * (fh + 2)
            if gi == 0:  # row label as in (a): Inter 46, right-aligned at x=180; long names wrap at the hyphen / camel case
                RIGHT = 180; fl = inter(46); sz = 46
                lines = [name] if d.textlength(name, font=fl) <= RIGHT - 2 else (name.replace("-", "-\n") if "-" in name else re.sub(r"([a-z])([A-Z])", r"\1\n\2", name)).split("\n")
                while any(d.textlength(ln, font=fl) > RIGHT - 2 for ln in lines) and sz > 40: sz -= 1; fl = inter(sz)
                capH = d.textbbox((0, 0), "H", font=fl)[3] - d.textbbox((0, 0), "H", font=fl)[1]; lh = capH + 14
                top = y + fh / 2 - (len(lines) * lh - 14) / 2
                for li, ln in enumerate(lines):
                    b2 = d.textbbox((0, 0), ln, font=fl); d.text((RIGHT - (b2[2] - b2[0]) - b2[0], top + li * lh - b2[1]), ln, fill="black", font=fl)
            keep = (fw / fh) / (16 / 9); off = (1 - keep) / 2   # centre crop 16:9 → (a)'s aspect
            for k, t in enumerate(picks[name]):
                im = frame(VIDEO[name](case), t, fw, fh, tmp); dd = ImageDraw.Draw(im)
                for (x0, y0, x1, y1) in BOXES.get((case, name, t), []):
                    cx0 = max(0.0, (x0 - off) / keep); cx1 = min(1.0, (x1 - off) / keep)
                    dd.rectangle([cx0 * fw, y0 * fh, cx1 * fw - 1, y1 * fh - 1], outline=(230, 0, 0), width=5)
                pb.paste(im, (gx0 + k * (fw + 2), y))
    lab_h = 56; pad = 26
    out = Image.new("RGB", (W, lab_h + pa.height + pad + lab_h + pb.height), "white"); d = ImageDraw.Draw(out)
    d.text((10, 4), "(a) Main benchmark — S-Agent, UniVA, Ours (character / prop / scene subclasses)", fill="black", font=f_panel)
    out.paste(pa, (0, lab_h)); y = lab_h + pa.height + pad
    d.text((10, y + 4), "(b) Story-level benchmark — MovieAgent, Anim-Director, Ours (one story per subclass)", fill="black", font=f_panel)
    out.paste(pb, (0, y + lab_h))
    out.save(a.out, "PDF", resolution=300.0, quality=88); out.save(str(Path(a.out).with_suffix(".png")))
    print(a.out, out.size, f"{Path(a.out).stat().st_size/1e6:.1f} MB")

if __name__ == "__main__":
    main()
