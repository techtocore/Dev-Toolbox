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
});