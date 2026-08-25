import { ImageMetadata } from './image-metadata';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('ImageMetadata', () => {
  it('cancels the busy state and stale download when the image is replaced', async () => {
    const utilityService = jasmine.createSpyObj<UtilityService>(
      'UtilityService',
      ['downloadBlob']
    );
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', ['success']);
    const component = new ImageMetadata(utilityService, toastService);
    let finishReencode!: (blob: Blob | null) => void;
    const reencode = new Promise<Blob | null>(resolve => finishReencode = resolve);
    spyOn<any>(component, 'reencode').and.returnValue(reencode);
    spyOn<any>(component, 'parseMetadata').and.resolveTo();
    spyOn(URL, 'createObjectURL').and.returnValue('blob:new');
    spyOn(URL, 'revokeObjectURL');
    (component as any).selectedFile = new File(['old'], 'old.jpg', { type: 'image/jpeg' });
    component.previewUrl = 'blob:old';
    component.fileName = 'old.jpg';

    const pending = component.downloadStripped();
    const replacement = new File(['new'], 'new.jpg', { type: 'image/jpeg' });
    (component as any).handleFiles(asFileList(replacement));

    expect(component.stripping).toBeFalse();
    finishReencode(new Blob(['result'], { type: 'image/jpeg' }));
    await pending;

    expect(utilityService.downloadBlob).not.toHaveBeenCalled();
    expect(toastService.success).not.toHaveBeenCalled();
    expect(component.fileName).toBe('new.jpg');
  });
});

function asFileList(file: File): FileList {
  return { 0: file, length: 1, item: () => file } as unknown as FileList;
}
