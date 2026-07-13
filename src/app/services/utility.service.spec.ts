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

  it('should neutralize spreadsheet formulas when serializing CSV rows', () => {
    expect(service.serializeCsvRow([
      '=SUM(A1:A2)',
      '+cmd',
      '-10',
      '@user',
      'safe,cell'
    ])).toBe("'=SUM(A1:A2),'+cmd,'-10,'@user,\"safe,cell\"");
  });

  it('should allow exact CSV serialization when formula protection is disabled', () => {
    expect(service.serializeCsvRow(['=SUM(A1:A2)', 'safe'], ',', false))
      .toBe('=SUM(A1:A2),safe');
  });

  it('should stop CSV parsing when a configured budget is exceeded', () => {
    expect(() => service.parseCsv('a,b\n1,2\n3,4', ',', { maxRows: 2 }))
      .toThrowError('CSV exceeds the 2 row limit');
    expect(() => service.parseCsv('a,b,c', ',', { maxColumns: 2 }))
      .toThrowError('CSV row exceeds the 2 column limit');
    expect(() => service.parseCsv('abcd', ',', { maxCellLength: 3 }))
      .toThrowError('CSV cell exceeds the 3 character limit');
  });
});
