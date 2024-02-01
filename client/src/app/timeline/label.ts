import { EventData } from './timeline-data.service';

export class Label {
  private event: EventData;
  private textLines: string[];
  private _width: number = 50;
  private _height: number = 30;
  private x: number;
  private y: number;
  private ctx: CanvasRenderingContext2D;

  constructor(
    event: EventData,
    maxWidth: number,
    ctx: CanvasRenderingContext2D
  ) {
    this.event = event;
    this.x = event.location.x;
    this.y = event.location.y;
    this.ctx = ctx;
    this.textLines = this.makeLabel(event, maxWidth);
    this.calculateDimensions();
  }

  get width() {
    return this._width;
  }

  get height() {
    return this._height;
  }

  breakTextIntoLines(text: string, maxWidth: number): string[] {
    const words = text.split(' ');
    const lines: string[] = [];
    let currentLine = '';

    for (const word of words) {
      const testLine = currentLine ? `${currentLine} ${word}` : word;
      const testWidth = this.ctx.measureText(testLine).width;

      if (testWidth <= maxWidth) {
        currentLine = testLine;
      } else {
        lines.push(currentLine);
        currentLine = word;
      }
    }

    if (currentLine) {
      lines.push(currentLine);
    }

    return lines;
  }

  private makeLabel(event: EventData, maxWidth: number): string[] {
    const titleLines = this.breakTextIntoLines(event.title, maxWidth);
    const authorLines = this.breakTextIntoLines(
      `${event.author}, ${event.year}`,
      maxWidth
    );
    return [...titleLines, ...authorLines];
  }

  private calculateDimensions() {
    const textIncr = 15; // Adjust as needed
    const horizLabelGap = 8; // Adjust as needed
    this._width =
      Math.max(
        ...this.textLines.map((row) => this.ctx.measureText(row).width)
      ) + horizLabelGap;
    this._height = this.textLines.length * textIncr;
  }

  private djb2Hash(str: string): number {
    var hash = 5381;
    for (var i = 0; i < str.length; i++) {
      hash = (hash << 5) + hash + str.charCodeAt(i); /* hash * 33 + c */
    }
    return hash;
  }

  private hashStringToColor(str: string): string {
    var hash = this.djb2Hash(str);
    var r = (hash & 0xff0000) >> 16;
    var g = (hash & 0x00ff00) >> 8;
    var b = hash & 0x0000ff;
    return (
      '#' +
      ('0' + r.toString(16)).substr(-2) +
      ('0' + g.toString(16)).substr(-2) +
      ('0' + b.toString(16)).substr(-2)
    );
  }

  draw() {
    this.ctx.save();
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.hashStringToColor(this.event.author);
    this.textLines.forEach((row: string, index: number) => {
      this.ctx.fillText(row, this.x, this.y + index * 15); // Adjust spacing as needed
    });

    this.ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    return (
      px >= this.x - this._width / 2 &&
      px <= this.x + this._width / 2 &&
      py >= this.y &&
      py <= this.y + this._height
    );
  }
}