import { PdfOrganize } from './pdf-organize';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('PdfOrganize', () => {
  let component: PdfOrganize;

  beforeEach(() => {
    const utilityService = new UtilityService({} as ToastService);
    component = new PdfOrganize(utilityService, {} as ToastService);
    component.pages = [
      { srcIndex: 0, rotation: 0, deleted: false },
      { srcIndex: 1, rotation: 0, deleted: true },
      { srcIndex: 2, rotation: 270, deleted: false },
    ];
  });

  it('should rotate every kept page', () => {
    component.rotateAll(90);

    expect(component.pages.map(page => page.rotation)).toEqual([90, 0, 0]);
  });

  it('should restore deleted pages', () => {
    component.restoreAll();

    expect(component.remainingCount).toBe(3);
  });

  it('should reset order, rotation, and deletion changes', () => {
    component.reverseOrder();

    component.resetChanges();

    expect(component.pages).toEqual([
      { srcIndex: 0, rotation: 0, deleted: false },
      { srcIndex: 1, rotation: 0, deleted: false },
      { srcIndex: 2, rotation: 0, deleted: false },
    ]);
    expect(component.hasChanges).toBeFalse();
  });
});