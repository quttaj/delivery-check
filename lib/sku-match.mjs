export const normalizeSku=(value='')=>String(value).toUpperCase().replace(/[^A-Z0-9]/g,'');

const parts=(value='')=>String(value).toUpperCase().split(/[^A-Z0-9]+/).filter(Boolean);

// Associate a wrong SKU with a row only for the controlled, segmented SKU
// format: same family prefix and exactly one changed later segment. Opaque or
// ambiguous codes remain standalone unexpected items.
function isRelatedSku(expected,observed){
 const a=parts(expected),b=parts(observed);
 if(a.length<3||a.length!==b.length||a[0]!==b[0]||a[1]!==b[1])return false;
 return a.slice(2).filter((part,index)=>part!==b[index+2]).length===1;
}

export function matchSku(rows,observedSku){
 const observed=normalizeSku(observedSku);
 if(!observed)return {row:null,status:'unreadable'};
 const exact=rows.find(row=>normalizeSku(row.sku)===observed);
 if(exact)return {row:exact,status:'matched'};
 const related=rows.filter(row=>isRelatedSku(row.sku,observedSku));
 return related.length===1?{row:related[0],status:'mismatch'}:{row:null,status:'unexpected'};
}
