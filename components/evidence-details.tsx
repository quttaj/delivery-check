'use client';
import {Button} from './ui/button';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from './ui/table';

type Check={field:string;expected:string;observed:string;status:string};
type Box={x:number;y:number;w:number;h:number};
type Unit={id:string;check:Check};
type Evidence={photoIndex:number;unitId:string;observedSku:string;reason:string;request:string;box:Box|null};
type Segment={id:number;x:number;y:number;w:number;h:number};
type Photo={data:string};

const list=<T,>(value:unknown):T[]=>Array.isArray(value)?value:[];
const text=(value:unknown,fallback='')=>typeof value==='string'?value:fallback;
const number=(value:unknown,fallback=0)=>Number.isFinite(Number(value))?Number(value):fallback;
const validBox=(value:any):Box|null=>value&&[value.x,value.y,value.w,value.h].every(item=>Number.isFinite(Number(item)))
 ?{x:number(value.x),y:number(value.y),w:number(value.w),h:number(value.h)}:null;

export function createEvidenceDetailsModel(selected:any,doc:any,photosValue:unknown){
 const units=list<any>(selected?.units).map((unit,index):Unit=>({
  id:text(unit?.id,`occurrence-${index+1}`),
  check:{field:'sku',expected:text(unit?.check?.expected),observed:text(unit?.check?.observed),status:text(unit?.check?.status,'unverified')}
 }));
 const evidence=list<any>(selected?.evidence).map((item,index):Evidence=>({
  photoIndex:number(item?.photoIndex,-1),unitId:text(item?.unitId,`occurrence-${index+1}`),
  observedSku:text(list<any>(item?.attributes)[0]?.observed),reason:text(item?.reason,'No evidence explanation was returned.'),
  request:text(item?.request),box:validBox(item?.box)
 }));
 const sourceIds=new Set(list<unknown>(selected?.sourceIds).filter(value=>Number.isInteger(Number(value))).map(Number));
 const segments=list<any>(doc?.segments).filter(segment=>sourceIds.has(Number(segment?.id))&&validBox(segment)).map((segment):Segment=>({id:number(segment.id),...validBox(segment)!}));
 const photos=list<Photo>(photosValue);
 const photoOnly=Number.isInteger(selected?.photoOnly)?Number(selected.photoOnly):null;
 return {units,evidence,segments,photos,photoOnly,standalone:selected?.standalone===true,documentOnly:selected?.documentOnly===true,documentImage:text(doc?.image)};
}

export function createFindingSelection(item:any,rowsValue:unknown,title:string){
 const row=list<any>(rowsValue).find(candidate=>candidate?.id===item?.rowId);
 return {...item,name:title,standalone:!row,units:[],sourceIds:row?list<number>(row.sourceIds):[],evidence:list(item?.evidence)};
}

export function EvidenceDetailsBody({selected,doc,photos,zoom,onToggleZoom}:{selected:any;doc:any;photos:unknown;zoom:boolean;onToggleZoom:()=>void}){
 const model=createEvidenceDetailsModel(selected,doc,photos);
 const imageClass=zoom?'source-frame zoom-source':'source-frame';
 return <>
  <Button variant="outline" size="sm" onClick={onToggleZoom}>{zoom?'Fit to width':'Enlarge source'}</Button>
  {model.units.map(unit=><div className="attribute-unit" key={unit.id}><strong>SKU occurrence {unit.id}</strong><Table><TableHeader><TableRow><TableHead>Attribute</TableHead><TableHead>Ordered</TableHead><TableHead>Observed</TableHead><TableHead>Check</TableHead></TableRow></TableHeader><TableBody><TableRow><TableCell>Printed SKU</TableCell><TableCell>{unit.check.expected||'Not specified'}</TableCell><TableCell>{unit.check.observed||'Not visible'}</TableCell><TableCell>{unit.check.status}</TableCell></TableRow></TableBody></Table></div>)}
  <div className="evidence-scroll">
   {model.photoOnly!==null?(model.photos[model.photoOnly]?.data?<img className={zoom?'zoom-source':'source-img'} src={model.photos[model.photoOnly].data} alt="Full delivery photograph"/>:<p>The selected photograph is unavailable.</p>):<>
    {!model.standalone&&(model.documentImage?<><h3>Delivery note · page 1</h3><div className={imageClass}><img src={model.documentImage} alt="Packing list evidence"/>{model.segments.map(segment=><span key={segment.id} className="source-box pdf-box" style={{left:`${segment.x*100}%`,top:`${segment.y*100}%`,width:`${segment.w*100}%`,height:`${segment.h*100}%`}}/>)}</div></>:<p>The packing-list preview is unavailable.</p>)}
    {!model.documentOnly&&model.evidence.length===0&&<p>No image evidence is available for this finding. Run the check again or provide a clearer photograph.</p>}
    {model.evidence.map((item,index)=>{const photo=model.photos[item.photoIndex];return <div className="evidence-item" key={`${item.unitId}-${index}`}><h3>Photo {item.photoIndex>=0?item.photoIndex+1:'?'} · {item.unitId}</h3><p>{item.observedSku||'SKU unreadable'} — {item.reason}</p>{photo?.data?<div className={imageClass}><img src={photo.data} alt={`Evidence for ${item.unitId}`}/>{item.box?<span className="source-box" style={{left:`${item.box.x*100}%`,top:`${item.box.y*100}%`,width:`${item.box.w*100}%`,height:`${item.box.h*100}%`}}/>:<p>Image region unavailable.</p>}</div>:<p>Supporting photograph unavailable.</p>}{item.request&&<p className="request-photo">Next photo: {item.request}</p>}</div>;})}
   </>}
  </div>
 </>;
}
