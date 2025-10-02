// Keyboard layout & quarter-tone labeling utilities

export const STEPS_PER_OCT = 24; // 24-TET
export const A4 = 440;
export const A4_MIDI = 69;
export const midiOfC4 = 60;
const NATURAL_NAMES = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Visual/PC layout rows
export const KEY_ROWS = [
  [..."ZXCVBNM,./"],
  [..."ASDFGHJKL;"],
  [..."QWERTYUIOP"],
  [..."1234567890"]
];
export const KEY_SEQUENCE = KEY_ROWS.flat();
export const keyToIndex = new Map(KEY_SEQUENCE.map((k,i)=>[k,i]));

export function labelForQuarterIndex(qIndexFromC4){
  const semitone = Math.floor(qIndexFromC4/2);
  const quarter = qIndexFromC4 % 2; // even=semitone, odd=between
  const name12 = NATURAL_NAMES[((semitone%12)+12)%12];
  let name = name12;
  let kind = 'natural';

  const isSharp = name.includes('#');
  if (quarter===1){
    // Half-sharp marker from the lower semitone
    kind = 'halfsharp';
    name = name12.replace('#','♯') + '↑';
  } else {
    if (isSharp){ kind='sharp'; name = name.replace('#','♯'); }
    else { kind='natural'; }
  }
  return {name, kind};
}

export function buildKeyboard(container, onDown, onUp){
  container.innerHTML = '';
  KEY_ROWS.forEach((rowChars, rowIdx)=>{
    const rowDiv = document.createElement('div');
    rowDiv.className = 'row';
    rowChars.forEach((ch, i)=>{
      const idx = KEY_ROWS.slice(0,rowIdx).reduce((a,arr)=>a+arr.length,0) + i;
      const {name, kind} = labelForQuarterIndex(idx);
      const keyDiv = document.createElement('div');
      keyDiv.className = 'key';
      keyDiv.dataset.key = ch;
      keyDiv.dataset.index = idx;
      keyDiv.dataset.kind = kind;
      keyDiv.innerHTML = `
        <div class="label">${name}</div>
        <div class="sub">${ch}</div>
      `;
      keyDiv.addEventListener('pointerdown', (e)=>{
        e.preventDefault();
        onDown(idx, ch);
        keyDiv.classList.add('active');
      });
      window.addEventListener('pointerup', ()=>{
        onUp(idx, ch);
        keyDiv.classList.remove('active');
      });
      rowDiv.appendChild(keyDiv);
    });
    container.appendChild(rowDiv);
  });
}

export function setActiveKeyVisual(rootEl, ch, on){
  const el = rootEl.querySelector(`.key[data-key="${ch}"]`);
  if (!el) return;
  el.classList.toggle('active', on);
}

export function normalizeKey(k){ return k.length===1 ? k.toUpperCase() : k; }
