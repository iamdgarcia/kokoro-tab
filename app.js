// Kokoro Tab — 82M-param TTS fully in-browser via kokoro-js (ONNX Runtime Web).
// API verified against https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX (2026-02-05):
//   KokoroTTS.from_pretrained(model_id, { dtype: "q8", device: "wasm", progress_callback })
//   tts.generate(text, { voice, speed }) -> RawAudio (24kHz, .toBlob() available in browser)
//   tts.voices -> frozen map {af_heart: {name, language, gender, ...}}
import { KokoroTTS } from "https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm";

const MODEL_ID = "onnx-community/Kokoro-82M-v1.0-ONNX";
const $ = (id) => document.getElementById(id);

const els = {
  text: $("text"), voice: $("voice"), speed: $("speed"), speedVal: $("speed-val"),
  go: $("go"), player: $("player"), status: $("status"),
  tffa: $("tffa"), tffaMs: $("tffa-ms"), tffaNote: $("tffa-note"),
  progWrap: $("progress-wrap"), progFile: $("progress-file"),
  progPct: $("progress-pct"), progFill: $("progress-fill"),
};

// ---- voices dropdown (from tts.voices once loaded; static labels before) ----
const VOICE_LABELS = {
  af: "American female", am: "American male",
  bf: "British female", bm: "British male",
};
function labelVoice(id, meta) {
  const region = VOICE_LABELS[id.slice(0, 2)] || id.slice(0, 2);
  const grade = meta?.overallGrade ? ` · grade ${meta.overallGrade}` : "";
  return `${id} — ${meta?.name ?? ""} (${region}${grade})`;
}
async function fillVoices(tts) {
  const voices = tts?.voices ?? {};
  const ids = Object.keys(voices).length ? Object.keys(voices)
    : ["af_heart", "af_bella", "am_adam", "am_michael", "bf_emma", "bm_george"];
  els.voice.innerHTML = "";
  for (const id of ids) {
    const opt = document.createElement("option");
    opt.value = id;
    opt.textContent = labelVoice(id, voices[id]);
    if (id === "af_heart") opt.selected = true;
    els.voice.appendChild(opt);
  }
}
fillVoices(null); // immediate placeholder fill; replaced after model load

// ---- progress rendering ----
// kokoro-js/transformers.js progress_callback yields {status, file, progress, loaded, total}
let fileSeen = new Set();
function onProgress(data) {
  if (data.status === "progress" && data.file) {
    fileSeen.add(data.file);
    els.progWrap.hidden = false;
    const pct = data.progress ?? (data.total ? (data.loaded / data.total) * 100 : 0);
    els.progFile.textContent = data.file.split("/").pop();
    els.progPct.textContent = `${pct.toFixed(0)}%`;
    els.progFill.style.width = `${pct}%`;
  } else if (data.status === "done" && data.file) {
    fileSeen.delete(data.file);
    if (fileSeen.size === 0) els.progWrap.hidden = true;
  }
}

function setStatus(msg) { els.status.textContent = msg; }

// ---- model load (lazy: on first Generate click) ----
let ttsPromise = null;
function loadTTS() {
  if (!ttsPromise) {
    setStatus("Loading model (first run downloads ~86 MB, cached after)…");
    ttsPromise = KokoroTTS.from_pretrained(MODEL_ID, {
      dtype: "q8",
      device: "wasm",
      progress_callback: onProgress,
    }).then((tts) => {
      fillVoices(tts);
      setStatus("");
      return tts;
    }).catch((err) => {
      ttsPromise = null; // allow retry
      setStatus(`Model load failed: ${err.message}`);
      throw err;
    });
  }
  return ttsPromise;
}

// ---- generation ----
let t0 = 0;
async function generate() {
  const text = els.text.value.trim();
  if (!text) { setStatus("Type some text first."); return; }

  els.go.disabled = true;
  els.tffa.hidden = true;
  t0 = performance.now();
  try {
    const tts = await loadTTS();
    setStatus("Synthesizing…");
    const audio = await tts.generate(text, {
      voice: els.voice.value,
      speed: parseFloat(els.speed.value),
    });
    const ms = Math.round(performance.now() - t0);
    const blob = audio.toBlob ? audio.toBlob() : rawAudioToWav(audio);
    const url = URL.createObjectURL(blob);
    if (els.player.src.startsWith("blob:")) URL.revokeObjectURL(els.player.src);
    els.player.src = url;
    els.tffa.hidden = false;
    els.tffaMs.textContent = String(ms);
    els.tffaNote.textContent = fileSeen.size
      ? "(included first-run model download — generate again for pure inference time)"
      : "(pure inference — model was cached)";
    setStatus(`Done: ${audio.audio.length / 24000 > 1 ? (audio.audio.length / 24000).toFixed(1) + " s of audio" : "audio ready"} at 24 kHz.`);
  } catch (err) {
    setStatus(`Generation failed: ${err.message}`);
  } finally {
    els.go.disabled = false;
  }
}
els.go.addEventListener("click", generate);
els.speed.addEventListener("input", () => {
  els.speedVal.textContent = `${parseFloat(els.speed.value).toFixed(1)}×`;
});

// fallback WAV encoder (RawAudio.toBlob exists in transformers.js ≥3.x; kept for safety)
function rawAudioToWav(rawAudio) {
  const sr = rawAudio.sampling_rate ?? 24000;
  const samples = rawAudio.audio; // Float32Array
  const buf = new ArrayBuffer(44 + samples.length * 2);
  const view = new DataView(buf);
  const w = (off, s) => { for (let i = 0; i < s.length; i++) view.setUint8(off + i, s.charCodeAt(i)); };
  w(0, "RIFF"); view.setUint32(4, 36 + samples.length * 2, true); w(8, "WAVEfmt ");
  view.setUint32(16, 16, true); view.setUint16(20, 1, true); view.setUint16(22, 1, true);
  view.setUint32(24, sr, true); view.setUint32(28, sr * 2, true);
  view.setUint16(32, 2, true); view.setUint16(34, 16, true);
  w(36, "data"); view.setUint32(40, samples.length * 2, true);
  for (let i = 0; i < samples.length; i++) {
    view.setInt16(44 + i * 2, Math.max(-1, Math.min(1, samples[i])) * 0x7fff, true);
  }
  return new Blob([buf], { type: "audio/wav" });
}
