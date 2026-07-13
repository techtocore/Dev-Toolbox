import { ImagesToPdf } from './images-to-pdf';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('ImagesToPdf', () => {
  let component: ImagesToPdf;

  beforeEach(() => {
    const utilityService = new UtilityService({} as ToastService);
    component = new ImagesToPdf(
      utilityService,
      {} as ToastService
    );
    component.images = [
      { file: {} as File, name: 'page-10.png', url: '10' },
      { file: {} as File, name: 'Page-2.png', url: '2' },
      { file: {} as File, name: 'page-1.png', url: '1' },
    ];
  });

  it('should sort image pages naturally by filename', () => {
    component.sortByName();

    expect(component.images.map(image => image.name)).toEqual([
      'page-1.png',
      'Page-2.png',
      'page-10.png',
    ]);
  });

  it('should reverse the current page order', () => {
    component.reverseOrder();

    expect(component.images.map(image => image.url)).toEqual(['1', '2', '10']);
  });

  it('should sanitize the PDF download filename', () => {
    component.outputName = ' Vacation / 2026.pdf ';

    expect(component.downloadName).toBe('Vacation - 2026.pdf');
  });

  it('should reject intake after the 100-image queue limit', () => {
    component.images = Array.from({ length: 100 }, (_, index) => ({
      file: new File(['image'], `queued-${index}.png`, { type: 'image/png' }),
      name: `queued-${index}.png`,
      url: `${index}`,
    }));
    const incoming = new File(['image'], 'extra.png', { type: 'image/png' });
    const fileList = { 0: incoming, length: 1, item: () => incoming } as unknown as FileList;

    (component as any).handleFiles(fileList);

    expect(component.images.length).toBe(100);
    expect(component.errorMessage).toContain('100-image limit');
  });
});