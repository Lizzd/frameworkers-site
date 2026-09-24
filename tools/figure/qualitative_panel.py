#!/usr/bin/env python3
"""Two-panel qualitative figure for the paper (fig:vis).

(a) the existing main-benchmark strip (vis.pdf: S-Agent / UniVA / Ours on character, prop, scene) rasterised,
(b) a story-level strip built here: MovieAgent / Anim-Director / Ours on three stories, four evenly spaced
frames per 48-second film, from FrameWorkers/comparisons/story_bench.

    python tools/figure/qualitative_panel.py [--cases TS63 AU05 AU08] [--out qualitative_both.pdf]
"""
from __future__ import annotations
import argparse, subprocess, tempfile
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont

FW = Path.home() / "FrameWorkers"
BENCH = FW / "comparisons/story_bench"
VIS_PDF = FW / "overleaf/iclr2027/figs/vis.pdf"
FONT = "/usr/share/fonts/dejavu/DejaVuSans.ttf"; FONT_B = "/usr/share/fonts/dejavu/DejaVuSans-Bold.ttf"
W = 3000; LABEL_W = 250; FR = [0.12, 0.37, 0.62, 0.87]; GAP = 8; GROUP_GAP = 16
SYSTEMS = [("MovieAgent", lambda c: BENCH / f"movieagent/{c}_real/gemini_ROICtrl_HunyuanVideo_I2V/video/final_video.mp4"),
           ("Anim-Director", lambda c: BENCH / f"anim_director/{c}_real/code/result/video/0/0.mp4"),
           ("Ours", lambda c: BENCH / f"frameworkers/{c}/{c}_fw_veo.mp4")]
TITLES = {"TS63": "Story: a little bird and a squirrel", "AU05": "Story: baker Pip and the birthday cake",
          "AU08": "Story: Mira, the museum night guard", "TS32": "Story: Sofia and the visitor", "AU06": "Story: the lighthouse keeper"}

def dur(p): return float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", str(p)], capture_output=True, text=True).stdout or 0)
def frame(p, t, w, h, tmp):
    dst = tmp / f"{p.parent.name}_{p.stem}_{t:.2f}.png"
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", f"{t:.2f}", "-i", str(p), "-frames:v", "1",
                    "-vf", f"scale={w}:{h}:force_original_aspect_ratio=decrease,pad={w}:{h}:(ow-iw)/2:(oh-ih)/2", str(dst)], capture_output=True)
    return Image.open(dst).convert("RGB")

def main():
    ap = argparse.ArgumentParser(); ap.add_argument("--cases", nargs="+", default=["TS63", "AU05", "AU08"]); ap.add_argument("--out", default=str(Path(__file__).parent / "qualitative_both.pdf"))
    a = ap.parse_args(); tmp = Path(tempfile.mkdtemp(prefix="qpanel_"))
    f_title = ImageFont.truetype(FONT, 40); f_label = ImageFont.truetype(FONT, 30); f_panel = ImageFont.truetype(FONT_B, 44)
    # (a) rasterise the existing strip at the target width
    subprocess.run(["pdftoppm", "-png", "-r", "300", "-scale-to-x", str(W), "-scale-to-y", "-1", str(VIS_PDF), str(tmp / "a")], check=True)
    pa = Image.open(next(tmp.glob("a*.png"))).convert("RGB")
    # (b) story strip
    n = len(a.cases); fw = (W - LABEL_W - (n - 1) * GROUP_GAP - n * 3 * GAP) // (n * 4); fh = round(fw * 9 / 16)
    title_h = 60; pb = Image.new("RGB", (W, title_h + 3 * (fh + GAP)), "white"); d = ImageDraw.Draw(pb)
    for gi, c in enumerate(a.cases):
        x0 = LABEL_W + gi * (4 * fw + 3 * GAP + GROUP_GAP)
        t = TITLES.get(c, c); tw = d.textlength(t, font=f_title); d.text((x0 + (4 * fw + 3 * GAP - tw) / 2, 6), t, fill="black", font=f_title)
        for ri, (name, pf) in enumerate(SYSTEMS):
            p = pf(c); D = dur(p); y = title_h + ri * (fh + GAP)
            if gi == 0:
                lw = d.textlength(name, font=f_label); d.text((LABEL_W - 14 - lw, y + fh / 2 - 17), name, fill="black", font=f_label)
            for k, fr in enumerate(FR):
                pb.paste(frame(p, D * fr, fw, fh, tmp), (x0 + k * (fw + GAP), y))
    # stack with panel letters
    pad = 26; lab_h = 56
    H = lab_h + pa.height + pad + lab_h + pb.height
    out = Image.new("RGB", (W, H), "white"); d = ImageDraw.Draw(out)
    d.text((10, 4), "(a) Main benchmark — S-Agent, UniVA, Ours (character / prop / scene subclasses)", fill="black", font=f_panel)
    out.paste(pa, (0, lab_h))
    y = lab_h + pa.height + pad
    d.text((10, y + 4), "(b) Story-level benchmark — MovieAgent, Anim-Director, Ours (four evenly spaced frames per 48 s film)", fill="black", font=f_panel)
    out.paste(pb, (0, y + lab_h))
    out.save(a.out, "PDF", resolution=300.0, quality=88)
    out.save(str(Path(a.out).with_suffix(".png")))
    print(a.out, out.size, f"{Path(a.out).stat().st_size/1e6:.1f} MB")

if __name__ == "__main__":
    main()
