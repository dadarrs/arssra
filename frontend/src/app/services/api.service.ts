import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  constructor(private readonly http: HttpClient) {}

  getTorrents(query = '', offset = 0, limit = 50): Observable<any> {
    let params = new HttpParams();
    if (query) {
      params = params.set('q', query);
    }
    if (offset > 0) {
      params = params.set('offset', offset.toString());
    }
    if (limit > 0) {
      params = params.set('limit', limit.toString());
    }
    return this.http.get<any>('/api/json/torrents', { params });
  }

  getTrackers(): Observable<any[]> {
    return this.http.get<any[]>('/api/json/trackers');
  }

  getTrackerDefinitions(): Observable<any[]> {
    return this.http.get<any[]>('/api/json/trackers/definitions');
  }

  getTrackerSchedules(): Observable<any[]> {
    return this.http.get<any[]>('/api/json/trackers/schedules');
  }

  toggleTracker(id: number, active: boolean): Observable<any> {
    return this.http.put(`/api/json/trackers/${id}/toggle`, { active });
  }

  deleteTracker(id: number): Observable<any> {
    return this.http.delete(`/api/json/trackers/${id}`);
  }

  createTracker(payload: any): Observable<any> {
    return this.http.post('/api/json/trackers', payload);
  }

  updateTracker(id: number, payload: any): Observable<any> {
    return this.http.put(`/api/json/trackers/${id}`, payload);
  }

  syncProwlarr(payload: { prowlarrUrl: string; prowlarrApiKey: string; arssraUrl: string }): Observable<any> {
    return this.http.post('/api/json/prowlarr/sync', payload);
  }
}
