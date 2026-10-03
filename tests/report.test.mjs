import test from 'node:test';
import assert from 'node:assert/strict';
import {buildReportHtml} from '../lib/report.mjs';

const reportResult={
 allVerified:false,
 rows:[{id:'4',name:'Greek Yogurt',sku:'AF-GY-10-0200',quantity:2,confirmedCount:1,status:'partial',reason:'One readable SKU; remainder unverified.',evidence:[{photoIndex:0}]}],
 unexpected:[{sku:'GH-CC-45-0250',count:2,status:'unexpected',rowId:null,reason:'Readable SKU does not match a row.',evidence:[{photoIndex:0}]}],
 unverified:[{sku:'',count:1,status:'unverified',reason:'Printed SKU is obscured.',evidence:[{photoIndex:1}]}],
 metrics:{totalMs:2345,costUSD:.00123,pricingAssumptions:'Input and output token pricing recorded at processing time.'}
};

test('print report contains results, evidence references, measurements and pricing assumptions',()=>{
 const output=buildReportHtml({documentName:'Delivery_Note_05.pdf',result:reportResult,verifiedAt:'2026-10-03T10:00:00Z'});
 for(const expected of ['Delivery_Note_05.pdf','AF-GY-10-0200','Expected','Verified visible','Visible shortfall','Row 4; Photo 1','GH-CC-45-0250','Unverified observations','Photo 2','2.3 seconds','$0.00123','Input and output token pricing recorded at processing time.','window.print()'])assert.match(output,new RegExp(expected.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')));
});

test('print report escapes data and does not fabricate a zero cost',()=>{
 const output=buildReportHtml({documentName:'<script>alert(1)</script>',result:{...reportResult,metrics:{costUSD:null}}});
 assert.doesNotMatch(output,/<script>alert\(1\)<\/script>/);
 assert.match(output,/&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
 assert.match(output,/Estimated API cost<\/strong><br>Not available/);
 assert.doesNotMatch(output,/\$0\.00000/);
});
