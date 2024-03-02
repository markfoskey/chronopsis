import { TimelineData, EventData, AuthorTitleEventData } from './timeline-data.service';
import { scaleAndShift, textHeight } from './timeline.utils';

function calcSizeParams(
  importance: number,
  maxImportance: number,
  minImportance: number,
  maxFontSize: number,
  minFontSize: number
) {
  const clampedImportance = Math.min(
    Math.max(importance - minImportance, 0),
    maxImportance
  );
  const importanceRange = maxImportance - minImportance;
  const fontRange = maxFontSize - minFontSize;
  const fontSize = Math.ceil(minFontSize + clampedImportance * (fontRange / importanceRange));
  const minWidth = 120;
  const widthRange = Label.maxWidth - minWidth;
  const scaledMaxWidth = minWidth + clampedImportance * (widthRange / importanceRange);
  return [fontSize, scaledMaxWidth];
};

// Represents a label for a novel
// Will need to introduce polymorphism for other types of events
export class Label {
  static vertLabelGap = 36;
  static horizLabelGap = 8;
  static tickRadius = 3;
  static maxWidth = 150;
  static maxImportance = 28000;
  static minImportance = 500;
  static maxFontSize = 24;
  static minFontSize = 8;
  private data: EventData;
  private textLines: string[];
  private textIncr: number;
  private scaledMaxWidth: number = Label.maxWidth;
  private _font: string = '10px arial';
  private _width: number = 50;
  private _textHeight: number = 30;
  private _height: number = 30;
  private _x: number;
  private _y: number;
  private _mouseover: boolean = false;
  private ctx: CanvasRenderingContext2D;

  constructor(data: EventData, ctx: CanvasRenderingContext2D) {
    this.data = data;
    this._x = 0;
    this._y = 0;
    this.ctx = ctx;
    const [fontSize, scaledMaxWidth] = calcSizeParams(
      this.importance,
      Label.maxImportance,
      Label.minImportance,
      Label.maxFontSize,
      Label.minFontSize
    );

    this.scaledMaxWidth = scaledMaxWidth;
    this.textIncr = textHeight(this.ctx) + 3;
    this.textLines = this.makeLabel(this.data, this.scaledMaxWidth);
    this.font = `${fontSize}px helvetica`;
  }

  get importance() {
    const rawVal = this.data.article_length;
    return ('author' in this.data ? rawVal : rawVal / 2);
  }

  get year() {
    return this.data.year;
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
    if (this.textLines) this.calculateDimensions();
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

  private makeLabel(
    data: AuthorTitleEventData | EventData,
    maxWidth: number
  ): string[] {
    if ('author' in data && 'title' in data) {
      const titleLines = this.breakTextIntoLines(data.title, maxWidth);
      const authorLines = this.breakTextIntoLines(
        `${data.author}, ${data.year}`,
        maxWidth
      );
      return [...titleLines, ...authorLines];
    } else {
      const descriptionLines = this.breakTextIntoLines(
        data.description,
        maxWidth
      );
      const yearLine = `${data.year}`;
      return [...descriptionLines, yearLine];
    }
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

  overlapsInX(other: Label) {
    return Math.abs(this.x - other.x) < (this.width + other.width) / 2;
  }

  overlapsInY(other: Label) {
    return (
      Math.abs(this.y - other.y + (this.height - other.height) / 2) <
      (this.height + other.height) / 2
    );
  }

  setX(
    minYear: number,
    maxYear: number,
    leftPixel: number,
    rightPixel: number
  ) {
    const yearWithDay: number = +this.year + +this.data.day_in_year / 365;
    this._x = scaleAndShift(
      yearWithDay,
      minYear,
      maxYear,
      leftPixel,
      rightPixel
    );
  }

  setYstrict(otherLabels: Label[], defaultY: number) {
    const topY = otherLabels
      .filter((otherLabel: Label) => {
        return this.overlapsInX(otherLabel);
      })
      .reduce((currentVal, b) => Math.min(currentVal, b.y), defaultY);

    this.y = topY - this.height - 10;
  }

  setYfill(otherLabels: Label[], defaultY: number) {
    const xOverlaps = otherLabels.filter((otherLabel: Label) => {
      return this.overlapsInX(otherLabel);
    });
    this.y = defaultY - this.height - 10;
    for (let i = 0; i < xOverlaps.length; i++) {
      if (xOverlaps[i].y - this.height - 10 > defaultY) continue;
      if (!xOverlaps.some((label: Label) => this.overlapsInY(label))) break;
      this.y = xOverlaps[i].y - this.height - 10;
    }
  }

  // Probably remove
  setYlinear(defaultY: number) {
    const span = 2000;
    const top = defaultY - span;
    this.y = top + this.importance * (span / 28000);
  }

  setY(otherLabels: Label[], defaultY: number) {
    if ('author' in this.data)
      this.setYstrict(otherLabels, defaultY);
    else
      this.setYstrict(otherLabels, defaultY);
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
      this.ctx.fillStyle = 'lightGray';
      this.ctx.globalAlpha = 0.5;
      this.ctx.fillRect(
        this.x - this.width / 2,
        this.y,
        this.width,
        this.textHeight + 5
      );
      this.ctx.globalAlpha = 1.0;
    }
    this.ctx.textAlign = 'center';
    if ('author' in this.data) {
      const authorTitleEvent = this.data as AuthorTitleEventData;
      this.ctx.fillStyle = this.hashStringToColor(authorTitleEvent.author);
    }
    else
    {
      this.ctx.fillStyle = 'black';
    }
    this.ctx.font = this.font;
    const numLines = this.textLines.length;
    this.textLines.forEach((row: string, index: number) => {
      this.ctx.fillText(row, this.x, this.y + (index + 1) * this.textIncr);
    });
    this.drawTickmark(
      this.x,
      this.y + numLines * this.textIncr + 0.5 * Label.vertLabelGap
    );
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
  }

  // Open a web page in the overlay element (intended to be the Wikipedia article)
  openOverlay(url: string) {
    const overlay = document.getElementById('overlay');
    if (!overlay) return;
    overlay.innerHTML = `<iframe src="${url}" style="width: 100%; height: 100%; border: none;"></iframe>`;
    overlay.style.display = 'block';
  }

  openPageIfClicked(px: number, py: number) {
    if (this.containsPoint(px, py)) {
      this.openOverlay(this.data.page_url);
      return true;
    }
    return false;
  }
}
