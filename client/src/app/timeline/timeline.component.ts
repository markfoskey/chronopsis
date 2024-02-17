import { Component, OnInit, HostListener } from '@angular/core';
import { Label } from './label'; // Adjust the path based on your project structure
import { TimelineDataService, EventData} from './timeline-data.service';
import { catchError, map, min } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { rescale, scaleAndShift } from './timeline.utils';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
})
export class TimelineComponent implements OnInit {
  private timelineData: EventData[] = [];
  private labels: Label[] = [];
  private zoomFactor = 0.1;
  private isDragging = false;
  private dragStartX = 0;
  private dragStartY = 0;
  private dragPrevX = 0;
  private dragPrevY = 0;
  private leftPixel = 0;
  private rightPixel = 0;
  private timelineY = 0;
  private labelBase = 0;
  private tickRadius = 0;
  private vertLabelGap = 0;
  private horizLabelGap = 0;
  private minYear = 0;
  private maxYear = 0;
  private maxWidth = 150;
  public currentEvent = {} as EventData;

  private canvas!: HTMLCanvasElement; // Canvas reference

  constructor(private timelineDataService: TimelineDataService) {}

  ngOnInit(): void {
    this.setupCanvas();

    this.leftPixel = -200;
    this.rightPixel = this.canvas.width + 200;
    this.timelineY = this.canvas.height - 115;
    this.labelBase = this.timelineY - 5;
    this.tickRadius = 3;
    this.vertLabelGap = 36;
    this.horizLabelGap = 8;
    this.minYear = 1800;
    this.maxYear = 1900;

    this.updateTimelineData();
    this.drawTimeline();
  }

  get getTimelineData(): any[] {
    return this.timelineData;
  }

  private updateTimelineData() {
    let duration = this.maxYear - this.minYear;
    const padding = duration * 0.25;
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;
    let beginYear = this.minYear - padding;
    let endYear = this.maxYear + padding;
    this.timelineDataService
      .getEvents(beginYear, endYear, 0, 10, 1000)
      .pipe(
        map((data) => {
          data.map((event: EventData) => {
            event.location = { x: 0, y: 0 };
          });
          return data;
        }),
        catchError((error) => {
          console.error(error);
          // Handle errors
          return EMPTY; // Returning an empty observable to swallow the error
        })
      )
      .subscribe((x) => {
        this.timelineData = x;
        this.labels = x.map((event: EventData) => {
          return new Label(event, this.maxWidth, ctx);
        });
        this.drawTimeline();
      });
  }

  private setupCanvas() {
    // Retrieve the canvas element and store the reference
    this.canvas = document.getElementById(
      'timelineCanvas'
    ) as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    let overlay = document.getElementById('overlay');
    overlay?.addEventListener('mouseup', (event) => { this.isDragging = false; })
  }

