import { PdfMerge } from './pdf-merge';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('PdfMerge', () => {
  let component: PdfMerge;

  beforeEach(() => {
    const utilityService = new UtilityService({} as ToastService);
    component = new PdfMerge(utilityService, {} as ToastService);
  });

  it('should normalize the requested output filename', () => {
    component.outputName = ' Release: final.pdf ';

    expect(component.downloadName).toBe('Release- final.pdf');
  });

  it('should require two files before enabling merge', () => {
    component.files = [{
      file: {} as File,
      name: 'one.pdf',
      sizeLabel: '1 KB',
      pages: 1,
    }];

    expect(component.canMerge).toBeFalse();
  });

  it('should reject intake after the 50-file queue limit', async () => {
    component.files = Array.from({ length: 50 }, (_, index) => ({
      file: new File(['pdf'], `queued-${index}.pdf`, { type: 'application/pdf' }),
      name: `queued-${index}.pdf`,
      sizeLabel: '3 B',
      pages: 1,
    }));
    const incoming = new File(['pdf'], 'extra.pdf', { type: 'application/pdf' });
    const fileList = { 0: incoming, length: 1, item: () => incoming } as unknown as FileList;

    await component.handleFiles(fileList);

    expect(component.files.length).toBe(50);
    expect(component.errorMessage).toContain('50-file limit');
  });
});