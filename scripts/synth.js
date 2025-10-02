// Audio setup, 24-TET math, oscilloscope drawing, and note routing to the worklet

import { A4, A4_MIDI, midiOfC4, STEPS_PER_OCT } from './keyboard.js';

const workletURL = '/worklets/quarter-tone.js';

export class QuarterToneSynth {
  constructor(scopeCanvas){
    this.ctx = new (window.AudioContext || window.webkitAudioContext)();
    this.started = false;
    this.synthNode = null;
    this.gain = null;
    this.analyser = null;

    this.wave = 'sawtooth';
    this.adsr = { a:0.01, d:0.1, s:0.7, r:0.2 };
    this.octaveShift = 0;

    this.held = new Map(); // key -> noteId

    this.scopeEl = scopeCanvas;
    this.scopeCtx = scopeCanvas.getContext('2d');
    this._noteUid = 1;

    this._drawScope = this._drawScope.bind(this);
    requestAnimationFrame(this._drawScope);
  }

  async ensureStarted(){
    if (this.ctx.state === 'suspended') await this.ctx.resume();
    if (this.started) return;
    await this.ctx.audioWorklet.addModule(workletURL);
    this.synthNode = new AudioWorkletNode(this.ctx, 'quarter-tone', {
      numberOfOutputs: 1,
      outputChannelCount: [2],
      parameterData: { volume: 0.8 }
    });
    this.gain = this.ctx.createGain();
    this.analyser = this.ctx.createAnalyser();
    this.analyser.fftSize = 2048;

    this.synthNode.connect(this.gain).connect(this.analyser).connect(this.ctx.destination);
    this.started = true;

    // push initial state
    this.setWave(this.wave);
    this.setADSR(this.adsr);
    this.setVolume(0.8);
  }

  setWave(w){
    this.wave = w;
    if (this.synthNode) this.synthNode.port.postMessage({type:'wave', data:w});
  }
  setADSR({a,d,s,r}){
    this.adsr = {a,d,s,r};
    if (this.synthNode) this.synthNode.port.postMessage({type:'adsr', data:this.adsr});
  }
  setVolume(v){
    if (this.synthNode) this.synthNode.parameters.get('volume').setValueAtTime(v, this.ctx.currentTime);
  }
  setOctave(n){ this.octaveShift = n|0; }

  nextNoteId(){ return this._noteUid++; }

  // frequency from quarter-tone offset relative to C4
  freqFromQuarterIndex(qIndexFromC4){
    const semisFromC4 = qIndexFromC4/2;
    const midi = midiOfC4 + semisFromC4;
    return A4 * Math.pow(2, (midi - A4_MIDI)/12);
  }

  currentBaseQuarterIndex(){ return this.octaveShift * STEPS_PER_OCT; }

  async noteOnByIndex(idx, keyName){
    await this.ensureStarted();
    const id = this.nextNoteId();
    const fq = this.freqFromQuarterIndex(this.currentBaseQuarterIndex() + idx);
    this.held.set(keyName, id);
    this.synthNode.port.postMessage({type:'noteOn', data:{freq: fq, id}});
  }

  noteOffByIndex(idx, keyName){
    const id = this.held.get(keyName);
    if (id){
      this.synthNode.port.postMessage({type:'noteOff', data:{id}});
      this.held.delete(keyName);
    }
  }

  releaseAll(){
    // Used when mouse is released outside keys etc.
    this.held.forEach((id)=> {
      this.synthNode?.port.postMessage({type:'noteOff', data:{id}});
    });
    this.held.clear();
  }

  _drawScope(){
    requestAnimationFrame(this._drawScope);
    const a = this.analyser;
    if (!a) return;
    const W = this.scopeEl.width = this.scopeEl.clientWidth * devicePixelRatio;
    const H = this.scopeEl.height = this.scopeEl.clientHeight * devicePixelRatio;
    const buf = new Uint8Array(a.fftSize);
    a.getByteTimeDomainData(buf);

    const g = this.scopeCtx;
    g.fillStyle = '#0b1117';
    g.fillRect(0,0,W,H);
    g.strokeStyle = '#79ffe1';
    g.lineWidth = 2 * devicePixelRatio;
    g.beginPath();
    const step = W / buf.length;
    for (let i=0;i<buf.length;i++){
      const y = (buf[i]/255)*H;
      if (i===0) g.moveTo(0,y);
      else g.lineTo(i*step, y);
    }
    g.stroke();
  }
}
