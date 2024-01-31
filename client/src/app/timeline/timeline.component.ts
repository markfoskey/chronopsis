import { Component, OnInit, HostListener } from '@angular/core';
import { TimelineDataService, EventData} from './timeline-data.service';
import { catchError, map } from 'rxjs/operators';
import { EMPTY } from 'rxjs';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css'],
})
export class TimelineComponent implements OnInit {
  private timelineData: EventData[] = [];
  private zoomFactor = 0.1;
  private isDragging = false;
  private dragStartX = 0;
  private leftPixel = 0;
  private rightPixel = 0;
  private timelineY = 0;
  private tickRadius = 0;
  private vertLabelGap = 0;
  private horizLabelGap = 0;
  private minYear = 0;
  private maxYear = 0;
  private maxWidth = 150;
  public showContent = false;
  public wikipediaContent = '';
  public currentEvent = {} as EventData;

  private canvas!: HTMLCanvasElement; // Canvas reference

  constructor(private timelineDataService: TimelineDataService) {}

  ngOnInit(): void {
    this.setupCanvas();

    this.leftPixel = -200;
    this.rightPixel = this.canvas.width + 200;
    this.timelineY = this.canvas.height - 115;
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
    let beginYear = this.minYear - padding;
    let endYear = this.maxYear + padding;
    this.timelineDataService
      .getEvents(beginYear, endYear, 0, 10, 400)
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
  }

  showWikipediaContent(event: any) {
    this.currentEvent = event;
    this.timelineDataService.getWikipediaContent(event.page_url).subscribe(
      (content: string) => {
        this.wikipediaContent = content;
        this.showContent = true;
      },
      (error) => {
        console.error('Error fetching Wikipedia content:', error);
      }
    );
  }

  hideWikipediaContent() {
    this.showContent = false;
  }
  
  private drawTimeline() {
    const ctx = this.canvas.getContext('2d') as CanvasRenderingContext2D;

    this.canvas.width = window.innerWidth;
    this.canvas.height = window.innerHeight;

    ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

    const textIncr = 15;
    const defaultTextY = this.timelineY - (this.tickRadius / 2 + 3 * textIncr); // Vertical position for text
    const textJitter = 3 * textIncr + 2;

    const drawTickmarkOld = (x: number, y: number) => {
      ctx.beginPath();
      ctx.moveTo(x, y - this.tickRadius);
      ctx.lineTo(x, y + this.tickRadius);
      ctx.stroke();
    };

    const drawTickmark = (x: number, y: number) => {
      ctx.beginPath();
      ctx.lineWidth = 1;
      ctx.arc(x, y, this.tickRadius, 0, 2 * Math.PI);
      ctx.stroke();
    };

    const breakTextIntoLines = (text: string, maxWidth: number): string[] => {
      const words = text.split(' ');
      const lines: string[] = [];
      let currentLine = '';

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const testWidth = ctx.measureText(testLine).width;

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
    };

    const makeLabel = (event: EventData, maxWidth: number): string[] => {
      const titleLines = breakTextIntoLines(event.title, maxWidth);
      const authorLines = breakTextIntoLines(
        `${event.author}, ${event.year}`,
        maxWidth
      );

      return [...titleLines, ...authorLines];
    };

    const labelWidth = (event: EventData) => {
      const label = makeLabel(event, this.maxWidth);
      return Math.max(
        ...label.map((row: string) => {
          return ctx.measureText(row).width;
        })
      ) + this.horizLabelGap;
    };

    const labelHeight = (event: EventData) => {
      const label = makeLabel(event, this.maxWidth);
      return label.length * textIncr + this.vertLabelGap;
    };

    const djb2 = (str: string) => {
      var hash = 5381;
      for (var i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i); /* hash * 33 + c */
      }
      return hash;
    }
    
    const hashStringToColor = (str: string) => {
      var hash = djb2(str);
      var r = (hash & 0xFF0000) >> 16;
      var g = (hash & 0x00FF00) >> 8;
      var b = hash & 0x0000FF;
      return "#" + ("0" + r.toString(16)).substr(-2) + ("0" + g.toString(16)).substr(-2) + ("0" + b.toString(16)).substr(-2);
    }

