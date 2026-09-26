# Flug-Bett (Wind/Flügel/Summen-Loops wie im Spiel, ohne Musik/Effekte) je Figur offline rendern und auf
# periodische Modulation 4–40 Hz („stotternder Motor“) prüfen: Hüllkurven- und Spektralschwerpunkt-Modulation.
# Aufruf: python3 tests/test_flight_audio.py [label] [tempo]   (label = Dateipräfix, z. B. vorher/nachher)
import sys, os, json, base64, wave
import numpy as np
sys.path.insert(0, 'tests')
from util import *

LABEL = sys.argv[1] if len(sys.argv) > 1 else 'nachher'
SPEED = float(sys.argv[2]) if len(sys.argv) > 2 else 7.0
OUT = 'tests/out/audio'
os.makedirs(OUT, exist_ok=True)
SR_ENV = 200.0

def load(path):
    w = wave.open(path); sr = w.getframerate(); ch = w.getnchannels()
    x = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float64) / 32768
    return x.reshape(-1, ch).mean(axis=1), sr

def mod_spectrum(sig, fs):
    # gemittelte Leistungsspektren (4-s-Fenster, Hann, 50 % Überlappung) eines normierten Zeitverlaufs
    seg = int(4 * fs); hop = seg // 2; win = np.hanning(seg); acc = None; n = 0
    for i in range(0, len(sig) - seg, hop):
        p = np.abs(np.fft.rfft(sig[i:i + seg] * win)) ** 2
        acc = p if acc is None else acc + p; n += 1
    return np.fft.rfftfreq(seg, 1 / fs), acc / n

def analyse(path):
    x, sr = load(path)
    x = x[int(3 * sr):]                      # Einschwingen überspringen
    hop = int(sr / SR_ENV); fs = sr / hop; nfr = len(x) // hop
    fr = x[:nfr * hop].reshape(nfr, hop)
    env = np.sqrt((fr ** 2).mean(axis=1)) + 1e-9
    e = env / env.mean() - 1
    f, P = mod_spectrum(e - e.mean(), fs)
    band = (f >= 4) & (f <= 40)
    # AM-Tiefe im Band 4–40 Hz (sinusförmige AM mit Tiefe m ⇒ m); Rauschen hat einen flachen Sockel
    full = np.fft.rfft(e - e.mean()); ff = np.fft.rfftfreq(len(e), 1 / fs)
    bp = np.fft.irfft(np.where((ff >= 4) & (ff <= 40), full, 0), n=len(e))
    depth = float(np.sqrt(2) * bp.std() * 100)
    pk = int(np.argmax(np.where(band, P, 0)))
    prom = float(10 * np.log10(P[pk] / np.median(P[band])))
    # Spektralschwerpunkt-Wobble (Frequenzmodulation, z. B. Summen mit Vibrato)
    n = 1024; spec = []
    for i in range(0, len(x) - n, hop):
        s = np.abs(np.fft.rfft(x[i:i + n] * np.hanning(n))); spec.append(s)
    spec = np.array(spec); fq = np.fft.rfftfreq(n, 1 / sr)
    cen = (spec * fq).sum(axis=1) / (spec.sum(axis=1) + 1e-12)
    c = cen / cen.mean() - 1
    fc, Pc = mod_spectrum(c - c.mean(), fs)
    bc = (fc >= 4) & (fc <= 40); pkc = int(np.argmax(np.where(bc, Pc, 0)))
    cprom = float(10 * np.log10(Pc[pkc] / np.median(Pc[bc])))
    rms_db = float(20 * np.log10(np.sqrt((x ** 2).mean()) + 1e-12))
    return dict(rms_dBFS=round(rms_db, 1), am_tiefe_4_40Hz_pct=round(depth, 1), am_peak_Hz=round(float(f[pk]), 2),
                am_peak_ueber_sockel_dB=round(prom, 1), fm_peak_Hz=round(float(fc[pkc]), 2), fm_peak_ueber_sockel_dB=round(cprom, 1))

with sync_playwright() as pw:
    s = Session(pw, dpr=1)
    s.open(); s.wait_audio()
    res = {}
    for kind, wid in [('schmetterling', 'wiese'), ('marienkaefer', 'wiese'), ('biene', 'wiese'), ('libelle', 'wiese'), ('schmetterling', 'sonne'), ('schmetterling', 'abend')]:
        b64 = s.pg.evaluate(f"__game.renderFlight('{kind}', '{wid}', 30, {SPEED})")
        path = f'{OUT}/flug_{LABEL}_{kind}_{wid}.wav'
        open(path, 'wb').write(base64.b64decode(b64))
        png = path.replace('.wav', '_spektrum.png')
        os.system(f"ffmpeg -hide_banner -loglevel error -y -i {path} -lavfi showspectrumpic=s=1024x512:legend=1:scale=log {png}")
        res[f'{kind}/{wid}'] = analyse(path)
        print(f'{kind:14s} {wid:6s}', res[f'{kind}/{wid}'], flush=True)
    # einzelne Schichten isoliert (welcher Loop stottert?)
    layers = s.ev("Object.keys(__app.audio.bufs.amb).filter(n => ['wind','water','bees','flutter','buzz'].includes(n))")
    for layer in layers:
        kind = 'biene' if layer == 'buzz' else 'schmetterling'
        wid = 'sonne' if layer == 'bees' else 'teich' if layer == 'water' else 'wiese'
        b64 = s.pg.evaluate(f"__game.renderFlight('{kind}', '{wid}', 30, {SPEED}, ['{layer}'])")
        path = f'{OUT}/flug_{LABEL}_schicht_{layer}.wav'
        open(path, 'wb').write(base64.b64decode(b64))
        res[f'Schicht {layer}'] = analyse(path)
        print(f'Schicht {layer:8s}', res[f'Schicht {layer}'], flush=True)
    res['errors'] = s.errors
    json.dump(res, open(f'tests/out/flug_audio_{LABEL}.json', 'w'), indent=1)
    # Grenzwerte (nur für „nachher“): keine ausgeprägte periodische Modulation im Flug-Bett
    if LABEL != 'vorher':
        bad = [k for k, v in res.items() if k != 'errors' and (v['am_peak_ueber_sockel_dB'] > 8 or v['fm_peak_ueber_sockel_dB'] > 8)]
        print('FLUG-BETT OHNE STOTTERN' if not bad and not s.errors else f'FEHLER: periodische Modulation in {bad} / errors {s.errors[:5]}')
    s.close()
