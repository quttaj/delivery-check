export type CaptureMode='overview'|'parts';

export const captureModeSettings:Record<CaptureMode,{maxPhotos:number;confirmation:string}>={
 overview:{maxPhotos:1,confirmation:'This single photo shows the complete delivery and every physical package once.'},
 parts:{maxPhotos:3,confirmation:'These photos show separate parts of one delivery. No physical package appears in more than one photo.'}
};
