export function rescale(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ): number {
    return (value * (outMax - outMin)) / (inMax - inMin);
  }

  export function scaleAndShift(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ): number {
    // let result = ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
    // console.log(`(${value} - ${inMin}) * (${outMax} - ${outMin})) / (${inMax} - ${inMin}) + ${outMin} = ${result}`);
    return ((value - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin;
  }

  export function textHeight(ctx: CanvasRenderingContext2D): number {
    const text = 'Hg'; // Using a string with characters that typically occupy the full height
    const metrics = ctx.measureText(text);
    return metrics.fontBoundingBoxAscent + metrics.fontBoundingBoxDescent;
  }