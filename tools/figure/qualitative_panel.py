#!/usr/bin/env python3
"""Two-panel qualitative figure for the paper (fig:vis).

(a) the existing main-benchmark strip (vis.pdf: S-Agent / UniVA / Ours on character, prop, scene) rasterised;
(b) a story-level strip built here on the SAME grid as (a) — its frame columns, row band, label column and title
band are measured from the rasterised (a) — with MovieAgent / Anim-Director / Ours on three stories, four evenly
spaced frames per 48-second film (centre-cropped to the 4:3 frames (a) uses), and red boxes on the drift.

    python tools/figure/qualitative_panel.py [--cases TS63 AU05 AU08] [--out qualitative_both.pdf]
"""
from __future__ import annotations
import argparse, subprocess, tempfile
from pathlib import Path
import numpy as np
from PIL import Image, ImageDraw, ImageFont

FW = Path.home() / "FrameWorkers"
BENCH = FW / "comparisons/story_bench"
VIS_PDF = FW / "overleaf/iclr2027/figs/vis.pdf"
FONT = "/usr/share/fonts/dejavu/DejaVuSans.ttf"; FONT_B = "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"
W = 3000; FR = [0.12, 0.37, 0.62, 0.87]
SYSTEMS = [("MovieAgent", lambda c: BENCH / f"movieagent/{c}_real/gemini_ROICtrl_HunyuanVideo_I2V/video/final_video.mp4"),
           ("Anim-Director", lambda c: BENCH / f"anim_director/{c}_real/code/result/video/0/0.mp4"),
           ("Ours", lambda c: BENCH / f"frameworkers/{c}/{c}_fw_veo.mp4")]
