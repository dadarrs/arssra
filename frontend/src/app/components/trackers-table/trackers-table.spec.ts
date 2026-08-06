import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TrackersTable } from './trackers-table';

describe('TrackersTable', () => {
  let component: TrackersTable;
  let fixture: ComponentFixture<TrackersTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TrackersTable],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TrackersTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
