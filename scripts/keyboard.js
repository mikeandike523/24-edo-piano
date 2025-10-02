// QWERTY-shaped UI mapping of semitones and quarter-tones (C4 on 'Z')
// Vertical meaning per column (bottom→top):
//   natural → natural+qt (↑) → sharp → sharp+qt (♯↑)
// For E and B columns, there is no sharp/sharp+qt (they are the semitone boundaries).

export const A4 = 440;
export const A4_MIDI = 69;
export const midiOfC4 = 60;

const NAT12 = ['C','C#','D','D#','E','F','F#','G','G#','A','A#','B'];

// Base columns we draw across the screen (starting at C4 on 'Z'):
// semitone offsets from C: C(0), D(2), E(4), F(5), G(7), A(9), B(11), C5(12), D5(14), E5(16)
const COLUMN_SEMITONES = [0,2,4,5,7,9,11,12,14,16];

// QWERTY rows’ visible keys per column (undefined = empty slot to keep alignment)
const ROW_BOTTOM =        ['Z','X','C','V','B','N','M',',','.','/'];                 // natural
const ROW_ALEFT  =        ['S','D','F','G','H','J','K','L',';'];                     // natural + qt (↑)
const ROW_QLEFT  =        ['W','E',undefined,'T','Y','U',undefined,'O','P',undefined]; // sharp
const ROW_NUM    =        ['2','3',undefined,'5','6','7',undefined,'9','0',undefined]; // sharp + qt (♯↑)

// Expose key->qIndex mapping (filled at build time)
export const keyToIndex = new Map();

export function normalizeKey(k){ return k.length===1 ? k.toUpperCase() : k; }

function name12(semi){ return NAT12[((semi%12)+12)%12]; }
function labelNatural(semi){ return name12(semi).replace('#',''); } // show natural letter only
function labelSharp(semi){ return name12(semi).replace('#','♯'); }  // pretty sharp

/**
 * Build the QWERTY-shaped keyboard with semitone and quarter-tone mapping.
 * @param {HTMLElement} container
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onDown
 * @param {(note:{midi:number,qstep:number}, pcKey:string)=>void} onUp
 */
export function buildQwertyKeyboard(container, onDown, onUp){
  container.innerHTML = '';
  container.classList.add('keyboard');

  // Helper to make a row
  const makeRow = (className) => {
    const row = document.createElement('div');
    row.className = `kb-row ${className}`;
    container.appendChild(row);
    return row;
  };

  const rowBottom = makeRow('bottom'); // naturals
  const rowAleft  = makeRow('aleft');  // natural + qt
  const rowQleft  = makeRow('qleft');  // sharps
  const rowNum    = makeRow('num');    // sharp + qt

  // Clear mapping first
  keyToIndex.clear();

  // Iterate columns left→right
  for (let col = 0; col < COLUMN_SEMITONES.length; col++){
    const semi = COLUMN_SEMITONES[col];

    // Bottom row: natural (no quarter-tone)
    addKey(rowBottom, ROW_BOTTOM[col], 'natural',
      midiOfC4 + semi, 0,
      labelNatural(semi));

    // A row: natural + quarter-tone (↑)
    if (ROW_ALEFT[col]){
      addKey(rowAleft, ROW_ALEFT[col], 'halfsharp',
        midiOfC4 + semi, 1,
        labelNatural(semi) + '↑');
    } else {
      addSpacer(rowAleft);
    }

    // Q row: sharp, unless this is E or B column (no sharp)
    if (ROW_QLEFT[col]){
      addKey(rowQleft, ROW_QLEFT[col], 'sharp',
        midiOfC4 + semi + 1, 0,
        labelSharp(semi+1));
    } else {
      addSpacer(rowQleft);
    }

    // Number row: sharp + quarter-tone (♯↑)
    if (ROW_NUM[col]){
      addKey(rowNum, ROW_NUM[col], 'halfsharp',
        midiOfC4 + semi + 1, 1,
        labelSharp(semi+1) + '↑');
    } else {
      addSpacer(rowNum);
    }
  }

  function addKey(row, pcKey, kind, midi, qstep, label){
    const div = document.createElement('div');
    div.className = 'key';
    div.dataset.kind = kind;
    div.dataset.midi = String(midi);
    div.dataset.qstep = String(qstep);
    div.dataset.key = pcKey;
    div.innerHTML = `
      <div class="label">${label}</div>
      <div class="sub">${pcKey}</div>
    `;
    div.addEventListener('pointerdown', (e)=>{ e.preventDefault(); onPointer('down', div); });
    window.addEventListener('pointerup', ()=> onPointer('up', div));
    row.appendChild(div);

    keyToIndex.set(pcKey, { midi, qstep });
  }

  // keeps gaps aligned visually
  function addSpacer(row){
    const spacer = document.createElement('div');
    spacer.style.width = '44px';
    spacer.style.height = '100%';
    spacer.style.opacity = '0';
    row.appendChild(spacer);
  }

  function onPointer(dir, el){
    const q = +el.dataset.qindex;
    const pc = el.dataset.key;
    if (dir==='down'){ el.classList.add('active'); onDown(q, pc); }
    else { el.classList.remove('active'); onUp(q, pc); }
  }
}
