import { buildKeyboard, keyToIndex, normalizeKey } from './keyboard.js';
import { QuarterToneSynth } from './synth.js';

const keyboardEl = document.getElementById('keyboard');
const scopeEl = document.getElementById('scope');

const synth = new QuarterToneSynth(scopeEl);

// Build UI keyboard
buildKeyboard(
  keyboardEl,
  (idx, ch) => { synth.noteOnByIndex(idx, ch); setActive(ch, true); },
  (idx, ch) => { synth.noteOffByIndex(idx, ch); setActive(ch, false); },
);

// Wire controls
const el = {
  wave: document.getElementById('wave'),
  attack: document.getElementById('attack'),
  decay: document.getElementById('decay'),
  sustain: document.getElementById('sustain'),
  release: document.getElementById('release'),
  volume: document.getElementById('volume'),
  octave: document.getElementById('octave'),
  attackVal: document.getElementById('attackVal'),
  decayVal: document.getElementById('decayVal'),
  sustainVal: document.getElementById('sustainVal'),
  releaseVal: document.getElementById('releaseVal'),
  volumeVal: document.getElementById('volumeVal'),
  octaveVal: document.getElementById('octaveVal'),
};

function syncLabels(){
  el.attackVal.textContent = (+el.attack.value).toFixed(2);
  el.decayVal.textContent = (+el.decay.value).toFixed(2);
  el.sustainVal.textContent = (+el.sustain.value).toFixed(2);
  el.releaseVal.textContent = (+el.release.value).toFixed(2);
  el.volumeVal.textContent = (+el.volume.value).toFixed(2);
  el.octaveVal.textContent = el.octave.value;
}
syncLabels();

['input','change'].forEach(evt=>{
  el.wave.addEventListener(evt, ()=>{
    synth.setWave(el.wave.value);
  });
  el.attack.addEventListener(evt, ()=>{
    const a = +el.attack.value; el.attackVal.textContent = a.toFixed(2);
    synth.setADSR({ ...synth.adsr, a });
  });
  el.decay.addEventListener(evt, ()=>{
    const d = +el.decay.value; el.decayVal.textContent = d.toFixed(2);
    synth.setADSR({ ...synth.adsr, d });
  });
  el.sustain.addEventListener(evt, ()=>{
    const s = +el.sustain.value; el.sustainVal.textContent = s.toFixed(2);
    synth.setADSR({ ...synth.adsr, s });
  });
  el.release.addEventListener(evt, ()=>{
    const r = +el.release.value; el.releaseVal.textContent = r.toFixed(2);
    synth.setADSR({ ...synth.adsr, r });
  });
  el.volume.addEventListener(evt, ()=>{
    const v = +el.volume.value; el.volumeVal.textContent = v.toFixed(2);
    synth.setVolume(v);
  });
  el.octave.addEventListener(evt, ()=>{
    const n = +el.octave.value; el.octaveVal.textContent = el.octave.value;
    synth.setOctave(n);
  });
});

// PC keyboard events
const down = new Set();
window.addEventListener('keydown', async (e)=>{
  if (e.repeat) return;
  const key = normalizeKey(e.key);
  if (key === '['){
    el.octave.value = Math.max(+el.octave.min, +el.octave.value-1);
    el.octave.dispatchEvent(new Event('input'));
    return;
  }
  if (key === ']'){
    el.octave.value = Math.min(+el.octave.max, +el.octave.value+1);
    el.octave.dispatchEvent(new Event('input'));
    return;
  }
  const idx = keyToIndex.get(key);
  if (idx !== undefined){
    e.preventDefault();
    if (down.has(key)) return;
    down.add(key);
    await synth.ensureStarted();
    await synth.noteOnByIndex(idx, key);
    setActive(key, true);
  }
});
window.addEventListener('keyup', (e)=>{
  const key = normalizeKey(e.key);
  const idx = keyToIndex.get(key);
  if (idx !== undefined){
    e.preventDefault();
    down.delete(key);
    synth.noteOffByIndex(idx, key);
    setActive(key, false);
  }
});

// Release any stuck notes when pointer leaves window
document.body.addEventListener('pointerup', ()=> synth.releaseAll());

function setActive(ch, on){
  const elKey = keyboardEl.querySelector(`.key[data-key="${ch}"]`);
  if (!elKey) return;
  elKey.classList.toggle('active', on);
}
