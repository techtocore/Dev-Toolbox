import { DeflateToolkit } from './deflate-toolkit';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('DeflateToolkit', () => {
  let component: DeflateToolkit;

  beforeEach(() => {
    component = new DeflateToolkit(
      new UtilityService({} as ToastService),
      {} as ToastService
    );
  });

  for (const format of ['gzip', 'zlib', 'deflate'] as const) {
    it(`should round-trip UTF-8 text through ${format}`, async () => {
      const text = 'Dev Toolbox compression test — repeat '.repeat(20);
      component.format = format;
      component.inputText = text;

      await component.process();
      const compressed = component.outputBytes!;
      const compressedSize = compressed.length;

      component.setOperation('decompress');
      component.format = format;
      component.inputBytes = compressed;
      component.inputFileName = `message.${format === 'gzip' ? 'gz' : format}`;
      await component.process();

      expect(component.outputPreview).toBe(text);
      expect(component.previewAvailable).toBeTrue();
      expect(component.inputSize).toBe(compressedSize);
    });
  }

  it('should preserve the original extension when decompressing a GZIP file', async () => {
    component.inputText = 'hello';
    await component.process();
    const compressed = component.outputBytes!;

    component.setOperation('decompress');
    component.inputBytes = compressed;
    component.inputFileName = 'report.json.gz';
    await component.process();

    expect(component.outputFileName).toBe('report.json');
  });
});