import { ImageFormatConverter } from './image-format-converter';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('ImageFormatConverter', () => {
  let component: ImageFormatConverter;

  beforeEach(() => {
    const utilityService = new UtilityService({} as ToastService);
    component = new ImageFormatConverter(utilityService, {} as ToastService);
  });

  it('should generate collision-safe output names', () => {
    const usedNames = new Set<string>();

    expect(component.makeOutputName('photo.png', usedNames)).toBe('photo.webp');
    expect(component.makeOutputName('photo.jpg', usedNames)).toBe('photo-2.webp');
  });

  it('should use the jpg extension for JPEG output', () => {
    component.format = 'jpeg';

    expect(component.makeOutputName('scan.png', new Set<string>())).toBe('scan.jpg');
  });

  it('should reset conversion results when settings change', () => {
    component.items = [{
      file: {} as File,
      name: 'photo.png',
      url: 'preview',
      status: 'done',
      outputBytes: 1200,
      error: '',
    }];
    component.processedCount = 1;

    component.resetResults();

    expect(component.items[0].status).toBe('ready');
    expect(component.items[0].outputBytes).toBe(0);
    expect(component.processedCount).toBe(0);
  });

  it('should package multiple converted images as a ZIP download', async () => {
    const utilityService = new UtilityService({} as ToastService);
    const downloadSpy = spyOn(utilityService, 'downloadBlob');
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    const batch = new ImageFormatConverter(utilityService, toastService);
    batch.items = [
      { file: {} as File, name: 'one.png', url: 'one', status: 'ready', outputBytes: 0, error: '' },
      { file: {} as File, name: 'two.png', url: 'two', status: 'ready', outputBytes: 0, error: '' },
    ];
    spyOn<any>(batch, 'convertItem').and.resolveTo(
      new Blob([new Uint8Array([1, 2, 3])], { type: 'image/webp' })
    );

    await batch.convertAll();

    expect(downloadSpy).toHaveBeenCalledTimes(1);
    const [archive, name] = downloadSpy.calls.mostRecent().args;
    const signature = Array.from(new Uint8Array(await archive.arrayBuffer()).slice(0, 4));
    expect(name).toBe('converted-images.zip');
    expect(archive.type).toBe('application/zip');
    expect(signature).toEqual([80, 75, 3, 4]);
    expect(batch.completedCount).toBe(2);
  });
});