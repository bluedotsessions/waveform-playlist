export default class {
    constructor (ee,initialValue=0,callback,from = -2,to = 2){
        this.value = ((initialValue - from)/(to - from)) * 2 - 1;
        this.id = Math.random()*100|0;
        this.lineWidth = 5;
        this.ee = ee;
        this.gap = Math.PI*.14; //This is doubled
        this.gapPosition = Math.PI*.5;
        this.callback = callback;
        this.from = from;
        this.to = to;
    }
    setupEvents(canvas){
        //effect Change
        const from = this.from;
        const to = this.to;
        canvas.onclick = e => {
       
            const {offsetX,offsetY} = e;
            const center = {x:canvas.width/2,y:canvas.height/2};
            const TAU = Math.PI*2;

            const angle = Math.atan2(offsetY-center.y,offsetX-center.x);
            
            const top = this.gapPosition - 3*Math.PI;

            const dangle = (angle - top)%TAU;

            const adjustedNegatives = dangle > Math.PI?dangle-TAU:dangle;

            const amount = adjustedNegatives/(Math.PI-this.gap);

            const clampedamount = amount > 1 ? 1 : (amount < -1 ? -1 : amount); //clamping to -1 to 1

            // console.log(adjustedNegatives*180/Math.PI);
            // this.track.pan = clampedamount;
            this.value = clampedamount;
            const adjustedAmount = ((clampedamount + 1) / 2) * (to - from) + from;
            this.callback(adjustedAmount);
            // this.track.ee.emit('panknob',this.track);
            this.ee.emit('interactive');

        };
    }
    draw(g,canvas){
        const center = {x:canvas.width/2,y:canvas.height/2};
        const TAU = Math.PI*2;
  
        //Background

        g.lineWidth = this.lineWidth;
        g.strokeStyle = canvas.getAttribute('data-ringbgcolor') || '#444444';
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

        const angle = this.value*(Math.PI-this.gap) + this.gapPosition + Math.PI
        const r = center.x-this.lineWidth;
        g.fillStyle = "white"
        g.beginPath();
        g.arc(
            center.x + r * Math.cos(angle),
            center.y + r * Math.sin(angle),
            5,
            0,Math.PI*2);
        g.fill();

    }
    hook(canvas,_,prev){
        
        
        this.setupEvents(canvas);
        const g = canvas.getContext('2d');
        this.draw(g,canvas);
    }
}
