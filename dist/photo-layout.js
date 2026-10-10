export const PHOTO_RATIOS=Object.freeze({free:null,'16:9':16/9,'21:9':21/9,'3:2':3/2,'4:3':4/3,'1:1':1,'4:5':4/5,'9:16':9/16});
export function cropRect(width,height,ratio='free',x=0,y=0){
  if(!(width>0&&height>0)||!Object.hasOwn(PHOTO_RATIOS,ratio))throw new Error('Invalid photo dimensions');
  const aspect=PHOTO_RATIOS[ratio]??width/height;
  const w=Math.min(width,height*aspect),h=w/aspect;
  return {x:(width-w)*(1+Math.max(-1,Math.min(1,x)))/2,y:(height-h)*(1+Math.max(-1,Math.min(1,y)))/2,width:w,height:h};
}
export function exportSize(rect,max=2880){
  const scale=Math.min(1,max/Math.max(rect.width,rect.height));
  return {width:Math.max(1,Math.round(rect.width*scale)),height:Math.max(1,Math.round(rect.height*scale))};
}
// The preview and PNG share these dimensions, including the two caption lines.
export function drawPostcard(ctx,width,height,caption){
  const border=Math.max(15,width*.025),footer=Math.max(72,height*.12,width*.07);
  ctx.fillStyle='#eee5d0';ctx.fillRect(0,0,width,border);ctx.fillRect(0,0,border,height);ctx.fillRect(width-border,0,border,height);ctx.fillRect(0,height-footer,width,footer);
  ctx.fillStyle='#4d5657';ctx.textAlign='left';ctx.font=Math.max(18,width*.023)+'px serif';ctx.fillText('海の旅 · Sea Railway',border*1.5,height-footer*.57,width-border*3);
  ctx.font=Math.max(14,width*.014)+'px sans-serif';ctx.fillText(caption,border*1.5,height-footer*.20,width-border*3);
}
