import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { ProwlarrSyncModal } from './prowlarr-sync-modal';

describe('ProwlarrSyncModal', () => {
  let component: ProwlarrSyncModal;
  let fixture: ComponentFixture<ProwlarrSyncModal>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ProwlarrSyncModal],
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: MatDialogRef, useValue: {} },
        { provide: MAT_DIALOG_DATA, useValue: {} }
      ]
    })
    .compileComponents();
    
    fixture = TestBed.createComponent(ProwlarrSyncModal);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
