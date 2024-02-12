import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface EventData {
  title: string;
  author: string;
  year: number;
  day_in_year: number;
  pubdate: string;
  genre: string;
  country: string;
  in_links: number;
  article_length: number;
  page_url: string;
  width: number;
  location: { x: number; y: number };
}

@Injectable({
  providedIn: 'root',
})
export class TimelineDataService {
  // private baseUrl = 'http://localhost:5500';  // Update with your server URL
  private baseUrl = 'https://mightcould.pythonanywhere.com/';  // Update with your server URL
  constructor(private http: HttpClient) {}

  getEvents(startYear: number, endYear: number, locationMin: number, locationMax: number, maxEvents: number): Observable<any[]> {
    const params = new HttpParams()
      .set('start_date', startYear.toString())
      .set('end_date', endYear.toString())
      .set('location_min', locationMin.toString())
      .set('location_max', locationMax.toString())
      .set('max_events', maxEvents.toString());

    return this.http.get<EventData[]>(`${this.baseUrl}/events`, { params });
  }

  getWikipediaContent(pageUrl: string): Observable<string> {
    const apiUrl = this.baseUrl + encodeURIComponent(pageUrl);
    return this.http.get(apiUrl).pipe(
      // Extracting the content from the Wikipedia API response
      map((response: any) => {
        const pageId = Object.keys(response.query.pages)[0];
        return response.query.pages[pageId].extract;
      })
    );
  }

}

class MockDataService {
  private timelineData: any[] = [
    { author: 'Jane Austen', title: 'Sense and Sensibility', year: 1811, importance: 50 },
    { author: 'Jane Austen', title: 'Pride and Prejudice', year: 1813, importance: 80 },
    { author: 'Jane Austen', title: 'Mansfield Park', year: 1814, importance: 20 },
    { author: 'Jane Austen', title: 'Emma', year: 1815, importance: 60 },
    { author: 'Jane Austen', title: 'Persuasion', year: 1817, importance: 40 },
    { author: 'Charles Dickens', title: 'Oliver Twist', year: 1837, importance: 65 },
    { author: 'Charles Dickens', title: 'The Pickwick Papers', year: 1838, importance: 35 },
    { author: 'Charles Dickens', title: 'A Christmas Carol', year: 1843, importance: 85 },
    { author: 'Herman Melville', title: 'Moby-Dick', year: 1851, importance: 55 },
    { author: 'Charles Dickens', title: 'Little Dorrit', year: 1857, importance: 35 },
    { author: 'Charles Dickens', title: 'A Tale of Two Cities', year: 1859, importance: 75 },
    { author: 'Charles Dickens', title: 'The Mystery of Edwin Drood', year: 1870, importance: 25 },
    { author: 'Mark Twain', title: 'The Adventures of Huckleberry Finn', year: 1884, importance: 62 },
    { author: 'Mark Twain', title: 'A Connecticut Yankee in King Arthur\'s Court', year: 1889, importance: 42 },
    { author: 'Mark Twain', title: 'Personal Recollections of Joan of Arc', year: 1895, importance: 22 },
    // Add more data as needed
  ];

  constructor() {}

  getTimelineData(): any[] {
    return this.timelineData;
  }
}
