import { samplesToSeconds, secondsToSamples } from './utils/conversions';

export default function (clip,playlist){
    const track = clip.track;
    const bpm = track.bpm;
    const minimumSilence = 8*playlist.sampleRate;
    const buffer = clip.buffer;
    const samples = buffer.getChannelData(0);
    const startTime = clip.startTime;
    const cueIn = clip.cueIn;
    const cueOut = clip.cueOut;
    const cueInSamp = secondsToSamples(cueIn,playlist.sampleRate)
    const cueOutSamp = secondsToSamples(cueOut,playlist.sampleRate)
    const secsperbeat = 60/bpm;
    const secsperbar = secsperbeat * playlist.barLength;
    const offsetTime = secsperbeat * playlist.barOffset;
    let startofSilence = NaN;
    const threshhold = 0.01;

    for (let a=cueInSamp;a<cueOutSamp;a++){
    if(!isNaN(startofSilence) && Math.abs(samples[a])>threshhold){
        if(a - startofSilence > minimumSilence){
        if (!clip.bpm){
            removeSamples(clip,startofSilence,a);
        }
        else {
            let qpoint = a;
            console.log("!->",
            secondsToMinutes(startofSilence/playlist.sampleRate),
            secondsToMinutes(a/playlist.sampleRate)
            )
            while(qpoint>=0 && Math.abs(samples[qpoint-1])<=threshhold){
            const secs = samplesToSeconds(qpoint,playlist.sampleRate) + startTime - cueIn;
            const secsprev =  samplesToSeconds(qpoint-1,playlist.sampleRate) + startTime - cueIn;
            if (Math.floor((secs - offsetTime) / secsperbar) > Math.floor((secsprev- offsetTime) / secsperbar)){
                removeSamples(clip,startofSilence,qpoint);
                break;
            }
            qpoint --;
            }
        }
        }
        startofSilence = NaN;
    }
    else if (isNaN(startofSilence) && Math.abs(samples[a])<=threshhold){
        if (!track.bpm){
        startofSilence = a;
        }
        else{
        const secs = samplesToSeconds(a,playlist.sampleRate) + startTime - cueIn;
        const secsprev =  samplesToSeconds(a-1,playlist.sampleRate) + startTime - cueIn;

        if (Math.floor((secs - offsetTime) / secsperbar) > Math.floor((secsprev - offsetTime) / secsperbar)){
            startofSilence = a;
        }
        }
    }
    }
    if (!isNaN(startofSilence) && samples.length - startofSilence > minimumSilence){
    removeSamples(clip,startofSilence,samples.length);
    }
}
function removeSamples(clip,start,end){
    const startSec = samplesToSeconds(start,playlist.sampleRate);
    const endSec = samplesToSeconds(end,playlist.sampleRate);
    const cueInSamp = clip.cueIn*playlist.sampleRate;
    const minClip = playlist.barLength * 60/playlist.bpm || 1;
    if (start == cueInSamp){
    if (clip.cueOut - clip.cueIn - endSec >= minClip){
        clip.cueIn += endSec;
        clip.startTime += endSec; 
    }
    }
    else if (end == clip.buffer.length){
    if (startSec - clip.cueIn >= minClip)
        clip.cueOut = startSec;
    else
        clip.track.clips.pop();
    }
    else{
    
    let info = clip.getTrackDetails();
    
    info.cueout = startSec;
    console.log(
        clip.name,
        secondsToMinutes(info.start),
        secondsToMinutes(info.start+info.cueout-info.cuein),
        minClip
    );
    if (info.cueout - info.cuein >= minClip)
        playlist.createClip(clip.buffer,info,false,clip.peaks);
    
    clip.startTime += endSec - clip.cueIn;
    clip.cueIn = endSec;
    }
}
function secondsToMinutes(sec){
    const min = sec/60|0;
    const secs = (sec - min*60)|0;
    return `${min}:${secs/10|0}${secs%10}`
}