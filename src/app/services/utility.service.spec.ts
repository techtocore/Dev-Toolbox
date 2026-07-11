import { TestBed } from '@angular/core/testing';

import { UtilityService } from './utility.service';

describe('UtilityService', () => {
  let service: UtilityService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(UtilityService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should normalize a download name and preserve one extension', () => {
    expect(service.normalizeDownloadName(' Vacation / 2026.PDF ', 'pdf', 'images'))
      .toBe('Vacation - 2026.pdf');
  });

  it('should use the fallback for an empty or invalid name', () => {
    expect(service.normalizeDownloadName(' ... ', '.pdf', 'document'))
      .toBe('document.pdf');
  });
});
