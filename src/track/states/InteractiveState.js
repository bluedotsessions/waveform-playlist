import { pixelsToSeconds } from '../../utils/conversions';

export default class {
  constructor(clip) {
    this.clip = clip;
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
    this.clip.ee.emit('shift', deltaTime, this.clip);
  }

  mousedown(e) {
    e.preventDefault();
    const mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    // console.log("mousedown",this.action);
    if (this.action == "fadedraggable"){
      this.action = "dragginghandle";
    }
    else if (this.action == "resizeable"){
      if (Math.abs(mousepos) < .4){
        this.draggingFrom = -1; // left
        this.action = "resizing";
      }
      else {
        this.draggingFrom = 1; //right
        this.action = "resizing";
      }    
    }
    else if (this.action == "scrolldraggable"){
      if (mousepos < 0 || mousepos > this.clip.duration){
        this.action = "scrolldraggingcandidate";
        this.clip.ee.emit("scrolldraggingstart");
      }
    }
    // console.log(this.clip);
  }
  correctOffset(e){
    if (e.target.classList.contains('playlist-overlay')){
      return e.offsetX-15;
    }
    else{
      return e.pageX - e.target.parentElement.parentElement.getBoundingClientRect().left;
    }
  }
  
  mousemove(e) {
    
    const mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    // console.log(this.action);
    if (this.action == "dragginghandle"){
      // console.log(mousepos,this.clip.getStartTime(),this.clip.startTime);
      if (mousepos >= 0 && mousepos <= this.clip.duration) {
        if (this.hoveringover == "fadein")
          this.clip.ee.emit('fadein', mousepos , this.clip);
        else
          this.clip.ee.emit('fadeout', this.clip.duration - mousepos, this.clip);
      }
      else{
        this.action = null;
      }
    }
    else if (this.action == "resizing"){
      this.updateResizing(e);
    }
    else if (e.target.classList.contains('fadehandle')){
      // console.log('true');
      this.action = "fadedraggable";

      this.hoveringover = e.target.classList.contains('fadein')?"fadein":"fadeout";
      
      document.body.style.cursor = "pointer";
    }
    else if (this.action == "scrolldragging" || this.action == "scrolldraggingcandidate"){
      this.clip.ee.emit("scrolldragging",e.movementX);
      this.action = "scrolldragging";
    }
    else if (Math.abs(mousepos) < .5){
      this.action = "resizeable"
      document.body.style.cursor = "e-resize";
    }
    else if (Math.abs(mousepos-this.clip.duration) < .5){
      this.action = "resizeable"
      document.body.style.cursor = "w-resize";
    }
    else if (mousepos < 0 || mousepos > this.clip.duration){
      // document.body.style.cursor = "grab";
      this.action = "scrolldraggable";
    }
    else{
      this.action = null;
      document.body.style.cursor = "auto";
      this.mouseup();
    }
    // console.log(this.action);
  }


  seekTo(e) {
    e.preventDefault();
    console.log("seek");
    const startX = e.offsetX;
    const startTime = pixelsToSeconds(startX, this.samplesPerPixel, this.sampleRate);

    this.clip.ee.emit('select', startTime, startTime, this.clip);
  }

  mouseleave = e => {
    this.mouseup(e);
    this.mousemove(e);
    document.body.style.cursor = "auto";
  };

  updateResizing(e){
    let mousepos = pixelsToSeconds(this.correctOffset(e), this.samplesPerPixel, this.sampleRate);
    if (this.clip.quantize){ 
      const blocklength = ( 60 / this.clip.bpm ) * this.clip.quantize;
      mousepos = Math.round ( mousepos / blocklength)*blocklength;
    }
    if (this.draggingFrom == -1){
      if (this.clip.cueIn + mousepos < 0)return;
      const oldStartTime = this.clip.startTime;
      const oldCueIn = this.clip.cueIn;
      this.clip.startTime = oldStartTime + mousepos;
      this.clip.cueIn = oldCueIn + mousepos;
    }
    if (this.draggingFrom == 1){
      if (this.clip.cueOut + mousepos - this.clip.duration > this.clip.buffer.duration)return;
      this.clip.cueOut = this.clip.cueOut + mousepos - this.clip.duration;
    }
    this.clip.ee.emit("interactive",this.clip);

  }
  mouseup(e) {
    if (this.action == "dragginghandle"){
      this.action = null;
    }
    else if (this.action == "scrolldraggingcandidate"){
      // this.seekTo(e);
      this.clip.ee.emit("scrolldraggingend",e);
      this.action = null;
    }
    else if (this.action == "scrolldragging"){
      this.action = null;
      this.clip.ee.emit("scrolldraggingend",e);
    }
    else if (this.action == "resizing") {
      e.preventDefault();
      this.updateResizing(e);
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
