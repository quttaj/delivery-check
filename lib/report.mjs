const html=(value='')=>String(value).replace(/[&<>"']/g,character=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[character]));
const list=value=>Array.isArray(value)?value:[];
const photos=evidence=>{
 const numbers=[...new Set(list(evidence).map(item=>Number(item?.photoIndex)).filter(Number.isInteger).map(index=>index+1))];
 return numbers.length?`Photo${numbers.length===1?'':'s'} ${numbers.join(', ')}`:'No photograph reference';
};
const findingLabel=status=>({matched:'Confirmed count',extra:'Extra units',partial:'Visible shortfall',mismatch:'Different item',unverified:'Unverified'}[status]||status||'Unverified');
const finite=value=>value!==null&&value!==undefined&&value!==''&&Number.isFinite(Number(value));

/**
 * @param {{documentName?: string, result?: any, verifiedAt?: Date|string|number}} options
 */
export function buildReportHtml({documentName,result,verifiedAt=new Date()}={}){
 const rows=list(result?.rows),unexpected=list(result?.unexpected),unverified=list(result?.unverified);
 const metrics=result?.metrics||{};
 const overall=result?.allVerified?'Delivery verified from supplied views':'Review required — delivery completeness is not fully verified';
 const rowHtml=rows.map(row=>`<tr><td><strong>${html(row.name||row.description)}</strong><br><span>SKU ${html(row.sku)}</span></td><td>${html(row.quantity)}</td><td>${html(row.confirmedCount)}</td><td>${html(findingLabel(row.status))}<br><small>${html(row.reason)}</small></td><td>Row ${html(row.id)}; ${html(photos(row.evidence))}</td></tr>`).join('');
 const findingHtml=(items,label)=>items.length?`<h2>${label}</h2><ul>${items.map(item=>`<li><strong>${html(item.sku||'Unreadable SKU')}</strong> — ${html(item.count||1)} visible. ${html(item.reason)} <span>${item.rowId?`Packing-list row ${html(item.rowId)}; `:''}${html(photos(item.evidence))}</span></li>`).join('')}</ul>`:'';
 const duration=finite(metrics.totalMs)?`${(Number(metrics.totalMs)/1000).toFixed(1)} seconds`:finite(metrics.elapsedMs)?`${(Number(metrics.elapsedMs)/1000).toFixed(1)} seconds`:'Not available';
 const cost=finite(metrics.costUSD)?`$${Number(metrics.costUSD).toFixed(5)}`:'Not available';
 return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Delivery verification report</title><style>@page{margin:16mm}*{box-sizing:border-box}body{font:14px/1.45 Arial,sans-serif;color:#17243e;margin:0}h1{font-size:25px;margin:0 0 5px}h2{font-size:17px;margin:24px 0 8px}.meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px 24px;background:#f4f7fc;padding:14px;margin:18px 0}.status{padding:12px 14px;background:${result?.allVerified?'#e6f5ed':'#fff4da'};font-weight:700;margin:16px 0}table{width:100%;border-collapse:collapse;font-size:12px}th,td{text-align:left;vertical-align:top;border-bottom:1px solid #ccd5e3;padding:9px 7px}th{background:#eef2f8}td span,small,li span{color:#536079}ul{padding-left:20px}li{margin:8px 0}.notice{border-top:2px solid #17243e;margin-top:25px;padding-top:12px;font-weight:700}.actions{margin:0 0 18px}@media print{.actions{display:none}}@media(max-width:700px){.meta{grid-template-columns:1fr}table{font-size:11px}}</style></head><body><div class="actions"><button onclick="window.print()">Print / Save as PDF</button></div><h1>Delivery verification report</h1><p>Visible printed-SKU evidence from the supplied photographs.</p><div class="meta"><div><strong>Packing list</strong><br>${html(documentName||'Not available')}</div><div><strong>Verification date</strong><br>${html(new Date(verifiedAt).toLocaleString())}</div><div><strong>Processing duration</strong><br>${html(duration)}</div><div><strong>Estimated API cost</strong><br>${html(cost)}</div></div><div class="status">${html(overall)}</div><h2>Packing-list rows</h2><table><thead><tr><th>Product / SKU</th><th>Expected</th><th>Verified visible</th><th>Finding</th><th>Evidence reference</th></tr></thead><tbody>${rowHtml}</tbody></table>${findingHtml(unexpected,'Unexpected or different SKUs')}${findingHtml(unverified,'Unverified observations')}<h2>Cost assumptions</h2><p>${html(metrics.pricingAssumptions||'Pricing assumptions were not available for this operation.')}</p><p class="notice">This report confirms visible SKU evidence only. Unreadable labels, missing views and incomplete coverage are not proof that an item was physically absent.</p></body></html>`;
}
