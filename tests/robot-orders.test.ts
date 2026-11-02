import assert from 'node:assert/strict';
import test from 'node:test';
import { Engine } from '../src/core/engine';
import { TURN_TICKS } from '../src/core/time';
import { parseEntityOrder } from '../src/shared/orders';
import { rvrWorld } from '../src/world';

const advanceTurn=(engine:Engine)=>{for(let tick=0;tick<TURN_TICKS;tick++)engine.step();};

test('robot orders queue, start authoritatively, and cancel as a batch',()=>{
  const engine=new Engine(rvrWorld),robot=engine.entity('min-01');
  for(const other of engine.entities)if(other!==robot)engine.setEntityEnabled(other.id,false);
  const first=engine.queueOrders([robot.id],{kind:'move',target:[robot.position[0]+4,robot.position[1],robot.position[2]]});
  const second=engine.queueOrders([robot.id],{kind:'patrol',points:[[robot.position[0],robot.position[1],robot.position[2]],[robot.position[0],robot.position[1],robot.position[2]+4]]});
  assert.deepEqual(robot.orderQueue?.map(order=>order.id),[first.id,second.id]);
  advanceTurn(engine);assert.equal(robot.orderQueue?.[0].status,'active');assert.ok(robot.motion);
  assert.equal(engine.cancelOrder([robot.id],first.id),1);assert.equal(robot.motion,undefined);assert.equal(robot.orderQueue?.[0].id,second.id);
});

test('group search fans robots outward and repair restores nearby targets',()=>{
  const engine=new Engine(rvrWorld),ids=['min-01','min-02','min-03'];
  const search=engine.queueOrders(ids,{kind:'search',mineral:'iron_ore'});
  const headings=ids.map(id=>engine.entity(id).orderQueue?.find(order=>order.id===search.id)?.heading);
  assert.equal(new Set(headings).size,3);
  engine.cancelOrder(ids,search.id);
  const target=engine.entity('min-02');target.health=40;
  engine.queueOrders(['min-01'],{kind:'repair',targetId:target.id,targetType:'entity'});advanceTurn(engine);
  assert.equal(target.health,50);assert.equal(engine.entity('min-01').status,'repairing');
});

test('order transport accepts registered minerals and rejects unknown catalogs',()=>{
  const ids=new Set(['iron_ore','copper_ore']);
  assert.deepEqual(parseEntityOrder({kind:'search',mineral:'iron_ore'},ids),{kind:'search',mineral:'iron_ore'});
  assert.throws(()=>parseEntityOrder({kind:'mine',mineral:'unobtainium'},ids),/registered mineable mineral/);
  assert.deepEqual(parseEntityOrder({kind:'patrol',points:[[0,1,2],[3,4,5]]},ids),{kind:'patrol',points:[[0,1,2],[3,4,5]]});
});

test('an idle teammate yields so the middle robot can cross its formation',()=>{
  const engine=new Engine(rvrWorld),robot=engine.entity('min-02'),start=robot.position[2];
  engine.queueOrders([robot.id],{kind:'move',target:[robot.position[0],robot.position[1],start-12]});
  for(let tick=0;tick<TURN_TICKS*10;tick++)engine.step();
  assert.ok(robot.position[2]<start-4,`the selected robot stopped inside the formation at z=${robot.position[2]}`);
  assert.ok(engine.frame().events.some(event=>event.type==='yield'&&event.data&&typeof event.data==='object'&&'moverId' in event.data&&event.data.moverId===robot.id));
});

test('a group move preserves formation offsets instead of converging and colliding',()=>{
  const engine=new Engine(rvrWorld),ids=['min-01','min-02','min-03'],before=ids.map(id=>engine.entity(id).position[0]);
  engine.queueOrders(ids,{kind:'move',target:[20,5,20]});
  const targets=ids.map(id=>engine.entity(id).orderQueue![0].target![0]);
  assert.deepEqual(targets.map((x,index)=>Math.round((x-targets[0]-(before[index]-before[0]))*1000)),[0,0,0]);
  assert.equal(new Set(targets).size,3);
});
