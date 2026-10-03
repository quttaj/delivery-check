import test from 'node:test';
import assert from 'node:assert/strict';
import {reconcile} from '../lib/reconcile.mjs';

const row={id:'1',description:'Controlled item',quantity:2,sourceIds:[1],sku:'SS-SC-16-0200',unit:'pc'};
function obs(unitId,photoIndex=0,status='matched',changes={}){return {unitId,photoIndex,rowId:status==='unexpected'?null:'1',box:{x:0,y:0,w:.3,h:.3},reason:'Visible printed SKU occurrence',request:'',attributes:[{field:'sku',expected:status==='matched'||status==='mismatch'?row.sku:'',observed:status==='mismatch'?'SS-SC-20-0200':status==='unexpected'?'OTHER-01':row.sku,status}],...changes};}

test('the same occurrence reference is counted once within a photo',()=>assert.equal(reconcile([row],[obs('T1'),obs('T1'),obs('T2')]).rows[0].count,2));
test('distinct readable occurrences with the same SKU are each counted',()=>assert.equal(reconcile([row],[obs('T1'),obs('T2'),obs('T3')]).rows[0].status,'extra'));
test('exact SKU and quantity confirm the row and delivery',()=>{const result=reconcile([row],[obs('T1'),obs('T2')]);assert.equal(result.rows[0].status,'matched');assert.equal(result.allVerified,true);});
test('related but different SKU is reported separately from the expected row',()=>{const result=reconcile([row],[obs('T1',0,'mismatch')]);assert.equal(result.rows[0].status,'unverified');assert.equal(result.unexpected[0].status,'mismatch');});
test('readable unknown SKU remains a standalone unexpected item',()=>{const result=reconcile([row],[obs('T1'),obs('X',0,'unexpected')]);assert.equal(result.unexpected[0].sku,'OTHER-01');assert.equal(result.allVerified,false);});
test('no readable occurrence is unverified rather than missing',()=>assert.match(reconcile([row],[]).rows[0].reason,/not proof/i));
test('separate non-overlapping photos sum their distinct occurrences',()=>assert.equal(reconcile([row],[obs('T1',0),obs('T1',1)]).rows[0].count,2));
test('capture ambiguity keeps established row counts while blocking overall verification',()=>{const result=reconcile([row],[obs('T1'),obs('T2')],'Capture clarification');assert.equal(result.rows[0].status,'matched');assert.equal(result.allVerified,false);});

test('confirmed readable quantities remain distinct from quantities not verified',()=>{
 const expected={...row,quantity:3};
 const result=reconcile([expected],[obs('T1')]);
 assert.equal(result.rows[0].count,1);
 assert.equal(result.rows[0].status,'partial');
 assert.match(result.rows[0].reason,/remainder is unverified, not missing/i);
 assert.equal(result.allVerified,false);
});

test('correct extras and simultaneous wrong SKUs remain independent findings',()=>{
 const rows=[
  {id:'1',description:'Row 1',quantity:1,sourceIds:[1],sku:'BM-FM-35-0500',unit:'pc'},
  {id:'2',description:'Row 2',quantity:3,sourceIds:[2],sku:'CH-SC-16-0200',unit:'pc'},
  {id:'3',description:'Row 3',quantity:1,sourceIds:[3],sku:'BB-SY-25-0150',unit:'pc'},
  {id:'4',description:'Row 4',quantity:2,sourceIds:[4],sku:'AF-GY-10-0200',unit:'pc'}
 ];
 const bySku=new Map(rows.map(item=>[item.sku,item]));
 const observation=(unitId,observedSku,status,rowId=null)=>({unitId,photoIndex:0,rowId,box:{x:0,y:0,w:.1,h:.1},reason:'Visible printed SKU occurrence',request:'',attributes:[{field:'sku',expected:rowId?rows.find(item=>item.id===rowId).sku:'',observed:observedSku,status}]});
 const observations=[
  ...['bm1','bm2','bm3'].map(id=>observation(id,'BM-FM-35-0500','matched',bySku.get('BM-FM-35-0500').id)),
  ...['bb1','bb2','bb3'].map(id=>observation(id,'BB-SY-25-0150','matched',bySku.get('BB-SY-25-0150').id)),
  observation('af1','AF-GY-10-0200','matched',bySku.get('AF-GY-10-0200').id),
  ...['wrong1','wrong2'].map(id=>observation(id,'BM-FM-15-0500','mismatch',bySku.get('BM-FM-35-0500').id)),
  ...['unknown1','unknown2'].map(id=>observation(id,'GH-CC-45-0250','unexpected'))
 ];
 const result=reconcile(rows,observations);
 assert.deepEqual(result.rows.map(item=>[item.sku,item.count,item.status]),[
  ['BM-FM-35-0500',3,'extra'],
  ['CH-SC-16-0200',0,'unverified'],
  ['BB-SY-25-0150',3,'extra'],
  ['AF-GY-10-0200',1,'partial']
 ]);
 assert.deepEqual(result.unexpected.map(item=>[item.sku,item.count,item.status]),[
  ['BM-FM-15-0500',2,'mismatch'],
  ['GH-CC-45-0250',2,'unexpected']
 ]);
 assert.deepEqual(result.unexpected.map(item=>item.evidence.length),[2,2]);
});

test('details-panel units expose one canonical SKU check',()=>{
 const unit=reconcile([{...row,quantity:1}],[obs('T1')]).rows[0].units[0];
 assert.deepEqual(unit.check,{field:'sku',expected:row.sku,observed:row.sku,status:'matched'});
 assert.equal('attributes' in unit,false);
});
