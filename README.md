---
title: Kokoro Tab
emoji: 🔊
colorFrom: green
colorTo: blue
sdk: static
app_file: index.html
short_description: 82M-param TTS entirely in your browser tab
tags:
- tts
- transformers-js
- webgpu
- kokoro
---

# Kokoro Tab

**▶ Try it live:** <https://iamdgarcia-kokoro-tab.static.hf.space> · **Code on GitHub:** <https://github.com/iamdgarcia/kokoro-tab>

Kokoro-82M — a frontier-quality 82-million-parameter text-to-speech model — running
entirely inside your browser tab. No server, no API key, no audio ever uploaded.
Type text, pick a voice, press Generate, and measure **time-to-first-audio** yourself.

## Why this exists

The interesting number is not audio quality — it's *where* the compute happens. A model
that fit a datacenter GPU in 2024 now runs in a WASM sandbox on your laptop, and the
browser tab is the most demanding production environment there is (no install, hostile
hardware variety, strict memory budgets). Kokoro Tab is a live instrument for that claim:

- **TTFA meter** — time from click to audible audio, in ms. First run includes the ~86 MB
  model download (cached by the browser after); subsequent runs show the raw inference cost.
- **28 voices** with real metadata (name, accent, gender) straight from `kokoro-js`.
- **Honest labels** — the model card's own voice grades, where known.

## How it works

- [kokoro-js](https://github.com/hexgrad/kokoro) (by hexgrad/Xenova) wraps ONNX Runtime Web;
  model: [onnx-community/Kokoro-82M-v1.0-ONNX](https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX),
  q8 quantization, WASM device, 24 kHz output.
- Phonemization happens locally (phonemizer); the style vector comes from per-voice `.bin` files
  fetched from the Hub and cached.
- 100% client-side. Nothing you type or hear leaves your machine.

Built by [iamdgarcia](https://huggingface.co/iamdgarcia) — realtime voice agent engineering.
Part of [The Learning Curve](https://github.com/iamdgarcia/the-learning-curve).
