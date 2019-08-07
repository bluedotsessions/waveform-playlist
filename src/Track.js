import _assign from 'lodash.assign';
import _forOwn from 'lodash.forown';

import h from 'virtual-dom/h';

import { secondsToPixels } from './utils/conversions';

import VolumeSliderHook from './render/VolumeSliderHook';
import PanKnob from './render/PanKnobHook';
import GridHook from './render/GridHook';

export default class {

  constructor() {
    this.name = 'Untitled'; // Track
    this.customClass = undefined; //Track
    this.waveOutlineColor = undefined; //Track
    this.gain = 1; //Track
    this._pan = 0; // Track
    this.ee = undefined;
    this.bpm = 100;
    this.quantize = 1;

    this.clips = [];

  }
  unasignAll(){
    return this.clips = [];
  }
  /*
    startTime, endTime in seconds (float).
    segment is for a highlighted section in the UI.
    returns a Promise that will resolve when the AudioBufferSource
    is either stopped or plays out naturally.
  */
  async schedulePlay(...args) {
    await Promise.all(this.clips.map(c=>c.schedulePlay(...args)));
  }
  scheduleStop(when){
    this.clips.forEach(c=>c.scheduleStop(when));
  }
  assign(clip){
    return this.clips.push(clip);
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
    this.clips.forEach(clip=>{
      clip.gain = level;
      clip.playout.setVolumeGainLevel(level);
    })
  }

  setMasterGainLevel(level) {
    this.clips.forEach(clip=>clip.playout.setMasterGainLevel(level));
  }
  setPan(value){
    this.pan = value || this.pan;
    this.clips.forEach(clip=>clip.setPan(this.pan));      
  }

  renderControls(data) {
    const muteClass = data.muted ? '.active' : '';
    const soloClass = data.soloed ? '.active' : '';

    return h('div.controls',
      {
        attributes: {
          style: `height: ${data.height}px; width: ${data.controls.width}px; position: absolute; left: 0; z-index: 10;`,
        },
      }, [
        h('header', [this.name]),
        h('div.btn-group', [
          h('span.btn.btn-default.btn-xs.destroyButton',{
            onclick: ()=>{
              this.ee.emit('destroy',this);
            }
          },['X']),
          h(`span.btn.btn-default.btn-xs.btn-mute${muteClass}`, {
            onclick: () => {
              this.ee.emit('mute', this);
            },
          }, ['Mute']),
          h(`span.btn.btn-default.btn-xs.btn-solo${soloClass}`, {
            onclick: () => {
              this.ee.emit('solo', this);
            },
          }, ['Solo']),
          h('div.btn.btn-default.dropdown-toggle.btn-xs.btn-effects',{
              onclick: e=>{
                this.showmenu = !this.showmenu;
                this.ee.emit('interactive');
              }
            },[
            "effects",
            h(`div.effectsmenu`,{
              attributes:{
                style:`
                  position:absolite;
                  top:0;
                  left:10;
                  ${this.showmenu?'':"display:none;"}
                `
              }
            },[
              h("div.effect.btn.btn-default",{
                onclick:e=>{
                  this.clips.forEach(clip=>{
                    clip.playout.toggleDelay = !clip.playout.toggleDelay;
                  });
                },
                attributes:{style:`
                width:50px;height:20px;display:inline-block;
              `}},"delay"),
              h("div.effect.btn.btn-default",{
                onclick:e=>{
                  this.clips.forEach(clip=>{
                    clip.playout.togglePhaser = !clip.playout.togglePhaser;
                  });
                },
                attributes:{style:`
                width:50px;height:20px;display:inline-block;
              `}},"bitcrusher"),
              h("div.effect.btn.btn-default",{
                onclick:e=>{
                  this.clips.forEach(clip=>{
                    clip.playout.toggleLowpass = !clip.playout.toggleLowpass;
                  });
                },
                attributes:{style:`
                width:50px;height:20px;display:inline-block;
              `}},"lowpass"),
            ])
          ]),
          h(`canvas.knobCanvas`,{
            attributes:{
                width: 25,
                height: 25,
                "data-ringbgcolor": '#EEE',
            },
            hook: new PanKnob(this.pan,this)
          })
        ]),
        h('label', [
          h('input.volume-slider', {
            attributes: {
              type: 'range',
              min: 0,
              max: 100,
              value: 100,
            },
            hook: new VolumeSliderHook(this.gain),
            oninput: (e) => {
              this.ee.emit('volumechange', e.target.value, this);
            },
          }),
        ]),
      ],
    );
  }


  getEndTime(){
    return this.clips.reduce((maxval,clip)=>Math.max(maxval,clip.endTime),0);
  }

  render(data) {

    function convert(seconds){
      return secondsToPixels(seconds,data.resolution, data.sampleRate);
    }

    const width = convert(this.getEndTime());
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
          style: `position: absolute; width: 1px; margin: 0; padding: 0; top: 0; left: ${playbackX}px; bottom: 0; z-index: 5;`,
        },
      }),
    ];

    const grid = h('canvas.grid',{
      attributes :{
        width,
        height: data.height,
        style: 'position:absolute;pointer-events:none'
      },
      hook: new GridHook(this.quantize,this.bpm,'lightgray',data.resolution,data.sampleRate)
    });
    waveformChildren.push(grid);

    waveformChildren.push(
      this.clips.map(
        clip=>clip.render(data)
      )
    );

    // draw cursor selection on active track.
    if (data.isActive === true) {
      const cStartX = secondsToPixels(data.timeSelection.start, data.resolution, data.sampleRate);
      const cEndX = secondsToPixels(data.timeSelection.end, data.resolution, data.sampleRate);
      const cWidth = (cEndX - cStartX) + 1;
      const cClassName = (cWidth > 1) ? '.segment' : '.point';

      waveformChildren.push(h(`div.selection${cClassName}`, {
        attributes: {
          style: `position: absolute; width: ${cWidth}px; bottom: 0; top: 0; left: ${cStartX}px; z-index: 4;`,
        },
      }));
    }


    const waveform = h('div.waveform',
      {
        attributes: {
          style: `height: ${data.height}px; position: relative;`,
        },
      },
      waveformChildren,
    );

    const channelChildren = [];
    let channelMargin = 0;

    if (data.controls.show) {
      channelChildren.push(this.renderControls(data));
      channelMargin = data.controls.width;
    }

    channelChildren.push(waveform);

    const audibleClass = data.shouldPlay ? '' : '.silent';
    const customClass = (this.customClass === undefined) ? '' : `.${this.customClass}`;

    return h(`div.channel-wrapper${audibleClass}${customClass}`,
      {
        attributes: {
          style: `margin-left: ${channelMargin}px; height: ${data.height}px;`,
        },
      },
      channelChildren,
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
