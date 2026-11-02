import assert from 'node:assert/strict';
import test from 'node:test';
import { selectionClusters, selectionGroupLabel, selectionMode, updateSelection } from '../src/view/selection.ts';

test('selection modifiers replace, add, and subtract entities', () => {
  assert.equal(selectionMode({ shiftKey: false, ctrlKey: false }), 'replace');
  assert.equal(selectionMode({ shiftKey: true, ctrlKey: false }), 'add');
  assert.equal(selectionMode({ shiftKey: false, ctrlKey: true }), 'subtract');
  assert.equal(selectionMode({ shiftKey: true, ctrlKey: true }), 'subtract');
  assert.deepEqual([...updateSelection(['one'], ['two'], 'replace')], ['two']);
  assert.deepEqual([...updateSelection(['one'], ['two'], 'add')], ['one', 'two']);
  assert.deepEqual([...updateSelection(['one', 'two'], ['one'], 'subtract')], ['two']);
});

test('multi-selection labels miners together and mixed kinds as Mix', () => {
  const miner=(position:[number,number,number],radius=.86)=>({kind:'miner-robot',position,hitbox:{radius}});
  const duck=(position:[number,number,number])=>({kind:'duck',position,hitbox:{radius:.25}});
  assert.equal(selectionGroupLabel([miner([0,0,0])]), undefined);
  assert.equal(selectionGroupLabel([miner([0,0,0]),miner([1.9,0,0])]), 'Miners');
  assert.equal(selectionGroupLabel([miner([0,0,0]),duck([0,0,1])]), 'Mix');
  assert.equal(selectionGroupLabel([duck([0,0,0]),duck([1,0,0])]), 'Group');
});

test('selected formations share one label through neighbours less than two metres apart',()=>{
  const miner=(position:[number,number,number])=>({kind:'miner-robot',position,hitbox:{radius:.86}});
  const formation=[.5,-2.22,-4.94].flatMap(z=>[-2.22,.5,3.06].map(x=>miner([x,0,z]))),outlier=miner([20,0,20]);
  assert.deepEqual(selectionClusters(formation).map(cluster=>cluster.length),[9]);
  assert.deepEqual(selectionClusters([...formation,outlier]).map(cluster=>cluster.length),[9,1]);
  assert.deepEqual(selectionClusters([miner([0,0,0]),miner([3.72,0,0])]).map(cluster=>cluster.length),[1,1]);
});
