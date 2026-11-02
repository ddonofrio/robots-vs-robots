import { observedMaterialKnowledge } from './knowledge';
import { clone, distance, type Action, type Body, type Entity, type EntityOrder, type EntityOrderInput, type Vec3 } from './types';
import type { Engine } from './engine';

const center=(point:Vec3):Vec3=>point.map(value=>value+.5) as Vec3;

export class EntityOrders {
  constructor(private readonly engine:Engine){}

  queue(entityIds:string[],input:EntityOrderInput){
    const entities=[...new Set(entityIds)].map(id=>this.engine.entity(id)).filter(entity=>this.engine.active(entity)&&entity.orderCapabilities?.includes(input.kind));
    if(!entities.length)throw new Error('Choose at least one enabled entity that supports this order.');
    const id=`order-${this.engine.tick}-${this.engine.nextEvent}`,centre:[number,number]=[entities.reduce((sum,entity)=>sum+entity.position[0],0)/entities.length,entities.reduce((sum,entity)=>sum+entity.position[2],0)/entities.length];
    for(const [index,entity] of entities.entries()){
      const order:EntityOrder={id,kind:input.kind,status:'queued',createdTick:this.engine.tick};
      const formationOffset:[number,number]=[entity.position[0]-centre[0],entity.position[2]-centre[1]];
      if(input.kind==='move')order.target=[input.target[0]+formationOffset[0],input.target[1],input.target[2]+formationOffset[1]];
      if(input.kind==='patrol'){order.points=input.points.map(point=>[point[0]+formationOffset[0],point[1],point[2]+formationOffset[1]]) as [Vec3,Vec3];order.patrolIndex=0;}
      if(input.kind==='search'){
        const dx=entity.position[0]-centre[0],dz=entity.position[2]-centre[1];
        order.mineral=input.mineral;order.heading=Math.hypot(dx,dz)>.1?Math.atan2(dx,dz)*180/Math.PI:index*360/entities.length;order.phase='travel';order.scans=0;
      }
      if(input.kind==='mine'){
        const target=entity.mineralKnowledge?.[input.mineral];if(!target)continue;
        order.mineral=input.mineral;order.target=clone(target);order.phase='mine';
      }
      if(input.kind==='defend'||input.kind==='repair'){order.targetId=input.targetId;order.targetType=input.targetType;order.phase=input.kind==='defend'?'guard':'repair';}
      entity.orderQueue??=[];entity.orderQueue.push(order);
    }
    const accepted=entities.filter(entity=>entity.orderQueue?.some(order=>order.id===id));
    if(!accepted.length)throw new Error(input.kind==='mine'?'None of the selected robots knows a deposit of that mineral.':'The selected entities cannot perform that order.');
    this.engine.event('world','order-queued',`${input.kind} was queued for ${accepted.map(entity=>entity.name).join(', ')}.`,{orderId:id,kind:input.kind,entityIds:accepted.map(entity=>entity.id),input});
    return{id,entities:accepted};
  }

  cancel(entityIds:string[],orderId:string){
    let cancelled=0;
    for(const id of new Set(entityIds)){
      const entity=this.engine.entity(id),queue=entity.orderQueue??[],active=queue[0]?.id===orderId,next=queue.filter(order=>order.id!==orderId);
      if(next.length===queue.length)continue;
      cancelled+=queue.length-next.length;entity.orderQueue=next;
      if(active){delete entity.motion;delete entity.following;entity.status='idle';}
    }
    if(cancelled)this.engine.event('world','order-cancelled',`Cancelled order ${orderId}.`,{orderId,entityIds,cancelled});
    return cancelled;
  }

  private act(entity:Entity,action:Action){return this.engine.act(entity.id,action,entity.controller==='automaton'?'automaton':'manual');}
  private finish(entity:Entity,message:string){
    const order=entity.orderQueue?.shift();entity.status='idle';delete entity.motion;
    if(order)this.engine.event(entity.id,'order-completed',message,{orderId:order.id,kind:order.kind});
  }
  private navigate(entity:Entity,target:Vec3){
    const dx=target[0]-entity.position[0],dz=target[2]-entity.position[2],metres=Math.hypot(dx,dz);
    if(metres<=.55)return true;
    const order=entity.orderQueue![0],blocked=entity.lastAction?.ok===false&&entity.lastAction.feedback?.outcome==='blocked';
    if(blocked){
      order.attempts=(order.attempts??0)+1;const side=(order.attempts+entity.id.length)%2?1:-1;
      delete entity.lastAction;this.act(entity,{action:'walk',distance:Math.min(5,Math.max(2,metres)),angle:side*(order.attempts%3===0?90:45)});return false;
    }
    const scale=Math.min(28,metres)/metres,waypoint:[number,number,number]=[entity.position[0]+dx*scale,entity.position[1],entity.position[2]+dz*scale];
    this.act(entity,{action:'walk',target:waypoint});return false;
  }
  private nearestVoxel(origin:Vec3,kind:string,radius=25){
    let nearest:Vec3|undefined,best=Infinity;const minY=this.engine.module.manifest.bounds.min[1],maxY=this.engine.module.manifest.bounds.max[1]-1;
    for(let x=Math.floor(origin[0]-radius);x<=Math.ceil(origin[0]+radius);x++)for(let z=Math.floor(origin[2]-radius);z<=Math.ceil(origin[2]+radius);z++){
      const horizontal=(x+.5-origin[0])**2+(z+.5-origin[2])**2;if(horizontal>radius**2||horizontal>=best)continue;
      for(let y=maxY;y>=minY;y--){if(this.engine.voxels.get([x,y,z])!==kind)continue;const score=horizontal+(y+.5-origin[1])**2;if(score<best){best=score;nearest=[x,y,z];}}
    }
    return nearest;
  }
  private excavationTarget(target:Vec3){
    for(let y=this.engine.module.manifest.bounds.max[1]-1;y>=target[1];y--){const point:[number,number,number]=[target[0],y,target[2]];if(this.engine.voxels.get(point))return point;}
    return target;
  }
  private reportMineral(reporter:Entity,mineral:string,target:Vec3){
    for(const robot of this.engine.entities.filter(entity=>entity.orderCapabilities?.includes('mine')&&this.engine.active(entity))){
      const previous=robot.mineralKnowledge?.[mineral],closer=!previous||distance(robot.position,center(target))<distance(robot.position,center(previous));
      robot.mineralKnowledge??={};if(closer)robot.mineralKnowledge[mineral]=clone(target);
      this.engine.discover(robot.id,observedMaterialKnowledge(mineral),`${reporter.name} reported ${mineral} at [${target.join(',')}].`,{source:'robot-report',reporterId:reporter.id,material:mineral,target});
      const order=robot.orderQueue?.[0];
      if(closer&&order?.kind==='search'&&order.mineral===mineral&&(order.scans??0)>0){order.kind='mine';order.phase='mine';order.target=clone(target);order.scanPending=false;robot.status='responding';}
    }
    this.engine.event(reporter.id,'mineral-report',`${reporter.name} reported ${mineral} at [${target.join(',')}].`,{material:mineral,target});
  }

