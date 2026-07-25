import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { ApiService } from './api.service';

describe('ApiService', () => {
  let service: ApiService;
  let httpMock: HttpTestingController;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [
        ApiService,
        provideHttpClient(),
        provideHttpClientTesting()
      ]
    });
    service = TestBed.inject(ApiService);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpMock.verify();
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('getTorrents should call correct URL without params', () => {
    service.getTorrents().subscribe();
    const req = httpMock.expectOne(request => 
      request.url === '/api/json/torrents' && 
      request.params.get('limit') === '50'
    );
    expect(req.request.method).toBe('GET');
  });

  it('getTorrents should call correct URL with query and offset', () => {
    service.getTorrents('batman', 20).subscribe();
    const req = httpMock.expectOne(request => 
      request.url === '/api/json/torrents' && 
      request.params.get('q') === 'batman' && 
      request.params.get('offset') === '20' &&
      request.params.get('limit') === '50'
    );
    expect(req.request.method).toBe('GET');
  });

  it('getTrackers should call correct URL', () => {
    service.getTrackers().subscribe();
    const req = httpMock.expectOne('/api/json/trackers');
    expect(req.request.method).toBe('GET');
  });

  it('getTrackerDefinitions should call correct URL', () => {
    service.getTrackerDefinitions().subscribe();
    const req = httpMock.expectOne('/api/json/trackers/definitions');
    expect(req.request.method).toBe('GET');
  });

  it('getTrackerSchedules should call correct URL', () => {
    service.getTrackerSchedules().subscribe();
    const req = httpMock.expectOne('/api/json/trackers/schedules');
    expect(req.request.method).toBe('GET');
  });

  it('toggleTracker should send PUT request', () => {
    service.toggleTracker(5, true).subscribe();
    const req = httpMock.expectOne('/api/json/trackers/5/toggle');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual({ active: true });
  });

  it('deleteTracker should send DELETE request', () => {
    service.deleteTracker(3).subscribe();
    const req = httpMock.expectOne('/api/json/trackers/3');
    expect(req.request.method).toBe('DELETE');
  });

  it('createTracker should send POST request', () => {
    const payload = { name: 'test' };
    service.createTracker(payload).subscribe();
    const req = httpMock.expectOne('/api/json/trackers');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
  });

  it('updateTracker should send PUT request', () => {
    const payload = { name: 'updated' };
    service.updateTracker(7, payload).subscribe();
    const req = httpMock.expectOne('/api/json/trackers/7');
    expect(req.request.method).toBe('PUT');
    expect(req.request.body).toEqual(payload);
  });

  it('syncProwlarr should send POST request', () => {
    const payload = { prowlarrUrl: 'http://test:9696', prowlarrApiKey: 'test', arssraUrl: 'http://localhost:3232' };
    service.syncProwlarr(payload).subscribe();
    const req = httpMock.expectOne('/api/json/prowlarr/sync');
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
  });
});
