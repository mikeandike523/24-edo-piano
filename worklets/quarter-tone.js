// AudioWorkletProcessor for a polyphonic quarter-tone synth (24-TET)
// No imports needed; loaded via audioWorklet.addModule('/worklets/quarter-tone.js')

class PolyVoice {
  constructor(sampleRate, wave='sine') {
    this.sampleRate = sampleRate;
    this.setWave(wave);
    this.active = false;
    this.phase = 0;
    this.freq = 440;
    // Envelope
    this.a = 0.01; this.d = 0.1; this.s = 0.7; this.r = 0.2;
    this.env = 0; this.state = 'idle';
    this.noteId = 0;
  }
  setWave(w){ this.wave = w; }
  setADSR(a,d,s,r){ this.a=a; this.d=d; this.s=s; this.r=r; }
  noteOn(freq, id) {
    this.freq = freq;
    this.noteId = id;
    this.state = 'attack';
    this.active = true;
  }
  noteOff(id) {
    if (this.active && this.noteId === id) this.state = 'release';
  }
  process() {
    if (!this.active) return 0;
    const sr = this.sampleRate;
    const inc = 2*Math.PI * this.freq / sr;
    this.phase += inc;
    if (this.phase > 2*Math.PI) this.phase -= 2*Math.PI;

    let s;
    switch(this.wave){
      case 'square': s = this.phase < Math.PI ? 1 : -1; break;
      case 'sawtooth': s = 2*(this.phase/(2*Math.PI)) - 1; break;
      case 'triangle': s = 2*Math.abs(2*(this.phase/(2*Math.PI)) - 1) - 1; break;
      default: s = Math.sin(this.phase);
    }

    const aSamp = Math.max(1, this.a * sr);
    const dSamp = Math.max(1, this.d * sr);
    const rSamp = Math.max(1, this.r * sr);

    if (this.state === 'attack') {
      this.env += 1 / aSamp;
      if (this.env >= 1) { this.env = 1; this.state = 'decay'; }
    } else if (this.state === 'decay') {
      const step = (1 - this.s) / dSamp;
      this.env -= step;
      if (this.env <= this.s) { this.env = this.s; this.state = 'sustain'; }
    } else if (this.state === 'sustain') {
      // hold
    } else if (this.state === 'release') {
      this.env -= 1 / rSamp;
      if (this.env <= 0) { this.env = 0; this.state = 'idle'; this.active=false; }
    }

    return s * this.env;
  }
}

class QuarterToneProcessor extends AudioWorkletProcessor {
  static get parameterDescriptors() {
    return [{name:'volume', defaultValue:0.8, minValue:0, maxValue:1}];
  }
  constructor(){
    super();
    this.voices = Array.from({length:16}, ()=> new PolyVoice(sampleRate,'sawtooth'));
    this.wave='sawtooth';
    this.adsr = {a:0.01,d:0.1,s:0.7,r:0.2};

    this.port.onmessage = (e)=>{
      const {type, data} = e.data;
      if (type==='noteOn'){
        const {freq, id} = data;
        const v = this._findFreeVoice();
        v.setWave(this.wave);
        v.setADSR(this.adsr.a, this.adsr.d, this.adsr.s, this.adsr.r);
        v.noteOn(freq, id);
      } else if (type==='noteOff'){
        const {id} = data;
        this.voices.forEach(v=>v.noteOff(id));
      } else if (type==='wave'){
        this.wave = data;
      } else if (type==='adsr'){
        this.adsr = data;
      }
    };
  }
  _findFreeVoice(){
    return this.voices.find(v=>!v.active) || this.voices[0];
  }
  process(inputs, outputs, parameters){
    const output = outputs[0];
    const volume = parameters.volume.length>1 ? parameters.volume : [parameters.volume[0]];
    for (let ch=0; ch<output.length; ch++){
      const out = output[ch];
      for (let i=0; i<out.length; i++){
        let s=0;
        for (let v of this.voices){ s += v.process(); }
        out[i] = s * (volume[Math.min(i, volume.length-1)] || volume[0]) * 0.25; // headroom
      }
    }
    return true;
  }
}

registerProcessor('quarter-tone', QuarterToneProcessor);
