const norm=(value='')=>String(value).replace(/\s+/g,' ').trim();

function lines(segments){
 const sorted=[...segments].filter(s=>norm(s.text)).sort((a,b)=>a.y-b.y||a.x-b.x);
 const out=[];
 for(const segment of sorted){
  let line=out.find(candidate=>Math.abs(candidate.y-segment.y)<=Math.max(.008,segment.h*.65));
  if(!line){line={y:segment.y,items:[]};out.push(line);}
  line.items.push(segment);line.items.sort((a,b)=>a.x-b.x);
 }
 return out.sort((a,b)=>a.y-b.y);
}

const sizePattern=/^\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)$/i;
const fatPattern=/^\d+(?:[.,]\d+)?\s*%$/;
const structuredSkuPattern=/^[A-Z0-9]{2,}(?:-[A-Z0-9]{2,}){2,}$/i;

const headerPatterns={
 row:/^(row|line|no\.?|#)$/i,
 brand:/^brand$/i,
 sku:/^(sku|code|item code|product code)$/i,
 product:/^(product name|product description|item description|product|description)$/i,
 info:/^(additional info|details?)$/i,
 pack:/^(weight\s*\/\s*volume|weight|volume|pack size|size)$/i,
 qty:/^(qty|quantity)$/i,
 unit:/^(unit|uom)$/i,
 price:/^(price|unit price|rate)$/i
};

function findHeaderAnchors(line){
 return Object.entries(headerPatterns).map(([name,pattern])=>{
  let best=null;
  for(let start=0;start<line.items.length;start++){
   for(let length=1;length<=3&&start+length<=line.items.length;length++){
    const text=norm(line.items.slice(start,start+length).map(item=>item.text).join(' '));
    if(pattern.test(text)&&(!best||length>best.length))best={name,x:line.items[start].x,length};
   }
  }
  return best&&{name:best.name,x:best.x};
 }).filter(Boolean).sort((a,b)=>a.x-b.x);
}

function parseCompactRows(grouped){
 const required=['row','sku','product','qty'];
 let header=null,anchors=[];
 for(const line of grouped){
  const candidate=findHeaderAnchors(line);
  if(required.every(name=>candidate.some(anchor=>anchor.name===name))){header=line;anchors=candidate;break;}
 }
 if(!header)return [];
 const cells=(items,name)=>{
  const index=anchors.findIndex(anchor=>anchor.name===name);
  if(index<0)return [];
  const lower=index===0?-Infinity:(anchors[index-1].x+anchors[index].x)/2;
  const upper=index===anchors.length-1?Infinity:(anchors[index].x+anchors[index+1].x)/2;
  return items.filter(item=>item.x>=lower&&item.x<upper).sort((a,b)=>a.x-b.x);
 };
 const rows=[];
 for(const line of grouped.filter(candidate=>candidate.y>header.y+.012)){
  const rowItem=cells(line.items,'row').find(item=>/^\d{1,2}$/.test(norm(item.text)));
  const qtyItem=cells(line.items,'qty').find(item=>/^\d+(?:[.,]\d+)?$/.test(norm(item.text)));
  const productItems=cells(line.items,'product');
  const codeItems=cells(line.items,'sku');
  const unitItems=cells(line.items,'unit');
  const brandItems=cells(line.items,'brand');
  const infoItems=cells(line.items,'info');
  const packItems=cells(line.items,'pack');
  if(!rowItem||!qtyItem||!productItems.length||!codeItems.length)continue;
  const productName=norm(productItems.map(item=>item.text).join(' '));
  const brand=norm(brandItems.map(item=>item.text).join(' '));
  const info=norm(infoItems.map(item=>item.text).join(' '));
  const pack=norm(packItems.map(item=>item.text).join(' '));
  const description=[productName,brand,info,pack].filter(Boolean).join(' · ');
  const sku=norm(codeItems.map(item=>item.text).join(' '));
  const quantity=Number(norm(qtyItem.text).replace(',','.'));
  if(!sku||!Number.isInteger(quantity)||quantity<1||quantity>100)continue;
  const sizeMatches=[...description.matchAll(/\b\d+(?:[.,]\d+)?\s*(?:kg|g|ml|l)\b/gi)].map(match=>norm(match[0]));
  rows.push({id:norm(rowItem.text),description,brand,manufacturer:'',productName,fat:fatPattern.test(info)?info:'',sku,quantity,unit:norm(unitItems.map(item=>item.text).join(' '))||'unit',packSize:pack||sizeMatches.join(' / '),sourceIds:line.items.map(item=>item.id)});
 }
 return rows;
}

// Some polished delivery-note templates render their column headings as artwork,
// while the row values remain selectable PDF text. This fallback reconstructs a
// row from the printed SKU and neighbouring value cells without OCR or AI.
function parseSeparatedRows(grouped){
 const rows=[];
 for(const line of grouped){
  const skuItem=line.items.find(item=>structuredSkuPattern.test(norm(item.text)));
  if(!skuItem)continue;
  const rowItem=line.items.filter(item=>item.x<skuItem.x&&/^\d{1,2}$/.test(norm(item.text))).sort((a,b)=>a.x-b.x)[0];
  const qtyItem=line.items.filter(item=>item!==rowItem&&/^\d{1,3}$/.test(norm(item.text))&&Number(norm(item.text))>=1&&Number(norm(item.text))<=100)
   .sort((a,b)=>Math.abs(a.x-skuItem.x)-Math.abs(b.x-skuItem.x))[0];
  if(!rowItem||!qtyItem)continue;
  const cells=line.items.filter(item=>item.x>rowItem.x&&item.x<skuItem.x&&item!==rowItem&&item!==qtyItem);
  const packItem=[...cells].reverse().find(item=>sizePattern.test(norm(item.text)));
  const fatItem=[...cells].reverse().find(item=>fatPattern.test(norm(item.text)));
  const identityCells=cells.filter(item=>item!==packItem&&item!==fatItem);
  if(identityCells.length<2)continue;
  const brand=norm(identityCells[0].text);
  const manufacturer=identityCells.length>=3?norm(identityCells[1].text):'';
  const productName=norm(identityCells.slice(manufacturer?2:1).map(item=>item.text).join(' '));
  const fat=norm(fatItem?.text);
  const packSize=norm(packItem?.text);
  const quantity=Number(norm(qtyItem.text));
  if(!productName||!Number.isInteger(quantity)||quantity<1||quantity>100)continue;
  rows.push({
   id:norm(rowItem.text),
   description:[productName,brand,fat,packSize].filter(Boolean).join(' · '),
   brand,manufacturer,productName,fat,
   sku:norm(skuItem.text),quantity,unit:'pc',packSize,
   sourceIds:line.items.map(item=>item.id)
  });
 }
 return rows;
}

export function parsePackingList(segments){
 const grouped=lines(segments);
 const compact=parseCompactRows(grouped);
 const rows=compact.length?compact:parseSeparatedRows(grouped);
 if(!rows.length)throw new Error('No SKU product rows were found. Use a one-page text PDF with row number, printed SKU and quantity.');
 if(rows.length>5)throw new Error(`This packing list contains ${rows.length} product rows. Use a test list with no more than 5.`);
 if(new Set(rows.map(row=>row.id)).size!==rows.length)throw new Error('Product row numbers are not unique.');
 if(rows.some(row=>!row.sku))throw new Error('Every test row needs a printed SKU so the labels can be checked reliably.');
 if(new Set(rows.map(row=>norm(row.sku).toUpperCase())).size!==rows.length)throw new Error('Every product row needs a unique SKU.');
 return rows;
}
