'use client';
import {useEffect,useRef,useState} from 'react';
import {PackageCheck,FileText,Camera,Plus,Check,ShieldCheck,X,ScanLine,Download,Info,LoaderCircle,Search,RotateCcw} from 'lucide-react';
import {RadioGroup,RadioGroupItem} from '@/components/ui/radio-group';
import {Checkbox} from '@/components/ui/checkbox';
import {Button} from '@/components/ui/button';
import {Dialog,DialogContent,DialogTitle,DialogDescription} from '@/components/ui/dialog';
import {Table,TableHeader,TableBody,TableRow,TableHead,TableCell} from '@/components/ui/table';
import {EvidenceDetailsBody,createFindingSelection} from '@/components/evidence-details';
import {parsePackingList} from '@/lib/packing-list.mjs';
import {buildReportHtml} from '@/lib/report.mjs';
import {captureModeSettings,type CaptureMode} from '@/lib/capture-mode';
import {canPreserveOriginalImage,fittedImageDimensions,MAX_IMAGE_DATA_URL_LENGTH,MAX_RESIZED_DIMENSION} from '@/lib/image-preparation';
type Segment={id:number,text:string,x:number,y:number,w:number,h:number};
type ParsedRow={id:string,description:string,brand:string,manufacturer:string,productName:string,fat:string,sku:string,quantity:number,unit:string,packSize:string,sourceIds:number[]};
type Doc={name:string,image:string,segments:Segment[],rows:ParsedRow[],ms:number};
type Photo={name:string,data:string};
const labels:Record<string,string>={matched:'Confirmed count',extra:'Extra units',mismatch:'Different item',partial:'Visible shortfall',unverified:'Needs a closer look'};
const readFileDataURL=(file:File)=>new Promise<string>((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(String(reader.result||''));reader.onerror=()=>reject(Error('The photo could not be read.'));reader.readAsDataURL(file);});
async function preparePhoto(file:File):Promise<Photo>{
 if(canPreserveOriginalImage(file.size,file.type)){
  const original=await readFileDataURL(file);
  if(original.length<=MAX_IMAGE_DATA_URL_LENGTH)return {name:file.name,data:original};
 }
 const bitmap=await createImageBitmap(file,{imageOrientation:'from-image'});
 try{
  let maxDimension=Math.min(MAX_RESIZED_DIMENSION,Math.max(bitmap.width,bitmap.height));
  for(let attempt=0;attempt<6;attempt++){
   const dimensions=fittedImageDimensions(bitmap.width,bitmap.height,maxDimension);
   const canvas=document.createElement('canvas');canvas.width=dimensions.width;canvas.height=dimensions.height;
   const context=canvas.getContext('2d')!;context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';context.drawImage(bitmap,0,0,canvas.width,canvas.height);
   for(const quality of [.96,.9,.84]){
    const data=canvas.toDataURL('image/jpeg',quality);
    if(data.length<=MAX_IMAGE_DATA_URL_LENGTH)return {name:file.name,data};
   }
   maxDimension=Math.max(1200,Math.round(maxDimension*.82));
  }
  throw Error('This photo could not be prepared within the upload limit. Crop unused background and try again.');
 }finally{bitmap.close();}
}
export default function Home(){
 const [doc,setDoc]=useState<Doc|null>(null),[photos,setPhotos]=useState<Photo[]>([]),[result,setResult]=useState<any>(null),[error,setError]=useState(''),[busy,setBusy]=useState(''),[ready,setReady]=useState<boolean|null>(null),[selected,setSelected]=useState<any>(null),[zoom,setZoom]=useState(false);
 const [captureMode,setCaptureMode]=useState<CaptureMode>('overview'),[captureConfirmed,setCaptureConfirmed]=useState(false);
 const maxPhotos=captureModeSettings[captureMode].maxPhotos;
 const pdfInput=useRef<HTMLInputElement>(null),photoInput=useRef<HTMLInputElement>(null),replaceInput=useRef<HTMLInputElement>(null),replaceIndex=useRef(0);
 useEffect(()=>{fetch('/api/status').then(r=>r.json()).then((r:any)=>setReady(r.ready)).catch(()=>setReady(false));},[]);
 function invalidate(){setCaptureConfirmed(false);setResult(null);setSelected(null);setError('');}
 async function readPDF(file:File){invalidate();setDoc(null);setBusy('Reading packing list');const started=performance.now();try{
 if(file.size>10*1024*1024)throw Error('The PDF must be smaller than 10 MB.');
 const pdfjs=await import('pdfjs-dist');pdfjs.GlobalWorkerOptions.workerSrc='/pdf.worker.min.mjs';
 const task=pdfjs.getDocument({data:new Uint8Array(await file.arrayBuffer()),isEvalSupported:false});const pdf=await task.promise;
 try{if(pdf.numPages!==1)throw Error(`This document has ${pdf.numPages} pages. Upload a one-page test packing list with up to 5 product rows.`);
 const page=await pdf.getPage(1),viewport=page.getViewport({scale:1.6}),content=await page.getTextContent();const canvas=document.createElement('canvas');canvas.width=viewport.width;canvas.height=viewport.height;
 await page.render({canvas,canvasContext:canvas.getContext('2d')!,viewport}).promise;
 const segments=content.items.filter((i:any)=>i.str?.trim()).map((i:any,id:number)=>{const t=pdfjs.Util.transform(viewport.transform,i.transform),h=Math.hypot(t[2],t[3]);return {id,text:i.str,x:t[4]/viewport.width,y:(t[5]-h)/viewport.height,w:i.width*viewport.scale/viewport.width,h:h/viewport.height};});
 if(segments.map(s=>s.text).join('').length<20)throw Error('No usable text layer found. Use a text PDF, not a scan or a screenshot.');
 const rows=parsePackingList(segments) as ParsedRow[];
 setDoc({name:file.name,image:canvas.toDataURL('image/png'),segments,rows,ms:Math.round(performance.now()-started)});
 }finally{await pdf.destroy();}
 }catch(e){setError(e instanceof Error?e.message:'Could not read this PDF.');}finally{setBusy('');}}
 async function readPhotos(files:File[],replace:number|null=null){invalidate();setBusy('Preparing photographs');try{
 if(replace===null && photos.length+files.length>maxPhotos)throw Error(captureMode==='overview'?'Single overview mode accepts one photo. Replace it or choose Delivery in separate parts.':'Use up to 3 non-overlapping photos. Replace a photo to add a clearer view.');
 const prepared:Photo[]=[];for(const file of files){if(!['image/jpeg','image/png','image/webp'].includes(file.type))throw Error('Please use JPEG, PNG or WebP. Export HEIC photos as JPEG.');if(file.size>15*1024*1024)throw Error('Each photo must be smaller than 15 MB.');prepared.push(await preparePhoto(file));}
 setPhotos(old=>replace===null?[...old,...prepared]:old.map((p,i)=>i===replace?prepared[0]:p));
 }catch(e){setError(e instanceof Error?e.message:'Could not prepare the photo.');}finally{setBusy('');}}
 async function analyze(){if(!doc||!photos.length)return;setError('');setResult(null);setBusy('Reading each photo separately and checking evidence');const start=performance.now();try{const response=await fetch('/api/analyze',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({captureMode,captureConfirmed,segments:doc.segments,photos})});const data:any=await response.json();const metrics={...data.metrics,totalMs:Math.round(performance.now()-start),pdfMs:doc.ms,success:response.ok};if(!response.ok)throw Error(data.error||'The check could not be completed.');setResult({...data,metrics});}catch(e){setError(e instanceof Error?e.message:'Connection lost. No conclusion was made.');}finally{setBusy('');}}
 function downloadReport(){if(!result)return;const reportWindow=window.open('','_blank');if(!reportWindow){setError('Allow pop-ups to open the printable PDF report.');return;}reportWindow.opener=null;reportWindow.document.write(buildReportHtml({documentName:doc?.name,result,verifiedAt:new Date()}));reportWindow.document.close();reportWindow.focus();setTimeout(()=>reportWindow.print(),250);}
 const counts=(status:string)=>result?.rows.filter((r:any)=>r.status===status).length||0;
 const inspectObservation=(item:any,title:string)=>{setSelected(createFindingSelection(item,result?.rows,title));setZoom(false);};
 return <div className="app-shell">
 <header className="topbar"><a className="brand" href="/"><span className="brand-icon"><PackageCheck size={25}/></span>Delivery<span>Check</span></a></header>
 <main><div className="page-heading"><h1>Check what arrived</h1></div>
 <div className="workspace"><section className="inputs">
 <div className="panel"><div className="panel-title"><span className="step">01</span><h2>Packing list</h2>{doc&&<span className="small-success"><Check size={15}/> Text ready</span>}</div>
 <input ref={pdfInput} type="file" accept="application/pdf" className="sr-only" onChange={e=>{if(e.target.files?.[0])void readPDF(e.target.files[0]);e.target.value='';}}/>
 {!doc?<button className="dropzone" disabled={!!busy} onClick={()=>pdfInput.current?.click()} onDragOver={e=>e.preventDefault()} onDrop={e=>{e.preventDefault();if(!busy&&e.dataTransfer.files[0])void readPDF(e.dataTransfer.files[0]);}}><span className="upload-icon"><FileText/></span><strong>Drop your delivery note here</strong><span>or choose a PDF</span><small>One page with selectable row values, SKU and quantity · up to 10 MB</small></button>:<><div className="document-loaded"><button className="paper-preview" onClick={()=>{setSelected({documentOnly:true});setZoom(false);}} aria-label="Open packing list"><img src={doc.image} alt="Your uploaded packing list"/></button><div><strong>{doc.name}</strong><p>1 page · {doc.rows.length} locked SKU row(s)</p><Button variant="outline" disabled={!!busy} onClick={()=>pdfInput.current?.click()}>Replace PDF</Button></div></div><div className="locked-rows">{doc.rows.map(row=><div key={row.id}><strong>Row {row.id}</strong><span>{row.description}</span><small><b>SKU {row.sku}</b> · {row.quantity} {row.unit}</small></div>)}</div></>}
 </div>
 <div className="panel"><div className="panel-title"><span className="step">02</span><h2>Delivery photos</h2><span className="count">{photos.length} / {maxPhotos}</span></div><RadioGroup className="capture-options" value={captureMode} disabled={!!busy} onValueChange={v=>{const mode=v as CaptureMode;setCaptureMode(mode);setPhotos(old=>mode==='overview'?old.slice(0,1):old);invalidate();}} aria-label="Photo capture convention"><label><RadioGroupItem value="overview"/> <span><strong>Single overview photo</strong><small>One photo shows the complete delivery and every package once.</small></span></label><label><RadioGroupItem value="parts"/> <span><strong>Delivery in separate parts</strong><small>Use up to three photos. Each physical package appears in only one photo.</small></span></label></RadioGroup><p className="panel-note">Keep each printed SKU fully readable and visually separate. Product appearance is not used.</p>
 <input ref={photoInput} type="file" accept="image/jpeg,image/png,image/webp" multiple={captureMode==='parts'} className="sr-only" onChange={e=>{void readPhotos(Array.from(e.target.files||[]));e.target.value='';}}/>
 <input ref={replaceInput} type="file" accept="image/jpeg,image/png,image/webp" className="sr-only" onChange={e=>{if(e.target.files?.[0])void readPhotos([e.target.files[0]],replaceIndex.current);e.target.value='';}}/>
 <div className="photo-grid">{photos.map((photo,index)=><div className="photo-card" key={index}><button className="photo-open" onClick={()=>{setSelected({photoOnly:index});setZoom(false);}}><img src={photo.data} alt={`Delivery photo ${index+1}`}/></button><div className="photo-caption"><span>Photo {index+1}</span><button aria-label={`Remove photo ${index+1}`} disabled={!!busy} onClick={()=>{setPhotos(p=>p.filter((_,i)=>i!==index));invalidate();}}><X size={15}/></button></div><button className="text-link" disabled={!!busy} onClick={()=>{replaceIndex.current=index;replaceInput.current?.click();}}>Replace view</button></div>)}{photos.length<maxPhotos&&<button className="photo-add" disabled={!!busy} onClick={()=>photoInput.current?.click()}><Camera size={28}/><strong>{photos.length?'Add photo':captureMode==='overview'?'Choose photo':'Choose photos'}</strong><small>JPEG, PNG or WebP</small><Plus size={18}/></button>}</div>
 </div>
 <div className="action-panel"><label className="capture-confirm"><Checkbox checked={captureConfirmed} disabled={!!busy} onCheckedChange={v=>{setCaptureConfirmed(v===true);setResult(null);}}/><span>{captureModeSettings[captureMode].confirmation}</span></label>{ready===false&&<p className="connection-note"><Info size={17}/><span>Recognition is not connected yet. You can prepare and preview your files.</span></p>}<Button className="check-button" disabled={!doc||!photos.length||!captureConfirmed||!!busy||ready!==true} onClick={analyze}>{busy?<LoaderCircle className="spin" size={20}/>:<ScanLine size={20}/>} {busy||'Check delivery'}</Button><p className="privacy-note">Files are sent for analysis only when you check. This app does not save your uploads.</p></div>
 {error&&<div className="error" role="alert">{error}</div>}
 </section>
 <section className="panel results"><div className="panel-title"><span className="step">03</span><h2>Evidence report</h2>{result&&<Button variant="ghost" size="sm" onClick={downloadReport} aria-label="Download PDF report"><Download size={18}/> PDF report</Button>}</div>
 {!result?<div className="empty-report"><div className="evidence-symbol"><Search size={36}/></div><h3>Every conclusion needs SKU evidence.</h3><p>Your report will connect each printed SKU to its document row and supporting photo region.</p><div className="status-examples"><span className="status matched"><Check size={14}/> Confirmed</span><span className="status mismatch">Different SKU</span><span className="status unverified">Unverified</span></div><div className="evidence-rule"><ShieldCheck size={23}/><p>A hidden SKU is not a missing item.<br/><strong>We ask for a clearer label view.</strong></p></div></div>:<>
 <div className={'report-verdict '+(result.allVerified?'verified':'attention')}><strong>{result.allVerified?'Delivery verified from the supplied views':'Review required'}</strong><span>{result.allVerified?'Every packing-list row has complete visible SKU and quantity evidence.':'Unexpected readable SKUs or incomplete row evidence prevent a complete delivery confirmation.'}</span></div>
 <div className="summary"><div><strong>{counts('matched')}</strong><span>Confirmed rows</span></div><div><strong>{counts('mismatch')+counts('extra')+result.unexpected.length}</strong><span>Discrepancies</span></div><div><strong>{counts('unverified')+counts('partial')+result.unverified.length}</strong><span>Unverified</span></div></div>
 <p className="scope">Visible SKU evidence only. Unseen goods are not presumed missing.</p>
 <Table><TableHeader><TableRow><TableHead>Ordered item</TableHead><TableHead>SKU identified / ordered</TableHead><TableHead>Finding</TableHead></TableRow></TableHeader><TableBody>{result.rows.map((r:any)=><TableRow key={r.id}><TableCell><button className="row-link" onClick={()=>{setSelected(r);setZoom(false);}}>{r.name}<small>SKU {r.sku} · view row & photo evidence</small></button></TableCell><TableCell>{r.confirmedCount} / {r.quantity}<small className="candidate-count">{r.count} readable SKU label(s)</small></TableCell><TableCell><span className={'status '+r.status}>{labels[r.status]}</span></TableCell></TableRow>)}</TableBody></Table>
 <div className="result-details">
  {result.rows.filter((r:any)=>r.status!=='matched').map((r:any)=><button className="finding" key={r.id} onClick={()=>{setSelected(r);setZoom(false);}}><strong>Row {r.id} · {r.name}</strong><p>{r.reason}</p></button>)}
  {result.unexpected.map((item:any)=><button className="finding unexpected-finding" key={item.id} onClick={()=>inspectObservation(item,item.status==='mismatch'?`Different item ${item.sku}`:`Unexpected SKU ${item.sku}`)}><strong>{item.status==='mismatch'?'Different item':'Unexpected SKU'} · {item.sku} · {item.count} visible</strong><p>{item.reason}</p></button>)}
  {result.unverified.map((item:any)=><button className="finding unverified-finding" key={item.id} onClick={()=>inspectObservation(item,'Unverified observation')}><strong>Unverified observation · {item.id}</strong><p>{item.reason} Open the supporting evidence.</p></button>)}
  {result.captureIssue&&<div className="capture-issue"><strong>Capture clarification needed</strong><p>{result.captureIssue}</p></div>}
 </div>
 <div className="metrics"><span>{(result.metrics.totalMs/1000).toFixed(1)}s to report</span><span>{result.metrics.costUSD===null?'Cost not configured':`$${result.metrics.costUSD.toFixed(5)} estimated`}</span><span>{result.metrics.attempts} photo analysis request(s)</span></div><Button variant="outline" onClick={analyze} disabled={!!busy}><RotateCcw size={16}/> Check current photos again</Button></>}
 </section></div>
 <footer><span>Delivery Check · Prototype</span><span>Confirm the label. Count the package. Keep the evidence.</span></footer>
 </main>
 <Dialog open={!!selected} onOpenChange={v=>{if(!v)setSelected(null);}}><DialogContent className="evidence-dialog"><DialogTitle>{selected?.name||'Source preview'}</DialogTitle><DialogDescription>{selected?.reason||'Inspect the original source. Photo boxes are model-proposed regions, not independently verified detections.'}</DialogDescription><EvidenceDetailsBody selected={selected} doc={doc} photos={photos} zoom={zoom} onToggleZoom={()=>setZoom(!zoom)}/></DialogContent></Dialog>
 </div>;
}
