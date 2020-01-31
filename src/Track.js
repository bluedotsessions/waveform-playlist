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
    /// Underlined properties are not to be touched.
    /// They have setters and gettters, so use this.pan instead. 
    /// go to the set pan() function for more info.
    this._pan = 0; // Track
    this.ee = undefined;
    this.bpm = 100;
    this.id = id;
    this.quantize = 1;
    
    this.analyzer = undefined;
    /// This is the volume slider and dB meter
    /// go to the ./src/render/VolumeSliderHook.js for more info.
    this.analyzerHook = new VolumeSliderHook(this);
    
    /// Properties for the effect knobs.
    /// 0 generally means off
    /// 1 - on
    this.delay = 1;
    this.bitcrusher = 1;
    this.lowpass = 0;
    
    /// Each track has array of Clips.
    /// Go to the ./Clip.js for more info.
    this.clips = [];
    
    /// This is the pan knob.
    /// Probably have to change it, to be EffetKnob.
    /// But this was my first effect done, so it's a bit hard-coded.
    this.panHook = new PanKnob(this.pan,this);

    /// These are the knobs that are currently visible on the track.
    this.buttonsList = [
      "Lo-Pass",
      "Delay - Simple",
      "Verb - Hall"
    ]

    /// I've experimented a bit, so there are the effects for the track
    /// The idea is that it holds the info for the 
    /// inital, minimal and maximum values and bunch more info.
    /// I'm not quite happy with it now, so
    /// you can change this array as you see fit.
    /// To see how this info is used, go to the renderEffects() function
    this.effectsList = [
      {name:"Chorus",knob:"chorus",params:[
        {name:"rate",tunaparam:"rate",init:0.75,min:0.75,max:2.5},
        {name:"depth",tunaparam:"depth",init:0.5,min:0.5,max:0.8},
      ]},
      {name:"Overdrive",knob:"overdrive",params:[
        {name:"curveAmount",tunaparam:"curveAmount",init:0,min:0,max:1},
      ]},
      {name:"BitCrusher",knob:"bitcrusher",params:[
        {name:"bits",tunaparam:"bits",init:6,min:6,max:3},
        {name:"frequency",tunaparam:"normfreq",init:0.5,min:0.5,max:0.1},
      ]},
      {name:"Lo-Pass",knob:"lowpass",params:[
        {name:"frequency",tunaparam:"frequency",init:4000,min:4000,max:100,interp:"log"},
        {auxiliaryKnob: "gainCompensation", name:"gain",tunaparam:"gain",init:1,min:1,max:5},
        //gainCompensation is used to drive an additional gain node for volume compensation
        //auxiliaryKnob new field to indicate a different target knob to manipulate
      ]},
      {name:"Hi-Pass",knob:"hipass",params:[
        {name:"frequency",tunaparam:"frequency",init:100,min:100,max:6000,interp:"log"},
      ]},
      {name:"Band-Pass",knob:"bandpass",params:[
        {name:"frequency",tunaparam:"frequency",init:100,min:100,max:8000,interp:"log"},
      ]},
      {name:"Cabinet",knob:"cabinet",params:[
        {name:"makeupGain",tunaparam:"makeupGain",init:10,min:10,max:10}, //cabinet is just on and off
      ]},
      {name:"Delay - Simple",knob:"delay",params:[
        {name:"mybypass",tunaparam:"mybypass",init:0,min:0,max:1},
      ]},
      {name:"Delay - Stereo",knob:"delay",params:[
        {name:"mybypass",tunaparam:"mybypass",init:0,min:0,max:1},
      ]},
      {name:"Verb - Hall",knob:"reverb_hall",params:[
        {name:"dryLevel",tunaparam:"dryLevel",init:1,min:1,max:0},
        {name:"wetLevel",tunaparam:"wetLevel",init:0,min:0,max:1},
      ],isReverb:true},
      {name:"Verb - Church",knob:"reverb",params:[
        {name:"mybypass",tunaparam:"mybypass",init:0,min:0,max:1},
      ],isReverb:true},
      {name:"Verb - Room",knob:"reverb_room",params:[
        {name:"dryLevel",tunaparam:"dryLevel",init:1,min:1,max:0},
        {name:"wetLevel",tunaparam:"wetLevel",init:0,min:0,max:1},
      ],isReverb:true},
      {name:"Verb - Spring",knob:"reverb_spring",params:[
        {name:"dryLevel",tunaparam:"dryLevel",init:1,min:1,max:0},
        {name:"wetLevel",tunaparam:"wetLevel",init:0,min:0,max:1},
      ],isReverb:true},
      {name:"Telephone",knob:"telephone",params:[
        {name:"dryLevel",tunaparam:"dryLevel",init:1,min:1,max:0},
        {name:"wetLevel",tunaparam:"wetLevel",init:0,min:0,max:1},
      ]},
      {name:"Clouds",knob:"clouds",params:[
        {name:"dryLevel",tunaparam:"dryLevel",init:1,min:1,max:0},
        {name:"wetLevel",tunaparam:"wetLevel",init:0,min:0,max:1},
      ]},
    ];

    //menu is originally not open
    this.showmenu = false;
  }
  updatedBMeter(){
    this.analyzerHook.update();
  }
  unasignAll(){
    return this.clips = [];
  }
  checkCrossfade(){
    for (let a of this.clips){
      for (let b of this.clips){
        if (a.startTime < b.startTime && a.endTime > b.startTime){
          this.ee.emit("fadeout", a.endTime - b.startTime, a);
          this.ee.emit("fadein", a.endTime - b.startTime, b);
        }
      }
    }


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

  getTextForFXButton(){
      //unicode for up arrow, in the future use icon font?
      return this.showmenu ? "\u25B2" : "FX";
  }

  renderButtons(data){
    const muteClass = data.muted ? '.active' : '';
    const soloClass = data.soloed ? '.active' : '';

    //different styling for fx
    let fx_class = 'div.effects-button.bordered-track-button' + (this.showmenu ? ".fx-enabled" : "");

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
      h(fx_class,{
          onclick: e=>{
            this.showmenu = !this.showmenu;
            this.ee.emit('interactive');
            this.ee.emit('fx', this);
          }
        },[this.getTextForFXButton()]),
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
  renderChooseEffectMenu(data, isReverbSlot){
    let children = this.effectsList
      .filter(ef => {
        //show only reverbs in reverb slot
        //not doing simple equality check due to usage of both undefined and boolean values
        if(isReverbSlot){
          return ef.isReverb;
        }else{
          return !ef.isReverb;
        }
      })
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

  renderSingleEffect(data,name,hook, isReverbSlot){
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
        
        this.renderChooseEffectMenu(data, isReverbSlot):

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
      // this.showSubMenu == name?
      // this.renderEffectSubmenu(data):""
    ])
  }

  renderEffects(data){
    /// Ouch. Don't worry, I'll explain everything.
    ///
    /// 0) We start with the names of the visible effects.
    /// Go to the constructor and see this.buttonList.
    ///
    /// 1) We get the info for the effects from the effectList array
    ///
    /// 2) We render the effect box by giving it a name, a controller
    ///
    /// 3) We create a controller for the effect Knob by giving it 
    /// a current value for the knob, and a callback for what to do
    /// when the user turns the knob. (value goes from 0 to 1)
    const effects = this.buttonsList
      .map(name=>this.effectsList.find(i=>i.name == name))
      .map((i, index)=>
        this.renderSingleEffect(data,i.name,new EffectKnobHook(this.ee,this[i.knob] || 0,(value)=>{
          /// Firstly we update the stored value for the knob.
          this[i.knob] = value;
          /// We notify each clip for the changed value.
          this.clips.forEach(clip=>{
            /// this determines what tuna.js parameters need to be changed.
            i.params.forEach(param=>{

              let amount;
              if(param.interp === "log"){//logarithmic curves are more natural in some cases
                  amount = param.min * (Math.pow(param.max, value)/Math.pow(param.min, value));
              }else{
                  amount = (param.max - param.min) * value + param.min;
              }
              /// go to Playout.js for more info on the tuna.js effects.

              let knob = clip.playout[param.auxiliaryKnob || i.knob]; //use auxiliary knob if specified
              if(knob){
                  knob[param.tunaparam] = amount;
                  /// if the value is 0 we bypass the effect
                  knob["bypass"] = value === 0;
              }else{
                  console.warn(`${i.knob} does not exist, see Playout.js`);
              }
            })
          })
        },0,1), index === 2) //reverb slot is 3rd slot
      )

    //bypass all other inactive effects
    this.effectsList.filter(i => !this.buttonsList.includes(i.name)).forEach(i => {
      this.clips.forEach(clip => {
        i.params.forEach(param => {
          this[i.knob] = 0;
          let knob = clip.playout[param.auxiliaryKnob || i.knob];
          if(knob){
            knob["bypass"] = 1;
          }
        })
      })
    });

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
        /// These are for the delete/rename buttons.
        onmouseenter:e=>{
          this.showhovermenu = true;
          this.ee.emit("interactive");
        },
        onmouseleave:e=>{
          this.showhovermenu = false;
          this.ee.emit("interactive");
        },
        attributes: {
          /// This is needed for opening menus that overlap with tracks
          /// below them
          style: `z-index: ${30 - this.id};`,
        },
      }, [
        h('div.track-title',[
          h('span.track-title-text', [this.name]),
          /// These are the buttons.
          h(`div.track-title-control-container${this.showhovermenu?".visible":""}`,[
            h('span.rename-track',{
              /// Todo:
              onclick:this.renameTrack
            },"ren"),
            h('span.delete-track',{
              onclick:()=>{
                /// implementation is in ./Playlist.js/setEventEmmiter().
                this.ee.emit('destroy',this);
              }
            },"del")
          ])
        ]),
        ///These are mute/solo buttons
        this.renderButtons(data),     
        ///These are the effects knobs. Go there now.   
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
     /// This is the cursor
      h('div.cursor', {
        attributes: {
          style: `left: ${playbackX}px;`,
        },
      }),
    ];

    /// This is the background grid.
    const grid = h('canvas.grid',{
      attributes :{
        width:convert(data.globalEndTime),
        height: data.height,
        style: 'position:absolute;pointer-events:none'
      },
      hook: new GridHook(this.quantize,this.bpm,this.barLength,this.barOffset,'lightgray',data.resolution,data.sampleRate)
    });
    waveformChildren.push(grid);
    
    /// And the clips
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
