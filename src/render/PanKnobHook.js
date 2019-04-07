export default class {
    constructor (pan,track){
        this.pan = pan;
        this.track = track;
        this.id = Math.random()*100|0;
        this.lineWidth = 5;
        this.gap = Math.PI*.14; //This is doubled
        this.gapPosition = Math.PI*.5;

    }
    setupEvents(canvas){
        //pan Change
        canvas.onclick = e => {
            console.log(this.id);
            const {offsetX,offsetY} = e;
            const center = {x:canvas.width/2,y:canvas.height/2};
            const TAU = Math.PI*2;

            const angle = Math.atan2(offsetY-center.y,offsetX-center.x);
            
            const top = this.gapPosition - 3*Math.PI;

            const dangle = (angle - top)%TAU;

            const adjustedNegatives = dangle > Math.PI?dangle-TAU:dangle;

            const amount = adjustedNegatives/(Math.PI-this.gap);

            const realamount = amount > 1 ? 1 : (amount < -1 ? -1 : amount); //clamping to -1 to 1

            // console.log(adjustedNegatives*180/Math.PI);
            // console.log(realamount);
            this.track.pan = realamount;

            this.track.ee.emit('panknob',this.track);

        };
    }
    draw(g,canvas){
        const center = {x:canvas.width/2,y:canvas.height/2};
        const TAU = Math.PI*2;

        //Background

        g.lineWidth = this.lineWidth;
        g.strokeStyle = canvas.getAttribute('data-ringbgcolor') || '#EEE';
        g.clearRect(0,0,canvas.width,canvas.height);
        g.beginPath()
        g.arc(
            center.x,
            center.y,
            center.x-this.lineWidth,
            this.gap + this.gapPosition,
            TAU - this.gap + this.gapPosition
        );
        g.stroke();
        
        //Pan Amount

        g.strokeStyle = canvas.getAttribute('data-ringcolor') || 'black';

        g.beginPath();
        g.arc(
            center.x,
            center.y,
            center.x-this.lineWidth,
            this.gapPosition + Math.PI,
            this.pan*(Math.PI-this.gap) + this.gapPosition + Math.PI,
            this.pan<0
        )
        g.stroke();

        // console.log('drawing pan',g.strokeStyle,center);
    }
    hook(canvas,_,prev){
        if (prev && prev.pan == this.pan)
            return;
        
        this.setupEvents(canvas);
        const g = canvas.getContext('2d');
        this.draw(g,canvas);
    }
}
