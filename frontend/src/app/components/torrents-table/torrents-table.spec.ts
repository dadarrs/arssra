import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';
import { vi } from 'vitest';
import { ApiService } from '../../services/api.service';
import { TorrentsTable } from './torrents-table';

describe('TorrentsTable', () => {
  let component: TorrentsTable;
  let fixture: ComponentFixture<TorrentsTable>;
  let mockApiService: any;

  beforeEach(async () => {
    mockApiService = {
      getTorrents: vi.fn().mockReturnValue(of({ items: [{ id: 1, title: 'Test Torrent' }], totalCount: 1 }))
    };

    await TestBed.configureTestingModule({
      imports: [TorrentsTable],
      providers: [
        { provide: ApiService, useValue: mockApiService }
      ]
    }).compileComponents();
    
    fixture = TestBed.createComponent(TorrentsTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create and fetch torrents on init', () => {
    expect(component).toBeTruthy();
    expect(mockApiService.getTorrents).toHaveBeenCalledWith('');
    expect(component.torrentsDataSource.data).toHaveLength(1);
    expect(component.totalCount).toBe(1);
  });

  it('should format file sizes correctly', () => {
    expect(component.formatSize(1024)).toBe('1.00 KB');
    expect(component.formatSize(1048576)).toBe('1.00 MB');
    expect(component.formatSize(1073741824)).toBe('1.00 GB');
  });

  it('should trigger search after debounce', async () => {
    component.onSearchModel('Breaking Bad');
    expect(component.searchQuery).toBe('Breaking Bad');
    await new Promise(resolve => setTimeout(resolve, 350));
    expect(mockApiService.getTorrents).toHaveBeenCalledWith('Breaking Bad');
  });
});