# (b) mirrors (a): one story per subclass, same three column titles
SUBCLASS = ["Character Consistency", "Prop Consistency", "Scene Consistency"]
# drift boxes, fractional coords in the ORIGINAL 16:9 frame: (case, system, frame index 0-3) -> [(x0,y0,x1,y1), ...]
BOXES = {
    # character: the protagonist (a bluebird) is replaced by a fox / a rabbit / a brown bird
    ("TS63", "MovieAgent", 0): [(0.28, 0.22, 0.56, 0.90)], ("TS63", "MovieAgent", 2): [(0.50, 0.18, 0.86, 0.90)],
    ("TS63", "Anim-Director", 2): [(0.40, 0.12, 0.62, 0.86)],
    # prop: the birthday cake is redrawn from shot to shot
    ("AU05", "MovieAgent", 0): [(0.33, 0.28, 0.62, 0.72)], ("AU05", "MovieAgent", 2): [(0.34, 0.12, 0.66, 0.86)],
    ("AU05", "Anim-Director", 0): [(0.27, 0.10, 0.56, 0.80)], ("AU05", "Anim-Director", 2): [(0.40, 0.28, 0.62, 0.62)],
    ("AU05", "Anim-Director", 3): [(0.60, 0.30, 0.82, 0.62)],
    # scene (AU08): no boxes, as in (a) — the whole frame changes room and style
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
    """Frame grid of panel (a): group x-spans, image row band, title band, label font size."""
    im = np.asarray(pa.convert("RGB")).astype(int); nonwhite = im.sum(axis=2) < 720
    rows = runs(nonwhite.mean(axis=1) > 0.5, 40); y0, y1 = rows[0][0], rows[-1][1]
    groups = runs(nonwhite[y0:y1].mean(axis=0) > 0.5, 30)
    title = runs(nonwhite[:y0].mean(axis=1) > 0.002, 5)
    return {"y0": y0, "y1": y1, "groups": groups, "title": (title[0][0], title[-1][1]) if title else (8, 56)}

def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout or 0)
def frame(p, t, w, h, tmp):
    """Centre-crop the 16:9 frame to the target aspect, then scale."""
    dst = tmp / f"{p.parent.name}_{p.stem}_{t:.2f}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(p), "-frames:v", "1",
                    "-vf", f"crop=min(iw\\,ih*{w}/{h}):ih,scale={w}:{h}", str(dst)], capture_output=True)
    return Image.open(dst).convert("RGB")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--cases", nargs="+", default=["TS63", "AU05", "AU08"]); ap.add_argument("--out", default=str(Path(__file__).parent / "qualitative_both.pdf"))
    a = ap.parse_args(); tmp = Path(tempfile.mkdtemp(prefix="qpanel_"))
    subprocess.run(["pdftoppm", "-png", "-r", "300", "-scale-to-x", str(W), "-scale-to-y", "-1", str(VIS_PDF), str(tmp / "a")], check=True)
    pa = Image.open(next(tmp.glob("a*.png"))).convert("RGB")
    m = measure(pa); rows_h = m["y1"] - m["y0"]; fh = (rows_h - 2 * 2) // 3; groups = m["groups"]
    t0, t1 = m["title"]; f_title = ImageFont.truetype(FONT, t1 - t0 - 2); f_label = ImageFont.truetype(FONT, 34); f_panel = ImageFont.truetype(FONT_B, 44)
    # (b) on the same grid
    pb = Image.new("RGB", (W, m["y1"]), "white"); d = ImageDraw.Draw(pb)
    for gi, c in enumerate(a.cases[:len(groups)]):
        gx0, gx1 = groups[gi]; fw = (gx1 - gx0 - 3 * 2) // 4
        t = SUBCLASS[gi] if gi < len(SUBCLASS) else c; tw = d.textlength(t, font=f_title); d.text(((gx0 + gx1 - tw) / 2, t0 - 4), t, fill="black", font=f_title)
        for ri, (name, pf) in enumerate(SYSTEMS):
            p = pf(c); D = dur(p); y = m["y0"] + ri * (fh + 2)
            if gi == 0:  # row label, left of the first group like (a); wrap at the hyphen if it would run into the frames
                lines = [name] if d.textlength(name, font=f_label) <= groups[0][0] - 10 else name.replace("-", "-\n").split("\n")
                ly = y + fh / 2 - 20 * len(lines)
                for li, ln in enumerate(lines): d.text((4, ly + li * 40), ln, fill="black", font=f_label)
            for k, fr in enumerate(FR):
                im = frame(p, D * fr, fw, fh, tmp); x = gx0 + k * (fw + 2)
                crop_w = fh * 16 / 9 / (fw / fh) if False else None
                # boxes: convert 16:9 fractional coords into the centre-cropped frame (crop keeps the middle fw/fh : 16/9 share of the width)
                keep = (fw / fh) / (16 / 9); off = (1 - keep) / 2
                dd = ImageDraw.Draw(im)
                for (x0, y0, x1, y1) in BOXES.get((c, name, k), []):
                    cx0 = max(0.0, (x0 - off) / keep); cx1 = min(1.0, (x1 - off) / keep)
                    dd.rectangle([cx0 * fw, y0 * fh, cx1 * fw - 1, y1 * fh - 1], outline=(230, 0, 0), width=5)
                pb.paste(im, (x, y))
    lab_h = 56; pad = 26
    out = Image.new("RGB", (W, lab_h + pa.height + pad + lab_h + pb.height), "white"); d = ImageDraw.Draw(out)
    d.text((10, 4), "(a) Main benchmark — S-Agent, UniVA, Ours (character / prop / scene subclasses)", fill="black", font=f_panel)
    out.paste(pa, (0, lab_h)); y = lab_h + pa.height + pad
    d.text((10, y + 4), "(b) Story-level benchmark — MovieAgent, Anim-Director, Ours (one story per subclass; four evenly spaced frames per 48 s film)", fill="black", font=f_panel)
    out.paste(pb, (0, y + lab_h))
    out.save(a.out, "PDF", resolution=300.0, quality=88); out.save(str(Path(a.out).with_suffix(".png")))
    print(a.out, out.size, f"{Path(a.out).stat().st_size/1e6:.1f} MB", "grid:", m)

if __name__ == "__main__":
    main()
