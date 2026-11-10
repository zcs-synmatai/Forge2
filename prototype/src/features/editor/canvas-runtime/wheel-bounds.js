// Limit wheel panning only. Keep a useful strip of nodes inside the unobscured
// work area; manual dragging and pointer-anchored zoom retain their own behavior.
export function boundedWheelPan(camera,delta,bounds,area){
 const next={...camera,x:camera.x-delta.x,y:camera.y-delta.y};
 if(!bounds||!area||!(camera.zoom>0))return next;
 for(const [axis,dimension,strip]of [['x','width',96],['y','height',80]]){
  if(!delta[axis]||!(area[dimension]>0))continue;
  const visible=Math.min(strip,bounds[dimension]*camera.zoom,area[dimension]/2);
  const lower=area[axis]+visible-(bounds[axis]+bounds[dimension])*camera.zoom;
  const upper=area[axis]+area[dimension]-visible-bounds[axis]*camera.zoom;
  // An old camera may already be outside the range. Freeze outward movement,
  // but allow the user to scroll back without jumping to a new position.
  next[axis]=Math.max(Math.min(camera[axis],lower),Math.min(Math.max(camera[axis],upper),next[axis]));
 }
 return next;
}
