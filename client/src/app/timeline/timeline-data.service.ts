import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';

export interface TimelineData {
  type: string;
  description: string; 
  article_length: number;
  page_url: string;
}

export interface EventData extends TimelineData {
  year: number;
  day_in_year: number;
  date: string;
}

export interface AuthorTitleEventData extends EventData {
  title: string;
  author: string;
  genre: string;
  country: string;
}

@Injectable({
  providedIn: 'root',
})
export class TimelineDataService {
  private baseUrl = 'http://localhost:5500';
  // private baseUrl = 'https://mightcould.pythonanywhere.com/';
  constructor(private http: HttpClient) {}

  getEvents(
    startYear: number,
    endYear: number,
    maxEvents: number
  ): Observable<any[]> {
    const params = new HttpParams()
      .set('start_date', startYear.toString())
      .set('end_date', endYear.toString())
      .set('max_events', maxEvents.toString());

    return this.http
      .get<EventData[]>(`${this.baseUrl}/events`, { params })
      .pipe(
        map((response: any[]) => {
          return response
            .map((item) => {
              if ('author' in item && 'title' in item) {
                return item as AuthorTitleEventData;
              } else {
                return item as EventData;
              }
            });
        })
      );
  }
}

