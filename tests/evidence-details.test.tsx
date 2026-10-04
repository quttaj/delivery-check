import test from 'node:test';
import assert from 'node:assert/strict';
import {renderToStaticMarkup} from 'react-dom/server';
import {EvidenceDetailsBody,createEvidenceDetailsModel,createFindingSelection} from '../components/evidence-details';
import {reconcile} from '../lib/reconcile.mjs';

const row={id:'1',description:'Controlled item',quantity:1,sourceIds:[7],sku:'BM-FM-35-0500',unit:'pc'};
const doc={image:'data:image/png;base64,doc',segments:[{id:7,x:.1,y:.2,w:.3,h:.04}]};
const photos=[{data:'data:image/jpeg;base64,photo'}];
const observation=(id:string,status='matched',sku=row.sku,rowId:string|null='1')=>({unitId:id,photoIndex:0,rowId,box:{x:.2,y:.3,w:.2,h:.2},reason:'Visible printed SKU',attributes:[{field:'sku',expected:rowId?row.sku:'',observed:status==='unreadable'?'':sku,status}]});
const render=(selected:any)=>renderToStaticMarkup(<EvidenceDetailsBody selected={selected} doc={doc} photos={photos} zoom={false} onToggleZoom={()=>{}}/>);

test('renders confirmed and extra row details from unit.check with row and image evidence',()=>{
 const confirmed=reconcile([row],[observation('confirmed')]).rows[0];
 const extra=reconcile([row],[observation('extra-1'),observation('extra-2')]).rows[0];
 for(const selected of [confirmed,extra]){
  const html=render(selected);
  assert.match(html,/BM-FM-35-0500/);
  assert.match(html,/Packing list evidence/);
  assert.match(html,/Evidence for/);
 }
});

test('renders known-row different items with document evidence and keeps standalone findings photo-only',()=>{
 const unexpectedResult=reconcile([row],[observation('unexpected','unexpected','GH-CC-45-0250',null)]);
 const differentResult=reconcile([row],[observation('different','mismatch','BM-FM-15-0500','1')]);
 const unverifiedResult=reconcile([row],[observation('hidden','unreadable','',null)]);
 const unexpected=createFindingSelection(unexpectedResult.unexpected[0],unexpectedResult.rows,'Unexpected SKU');
 const different=createFindingSelection(differentResult.unexpected[0],differentResult.rows,'Different item');
 const unverified=createFindingSelection(unverifiedResult.unverified[0],unverifiedResult.rows,'Unverified object');
 const unexpectedHtml=render(unexpected);
 const differentHtml=render(different);
 const unverifiedHtml=render(unverified);
 assert.match(unexpectedHtml,/Evidence for/);
 assert.match(unexpectedHtml,/GH-CC-45-0250/);
 assert.doesNotMatch(unexpectedHtml,/Packing list evidence/);
 assert.match(differentHtml,/Evidence for/);
 assert.match(differentHtml,/BM-FM-15-0500/);
 assert.match(differentHtml,/Packing list evidence/);
 assert.match(unverifiedHtml,/Evidence for/);
 assert.match(unverifiedHtml,/SKU unreadable/);
 assert.doesNotMatch(unverifiedHtml,/Packing list evidence/);
});

test('normalizes missing arrays and incomplete evidence before rendering',()=>{
 const model=createEvidenceDetailsModel({name:'Incomplete',evidence:[{photoIndex:4}]},{image:'',segments:undefined},undefined);
 assert.deepEqual(model.units,[]);
 assert.equal(model.evidence.length,1);
 assert.deepEqual(model.segments,[]);
 assert.doesNotThrow(()=>renderToStaticMarkup(<EvidenceDetailsBody selected={{evidence:[{photoIndex:4}]}} doc={{}} photos={undefined} zoom={false} onToggleZoom={()=>{}}/>));
 const html=renderToStaticMarkup(<EvidenceDetailsBody selected={{}} doc={{}} photos={undefined} zoom={false} onToggleZoom={()=>{}}/>);
 assert.match(html,/packing-list preview is unavailable/i);
 assert.match(html,/No image evidence is available/i);
});

test('renders normalized image coordinates as matching CSS percentages',()=>{
 const html=render({standalone:true,evidence:[observation('boxed')],units:[]});
 assert.match(html,/left:20%;top:30%;width:20%;height:20%/);
});