  advance(entity:Entity){
    const order=entity.orderQueue?.[0];if(!order)return;
    order.status='active';delete entity.following;
    if(order.kind==='move'){
      if(this.navigate(entity,order.target!))this.finish(entity,`${entity.name} reached its ordered position.`);return;
    }
    if(order.kind==='patrol'){
      order.patrolIndex??=0;const target=order.points![order.patrolIndex];
      if(this.navigate(entity,target)){order.patrolIndex=order.patrolIndex===0?1:0;entity.status='patrolling';}
      return;
    }
    if(order.kind==='search'){
      if(order.phase==='scan'){
        if(!order.scanPending){const result=this.act(entity,{action:'find_material'});if(result.ok&&entity.motion){entity.motion.duration=2;order.scanPending=true;entity.status='scanning';}return;}
        const target=this.nearestVoxel(entity.position,order.mineral!,25);order.scans=(order.scans??0)+1;order.scanPending=false;
        if(target){this.reportMineral(entity,order.mineral!,target);order.kind='mine';order.phase='mine';order.target=clone(target);return;}
        const angle=order.heading!*Math.PI/180;order.target=[entity.position[0]+Math.sin(angle)*50,entity.position[1],entity.position[2]+Math.cos(angle)*50];order.phase='travel';entity.status='searching';return;
      }
      if(!order.target){const angle=order.heading!*Math.PI/180;order.target=[entity.position[0]+Math.sin(angle)*10,entity.position[1],entity.position[2]+Math.cos(angle)*10];}
      if(this.navigate(entity,order.target)){order.phase='scan';delete order.target;entity.status='preparing-scan';}
      return;
    }
    if(order.kind==='mine'){
      const target=order.target??entity.mineralKnowledge?.[order.mineral!];
      if(!target){this.finish(entity,`${entity.name} no longer knows a ${order.mineral} deposit.`);return;}
      order.target=clone(target);
      if(this.engine.voxels.get(target)!==order.mineral){
        const next=this.nearestVoxel(center(target),order.mineral!,8);
        if(next){order.target=next;return;}
        order.phase='waiting-base';order.status='waiting';entity.status='waiting-for-base';return;
      }
      const point=center(target),dx=entity.position[0]-point[0],dz=entity.position[2]-point[2],length=Math.max(.001,Math.hypot(dx,dz)),approach:[number,number,number]=[point[0]+dx/length*1.8,entity.position[1],point[2]+dz/length*1.8];
      if(Math.hypot(entity.position[0]-approach[0],entity.position[2]-approach[2])>.6){this.navigate(entity,approach);return;}
      const excavation=this.excavationTarget(target);this.act(entity,{action:'hit',target:excavation});entity.status=excavation[1]===target[1]?'mining':'excavating';return;
    }
    const target=order.targetType==='entity'?this.engine.entities.find(candidate=>candidate.id===order.targetId):this.engine.bodies.find(candidate=>candidate.id===order.targetId);
    if(!target){this.finish(entity,`${entity.name}'s ${order.kind} target no longer exists.`);return;}
    const metres=distance(entity.position,target.position);
    if(metres>3){this.navigate(entity,target.position);return;}
    if(order.kind==='defend'){entity.status='defending';return;}
    const repairable=target as Entity|Body;repairable.maxHealth??=100;repairable.health??=repairable.maxHealth;
    if(repairable.health>=repairable.maxHealth){this.finish(entity,`${entity.name} finished repairing ${target.id}.`);return;}
    repairable.health=Math.min(repairable.maxHealth,repairable.health+10);entity.status='repairing';this.engine.event(entity.id,'repair',`${entity.name} repaired ${target.id}.`,{targetId:target.id,health:repairable.health,maxHealth:repairable.maxHealth});
  }
}