    const drawLabel = (event: EventData) => {
      if (!event.location) return;
      const loc = event.location;
      const label = makeLabel(event, this.maxWidth);
      ctx.save();
      ctx.textAlign = 'center';
      // ctx.font = '12px'
      ctx.fillStyle = hashStringToColor(event.author);
      label.forEach((row: string, index: number) => {
        ctx.fillText(row, loc.x, loc.y + index * textIncr);
      });
      const height = label.length * textIncr;

      drawTickmark(loc.x, loc.y + height);
      ctx.restore();
    };

    const drawBand = (
      startX: number,
      width: number,
      year: string,
      color: string
    ) => {
      ctx.fillStyle = color;
      let widthInPixels = this.rescale(
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
      ctx.font = '24px Garamond'; // Adjust the font size and font family as needed
      ctx.fillText(year, startX + 5, this.timelineY - 5);
      ctx.restore();
    };

    let candidateBandwidths  = [100, 50, 25, 10, 5, 2];
   
    let bandWidth = candidateBandwidths.find((x) => { let b = (this.maxYear - this.minYear) / x > 4; return b; });
    if (!bandWidth) bandWidth = 2;
    
    const firstBandStart = Math.floor(this.minYear / bandWidth);
    const lastBandEnd = Math.floor(this.maxYear / bandWidth) + 1;

    for (let i = firstBandStart; i < lastBandEnd; i++) {
      const startX = this.pixelFromYear(i * bandWidth);
      const year = (i * bandWidth).toString();
      const color = (i % 2 === 0 ? 'lightCyan' : 'white'); // Alternating blue and white bands
      drawBand(startX, bandWidth, year, color);
    }

    // Sort events in decreasing order of importance
    const sortedEvents: EventData[] = this.timelineData
      .slice()
      .sort((a, b) => b.importance - a.importance);
    let shownEvents: EventData[] = [];

    sortedEvents.forEach((event, index) => {
      if (event.year < this.minYear || event.year > this.maxYear) return;
      const x = this.pixelFromYear(event.year);

      if (!event.width) {
        event.width = labelWidth(event);
      }
      event.location.x = x;

      const eventsOverlap = (event1: EventData, event2: EventData) => {
        if (!event2.location || !event2.width) return false;
        const x1 = event1.location.x;
        const x2 = event2.location.x;
        return Math.abs(x1 - x2) < (event1.width + event2.width) / 2;
      };

      const topY = shownEvents
        .filter(function (otherEvent: EventData) {
          return eventsOverlap(event, otherEvent);
        })
        .reduce(
          (currentVal, b) => Math.min(currentVal, b.location.y),
          defaultTextY
        );

      event.location.y = topY - labelHeight(event) - 10;

      // const textY = defaultTextY - Math.random() * defaultTextY;
      drawLabel(event);
      shownEvents.push(event);
    });
  }

  // Handle mouse down event to initiate dragging
  @HostListener('mousedown', ['$event'])
  onMouseDown(event: MouseEvent) {
    this.isDragging = true;
    this.dragStartX = event.clientX;
  }

  // Handle mouse move event to pan the timeline
  @HostListener('mousemove', ['$event'])
  onMouseMove(event: MouseEvent) {
    if (this.isDragging) {
      const deltaX = event.clientX - this.dragStartX;
      this.dragStartX = event.clientX;

      // Adjust the visible portion of the timeline based on deltaX
      const deltaYear = this.rescale(
        deltaX,
        this.leftPixel,
        this.rightPixel,
        this.minYear,
        this.maxYear
      );
      this.minYear -= deltaYear;
      this.maxYear -= deltaYear;

      // Redraw the timeline with the updated visible portion
      this.drawTimeline();
      this.updateTimelineData();
    }
  }

  // Handle mouse up event to stop dragging
  @HostListener('mouseup', ['$event'])
  onMouseUp(event: MouseEvent) {
    this.isDragging = false;
  }

  // Handle mouse wheel events for zooming
  @HostListener('mousewheel', ['$event'])
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
  }

  private rescale(
    value: number,
    inMin: number,
    inMax: number,
    outMin: number,
    outMax: number
  ): number {
    return (value * (outMax - outMin)) / (inMax - inMin);
  }

  private scaleAndShift(
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

  private yearFromPixel(xInPixels: number): number {
    return this.scaleAndShift(
      xInPixels,
      this.leftPixel,
      this.rightPixel,
      this.minYear,
      this.maxYear
    );
  }

  private pixelFromYear(year: number): number {
    return this.scaleAndShift(
      year,
      this.minYear,
      this.maxYear,
      this.leftPixel,
      this.rightPixel
    );
  }

}