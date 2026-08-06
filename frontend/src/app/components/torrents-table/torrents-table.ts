import { CommonModule } from '@angular/common';
import { AfterViewInit, ChangeDetectorRef, Component, HostListener, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatAutocompleteModule } from '@angular/material/autocomplete';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSort, MatSortModule } from '@angular/material/sort';
import { MatTableDataSource, MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RelativeTimePipe } from '../../pipes/relative-time.pipe';
import { ApiService } from '../../services/api.service';

@Component({
  selector: 'app-torrents-table',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatAutocompleteModule,
    MatTooltipModule,
    RelativeTimePipe
  ],
  templateUrl: './torrents-table.html',
  styleUrl: './torrents-table.css',
})
export class TorrentsTable implements OnInit, OnDestroy, AfterViewInit {
  torrentsDataSource = new MatTableDataSource<any>();
  torrentColumns: string[] = ['title', 'tracker', 'category', 'size', 'pubDate', 'action'];
  totalCount = 0;
  
  searchQuery = '';
  isLoadingMore = false;
  hasMoreData = true;
  private searchTimer: any;
  refreshInterval: any;

  @ViewChild('torrentSort') torrentSort!: MatSort;

  constructor(
    private readonly api: ApiService,
    private readonly cdr: ChangeDetectorRef,
  ) {}

  ngOnInit() {
    this.fetchTorrents();
    this.refreshInterval = setInterval(() => this.backgroundRefresh(), 60000);
  }

  ngOnDestroy() {
    if (this.refreshInterval) {
      clearInterval(this.refreshInterval);
    }
  }

  ngAfterViewInit() {
    this.torrentsDataSource.sort = this.torrentSort;
    this.torrentsDataSource.sortingDataAccessor = (item, property) => {
      if (property === 'pubDate') return item.created_at || item.pubDate;
      if (property === 'tracker') return item.trackerName || '';
      return item[property];
    };
  }

  backgroundRefresh() {
    const currentLimit = Math.max(50, this.torrentsDataSource.data.length);
    this.api.getTorrents(this.searchQuery, 0, currentLimit).subscribe((res) => {
      this.torrentsDataSource.data = res.items;
      this.totalCount = res.totalCount;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  fetchTorrents() {
    this.hasMoreData = true;
    this.api.getTorrents(this.searchQuery).subscribe((res) => {
      this.torrentsDataSource.data = res.items;
      this.totalCount = res.totalCount;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  @HostListener('window:scroll', [])
  onScroll(): void {
    if (this.isLoadingMore || !this.hasMoreData) return;

    const pos =
      (document.documentElement.scrollTop || document.body.scrollTop) +
      document.documentElement.offsetHeight;
    const max = document.documentElement.scrollHeight;

    if (pos >= max - 200) {
      this.loadMoreTorrents();
    }
  }

  loadMoreTorrents() {
    if (this.torrentsDataSource.data.length >= this.totalCount) {
      this.hasMoreData = false;
      return;
    }

    this.isLoadingMore = true;
    const offset = this.torrentsDataSource.data.length;

    this.api.getTorrents(this.searchQuery, offset).subscribe((res) => {
      this.torrentsDataSource.data = [...this.torrentsDataSource.data, ...res.items];
      this.totalCount = res.totalCount;
      this.isLoadingMore = false;
      if (this.torrentsDataSource.data.length >= res.totalCount) {
        this.hasMoreData = false;
      }
      this.cdr.detectChanges();
    });
  }

  onSearchModel(value: string) {
    this.searchQuery = value;
    clearTimeout(this.searchTimer);
    this.searchTimer = setTimeout(() => {
      this.fetchTorrents();
    }, 300);
  }

  clearSearch() {
    this.searchQuery = '';
    this.fetchTorrents();
  }

  formatSize(size: number) {
    if (!size) return 'Unknown';
    if (size >= 1024 * 1024 * 1024 * 1024)
      return (size / (1024 * 1024 * 1024 * 1024)).toFixed(2) + ' TB';
    if (size >= 1024 * 1024 * 1024) return (size / (1024 * 1024 * 1024)).toFixed(2) + ' GB';
    if (size >= 1024 * 1024) return (size / (1024 * 1024)).toFixed(2) + ' MB';
    if (size >= 1024) return (size / 1024).toFixed(2) + ' KB';
    return size + ' B';
  }

  formatCategory(id: string) {
    if (id === '2000') return 'Movies (2000)';
    if (id === '2030') return 'Movies/SD (2030)';
    if (id === '2040') return 'Movies/HD (2040)';
    if (id === '3000') return 'Audio (3000)';
    if (id === '3010') return 'Audio/MP3 (3010)';
    if (id === '3020') return 'Audio/Video (3020)';
    if (id === '3030') return 'Audio/Audiobook (3030)';
    if (id === '3040') return 'Audio/Lossless (3040)';
    if (id === '5000') return 'TV (5000)';
    if (id === '5020') return 'TV/Foreign (5020)';
    if (id === '5030') return 'TV/SD (5030)';
    if (id === '5040') return 'TV/HD (5040)';
    if (id === '5060') return 'TV/Sport (5060)';
    if (id === '5070') return 'Anime (5070)';
    if (id === '5080') return 'TV/Doc (5080)';
    return id || 'Unknown';
  }
}
