import { CsvJsonConverter } from './csv-json-converter';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('CsvJsonConverter', () => {
  let component: CsvJsonConverter;

  beforeEach(() => {
    const toastService = jasmine.createSpyObj<ToastService>('ToastService', [
      'success', 'error', 'info'
    ]);
    component = new CsvJsonConverter(new UtilityService(toastService), toastService);
    component.mode = 'json-to-csv';
  });

  it('protects formula-like JSON values by default', () => {
    component.inputText = JSON.stringify([{ name: '=HYPERLINK("https://example.test")' }]);

    expect(component.jsonToCsv()).toBe("name\n\"'=HYPERLINK(\"\"https://example.test\"\")\"");
  });

  it('allows exact output when spreadsheet protection is disabled', () => {
    component.protectSpreadsheetFormulas = false;
    component.inputText = JSON.stringify([{ value: '=1+1' }]);

    expect(component.jsonToCsv()).toBe('value\n=1+1');
  });

  it('rejects oversized pasted input before parsing', () => {
    component.mode = 'csv-to-json';
    component.inputText = 'a'.repeat(10 * 1024 * 1024 + 1);

    component.convert();

    expect(component.outputText).toBe('');
    expect(component.errorMessage).toBe('Input exceeds the 10 MB safety limit');
  });
});