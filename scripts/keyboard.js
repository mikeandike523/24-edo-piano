// Piano-like QWERTY mapping for 12-TET + quarter-tones (C4 on 'Z')
// Whites: Z X C V B N M , (C D E F G A B C)
// Blacks: W E   T Y U    (C# D#   F# G# A#)
// Quarter-tones (half-sharp ↑): S D   F G H  and  2 3   5 6 7

export const A4 = 440;
export const A4_MIDI = 69;
export const midiOfC4 = 60;

const NAT12 = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

export function normalizeKey(k){ return k.length===1 ? k.toUpperCase() : k; }
function name12(semi){ return NAT12[((semi%12)+12)%12]; }
function labelNatural(semi){ return name12(semi).replace('#',''); } // show natural letter only
function labelSharp(semi){ return name12(semi).replace('#','♯'); }  // pretty sharp

// Expose key->note mapping for runtime keyboard input
export const keyToIndex = new Map();

/**
 * Explicit per-key bindings (relative to C4 on 'Z').
 * semi = semitone offset from C4; qstep = 0 (normal) or 1 (quarter up).
 * kind controls key color: natural | sharp | halfsharp | inactive
 */
const BINDINGS = [
  // ===== 12-tone (whites / blacks) =====
  // Whites (bottom row)
  { pc:'Z', semi: 0, qstep:0, kind:'natural',   label: labelNatural(0) },   // C
  { pc:'X', semi: 2, qstep:0, kind:'natural',   label: labelNatural(2) },   // D
  { pc:'C', semi: 4, qstep:0, kind:'natural',   label: labelNatural(4) },   // E
  { pc:'V', semi: 5, qstep:0, kind:'natural',   label: labelNatural(5) },   // F
  { pc:'B', semi: 7, qstep:0, kind:'natural',   label: labelNatural(7) },   // G
  { pc:'N', semi: 9, qstep:0, kind:'natural',   label: labelNatural(9) },   // A
  { pc:'M', semi:11, qstep:0, kind:'natural',   label: labelNatural(11) },  // B
  { pc:',', semi:12, qstep:0, kind:'natural',   label: labelNatural(12) },  // C (next octave)

  // Blacks (Q row)
  { pc:'W', semi: 1, qstep:0, kind:'sharp',     label: labelSharp(1) },     // C#
  { pc:'E', semi: 3, qstep:0, kind:'sharp',     label: labelSharp(3) },     // D#
  { pc:'T', semi: 6, qstep:0, kind:'sharp',     label: labelSharp(6) },     // F#
  { pc:'Y', semi: 8, qstep:0, kind:'sharp',     label: labelSharp(8) },     // G#
  { pc:'U', semi:10, qstep:0, kind:'sharp',     label: labelSharp(10) },    // A#

  // ===== Quarter-tones (half-sharp ↑) =====
  // Quarter above whites that have a black to their right (piano-like): C, D, F, G, A
  { pc:'S', semi: 0, qstep:1, kind:'halfsharp', label: labelNatural(0)  + '↑' }, // C+0.5
  { pc:'D', semi: 2, qstep:1, kind:'halfsharp', label: labelNatural(2)  + '↑' }, // D+0.5
  { pc:'F', semi: 5, qstep:1, kind:'halfsharp', label: labelNatural(5)  + '↑' }, // F+0.5
  { pc:'G', semi: 7, qstep:1, kind:'halfsharp', label: labelNatural(7)  + '↑' }, // G+0.5
  { pc:'H', semi: 9, qstep:1, kind:'halfsharp', label: labelNatural(9)  + '↑' }, // A+0.5

  // Quarter above sharps: C#, D#, F#, G#, A#
  { pc:'2', semi: 1, qstep:1, kind:'halfsharp', label: labelSharp(1)   + '↑' }, // C# +0.5
  { pc:'3', semi: 3, qstep:1, kind:'halfsharp', label: labelSharp(3)   + '↑' }, // D# +0.5
  { pc:'5', semi: 6, qstep:1, kind:'halfsharp', label: labelSharp(6)   + '↑' }, // F# +0.5
  { pc:'6', semi: 8, qstep:1, kind:'halfsharp', label: labelSharp(8)   + '↑' }, // G# +0.5
  { pc:'7', semi:10, qstep:1, kind:'halfsharp', label: labelSharp(10)  + '↑' }, // A# +0.5
];

