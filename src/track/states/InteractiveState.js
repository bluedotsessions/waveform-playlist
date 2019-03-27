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
    const mousepos = pixelsToSeconds(e.offsetX, this.samplesPerPixel, this.sampleRate);

    if (this.action == "fadedraggable"){
      // console.log("trueeer");
      this.action = "dragginghandle";
    }
    if (this.action == "dragable"){

      
      if (Math.abs(mousepos-this.track.startTime) < .4){
        this.draggingFrom = -1;
        this.action = "droppable";
      }

      if (Math.abs(mousepos-this.track.endTime) < .4){
        this.draggingFrom = 1;
        this.action = "droppable";
      }    
    }
    if (this.action == "scrolldraggable"){
      if (mousepos < this.track.startTime || mousepos > this.track.endTime){
        this.action = "scrolldragging";
        this.track.ee.emit("scrolldraggingstart");
      }
    }
    // console.log(this.track);
  }
  correctOffset(e){
    if (e.target.classList.contains('playlist-overlay')){
      return e.offsetX;
    }
    else{
      //sorry :/ 
      //this is to select the div.waveform 
      return e.pageX - e.target.parentElement.parentElement.parentElement.getBoundingClientRect().left;
    }
  }
  
  mousemove(e) {
 
    const mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    // console.log(this.action);
    if (this.action == "dragginghandle"){
      // console.log(mousepos,this.track.getStartTime(),this.track.startTime);
      if (mousepos >= this.track.getStartTime() && mousepos <= this.track.getEndTime()) {
        if (this.hoveringover == "fadein")
          this.track.ee.emit('fadein', mousepos - this.track.getStartTime(), this.track);
        else
          this.track.ee.emit('fadeout', this.track.getEndTime() - mousepos, this.track);
      }
      else{
        this.action = null;
      }
    }
    else if (this.action == "droppable"){
      this.updateDrag(e);
    }
    else if (e.target.classList.contains('fadehandle')){
      // console.log('true');
      this.action = "fadedraggable";

      this.hoveringover = e.target.classList.contains('fadein')?"fadein":"fadeout";
      
      document.body.style.cursor = "pointer";
    }
    else if (this.action == "scrolldragging"){
      this.track.ee.emit("scrolldragging",e.movementX);
    }
    else if (Math.abs(mousepos-this.track.startTime) < .4){
      this.action = "dragable"
      document.body.style.cursor = "e-resize";
    }
    else if (Math.abs(mousepos-this.track.endTime) < .4){
      this.action = "dragable"
      document.body.style.cursor = "w-resize";
    }
    else if (mousepos < this.track.startTime || mousepos > this.track.endTime){
      document.body.style.cursor = "grab";
      this.action = "scrolldraggable";
    }
    else{
      this.action = null;
      document.body.style.cursor = "auto";
      this.mouseup();
    }
    // console.log(this.action);
  }

  mouseleave = e => {
    this.mouseup(e);
    this.mousemove(e);
  };

  updateDrag(e){
    let mousepos = pixelsToSeconds(e.offsetX, this.samplesPerPixel, this.sampleRate);
    if (this.track.quantize){ 
      const blocklength = ( 60 / this.track.bpm ) * this.track.quantize;
      mousepos = Math.round ( mousepos / blocklength)*blocklength;
    }
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
    if (this.action == "dragginghandle"){
      this.action = null;
    }
    else if (this.action == "scrolldragging"){
      this.action = null;
      this.track.ee.emit("scrolldraggingend");
    }
    else if (this.action == "droppable") {
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
