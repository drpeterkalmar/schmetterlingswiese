# Audio-Realitätstest OHNE --autoplay-policy-Flag + Offline-Renders → WAV → ffmpeg (Lautheit, Peak, Spektrum)
import time, json, sys, base64, subprocess, re, os
sys.path.insert(0, 'tests')
from util import *
OUT = 'tests/out/audio'
os.makedirs(OUT, exist_ok=True)

def measure(path):
    r = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128=peak=true', '-f', 'null', '-'], capture_output=True, text=True).stderr
    summ = r[r.rfind('Summary:'):]
    I = float(re.search(r'I:\s+(-?[\d.]+) LUFS', summ).group(1))
    LRA = float(re.search(r'LRA:\s+(-?[\d.]+) LU', summ).group(1))
    TP = float(re.search(r'Peak:\s+(-?[\d.]+|-inf) dBFS', summ).group(1))
    v = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    mx = float(re.search(r'max_volume: (-?[\d.]+) dB', v).group(1)); mean = float(re.search(r'mean_volume: (-?[\d.]+) dB', v).group(1))
    lo = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'lowpass=f=60,lowpass=f=60,volumedetect', '-f', 'null', '-'], capture_output=True, text=True).stderr
    lomean = float(re.search(r'mean_volume: (-?[\d.]+) dB', lo).group(1))
    png = path.replace('.wav', '_spektrum.png')
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', path, '-lavfi', 'showspectrumpic=s=1024x512:legend=1:scale=log', png])
    return dict(LUFS=I, LRA=LRA, TruePeak_dBTP=TP, max_dB=mx, mean_dB=mean, below60Hz_mean_dB=lomean)

with sync_playwright() as pw:
    s = Session(pw, dpr=1)   # KEIN Autoplay-Flag (echte Handy-Regeln)
    s.open()
    s.wait_audio()
    res = {'render_ms': s.ev("__app.audio.renderMs"), 'sfx_ready_ms': s.ev("__app.audio.sfxMs"), 'ac_before_tap': s.ev("__game.ac()")}
    s.tap('#title')
    time.sleep(0.6)
    res['ac_after_tap'] = s.ev("__game.ac()")
    s.pg.fill('input.name', 'Ton'); s.tap('[data-a=create]')
    time.sleep(1)
    res['voices_after_ui'] = s.ev("__app.audio.stats")
    report = {}
    for mode, wid, sec, inten in [('mix', 'wiese', 60, 0.6), ('mix', 'abend', 45, 0.6), ('music', 'wiese', 60, 0.4), ('music', 'sonne', 40, 0.9), ('sfx', 'wiese', 60, 0.6)]:
        b64 = s.pg.evaluate(f"__game.renderWav('{mode}', '{wid}', {sec}, {inten})")
        path = f'{OUT}/{mode}_{wid}_{int(inten*100)}.wav'
        open(path, 'wb').write(base64.b64decode(b64))
        report[os.path.basename(path)] = measure(path)
        print(os.path.basename(path), report[os.path.basename(path)], flush=True)
    res['measure'] = report
    # Zweiter Start: Klänge aus dem IndexedDB-Cache
    time.sleep(3)
    s.pg.reload(); s.pg.wait_for_function("window.__app && window.__app.audio.ready", timeout=120000)
    res['render_ms_cached'] = s.ev("__app.audio.renderMs"); res['from_cache'] = s.ev("!!__app.audio.fromCache")
    res['sfx_ready_ms_first'] = None
    res['errors'] = s.errors
    print(json.dumps(res, indent=1))
    json.dump(res, open('tests/out/audio_report.json', 'w'), indent=1)
    s.close()
