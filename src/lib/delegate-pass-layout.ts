/**
 * Scale the complete portrait ID into the available visual viewport.
 * The card's natural dimensions are measured after layout (including
 * long names), so no barcode, footer, or heading is cropped.
 */
export function calculateDelegatePassScale(
 viewportWidth:number,viewportHeight:number,
 cardWidth:number,cardHeight:number,gutter=12
):number{
 const values=[viewportWidth,viewportHeight,cardWidth,cardHeight,gutter];
 if(values.some(value=>!Number.isFinite(value))||cardWidth<=0||cardHeight<=0
  ||viewportWidth<=0||viewportHeight<=0||gutter<0)return 1;
 return Math.max(0.001,Math.min(1,
  (Math.max(0,viewportWidth-gutter))/cardWidth,
  (Math.max(0,viewportHeight-gutter))/cardHeight));
}
