import { pixelsToSeconds } from '../../utils/conversions';

export default class {
  constructor(track) {
    this.track = track;
    // 0 : not dragging; 1 : dragging the end; -1 : dragging the begining
    this.draggingFrom = 0;
    this.action = null;
  }

  setup(samplesPerPixel, sampleRate) {
    this.samplesPerPixel = samplesPerPixel;
    this.sampleRate = sampleRate;
  }

  emitShift(x) {
    const deltaX = x - this.prevX;
    const deltaTime = pixelsToSeconds(deltaX, this.samplesPerPixel, this.sampleRate);
    this.prevX = x;
    this.track.ee.emit('shift', deltaTime, this.track);
  }

  mousedown(e) {
    e.preventDefault();

    if (this.action == "dragable"){

      const mousepos = pixelsToSeconds(e.offsetX, this.samplesPerPixel, this.sampleRate);
      
      if (Math.abs(mousepos-this.track.startTime) < .4){
        this.draggingFrom = -1;
        this.action = "droppable";
      }

      if (Math.abs(mousepos-this.track.endTime) < .4){
        this.draggingFrom = 1;
        this.action = "droppable";
      }    
    }
    // console.log(this.track);
  }

  mousemove(e) {
 
    const mousepos = pixelsToSeconds(e.offsetX, this.samplesPerPixel, this.sampleRate);
    
    // console.log(mousepos-this.track.startTime);
    if (this.action == "droppable"){
      this.updateDrag(e);
    }
    else if (Math.abs(mousepos-this.track.startTime) < .4){
      this.action = "dragable"
      document.body.style.cursor = "e-resize";
    }
    else if (Math.abs(mousepos-this.track.endTime) < .4){
      this.action = "dragable"
      document.body.style.cursor = "w-resize";
    }
    else{
      this.action = null;
      document.body.style.cursor = "auto";
    }
    // console.log(this.action);
  }

  mouseleave = e => this.mousemove(e);

  updateDrag(e){
    const mousepos = pixelsToSeconds(e.offsetX, this.samplesPerPixel, this.sampleRate);
    if (this.draggingFrom == -1){
      const oldStartTime = this.track.startTime;
      const oldCueIn = this.track.cueIn;
      if (oldCueIn + (mousepos - oldStartTime) < 0)return;
      this.track.startTime = mousepos;
      this.track.cueIn = oldCueIn + (mousepos - oldStartTime);
      this.duration = this.track.cueOut - this.track.cueIn;
      this.endTime = this.startTime + this.duration;
    }
    if (this.draggingFrom == 1){
      this.track.trim(this.track.getStartTime(), mousepos);
      this.track.endTime = mousepos;   
    }
    this.track.ee.emit("interactive",this.track);
  }
  mouseup(e) {
    if (this.action == "droppable") {
      e.preventDefault();
      this.updateDrag(e);
      this.action = null;
      // console.log("dropped");
    }
  }

  static getClass() {
    return '.state-interactive';
  }

  static getEvents() {
    return ['mousedown', 'mousemove', 'mouseup', 'mouseleave'];
  }
}
