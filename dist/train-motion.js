import {TRACK_LENGTH,LOOP_SECONDS} from './physics.js';
export const CRUISE_SPEED=TRACK_LENGTH/LOOP_SECONDS;
const directions={forward:1,stop:0,reverse:-1};
const ease=t=>t*t*t*(10+t*(-15+6*t));
const primitive=t=>t**4*(2.5+t*(-3+t));

// Speed changes have zero acceleration at their endpoints. Integrating the curve
// analytically keeps travel independent of frame rate and preserves the metric loop.
export class TrainMotion{
  constructor(){this.distance=0;this.speed=CRUISE_SPEED;this.requested='forward';this.phase='cruise';this.segment=null;this.lastDirection=1;this.hold=0;}
  setDirection(direction){if(!Object.hasOwn(directions,direction))throw new Error('Unknown train direction');if(direction===this.requested)return this.state();this.requested=direction;const sign=directions[direction];if(Math.abs(this.speed)>1e-9)this.lastDirection=Math.sign(this.speed);
    if(Math.abs(this.speed)<1e-9){this.speed=0;if(!sign){this.segment=null;this.hold=0;this.phase='stopped';}else if(this.phase!=='turning')this.begin(sign*CRUISE_SPEED,5,'accelerating');}
    else if(!sign||Math.sign(this.speed)!==sign)this.begin(0,Math.max(1.2,4*Math.abs(this.speed)/CRUISE_SPEED),'braking');
    else this.begin(sign*CRUISE_SPEED,Math.max(1.2,5*Math.abs(sign*CRUISE_SPEED-this.speed)/CRUISE_SPEED),'accelerating');
    return this.state();
  }
  begin(to,duration,phase){this.segment={from:this.speed,to,duration,time:0};this.phase=phase;}
  update(dt){if(!Number.isFinite(dt)||dt<0)throw new Error('Invalid train timestep');let remaining=dt;
    while(remaining>1e-9){
      if(this.phase==='turning'){const step=Math.min(remaining,this.hold);remaining-=step;this.hold-=step;if(this.hold<=1e-9){const sign=directions[this.requested];if(sign)this.begin(sign*CRUISE_SPEED,5,'accelerating');else this.phase='stopped';}continue;}
      if(!this.segment){this.distance+=this.speed*remaining;remaining=0;break;}
      const s=this.segment,step=Math.min(remaining,s.duration-s.time),a=s.time/s.duration,b=(s.time+step)/s.duration;
      this.distance+=s.from*step+(s.to-s.from)*s.duration*(primitive(b)-primitive(a));s.time+=step;remaining-=step;this.speed=s.from+(s.to-s.from)*ease(b);
      if(s.time>=s.duration-1e-9){this.speed=s.to;this.segment=null;const sign=directions[this.requested];
        if(!this.speed){if(sign&&sign!==this.lastDirection){this.phase='turning';this.hold=.22;}else if(sign)this.begin(sign*CRUISE_SPEED,5,'accelerating');else this.phase='stopped';}
        else{this.lastDirection=Math.sign(this.speed);this.phase='cruise';}
      }
    }
    this.distance=((this.distance%TRACK_LENGTH)+TRACK_LENGTH)%TRACK_LENGTH;return this.state();
  }
  state(){return {requested:this.requested,phase:this.phase,speed:this.speed,distance:this.distance,direction:Math.abs(this.speed)<.001?0:Math.sign(this.speed)};}
}
