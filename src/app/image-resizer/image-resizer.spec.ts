import { ImageResizer } from './image-resizer';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('ImageResizer', () => {
  let component: ImageResizer;

  beforeEach(() => {
    component = new ImageResizer(
      {} as UtilityService,
      {} as ToastService
    );
  });

  it('should reject output dimensions above the safe pixel budget', () => {
    component.targetWidth = 20000;
    component.targetHeight = 20000;

    expect(component.isOutputSizeSafe).toBeFalse();
  });

  it('should apply a percentage preset from the original dimensions', () => {
    component.originalWidth = 4000;
    component.originalHeight = 3000;

    component.setScale(50);

    expect(component.targetWidth).toBe(2000);
    expect(component.targetHeight).toBe(1500);
  });

  it('should discard a stale result when output settings change', () => {
    component.hasResult = true;

    component.onSettingsChange();

    expect(component.hasResult).toBeFalse();
  });

  it('should ignore a pending decode after the tool is cleared', async () => {
    let resolveDecode!: (image: HTMLImageElement) => void;
    const decode = new Promise<HTMLImageElement>(resolve => resolveDecode = resolve);
    spyOn<any>(component, 'decode').and.returnValue(decode);
    spyOn(URL, 'createObjectURL').and.returnValue('blob:pending');
    spyOn(URL, 'revokeObjectURL');
    const file = new File(['image'], 'photo.png', { type: 'image/png' });
    (component as any).loadSeq = 1;

    const pending = (component as any).loadImage(file, 1);
    component.clearAll();
    resolveDecode({
      naturalWidth: 640,
      naturalHeight: 480,
    } as HTMLImageElement);
    await pending;

    expect(component.previewUrl).toBeNull();
    expect(component.fileName).toBe('');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:pending');
  });
});