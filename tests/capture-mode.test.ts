import test from 'node:test';
import assert from 'node:assert/strict';
import {captureModeSettings} from '../lib/capture-mode';

test('single overview mode keeps exactly one complete-delivery photo',()=>{
 assert.equal(captureModeSettings.overview.maxPhotos,1);
 assert.match(captureModeSettings.overview.confirmation,/single photo.*complete delivery/i);
});

test('separate-parts mode keeps up to three non-overlapping photos',()=>{
 assert.equal(captureModeSettings.parts.maxPhotos,3);
 assert.match(captureModeSettings.parts.confirmation,/No physical package appears in more than one photo/i);
});
