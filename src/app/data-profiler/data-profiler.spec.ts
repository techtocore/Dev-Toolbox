import { DataProfiler } from './data-profiler';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('DataProfiler', () => {
  let component: DataProfiler;
  let utilityService: UtilityService;

  beforeEach(() => {
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'success', 'error', 'info'
    ]);
    utilityService = new UtilityService(toastService);
    component = new DataProfiler(utilityService, toastService);
  });

  it('rejects JSON arrays containing non-object rows', () => {
    component.format = 'json';
    component.inputData = '[null, {"name":"valid"}]';

    component.analyzeData();

    expect(component.profiles).toEqual([]);
    expect(component.errorMessage).toBe('JSON data must be an object or an array of objects');
  });

  it('neutralizes formula-like column names in CSV exports', () => {
    const downloadSpy = spyOn(utilityService, 'downloadFile');
    component.format = 'json';
    component.inputData = '[{"=DANGEROUS":"value"}]';
    component.analyzeData();

    component.exportCsv();

    expect(downloadSpy).toHaveBeenCalled();
    const csv = downloadSpy.calls.mostRecent().args[0];
    expect(csv).toContain("'=DANGEROUS");
  });

  it('rejects oversized pasted input before profiling', () => {
    component.inputData = 'a'.repeat(10 * 1024 * 1024 + 1);

    component.analyzeData();

    expect(component.profiles).toEqual([]);
    expect(component.errorMessage).toBe('Input exceeds the 10 MB safety limit');
  });
});