// Set of active PC keys for quick lookup
const ACTIVE_KEYS = new Set(BINDINGS.map(b => b.pc));

// Screen rows for the *visual* keyboard (kept full for realism)
const ROW_NUM_FULL    = ['1','2','3','4','5','6','7','8','9','0'];
const ROW_QLEFT_FULL  = ['Q','W','E','R','T','Y','U','I','O','P'];
const ROW_ALEFT_FULL  = ['A','S','D','F','G','H','J','K','L',';'];
const ROW_BOTTOM_FULL = ['Z','X','C','V','B','N','M',',','.','/'];

/**
 * Build the piano-like QWERTY keyboard per the mapping above.
 * @param {HTMLElement} container
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onDown
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onUp
 */
export function buildQwertyKeyboard(container, onDown, onUp){
  container.innerHTML = '';
  container.classList.add('keyboard');

  const makeRow = (className) => {
    const row = document.createElement('div');
    row.className = `kb-row ${className}`;
    container.appendChild(row);
    return row;
  };

  // Append rows in visual order: top -> bottom
  const rowNum    = makeRow('num');    // number row (top)
  const rowQleft  = makeRow('qleft');  // QWERTY row
  const rowAleft  = makeRow('aleft');  // ASDF row
  const rowBottom = makeRow('bottom'); // ZXCV row (bottom)

  keyToIndex.clear();

  // Helper to drop a key (active or inactive)
  const addActiveKey = (row, binding) => {
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind  = binding.kind;
    div.dataset.midi  = String(midiOfC4 + binding.semi);
    div.dataset.qstep = String(binding.qstep);
    div.dataset.key   = binding.pc;
    div.innerHTML = `
      <div class="label">${binding.label}</div>
      <div class="sub">${binding.pc}</div>
    `;
    div.addEventListener('pointerdown', (e)=>{ e.preventDefault(); onPointer('down', div); });
    window.addEventListener('pointerup', ()=> onPointer('up', div));
    row.appendChild(div);
    keyToIndex.set(binding.pc, { midi: midiOfC4 + binding.semi, qstep: binding.qstep });
  };

  const addInactiveKey = (row, pcKey) => {
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind = 'inactive';
    div.dataset.key = pcKey;
    div.innerHTML = `
      <div class="label">${pcKey}</div>
      <div class="sub">—</div>
    `;
    row.appendChild(div);
    // Not added to keyToIndex => no synth trigger
  };

  // Utility: get binding for a pc key
  const byPC = new Map(BINDINGS.map(b => [b.pc, b]));

  // Render rows left→right
  for (let i=0; i<ROW_BOTTOM_FULL.length; i++){
    const pc = ROW_BOTTOM_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowBottom, b); else addInactiveKey(rowBottom, pc);
  }
  for (let i=0; i<ROW_ALEFT_FULL.length; i++){
    const pc = ROW_ALEFT_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowAleft, b); else addInactiveKey(rowAleft, pc);
  }
  for (let i=0; i<ROW_QLEFT_FULL.length; i++){
    const pc = ROW_QLEFT_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowQleft, b); else addInactiveKey(rowQleft, pc);
  }
  for (let i=0; i<ROW_NUM_FULL.length; i++){
    const pc = ROW_NUM_FULL[i];
    const b = byPC.get(pc);
    if (b) addActiveKey(rowNum, b); else addInactiveKey(rowNum, pc);
  }

  function onPointer(dir, el){
    const pc = el.dataset.key;
    const midi  = +el.dataset.midi;
    const qstep = +el.dataset.qstep;
    if (dir==='down'){
      if (!isNaN(midi)) { // ignore inactive
        el.classList.add('active');
        onDown({midi,qstep}, pc);
      }
    } else {
      el.classList.remove('active');
      if (!isNaN(midi)) onUp({midi,qstep}, pc);
    }
  }
}
