// Shared metre-scale interior dimensions for geometry, collisions and interactions.
export const STANDING_EYE=2.69,SEATED_EYE=2.365,CAB_PARTITION_Z=7.10,CAB_FRONT_LIMIT=7.87;
export const CUSHION_COUNT=8,CUSHION_SPACING=1.515,FIRST_CUSHION_Z=-5.94;
export const CUSHION_X=.995,CUSHION_WIDTH=.61,BACKREST_X=1.16,GRAB_POLE_X=.635;
export const DOOR_TRAVEL=.78;
export const SEATS=[];
for(const car of [0,1])for(const side of [-1,1])for(let i=0;i<CUSHION_COUNT*2;i++){
  const mirror=car===0?1:-1,z=(FIRST_CUSHION_Z+(Math.floor(i/2)+(i%2===0?-.25:.25))*CUSHION_SPACING)*mirror;
  SEATS.push({id:SEATS.length+1,car,side:side*mirror,x:side*mirror*1.04,z,y:SEATED_EYE,width:CUSHION_SPACING/2});
}

// Looking toward the lead cab (+Z), the right-hand bench is local -X.
// One slot to the viewer's left along the same bench (+Z when facing him).
const rearRightSeats=SEATS.filter(s=>s.car===1&&s.side===-1);
const centerSeat=rearRightSeats.reduce((a,b)=>Math.abs(a.z)<Math.abs(b.z)?a:b);
export const NO_FACE_SEAT=rearRightSeats.find(s=>Math.abs(s.z-centerSeat.z-CUSHION_SPACING/2)<1e-6);
export const CHIHIRO_SEAT=rearRightSeats.find(s=>Math.abs(s.z-NO_FACE_SEAT.z-CUSHION_SPACING/2)<1e-6);
let visitorSeat=null;
export function setVisitorSeat(id){visitorSeat=id;}
export const isSeatOccupied=seat=>seat.id===NO_FACE_SEAT.id||seat.id===CHIHIRO_SEAT.id||seat.id===visitorSeat;
