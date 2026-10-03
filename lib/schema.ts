import {z} from 'zod';

export const documentRow=z.object({
 id:z.string(),description:z.string(),brand:z.string(),manufacturer:z.string(),productName:z.string(),fat:z.string(),sku:z.string().min(1),quantity:z.number().int().positive().max(100),unit:z.string(),packSize:z.string(),sourceIds:z.array(z.number().int().nonnegative()).min(1)
});
export const box=z.object({x:z.number().min(0).max(1),y:z.number().min(0).max(1),w:z.number().positive().max(1),h:z.number().positive().max(1)});
export const photoExtraction=z.object({
 observations:z.array(z.object({
  occurrenceRef:z.string().trim().min(1).max(80),observedSku:z.string().trim().min(1).max(200),textBox:box
 })).max(100)
}).superRefine((value,context)=>{
 const references=new Set<string>();
 value.observations.forEach((item,index)=>{
  if(references.has(item.occurrenceRef))context.addIssue({code:z.ZodIssueCode.custom,path:['observations',index,'occurrenceRef'],message:'Each returned text occurrence needs a unique occurrenceRef.'});
  references.add(item.occurrenceRef);
 });
});

const str={type:'string'};
const obj=(properties:Record<string,unknown>)=>({type:'object',properties,required:Object.keys(properties),additionalProperties:false});
export const photoExtractionJSON=obj({
 observations:{type:'array',items:obj({
  occurrenceRef:str,observedSku:str,
  textBox:obj({x:{type:'number',minimum:0,maximum:1},y:{type:'number',minimum:0,maximum:1},w:{type:'number',minimum:.001,maximum:1},h:{type:'number',minimum:.001,maximum:1}})
 })}
});
