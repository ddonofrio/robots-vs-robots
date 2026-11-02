import assert from 'node:assert/strict';
import test from 'node:test';
import { zoomDistanceAt, zoomProgressAt } from '../src/view/zoom-scale.ts';

test('zoom slider endpoints reach both camera distance limits', () => {
  assert.equal(zoomDistanceAt(0,2,120),120);
  assert.equal(zoomDistanceAt(1,2,120),2);
  assert.equal(zoomProgressAt(120,2,120),0);
  assert.equal(zoomProgressAt(2,2,120),1);
});

test('zoom scale is reversible and gives useful precision across its range', () => {
  for(const progress of [.1,.25,.5,.75,.9]){
    const distance=zoomDistanceAt(progress,2,120);
    assert.ok(Math.abs(zoomProgressAt(distance,2,120)-progress)<1e-12);
  }
});
