import { pixelsToSeconds } from '../../utils/conversions';

export default class {
  constructor(track) {
    this.track = track;
    this.active = false;
    this.lastqtime = undefined;
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel;
    this.sampleRate = sampleRate;
  }

  emitShift(x) {
    const deltaX = x - this.prevX;
    const deltaTime = pixelsToSeconds(deltaX, this.samplesPerPixel, this.sampleRate);

    const quantizeTime = (( 60 / this.track.bpm ) * this.track.quantize);

    // debugger;
    if (this.track.quantize != 0){

      var varGHtime = Math.round(deltaTime / quantizeTime) * quantizeTime;

      if (varGHtime != this.lastqtime) {    // Galen
        this.prevX = x;  // Galen
        this.track.ee.emit('shift', varGHtime, this.track);  // Galen
        this.lastqtime = varGHtime; // Galen
      }
    }
    else {  // Galen: if the track isn't quantized
      this.prevX = x;  // Galen
      this.track.ee.emit('shift', deltaTime, this.track);  // Galen
      this.lastqtime = varGHtime; // Galen
    }


    // const deltaX = x - this.prevX;
    // const deltaTime = pixelsToSeconds(deltaX, this.samplesPerPixel, this.sampleRate);
    // this.prevX = x;
    // this.track.ee.emit('shift', deltaTime, this.track);
  }

  complete(x) {
    this.emitShift(x);
    this.active = false;
  }

  mousedown(e) {
    e.preventDefault();

    this.active = true;
    this.el = e.target;
    this.prevX = e.offsetX;
  }

  mousemove(e) {
    if (this.active) {
      e.preventDefault();
      this.emitShift(e.offsetX);
    }
  }

  mouseup(e) {
    if (this.active) {
      e.preventDefault();
      this.complete(e.offsetX);
    }
  }

  mouseleave(e) {
    if (this.active) {
      e.preventDefault();
      this.complete(e.offsetX);
    }
  }

  static getClass() {
    return '.state-shift';
  }

  static getEvents() {
    return ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];
  }
}
