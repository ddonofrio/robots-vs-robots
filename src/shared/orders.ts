import type { EntityOrderInput, Vec3 } from '../core/types';

const point=(value:unknown):value is Vec3=>Array.isArray(value)&&value.length===3&&value.every(Number.isFinite);

export function parseEntityOrder(value:unknown,mineralIds:ReadonlySet<string>):EntityOrderInput {
  if(!value||typeof value!=='object')throw new Error('Order is required.');
  const order=value as Record<string,unknown>,kind=order.kind;
  if(kind==='move'){
    if(!point(order.target))throw new Error('Move requires a finite world target.');
    return{kind,target:order.target};
  }
  if(kind==='patrol'){
    if(!Array.isArray(order.points)||order.points.length!==2||!order.points.every(point))throw new Error('Patrol requires two finite world targets.');
    return{kind,points:order.points as [Vec3,Vec3]};
  }
  if(kind==='search'||kind==='mine'){
    if(typeof order.mineral!=='string'||!mineralIds.has(order.mineral))throw new Error('Choose a registered mineable mineral.');
    return{kind,mineral:order.mineral};
  }
  if(kind==='defend'||kind==='repair'){
    if(typeof order.targetId!=='string'||!order.targetId||!['entity','body'].includes(String(order.targetType)))throw new Error(`${kind} requires an entity or building target.`);
    return{kind,targetId:order.targetId,targetType:order.targetType as 'entity'|'body'};
  }
  throw new Error('Unsupported order.');
}
