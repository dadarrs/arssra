import { CommonModule } from '@angular/common';
import { ChangeDetectorRef, Component, Inject, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatSlideToggleModule } from '@angular/material/slide-toggle';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-add-tracker-modal',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    MatSlideToggleModule,
    MatButtonModule,
    MatIconModule
  ],
  templateUrl: './add-tracker-modal.html',
  styleUrl: './add-tracker-modal.css',
})
export class AddTrackerModal implements OnInit {
  definitions: any[] = [];
  schedules: any[] = [];
  
  newTrackerDefId = '';
  newTrackerName = '';
  newTrackerUrl = '';
  newTrackerSchedule = '*/30 * * * *';
  newTrackerAllowApi = false;
  editingTrackerId: number | null = null;

  get selectedTrackerDef(): any {
    return this.definitions.find((d) => d.id === this.newTrackerDefId);
  }

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
    public dialogRef: MatDialogRef<AddTrackerModal>,
    @Inject(MAT_DIALOG_DATA) public data: { tracker?: any }
  ) {}

  ngOnInit() {
    this.api.getTrackerDefinitions().subscribe((res) => {
      this.definitions = res;
      if (this.data?.tracker) {
        this.setupEdit(this.data.tracker);
      }
      this.cdr.detectChanges();
    });
    this.api.getTrackerSchedules().subscribe((res) => {
      this.schedules = res;
      this.cdr.detectChanges();
    });
  }

  setupEdit(tracker: any) {
    this.editingTrackerId = tracker.id;
    const def = this.definitions.find(
      (d) => d.name === tracker.name || d.id === tracker.definitionId,
    );
    this.newTrackerDefId = def ? def.id : 'tvchaosuk'; // Fallback
    this.newTrackerName = tracker.name;
    this.newTrackerUrl = tracker.url;
    this.newTrackerSchedule = tracker.cronSchedule;
    this.newTrackerAllowApi = tracker.allowApi === true;
  }

  onDefinitionSelect() {
    const def = this.definitions.find((d) => d.id === this.newTrackerDefId);
    if (def && !this.newTrackerName) {
      this.newTrackerName = def.name;
    }
  }

  saveTracker() {
    if (
      !this.newTrackerDefId ||
      !this.newTrackerUrl ||
      !this.newTrackerSchedule ||
      !this.newTrackerName
    )
      return;

    const payload = {
      definitionId: this.newTrackerDefId,
      name: this.newTrackerName,
      url: this.newTrackerUrl,
      schedule: this.newTrackerSchedule,
      allowApi: this.newTrackerAllowApi,
    };

    const request = this.editingTrackerId
      ? this.api.updateTracker(this.editingTrackerId, payload)
      : this.api.createTracker(payload);

    request.subscribe(() => {
      this.dialogRef.close(true);
    });
  }
}
