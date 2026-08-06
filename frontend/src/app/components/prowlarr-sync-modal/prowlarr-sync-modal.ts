import { CommonModule, NgClass } from '@angular/common';
import { ChangeDetectorRef, Component, Inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-prowlarr-sync-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    NgClass,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './prowlarr-sync-modal.html',
  styleUrl: './prowlarr-sync-modal.css',
})
export class ProwlarrSyncModal {
  prowlarrUrl = 'http://localhost:9696';
  prowlarrApiKey = '';
  arssraUrl = 'http://localhost:3232';
  prowlarrSyncStatus: 'idle' | 'syncing' | 'success' | 'error' = 'idle';
  prowlarrSyncMessage = '';
  hasActiveTrackers = false;

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<ProwlarrSyncModal>,
    @Inject(MAT_DIALOG_DATA) public data: { hasActiveTrackers: boolean }
  ) {
    this.hasActiveTrackers = data?.hasActiveTrackers || false;
  }

  syncToProwlarr() {
    if (!this.prowlarrUrl || !this.prowlarrApiKey || !this.arssraUrl) return;

    this.prowlarrSyncStatus = 'syncing';
    this.prowlarrSyncMessage = '';
    this.cdr.detectChanges();

    this.api.syncProwlarr({
      prowlarrUrl: this.prowlarrUrl,
      prowlarrApiKey: this.prowlarrApiKey,
      arssraUrl: this.arssraUrl
    }).subscribe({
      next: (res) => {
        this.prowlarrSyncStatus = 'success';
        this.prowlarrSyncMessage = res.message || 'Successfully synced with Prowlarr!';
        this.cdr.detectChanges();
      },
      error: (err) => {
        this.prowlarrSyncStatus = 'error';
        const backendError = err.error?.error;
        const details = err.error?.details;
        
        if (backendError) {
          this.prowlarrSyncMessage = details ? `${backendError}: ${details}` : backendError;
        } else {
          this.prowlarrSyncMessage = 'Failed to sync with Prowlarr. Check your URL and API Key.';
        }
        this.cdr.detectChanges();
      }
    });
  }

  copyToClipboard(text: string) {
    navigator.clipboard.writeText(text);
  }
}