  private drawTimeline() {
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const drawBand = (
      startX: number,
      width: number,
      year: string,
      color: string
    ) => {
      ctx.fillStyle = color;
      let widthInPixels = rescale(
        width,
        this.minYear,
        this.maxYear,
        this.leftPixel,
        this.rightPixel
      );
      ctx.fillRect(startX, 0, widthInPixels, this.canvas.height);

      // Print the year at the beginning of the band
      ctx.save();
      ctx.fillStyle = 'black';
      ctx.textAlign = 'start';
      ctx.font = '24px Garamond';
      ctx.fillText(year, startX + 5, this.timelineY - 5);
      ctx.restore();
    };

    let candidateBandwidths = [100, 50, 25, 10, 5, 2];

    let bandWidth = candidateBandwidths.find((x) => {
      let b = (this.maxYear - this.minYear) / x > 4;
      return b;
    });
    if (!bandWidth) bandWidth = 2;

    const firstBandStart = Math.floor(this.minYear / bandWidth);
    const lastBandEnd = Math.floor(this.maxYear / bandWidth) + 1;

    for (let i = firstBandStart; i < lastBandEnd; i++) {
      const startX = this.pixelFromYear(i * bandWidth);
      const year = (i * bandWidth).toString();
      const color = i % 2 === 0 ? 'lightCyan' : 'white'; // Alternating blue and white bands
      drawBand(startX, bandWidth, year, color);
    }

    // Sort labels in decreasing order of importance
    const sortedLabels: Label[] = this.labels
      .slice()
      .sort((a, b) => b.importance - a.importance);
    let shownLabels: Label[] = [];

    const calcFontSize = (
      label: Label,
      maxImportance: number,
      minImportance: number,
      maxFontSize: number,
      minFontSize: number
    ) => {
      const clampedImportance = Math.min(
        Math.max(label.importance - minImportance, 0),
        maxImportance
      );
      const importanceRange = maxImportance - minImportance;
      const fontRange = maxFontSize - minFontSize;
      return Math.ceil(minFontSize + clampedImportance * (fontRange / importanceRange));
    };

    sortedLabels.forEach((label, index) => {
      if (label.year < this.minYear || label.year > this.maxYear) return;

      const maxImportance = 28000;
      const minImportance = 500;
      const maxFontSize = 24;
      const minFontSize = 8;
      const fontSize = calcFontSize(
        label,
        maxImportance,
        minImportance,
        maxFontSize,
        minFontSize
      );
    
      label.font = `${fontSize}px helvetica`;
      label.setX(this.minYear, this.maxYear, this.leftPixel, this.rightPixel);
      label.setY(shownLabels, this.labelBase);

      label.draw();
      shownLabels.push(label);
    });
  }

  // Handle mouse down event to initiate dragging
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.dragPrevX = this.dragStartX = event.clientX;
    this.dragPrevY = this.dragStartY = event.clientY;
  }

  // Handle mouse move event to pan the timeline
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragPrevX;
      const deltaY = event.clientY - this.dragPrevY;
      this.dragPrevX = event.clientX;
      this.dragPrevY = event.clientY;

      // Adjust the visible portion of the timeline based on deltaX
      const deltaYear = rescale(
        deltaX,
        this.leftPixel,
        this.rightPixel,
        this.minYear,
        this.maxYear
      );
      this.minYear -= deltaYear;
      this.maxYear -= deltaYear;

      this.labelBase += deltaY;

      // Redraw the timeline with the updated visible portion
      this.drawTimeline();
      this.updateTimelineData();
    }
    else {
      this.labels.forEach((label: Label) => label.setMouseover(event.clientX, event.clientY));
      this.drawTimeline();
    }
  }

  dragDistSq(event: MouseEvent): number {
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    return dx ** 2 + dy ** 2;
  }

  // Handle mouse up event to stop dragging
  @HostListener('document:mouseup', ['$event'])
  @HostListener('document:mouseleave', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
    // Manually detect a click as opposed to a drag
    const clickThreshSq = 1.0
    if (this.dragDistSq(event) < clickThreshSq) {
      if (!this.labels.some(label => label.openPageIfClicked(event.clientX, event.clientY))) {
        let overlay = document.getElementById('overlay');
        if (overlay) overlay.style.display = 'none';
      }
    }
  }
    
  // Handle mouse wheel events for zooming
  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent) {
    // Scrolling up --> zooming in --> min and max years closer together
    const zoomMultiplier =
      event.deltaY < 0 ? -this.zoomFactor : this.zoomFactor;
    const wheelStartYear = this.yearFromPixel(event.clientX);

    this.minYear += zoomMultiplier * (wheelStartYear - this.minYear);
    this.maxYear += zoomMultiplier * (wheelStartYear - this.maxYear);

    // Redraw the timeline with the updated scale
    this.drawTimeline();
    this.updateTimelineData();
    return false;
  }

  private yearFromPixel(xInPixels: number): number {
    return scaleAndShift(
      xInPixels,
      this.leftPixel,
      this.rightPixel,
      this.minYear,
      this.maxYear
    );
  }

  private pixelFromYear(year: number): number {
    return scaleAndShift(
      year,
      this.minYear,
      this.maxYear,
      this.leftPixel,
      this.rightPixel
    );
  }

}