import { FADEIN, FADEOUT, createFadeIn, createFadeOut } from 'fade-maker';
import Tuna from 'tunajs';


export default class {

  constructor(ac, buffer) {
    this.ac = ac;
    this.tuna = new Tuna(this.ac);
    this.gain = 1;
    this.buffer = buffer;
    this.destination = this.ac.destination;

    // this.chorus =  new this.tuna.Chorus({
    //   rate: 1.5,         //0.01 to 8+
    //   feedback: 0.2,     //0 to 1+
    //   delay: 0.0245,     //0 to 1
    //   bypass: 0          //the value 1 starts the effect as bypassed, 0 or 1
    // });

    this.overdrive =  new this.tuna.Overdrive({
      outputGain: 0,           //-42 to 0 in dB
      drive: 1,              //0 to 1
      curveAmount: 1,          //0 to 1
      algorithmIndex: 4,       //0 to 5, selects one of our drive algorithms
      bypass: 0
    });

    this.bitcrusher =  new this.tuna.Bitcrusher({
      bits: 3,          //1 to 16
      normfreq: 0.1,    //0 to 1
      bufferSize: 4096  //256 to 16384
    });

    this.lowpass = new this.tuna.Filter({
      frequency: 4000, //20 to 22050
      Q: 1, //0.001 to 100
      gain: 0, //-40 to 40 (in decibels)
      filterType: "lowpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    });

    this.hipass = new this.tuna.Filter({
      frequency: 6000, //20 to 22050
      Q: 1, //0.001 to 100
      gain: 0, //-40 to 40 (in decibels)
      filterType: "highpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    });

    this.bandpass = new this.tuna.Filter({
      frequency: 100, //20 to 22050
      Q: 1, //0.001 to 100
      gain: 0, //-40 to 40 (in decibels)
      filterType: "bandpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
      bypass: 0
    });
    
  //   this.cabinet = new this.tuna.Cabinet({
  //     makeupGain: 1,                                 //0 to 20
  //     impulsePath: "impulses/impulse_guitar.wav",    //path to your speaker impulse
  //     bypass: 0
  // });

  


  }

  applyFade(type, start, duration, shape = 'logarithmic') {
    if (type === FADEIN) {
      createFadeIn(this.fadeGain.gain, shape, start, duration);
    } else if (type === FADEOUT) {
      createFadeOut(this.fadeGain.gain, shape, start, duration);
    } else {
      throw new Error('Unsupported fade type');
    }
  }

  applyFadeIn(start, duration, shape = 'logarithmic') {
    this.applyFade(FADEIN, start, duration, shape);
  }

  applyFadeOut(start, duration, shape = 'logarithmic') {
    this.applyFade(FADEOUT, start, duration, shape);
  }

  isPlaying() {
    return this.source !== undefined;
  }

  getDuration() {
    return this.buffer.duration;
  }

  setAudioContext(audioContext) {
    this.ac = audioContext;
    this.destination = this.ac.destination;
  }

  setUpEffect(chain,effectname){
    if(this[`toggle_${effectname}`]){
      const effect = this[effectname];
      if (effect.mybypass){
        const gainBypass = this.ac.createGain();
        gainBypass.value = Math.sqrt(effect.mybypass);
        const gainEffect = this.ac.createGain();
        gainEffect.value = Math.sqrt(1-effect.mybypass);
      }
      else{
        tunachain.connect(effect);
        tunachain = effect;
      }
      return tunachain
    }
  }

  setUpSource(compressor) {
    this.source = this.ac.createBufferSource();
    this.source.buffer = this.buffer;

    const sourcePromise = new Promise((resolve) => {
      // keep track of the buffer state.
      this.source.onended = () => {
        this.source.disconnect();
        this.fadeGain.disconnect();
        this.volumeGain.disconnect();
        this.shouldPlayGain.disconnect();
        this.masterGain.disconnect();
        this.panner.disconnect();


        this.source = undefined;
        this.fadeGain = undefined;
        this.volumeGain = undefined;
        this.shouldPlayGain = undefined;
        this.masterGain = undefined;
        this.panner = undefined;

        resolve();
      };
    });

    this.fadeGain = this.ac.createGain();
    // used for track volume slider
    this.volumeGain = this.ac.createGain();
    // used for solo/mute
    this.shouldPlayGain = this.ac.createGain();
    
    
    this.panner = this.ac.createStereoPanner();


    // console.log('playout', this.delay);
    
    
    this.masterGain = this.ac.createGain();


    this.source
      .connect(this.fadeGain)
      .connect(this.panner)

    let tunachain = this.panner;
    if (this.toggle_delay){
      tunachain.connect(this.delay);  
      tunachain = this.delay;
    }
    if(this.toggle_phaser){
      tunachain.connect(this.bitcrusher);
      tunachain = this.bitcrusher;
    }
    if(this.toggle_lowpass){
      tunachain.connect(this.lowpass);
      tunachain = this.lowpass;
    }
    tunachain.connect(this.volumeGain);

    this.volumeGain
      .connect(this.shouldPlayGain)
      .connect(this.masterGain)
      .connect(compressor)
      .connect(this.destination)



    return sourcePromise;
  }
  get dBSource(){
    return this.masterGain;
  }

  setVolumeGainLevel(level) {
    if (this.volumeGain) {
      this.volumeGain.gain.value = level;
    }
  }

  setShouldPlay(bool) {
    if (this.shouldPlayGain) {
      this.shouldPlayGain.gain.value = bool ? 1 : 0;
    }
  }

  setMasterGainLevel(level) {
    if (this.masterGain) {
      this.masterGain.gain.value = level;
    }
  }
  setPan(pan){
    if (this.panner){
      this.panner.pan.value = pan;
    }
  }

  /*
    source.start is picky when passing the end time.
    If rounding error causes a number to make the source think
    it is playing slightly more samples than it has it won't play at all.
    Unfortunately it doesn't seem to work if you just give it a start time.
  */
  play(when, start, duration) {
    this.source.start(when, start, duration);
  }

  stop(when = 0) {
    if (this.source) {
      try{
        this.source.stop(when);
      }
      catch(e){}
    }
  }
}
