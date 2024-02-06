import { EventData } from './timeline-data.service';
import { scaleAndShift, textHeight } from './timeline.utils';

export class Label {
  static vertLabelGap = 36;
  static horizLabelGap = 8;
  static tickRadius = 3;
  private event: EventData;
  private textLines: string[];
  private textIncr: number;
  private _font: string = '10px arial';
  private _width: number = 50;
  private _textHeight: number = 30;
  private _height: number = 30;
  private _x: number;
  private _y: number;
  private _mouseover: boolean = false;
  private ctx: CanvasRenderingContext2D;

  constructor(
    event: EventData,
    maxWidth: number,
    ctx: CanvasRenderingContext2D
  ) {
    this.event = event;
    this._x = event.location.x;
    this._y = event.location.y;
    this.ctx = ctx;
    this.textIncr = textHeight(this.ctx) + 3;
    this.textLines = this.makeLabel(event, maxWidth);
    this.calculateDimensions();
  }

  get importance() {
    return this.event.article_length;
  }

  get year() {
    return this.event.year;
  }

  get width() {
    return this._width;
  }

  get textHeight() {
    return this._textHeight;
  }

  get height() {
    return this._height;
  }

  set x(xVal: number) {
    this._x = xVal;
  }

  get x() {
    return this._x;
  }

  set y(yVal: number) {
    this._y = yVal;
  }

  get y() {
    return this._y;
  }

  set font(fontStr: string) {
    this.ctx.save();
    this._font = fontStr;
    this.ctx.font = fontStr;
    this.textIncr = textHeight(this.ctx);
    this.calculateDimensions();
    this.ctx.restore();
  }

  get font() {
    return this._font;
  }

  get mouseover() {
    return this._mouseover;
  }

  private breakTextIntoLines(text: string, maxWidth: number): string[] {
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
    this._width =
      Math.max(
        ...this.textLines.map((row) => this.ctx.measureText(row).width)
      ) + Label.horizLabelGap;
    this._textHeight = this.textLines.length * this.textIncr;
    this._height = this._textHeight + Label.vertLabelGap;
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

  overlaps(other: Label) {
    return Math.abs(this.x - other.x) < (this.width + other.width) / 2;
  }

  setX(
    minYear: number,
    maxYear: number,
    leftPixel: number,
    rightPixel: number
  ) {
    const yearWithDay: number = +this.year + +this.event.day_in_year / 365;


    this._x = scaleAndShift(yearWithDay, minYear, maxYear, leftPixel, rightPixel);
    console.log(`diy = ${this.event.day_in_year}, yearWithDay = ${yearWithDay}, this._x = ${this._x}`);
  }

  setY(otherLabels: Label[], defaultY: number) {
    const topY = otherLabels
      .filter((otherLabel: Label) => {
        return this.overlaps(otherLabel);
      })
      .reduce((currentVal, b) => Math.min(currentVal, b.y), defaultY);

    this.y = topY - this.height - 10;
  }

  private drawTickmark(x: number, y: number) {
    this.ctx.beginPath();
    this.ctx.lineWidth = 1;
    this.ctx.arc(x, y, Label.tickRadius, 0, 2 * Math.PI);
    this.ctx.stroke();
  }

  draw() {
    this.ctx.save();
    if (this._mouseover) {
      console.log(this.event.title);
      this.ctx.fillStyle = 'lightGray';
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(
        this.x - this.width / 2,
        this.y,
        this.width,
        this.textHeight
      );
      this.ctx.globalAlpha = 1.0;
    }
    this.ctx.textAlign = 'center';
    this.ctx.fillStyle = this.hashStringToColor(this.event.author);
    this.ctx.font = this.font;
    const numLines = this.textLines.length;
    this.textLines.forEach((row: string, index: number) => {
      this.ctx.fillText(row, this.x, this.y + (index + 1) * this.textIncr); // Adjust spacing as needed
    });
    this.drawTickmark(this.x, this.y + numLines * this.textIncr + 0.5 * Label.vertLabelGap);
    this.ctx.restore();
  }

  containsPoint(px: number, py: number): boolean {
    return (
      px >= this._x - this._width / 2 &&
      px <= this._x + this._width / 2 &&
      py >= this._y &&
      py <= this._y + this._height
    );
  }

  setMouseover(px: number, py: number) {
    this._mouseover = this.containsPoint(px, py);
    // console.log(`(${px}, ${py})`);
  }

  openPageIfClicked(px: number, py: number) {
    if (this.containsPoint(px, py)) {
      window.open(this.event.page_url);
    }
  }
}