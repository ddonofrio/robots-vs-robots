import assert from 'node:assert/strict';
import { test } from 'node:test';
import { canCommandRobot, createRvrWorld, loadWorldGenerator, minerals, vehicles, worldGenerators, type Commander } from '../src/world';
import { MAX_PLAYERS, PROTOCOL_VERSION } from '../src/shared/protocol';

test('RvR exposes modular generators and scalable content registries',()=>{
  assert.deepEqual(Object.keys(worldGenerators),['empty','flat','noise']);
  assert.equal(createRvrWorld(loadWorldGenerator('flat')).manifest.terrain?.type,'layers');
  assert.equal(createRvrWorld(loadWorldGenerator('empty')).manifest.terrain,undefined);
  assert.throws(()=>loadWorldGenerator('unknown'),/Unknown world generator/);
  assert.ok(minerals.length>=6);
  assert.ok(vehicles.length>=2);
  assert.equal(MAX_PLAYERS,20);
  assert.equal(PROTOCOL_VERSION,1);
  const commander:Commander={id:'commander-1',name:'Commander One',robotIds:['robot-a','robot-b']};
  assert.equal(canCommandRobot(commander,'robot-a'),true);
  assert.equal(canCommandRobot(commander,'robot-c'),false);
});
