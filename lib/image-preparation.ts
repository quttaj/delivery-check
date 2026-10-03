export const MAX_IMAGE_DATA_URL_LENGTH=5_800_000;
export const MAX_RESIZED_DIMENSION=4_096;

export function estimatedDataUrlLength(byteLength:number,mimeType='image/jpeg'){
 return `data:${mimeType};base64,`.length+Math.ceil(Math.max(0,byteLength)/3)*4;
}

export function canPreserveOriginalImage(byteLength:number,mimeType:string){
 return estimatedDataUrlLength(byteLength,mimeType)<=MAX_IMAGE_DATA_URL_LENGTH;
}

export function fittedImageDimensions(width:number,height:number,maxDimension=MAX_RESIZED_DIMENSION){
 const longest=Math.max(width,height),ratio=longest>0?Math.min(1,maxDimension/longest):1;
 return {width:Math.max(1,Math.round(width*ratio)),height:Math.max(1,Math.round(height*ratio))};
}
