/*
* virtual-dom hook for drawing to the canvas element.
*/
import { secondsToPixels, secondsToSamples } from '../utils/conversions';


class CanvasHook {
  constructor(peaks, offset, bits, color, cueIn, resolution, sampleRate, image) {
    this.cueIn = cueIn;
    this.resolution = resolution;
    this.sampleRate = sampleRate;
    this.peaks = peaks;
    // http://stackoverflow.com/questions/6081483/maximum-size-of-a-canvas-element
    this.offset = offset;
    this.color = color;
    this.bits = bits;
    this.bufferedwaveform = image;
    this.bwc = undefined; // BufferedWaveformContext
  }

  static drawFrame(cc, h2, x, minPeak, maxPeak) {
    const min = Math.abs(minPeak * h2);
    const max = Math.abs(maxPeak * h2);

    // draw max
    cc.fillRect(x, 0, 1, h2 - max);
    // draw min
    cc.fillRect(x, h2 + min, 1, h2 - min);
  }

  drawCanvas (cc, len, h2){
    const maxValue = 2 ** (this.bits - 1);

    cc.clearRect(0, 0, len, h2*2);
    // cc.fillStyle = "black";
    // cc.fillRect(0,0,len,h2*2);
    cc.fillStyle = this.color;
    // console.log(this.color);
    for (let i = 0; i < len; i += 1) {
      const minPeak = this.compressValue(this.peaks[i * 2] / maxValue);
      const maxPeak = this.compressValue(this.peaks[i * 2 + 1] / maxValue);
      
      CanvasHook.drawFrame(cc, h2, i, minPeak, maxPeak);
    }
  }
  compressValue(val){
  
    if (Math.abs(val) < 0.1){
      val *= 1.6;
    }
    else if (Math.abs(val) < 0.2){
      val *= 1.5;
    }
    else if (Math.abs(val) < 0.3){
      val *= 1.4;
    }
    else if (Math.abs(val) < 0.4){
      val *= 1.3;
    }
    else if (Math.abs(val) <= 0.6){
      val *= 1.2
    }
    return val;
  }

  getImage() {
    return this.bufferedwaveform;
  }
  setupImage(width, height){
    this.bufferedwaveform = document.createElement('canvas');
    this.bufferedwaveform.width = width;
    this.bufferedwaveform.height = height;
    // console.log(this.bufferedwaveform);
    console.log("redraw");
    this.bwc = this.bufferedwaveform.getContext('2d');
    this.drawCanvas(this.bwc,width,height/2);
    return this.bufferedwaveform;
  }

  hook(canvas, prop, prev) {
    // canvas is up to date

    const len = canvas.width;
    const cc = canvas.getContext('2d');
    const h2 = canvas.height / 2;

    if (!this.bufferedwaveform)
      this.setupImage(this.peaks.length,h2*2);

    cc.clearRect(0,0,canvas.width,canvas.height);
    const offsettotal = secondsToPixels(-this.cueIn,this.resolution,this.sampleRate);

    cc.drawImage(this.bufferedwaveform,offsettotal,0);
    
  }
}

export default CanvasHook;
