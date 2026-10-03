import test from 'node:test';
import assert from 'node:assert/strict';
import {parsePackingList} from '../lib/packing-list.mjs';

const s=(id,text,x,y)=>({id,text,x,y,w:.04,h:.012});
const segments=[
 s(1,'Row',.07,.32),s(2,'Item code',.12,.32),s(3,'Product description',.25,.32),s(4,'Qty',.60,.32),s(5,'Unit',.65,.32),s(6,'Unit price',.72,.32),
 s(7,'1',.07,.365),s(8,'0550070018',.12,.365),s(9,'Smotana kyslá 16% 1kg Milsy',.25,.365),s(10,'1',.62,.365),s(11,'pc',.65,.365),s(12,'3.6900',.75,.365),
 s(13,'2',.07,.44),s(14,'055008516',.12,.44),s(15,'Maslo NAŠE 82% 250g Bape',.25,.44),s(16,'2',.62,.44),s(17,'pc',.65,.44),s(18,'1.3900',.75,.44)
];

test('locks exact product descriptions and keeps pack size separate',()=>{
 const rows=parsePackingList(segments);
 assert.deepEqual(rows.map(row=>({description:row.description,quantity:row.quantity,packSize:row.packSize})),[
  {description:'Smotana kyslá 16% 1kg Milsy',quantity:1,packSize:'1kg'},
  {description:'Maslo NAŠE 82% 250g Bape',quantity:2,packSize:'250g'}
 ]);
});

test('does not confuse percentage with pack size',()=>assert.equal(parsePackingList(segments)[0].packSize,'1kg'));

const separated=[
 s(6,'1',.0526,.5241),s(7,'Golden Hearth',.0948,.5248),s(8,'Hearthstone Foods Ltd.',.2095,.5245),s(9,'Cheddar Cheese',.3953,.5245),
 s(10,'45%',.5753,.5244),s(11,'250 g',.6612,.5244),s(12,'GH-CC-45-0250',.7412,.5245),s(13,'2',.9214,.5241)
];

test('reads a separated-column SKU row even when headings are artwork',()=>{
 const row=parsePackingList(separated)[0];
 assert.deepEqual({brand:row.brand,manufacturer:row.manufacturer,productName:row.productName,fat:row.fat,packSize:row.packSize,sku:row.sku,quantity:row.quantity},
  {brand:'Golden Hearth',manufacturer:'Hearthstone Foods Ltd.',productName:'Cheddar Cheese',fat:'45%',packSize:'250 g',sku:'GH-CC-45-0250',quantity:2});
 assert.equal(row.description,'Cheddar Cheese · Golden Hearth · 45% · 250 g');
});

const reordered=[
 s(20,'Row',.05,.20),s(21,'Product description',.14,.20),s(22,'Quantity',.55,.20),s(23,'SKU',.66,.20),s(24,'Unit',.86,.20),
 s(25,'1',.05,.26),s(26,'Fresh Milk 3.5% 500 ml',.14,.26),s(27,'3',.56,.26),s(28,'BM-FM-35-0500',.66,.26),s(29,'pc',.86,.26),
 s(30,'2',.05,.32),s(31,'Greek Yogurt 10% 200 g',.14,.32),s(32,'2',.56,.32),s(33,'AF-GY-10-0200',.66,.32),s(34,'pc',.86,.32)
];

test('uses header positions when Quantity appears before SKU',()=>{
 const rows=parsePackingList(reordered);
 assert.deepEqual(rows.map(row=>({id:row.id,sku:row.sku,quantity:row.quantity,description:row.description})),[
  {id:'1',sku:'BM-FM-35-0500',quantity:3,description:'Fresh Milk 3.5% 500 ml'},
  {id:'2',sku:'AF-GY-10-0200',quantity:2,description:'Greek Yogurt 10% 200 g'}
 ]);
 assert.deepEqual(rows[0].sourceIds,[25,26,27,28,29]);
});

const productNameReordered=[
 s(40,'No.',.05,.20),s(41,'Brand',.10,.20),s(42,'Product Name',.23,.20),s(43,'Additional Info',.45,.20),s(44,'Weight / Volume',.57,.20),s(45,'Quantity',.72,.20),s(46,'SKU',.80,.20),
 s(47,'1',.05,.26),s(48,'Clover Home',.10,.26),s(49,'Sour Cream',.23,.26),s(50,'16%',.46,.26),s(51,'200 g',.59,.26),s(52,'2',.73,.26),s(53,'CH-SC-16-0200',.80,.26),
 s(54,'2',.05,.32),s(55,'Golden Hearth',.10,.32),s(56,'Cultured Butter',.23,.32),s(57,'82%',.46,.32),s(58,'200 g',.59,.32),s(59,'1',.73,.32),s(60,'GH-CB-82-0200',.80,.32),
 s(61,'3',.05,.38),s(62,'Clover Home',.10,.38),s(63,'Cottage Cheese',.23,.38),s(64,'5%',.46,.38),s(65,'200 g',.59,.38),s(66,'3',.73,.38),s(67,'CH-CT-05-0200',.80,.38)
];

test('recognizes Product Name and maps Quantity and SKU from reordered header positions',()=>{
 const rows=parsePackingList(productNameReordered);
 assert.deepEqual(rows.map(row=>({sku:row.sku,quantity:row.quantity})),[
  {sku:'CH-SC-16-0200',quantity:2},
  {sku:'GH-CB-82-0200',quantity:1},
  {sku:'CH-CT-05-0200',quantity:3}
 ]);
 assert.equal(rows[0].description,'Sour Cream · Clover Home · 16% · 200 g');
 assert.deepEqual(rows[0].sourceIds,[47,48,49,50,51,52,53]);
});

const separatedReordered=[
 s(70,'1',.05,.50),s(71,'Clover Home',.11,.50),s(72,'Sour Cream',.28,.50),s(73,'16%',.51,.50),s(74,'200 g',.61,.50),s(75,'2',.74,.50),s(76,'CH-SC-16-0200',.82,.50)
];

test('fallback does not require Quantity to be right of SKU',()=>{
 const row=parsePackingList(separatedReordered)[0];
 assert.deepEqual({sku:row.sku,quantity:row.quantity},{sku:'CH-SC-16-0200',quantity:2});
 assert.deepEqual(row.sourceIds,[70,71,72,73,74,75,76]);
});
