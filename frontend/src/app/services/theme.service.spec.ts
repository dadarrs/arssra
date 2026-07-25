import { DOCUMENT } from '@angular/common';
import { TestBed } from '@angular/core/testing';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  let service: ThemeService;
  let mockDocument: any;

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: (query: string) => ({
        matches: false,
        media: query,
        onchange: null,
        addListener: () => { /* empty */ }, // deprecated
        removeListener: () => { /* empty */ }, // deprecated
        addEventListener: () => { /* empty */ },
        removeEventListener: () => { /* empty */ },
        dispatchEvent: () => false,
      }),
    });

    mockDocument = {
      documentElement: {
        style: {},
        classList: {
          toggle: () => { /* empty */ }
        }
      }
    };

    TestBed.configureTestingModule({
      providers: [
        ThemeService,
        { provide: DOCUMENT, useValue: mockDocument }
      ]
    });
    service = TestBed.inject(ThemeService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
