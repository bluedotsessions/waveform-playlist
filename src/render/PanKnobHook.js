export default class {
    constructor (pan,track){
        this.pan = pan;
        this.track = track;
        this.lineWidth = 5;
        this.gap = Math.PI*.14; //This is doubled
        this.gapPosition = Math.PI*.5;
        this.track.pan = this.pan;
    }
    onclick (e) {
        if ( this.canvas != e.target){
            // console.log("why?!!");
            this.canvas = e.target;
            this.g = this.canvas.getContext('2d');
        }
        
        const {offsetX,offsetY} = e;
        const center = {x:this.canvas.width/2,y:this.canvas.height/2};
        const TAU = Math.PI*2;
        /// Where the mouse clicked:
        const angle = Math.atan2(offsetY-center.y,offsetX-center.x);
        
        /// Where is the top of the pan
        const top = this.gapPosition - 3*Math.PI;

        /// transform position:
        const dangle = (angle - top)%TAU;

        const adjustedNegatives = dangle > Math.PI?dangle-TAU:dangle;

        /// account for the gap.
        const amount = adjustedNegatives/(Math.PI-this.gap);

        const realamount = amount > 1 ? 1 : (amount < -1 ? -1 : amount); //clamping to -1 to 1

        // console.log(adjustedNegatives*180/Math.PI);
        // console.log(realamount);
        this.track.pan = realamount;
        this.draw();
        // self.track.ee.emit('panknob',self.track);
    };
    draw(){

        const canvas = this.canvas;
        const g = this.g;
        const center = {x:canvas.width/2,y:canvas.height/2};
        const TAU = Math.PI*2;
        this.pan = this.track.pan;
        //Background
        ///Thickness:
        g.lineWidth = this.lineWidth;
        ///Color:
        g.strokeStyle = canvas.getAttribute('data-ringbgcolor') || '#EEE';
        g.clearRect(0,0,canvas.width,canvas.height);
        g.beginPath();
        /// Circle:
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
    }
    hook(canvas,_,prev){
        if (prev && prev.pan == this.pan)
            return;
        this.canvas = canvas;
        this.g = canvas.getContext('2d');
        // this.setupEvents();
        this.draw();
    }
}
