import { pixelsToSeconds, secondsToPixels } from '../utils/conversions'
export default class {
    constructor(quantizeValue,bpm,color,resolution,sampleRate){
        this.quantizeValue = quantizeValue;
        this.bpm = bpm;
        this.color = color;
        this.resolution = resolution;
        this.sampleRate = sampleRate;
    }
    draw(g,canvas){
        // const step = secondsToPixels(60/this.bpm*this.quantizeValue,this.resolution,this.sampleRate);
        g.clearRect(0,0,canvas.width,canvas.height);
        g.strokeStyle = this.color;
        g.beginPath();
        const step = 60/this.bpm;
        for (let a = 1; a < canvas.width; a++){
            const secs = pixelsToSeconds(a,this.resolution,this.sampleRate);
            const prevsecs = pixelsToSeconds(a-1,this.resolution,this.sampleRate)
            if (Math.floor(secs/step) > Math.floor(prevsecs/step)){
                g.moveTo(a,0);
                g.lineTo(a,canvas.height);
            }
        }
        g.stroke();
    }
    hook(canvas,_,prev){
        const g = canvas.getContext('2d');
        this.width = canvas.width;
        this.height = canvas.height;
        if (!prev){
            this.draw(g,canvas);
            return;
        }
        else
            for (const prop in this)
                if (this[prop] != prev[prop]){
                    this.draw(g,canvas);
                    return;
                }
    }
}