import { Component, OnInit, HostListener } from '@angular/core';
import { Label } from './label'; // Adjust the path based on your project structure
import { TimelineDataService, EventData} from './timeline-data.service';
import { catchError, map, min } from 'rxjs/operators';
import { EMPTY } from 'rxjs';
import { rescale, scaleAndShift } from './timeline.utils';

// Class for a timeline that can be zoomed and panned. 
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
  private minYear = 0;
  private maxYear = 0;
  public currentEvent = {} as EventData;

  private canvas!: HTMLCanvasElement; // Canvas reference

  constructor(private timelineDataService: TimelineDataService) {}

  ngOnInit(): void {
    this.setupCanvas();

    this.leftPixel = -200;
    this.rightPixel = this.canvas.width + 200;
    this.timelineY = this.canvas.height - 115;
    this.labelBase = this.timelineY - 5;
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
      .getEvents(beginYear, endYear, 1000)
      .pipe(
        catchError((error) => {
          console.error(error);
          return EMPTY; // Returning an empty observable to swallow the error
        })
      )
      .subscribe((x) => {
        this.timelineData = x;
        this.labels = x.map((event: EventData) => {
          return new Label(event, ctx);
        });
        this.drawTimeline();
      });
  }

  private setupCanvas() {
    this.canvas = document.getElementById(
      'timelineCanvas'
    ) as HTMLCanvasElement;
    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;
    let overlay = document.getElementById('overlay');
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
    };

    const printYear = (startX: number, width: number, year: string) => {
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
      const color = i % 2 === 0 ? 'lightCyan' : 'white';
      drawBand(startX, bandWidth, year, color);
    }

    const sortedLabels: Label[] = this.labels
      .slice()
      .sort((a, b) => b.importance - a.importance);
    let shownLabels: Label[] = [];

    sortedLabels.forEach((label, index) => {
      if (label.year < this.minYear || label.year > this.maxYear) return;

      label.setX(this.minYear, this.maxYear, this.leftPixel, this.rightPixel);
      label.setY(shownLabels, this.labelBase);

      label.draw();
      shownLabels.push(label);
    });

    // This is separated from the color band rendering because we want the years to be on top
    for (let i = firstBandStart; i < lastBandEnd; i++) {
      const startX = this.pixelFromYear(i * bandWidth);
      const year = (i * bandWidth).toString();
      printYear(startX, bandWidth, year);
    }
  }

  startDrag(x: number, y: number) {
    this.isDragging = true;
    this.dragPrevX = this.dragStartX = x;
    this.dragPrevY = this.dragStartY = y;
  }

  @HostListener('touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (event.touches.length === 1) {
      const touch = event.touches[0];
      this.startDrag(touch.clientX, touch.clientY);
    }
  }

  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.startDrag(event.clientX, event.clientY);
    this.canvas.classList.add('hand-cursor');
  }

  panTimeline(x: number, y: number)
  {
    const deltaX = x - this.dragPrevX;
    const deltaY = y - this.dragPrevY;
    this.dragPrevX = x;
    this.dragPrevY = y;

    // Panning changes the range of visible years; handle that.
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

  @HostListener('touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isDragging && event.touches.length === 1) {
      const touch = event.touches[0];
      this.panTimeline(touch.clientX, touch.clientY);
    }
  }

  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      this.panTimeline(event.clientX, event.clientY);
    } else {
      this.labels.forEach((label: Label) =>
        label.setMouseover(event.clientX, event.clientY)
      );
      this.drawTimeline();
    }
  }

  // @HostListener('gesturechange', ['$event'])
  // onGestureChange(event: GestureEvent) {
  //   // Handle pinch zooming
  // }

  @HostListener('touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (event.changedTouches.length === 1) {
      const touch = event.changedTouches[0];
      if (this.isDragging) {
        // Check if it's a tap or drag
        const dragDistance = Math.sqrt(
          (touch.clientX - this.dragStartX) ** 2 +
            (touch.clientY - this.dragStartY) ** 2
        );
        if (dragDistance < 10) {
          // Adjust this threshold as needed
          // Handle tap to open links
        }
      }
      this.isDragging = false;
      this.canvas.classList.remove('hand-cursor');
    }
  }

  // @HostListener('gestureend', ['$event'])
  // onGestureEnd(event: GestureEvent) {
  //   // Handle end of pinch gesture
  // }

  dragDistSq(event: MouseEvent): number {
    const dx = event.clientX - this.dragStartX;
    const dy = event.clientY - this.dragStartY;
    return dx ** 2 + dy ** 2;
  }

  @HostListener('mouseup', ['$event'])
  @HostListener('mouseleave', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
    this.canvas.classList.remove('hand-cursor');
    // Manually detect a click as opposed to a drag
    const clickThreshSq = 1.0;
    if (this.dragDistSq(event) < clickThreshSq) {
      if (
        !this.labels.some((label) =>
          label.openPageIfClicked(event.clientX, event.clientY)
        )
      ) {
        let overlay = document.getElementById('overlay');
        if (overlay) overlay.style.display = 'none';
      }
    }
  }

  @HostListener('wheel', ['$event'])
  onMouseWheel(event: WheelEvent) {
    // Scrolling up --> zooming in --> min and max years closer together
    const zoomMultiplier =
      event.deltaY < 0 ? -this.zoomFactor : this.zoomFactor;
    const wheelStartYear = this.yearFromPixel(event.clientX);

    this.minYear += zoomMultiplier * (wheelStartYear - this.minYear);
    this.maxYear += zoomMultiplier * (wheelStartYear - this.maxYear);

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