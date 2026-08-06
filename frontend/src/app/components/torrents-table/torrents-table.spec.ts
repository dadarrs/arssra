import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { TorrentsTable } from './torrents-table';

describe('TorrentsTable', () => {
  let component: TorrentsTable;
  let fixture: ComponentFixture<TorrentsTable>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TorrentsTable],
      providers: [provideHttpClient(), provideHttpClientTesting()]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(TorrentsTable);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
