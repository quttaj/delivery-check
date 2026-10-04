import test from 'node:test';
import assert from 'node:assert/strict';
import {canPreserveOriginalImage,estimatedDataUrlLength,fittedImageDimensions,MAX_ANALYZE_REQUEST_BYTES,MAX_IMAGE_DATA_URL_LENGTH} from '../lib/image-preparation';

test('original image bytes are preserved when their data URL fits the request limit',()=>{
 const bytes=2_000_000;
 assert.ok(estimatedDataUrlLength(bytes,'image/jpeg')<MAX_IMAGE_DATA_URL_LENGTH);
 assert.equal(canPreserveOriginalImage(bytes,'image/jpeg'),true);
});

test('oversized originals enter the high-resolution resize path',()=>{
 assert.equal(canPreserveOriginalImage(10_000_000,'image/png'),false);
});

test('large images start at 4096px while preserving aspect ratio',()=>{
 assert.deepEqual(fittedImageDimensions(6000,3000),{width:4096,height:2048});
 assert.deepEqual(fittedImageDimensions(2400,1600),{width:2400,height:1600});
});

test('prepared image allowance leaves JSON overhead below the Vercel request budget',()=>{
 assert.ok(MAX_IMAGE_DATA_URL_LENGTH<MAX_ANALYZE_REQUEST_BYTES);
 assert.ok(MAX_ANALYZE_REQUEST_BYTES<4_500_000);
});
