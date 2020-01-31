import { FADEIN, FADEOUT, createFadeIn, createFadeOut } from 'fade-maker';
import Tuna from 'tunajs';

/// This file is an interface to the audioContext and Tuna.js


/**
 * Overriding Tuna.js Overdrive
 *
 * Currently, even when Overdrive is clipping, it still sends bad data to the output node
 * This is presumably because even though the input is disconnect, the outputDrive node is still
 * sending data to the output. To prevent this, we override the activate function to disconnect the offending node
 */
Tuna.prototype.CustomOverdrive = function(properties){
    Tuna.prototype.Overdrive.call(this, properties);
};
Tuna.prototype.CustomOverdrive.prototype = Object.create(Tuna.prototype.Overdrive.prototype, {
    activate: {
        value: function(doActivate) {
            Tuna.prototype.Overdrive.prototype.activate.call(this, doActivate);
            if(doActivate){
                this.outputDrive.connect(this.output);
            }else{
                this.outputDrive.disconnect();
            }
        }
    },
});


export default class {

    constructor(ac, buffer) {
        this.ac = ac;
        /// probably there should be only one instance of the library
        /// because it is currently really laggy.
        /// and the chorus and reverb doesn't work.
        this.tuna = new Tuna(this.ac);
        this.gain = 1;
        this.buffer = buffer;
        this.destination = this.ac.destination;

        ///Now follows the initiation of the effects:
        this.chorus =  new this.tuna.Chorus({
            rate: 1.5,         //0.01 to 8+
            feedback: 0.2,     //0 to 1+
            delay: 0.0245,     //0 to 1
            bypass: 1          //the value 1 starts the effect as bypassed, 0 or 1
        });

        this.overdrive =  new this.tuna.CustomOverdrive({
            outputGain: 0.1,           //-42 to 0 in dB
            drive: 0.7,              //0 to 1
            curveAmount: 1,          //0 to 1
            algorithmIndex: 0,       //0 to 5, selects one of our drive algorithms
            bypass: 1
        });

        this.bitcrusher =  new this.tuna.Bitcrusher({
            bits: 3,          //1 to 16
            normfreq: 0.1,    //0 to 1
            bufferSize: 256,  //256 to 16384,
            bypass: 1
        });

        this.lowpass = new this.tuna.Filter({
            frequency: 4000, //20 to 22050
            Q: 1, //0.001 to 100
            gain: 0, //-40 to 40 (in decibels)
            filterType: "lowpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
            bypass: 1
        });

        this.hipass = new this.tuna.Filter({
            frequency: 6000, //20 to 22050
            Q: 1, //0.001 to 100
            gain: 0, //-40 to 40 (in decibels)
            filterType: "highpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
            bypass: 1
        });

        this.bandpass = new this.tuna.Filter({
            frequency: 100, //20 to 22050
            Q: 1, //0.001 to 100
            gain: 0, //-40 to 40 (in decibels)
            filterType: "bandpass", //lowpass, highpass, bandpass, lowshelf, highshelf, peaking, notch, allpass
            bypass: 1
        });

        //this is an gain node that the low pass filter needs to implement the volume compensation
        this.gainCompensation = new this.tuna.Gain({
            gain: 1
        });

        this.cabinet = new this.tuna.Cabinet({
            makeupGain: 1,                                 //0 to 20
            impulsePath: "impulse_response/BDS_FX_Cabinet.wav",    //path to your speaker impulse
            bypass: 1
        });

        /// Now go to setUpSource() function

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
            return tunachain;
        }
    }

    setUpSource(compressor) {
        /// This function prepares the audio clip to be played.
        /// The compressor here is global, so it is handled from the playlist.js
        /// Go to the play() function in the Playlist.js for more info.
        this.source = this.ac.createBufferSource();
        this.source.buffer = this.buffer;

        /// firstly we reset the effect chain
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
        // used for fadein/fadeout
        this.fadeGain = this.ac.createGain();
        // used for track volume slider
        this.volumeGain = this.ac.createGain();
        // used for solo/mute
        this.shouldPlayGain = this.ac.createGain();

        /// the Panner
        this.panner = this.ac.createStereoPanner();


        // console.log('playout', this.delay);


        this.masterGain = this.ac.createGain();

        /// The effect chain:
        let effectChain = [
            this.fadeGain,
            this.panner,
            this.lowpass,
            this.gainCompensation,
            this.hipass,
            this.bandpass,
            this.bitcrusher,
            this.overdrive,
            this.chorus,
            this.cabinet,
            this.volumeGain,
            this.shouldPlayGain,
            this.masterGain,
            compressor,
            this.destination
        ];

        //setups chain in series
        effectChain.reduce((previous, current) => {
            previous.connect(current);
            return current;
        }, this.source);


        /// There is also setupEffect that is not used,
        /// but you might find it usefull.
        /// Feel free to add more ifs for more effects.

        /// Now go to the playlist.js/setUpEventEmmiter()/ee.on('play',...)

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
