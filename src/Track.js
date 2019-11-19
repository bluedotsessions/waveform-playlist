import _assign from 'lodash.assign';
import _forOwn from 'lodash.forown';
import h from 'virtual-dom/h';
import { secondsToPixels } from './utils/conversions';
import VolumeSliderHook from './render/VolumeSliderHook';
import PanKnob from './render/PanKnobHook';
import GridHook from './render/GridHook';
import EffectKnobHook from './render/EffectKnobHook';

export default class {
  constructor(id) {
    this.name = 'Untitled'; // Track
    this.customClass = undefined; //Track
    this.waveOutlineColor = undefined; //Track
    this.gain = 1; //Track
    this._pan = 0; // Track
    this.ee = undefined;
    this.bpm = 100;
    this.id = id;
    this.quantize = 1;
    
    this.analyzer = undefined;
    this.analyzerHook = new VolumeSliderHook(this);
    
    this.delay = 1;
    this.bitcrusher = 1;
    this.lowpass = 10;
    
    this.clips = [];
    this.panHook = new PanKnob(this.pan,this);

    this.buttonsList = [
      "Lo-Pass",
      "Delay - Simple",
      "Verb - Hall"
    ]

    this.effectsList = [
      {name:"Chorus",knob:"chorus",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Overdrive",knob:"overdrive",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"BitCrusher",knob:"bitcrusher",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Lo-Pass",knob:"lowpass",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Hi-Pass",knob:"hipass",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Band-Pass",knob:"bandpass",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Cabinet",knob:"cabinet",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Delay - Simple",knob:"delay",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Delay - Stereo",knob:"delay",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},

      {name:"Verb - Hall",knob:"reverb",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Verb - Church",knob:"reverb",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Verb - Room",knob:"reverb",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},
      {name:"Verb - Spring",knob:"reverb",params:[
        {name:"bypass",tunaparam:"bypass",init:0,min:0,max:1},
        {name:"somethingelse",tunaparam:"blabla",init:0,min:0.1,max:0.2}
      ]},

    ]




  }
  updatedBMeter(){
    this.analyzerHook.update();
  }
  unasignAll(){
    return this.clips = [];
  }

  schedulePlay(...args) {
    return Promise.all(this.clips.map(c=>c.schedulePlay(...args)));
  }
  play(...args){
    this.clips.forEach(clip=>clip.play(...args));
  }
  scheduleStop(when){
    this.clips.forEach(c=>c.scheduleStop(when));
  }
  assign(clip){
    return this.clips.push(clip);
  }
  registerPlayout(source){
    if (source.context.constructor.name != "OfflineAudioContext"){
      source.connect(this.analyzer);
    }
  }

  set pan(inp){
    this._pan = inp;
    this.clips.forEach(clip=>clip.setPan(inp));
  }
  get pan(){
    return this._pan;
  }

  setEventEmitter(ee) {
    this.ee = ee;
    this.clips.forEach(c=>c.setEventEmitter(ee));
  }

  setName(name) {
    this.name = name;
  }

  setCustomClass(className) {
    this.customClass = className;
  }

  setWaveOutlineColor(color) {
    this.waveOutlineColor = color;
  }

  setStartTime(start) {
    this.startTime = start;
    this.endTime = start + this.duration;
  }
  setOfflinePlayout(playout){
    this.clips.forEach(clip=>clip.setOfflinePlayout(playout));
  }

  setEnabledStates(enabledStates = {}) {
    const defaultStatesEnabled = {
      cursor: true,
      fadein: true,
      fadeout: true,
      select: true,
      shift: true,
      interactive: true
    };

    this.enabledStates = _assign({}, defaultStatesEnabled, enabledStates);
  }

  setState(state) {
    this.clips.forEach(clip=>clip.setState(state));
  }


  isPlaying() {
    return this.clips.reduce((isit,clip)=> clip.isPlaying() || isit,false);
  }

  setShouldPlay(bool) {
    this.clips.forEach(clip=>clip.playout.setShouldPlay(bool));
  }

  setGainLevel(level) {
    this.gain = level;
    this.analyzerHook.update();
    this.clips.forEach(clip=>{
      // clip.gain = Math.log10(level+0.1)+1;
      clip.gain = Math.pow(8,(level-1)/0.8)-0.075;
      clip.playout.setVolumeGainLevel(clip.gain);
    })
  }

  setMasterGainLevel(level) {
    this.clips.forEach(clip=>clip.playout.setMasterGainLevel(level));
  }
  setPan(value){
    this.pan = value || this.pan;
    this.clips.forEach(clip=>clip.setPan(this.pan));      
  }

  renderButtons(data){
    const muteClass = data.muted ? '.active' : '';
    const soloClass = data.soloed ? '.active' : '';
    return h('div.track-buttons-container', [
      h(`span.mute-button.bordered-track-button`, {
        onclick: () => {
          this.ee.emit('mute', this);
        },
      }, ['M']),
      h(`span.solo-button.bordered-track-button`, {
        onclick: () => {
          this.ee.emit('solo', this);
        },
      }, ['S']),
      h('div.effects-button.bordered-track-button',{
          onclick: e=>{
            this.showmenu = !this.showmenu;
            this.ee.emit('interactive');
          }
        },["FX"]),
      h(`div.protectFromStreching`,[
        h(`canvas.knobCanvas#id${this.id}`,{
          onclick: e=>this.panHook.onclick(e),
          attributes:{
              width: 25,
              height: 25,
              "data-ringbgcolor": '#EEE',
          },
          hook: this.panHook
        }),
      ]),

      this.renderVolumeSlider(data),
    ])
  }
  renderChooseEffectMenu(data){
    let children = this.effectsList
      .filter(ef=>!this.buttonsList.find(i=>i == ef.name))
      .map(i=>i.name)
      .map(name=>h('div.effectlabel',{
        onclick:e=>{
          const ind = this.buttonsList.indexOf(this.changeEffect);
          this.buttonsList[ind] = e.target.innerHTML;
          this.changeEffect = undefined;
          this.ee.emit("interactive");
        }
      },name));

    return h("div.choose-effect-menu",{
      onclick:e=>{
        this.changeEffect = undefined;
        this.ee.emit("interactive");
      }
    },[
      h("div.effectlabel.highlight",this.changeEffect),
      ...children
    ])
  }

  renderSingleEffect(data,name,hook){
    // console.log(this.changeEffect);
    return h("div.effectBox",{
      onmouseenter:e=>{
        this.showSubMenu = name;
        this.ee.emit("interactive");
      },
      onmouseleave:e=>{
        this.showSubMenu = undefined;
        this.ee.emit("interactive");
      },
    },[
      this.changeEffect==name?
        
        this.renderChooseEffectMenu(data):

        h('div.effectlabel',{
          onclick:e=>{
            this.changeEffect=name;
            this.ee.emit("interactive");
          }
        },name),
      h(`canvas.effect.${name}`,{
        
        attributes:{
          width: '35px',
          height: '35px',
        },
        hook
      }),
      this.showSubMenu == name?
      this.renderEffectSubmenu(data):""
    ])
  }

  renderEffects(data){

    const effects = this.buttonsList
      .map(name=>this.effectsList.find(i=>i.name == name))
      .map(i=>
        this.renderSingleEffect(data,i.name,new EffectKnobHook(this.ee,this[i.knob],(value)=>{
          this[i.knob] = value;
          this.clips.forEach(clip=>{
            clip.playout[`toggle_${i.knob}`] = value > 1;
            clip.playout[i.knob].bypass = value;
          })
        }))
      )
    
    return h(`div.effectsmenu${this.showmenu?'.visible':''}`,effects);

  }
      
  renderEffectSubmenu(data){

    const children = this.effectsList
      .find(i=>i.name == this.showSubMenu)
      .params
      .map(i=>
        h(`canvas.effect.${i.name}`,{
          attributes:{
            width: '35px',
            height: '35px',
            "data-ringbgcolor":"#606060",
            "data-effect":i.name
          },
          hook:new EffectKnobHook(this.ee,this[i.knob]||i.init,(value)=>{
            this[i.knob] = value;
            this.clips.forEach(clip=>{
              this.ee.emit("interactive");
            })
          },i.min,i.max)
        }),
      )
      .map(el=>{
        const label = el.properties.attributes["data-effect"]
        return h(`.effectBox`,[el,h('div.subeffectlabel',label)])  
      }
      )
    return h('div.effectSubMenu',children);
  }

  renderVolumeSlider(data){
    const width = 75;
    return h('canvas.volume-slider', {
        attributes:{
          width,
          height:30          
        },
        onclick:e=>{
          const relativeX = e.layerX;
          //canvas is larger than the slider with 7 pixels on each side, so:
          const clamped = Math.min(Math.max(relativeX, 7), width-7);
          this.setGainLevel((clamped-7)/(width-14))
        },
        hook: this.analyzerHook,
    })
  }

  renameTrack(){

  }

  renderControls(data) {
    return h('div.track-controls',
      {
        onmouseenter:e=>{
          this.showhovermenu = true;
          this.ee.emit("interactive");
        },
        onmouseleave:e=>{
          this.showhovermenu = false;
          this.ee.emit("interactive");
        },
        attributes: {
          style: `z-index: ${30 - this.id};`,
        },
      }, [
        h('div.track-title',[
          h('span.track-title-text', [this.name]),
          h(`div.track-title-control-container${this.showhovermenu?".visible":""}`,[
            h('span.rename-track',{
              onclick:this.renameTrack
            },"ren"),
            h('span.delete-track',{
              onclick:()=>{
                this.ee.emit('destroy',this);
              }
            },"del")
          ])
        ]),
        this.renderButtons(data),        
        this.renderEffects(data),
      ],
    );
  }

  
  getEndTime(){
    return this.clips.reduce((maxval,clip)=>Math.max(maxval,clip.endTime),0);
  }

  renderWaveform(data) {

    function convert(seconds){
      return secondsToPixels(seconds,data.resolution, data.sampleRate);
    }

    const width = convert(data.globalEndTime);
    const playbackX = convert(data.playbackSeconds);
    const startX = convert(this.startTime);
    const endX = convert(this.endTime);
    let progressWidth = 0;

    if (playbackX > 0 && playbackX > startX) {
      if (playbackX < endX) {
        progressWidth = playbackX - startX;
      } else {
        progressWidth = width;
      }
    }

    const waveformChildren = [
      h('div.cursor', {
        attributes: {
          style: `left: ${playbackX}px;`,
        },
      }),
    ];

    const grid = h('canvas.grid',{
      attributes :{
        width:convert(data.globalEndTime),
        height: data.height,
        style: 'position:absolute;pointer-events:none'
      },
      hook: new GridHook(this.quantize,this.bpm,this.barLength,this.barOffset,'lightgray',data.resolution,data.sampleRate)
    });
    waveformChildren.push(grid);

    waveformChildren.push(
      this.clips.map(
        clip=>clip.render(data)
      )
    );


    return h('div.waveform',
      {
        attributes: {
          style: `height: ${data.height}px;width:${width}px`,
        },
      },
      waveformChildren,
    );
  }

  getTrackDetails() {
    const info = {
      src: this.src,
      name: this.name,
      customClass: this.customClass,
    };
    return info;
  }
}
