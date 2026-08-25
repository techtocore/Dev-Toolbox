import { ImageBase64 } from './image-base64';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

class FakeFileReader {
  static readonly LOADING = 1;

  readyState = 0;
  result: string | ArrayBuffer | null = null;
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  onabort: (() => void) | null = null;

  constructor() {
    FakeFileReader.instances.push(this);
  }

  static instances: FakeFileReader[] = [];

  readAsDataURL(): void {
    this.readyState = FakeFileReader.LOADING;
  }

  abort(): void {
    this.readyState = 2;
    this.onabort?.();
  }

  complete(result: string): void {
    this.readyState = 2;
    this.result = result;
    this.onload?.();
  }
}

describe('ImageBase64', () => {
  let originalFileReader: typeof FileReader;

  beforeEach(() => {
    originalFileReader = window.FileReader;
    FakeFileReader.instances = [];
    (window as any).FileReader = FakeFileReader;
  });

  afterEach(() => {
    (window as any).FileReader = originalFileReader;
  });

  it('ignores a stale file read after a newer image is selected', () => {
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    const component = new ImageBase64({} as UtilityService, toastService);
    const first = new File(['first'], 'first.png', { type: 'image/png' });
    const second = new File(['second'], 'second.png', { type: 'image/png' });

    (component as any).handleFiles(asFileList(first));
    const firstReader = FakeFileReader.instances[0];
    (component as any).handleFiles(asFileList(second));
    const secondReader = FakeFileReader.instances[1];

    secondReader.complete('data:image/png;base64,c2Vjb25k');
    firstReader.complete('data:image/png;base64,Zmlyc3Q=');

    expect(component.fileName).toBe('second.png');
    expect(component.encodeUri).toBe('data:image/png;base64,c2Vjb25k');
    expect(toastService.success).toHaveBeenCalledTimes(1);
  });

  it('aborts and invalidates an active read when cleared', () => {
    const component = new ImageBase64(
      {} as UtilityService,
      jasmine.createSpyObj<ToastService>('ToastService', ['success'])
    );
    const file = new File(['image'], 'photo.png', { type: 'image/png' });

    (component as any).handleFiles(asFileList(file));
    const reader = FakeFileReader.instances[0];
    const abortSpy = spyOn(reader, 'abort').and.callThrough();

    component.clearEncode();
    reader.complete('data:image/png;base64,aW1hZ2U=');

    expect(abortSpy).toHaveBeenCalled();
    expect(component.encodeUri).toBe('');
    expect(component.fileName).toBe('');
  });
});

function asFileList(file: File): FileList {
  return { 0: file, length: 1, item: () => file } as unknown as FileList;
}
