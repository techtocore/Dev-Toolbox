import { ConversionItem, ImageFormatConverter } from './image-format-converter';
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

  it('should detect animated PNG and WebP markers', async () => {
    const apng = conversionItem(
      new File([pngFile([pngChunk('acTL', new Uint8Array(8))]) as BlobPart], 'animated.png', {
        type: 'image/png',
      })
    );
    const webp = conversionItem(
      new File([webpFile('VP8X', new Uint8Array([0x02, 0, 0, 0, 0, 0, 0, 0, 0, 0])) as BlobPart], 'animated.webp', {
        type: 'image/webp',
      })
    );
    component.items = [apng, webp];

    await (component as any).detectAnimation(apng);
    await (component as any).detectAnimation(webp);

    expect(apng.animated).toBeTrue();
    expect(webp.animated).toBeTrue();
    expect(component.hasAnimatedInput).toBeTrue();
  });

  it('should ignore animation marker text inside static image payloads', async () => {
    const staticPng = conversionItem(
      new File([
        pngFile([pngChunk('IDAT', new TextEncoder().encode('payload-acTL-payload'))]) as BlobPart
      ], 'static.png', { type: 'image/png' })
    );
    const staticWebp = conversionItem(
      new File([
        webpFile('VP8 ', new TextEncoder().encode('payload-ANMF-payload')) as BlobPart
      ], 'static.webp', { type: 'image/webp' })
    );
    component.items = [staticPng, staticWebp];

    await (component as any).detectAnimation(staticPng);
    await (component as any).detectAnimation(staticWebp);

    expect(staticPng.animated).toBeFalse();
    expect(staticWebp.animated).toBeFalse();
    expect(component.animationDetectionIncomplete).toBeFalse();
  });
});

function conversionItem(file: File): ConversionItem {
  return {
    file,
    name: file.name,
    url: 'preview',
    status: 'ready' as const,
    outputBytes: 0,
    error: '',
  };
}

function pngFile(chunks: Uint8Array[]): Uint8Array {
  return concat(
    new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]),
    ...chunks
  );
}

function pngChunk(type: string, data: Uint8Array): Uint8Array {
  const chunk = new Uint8Array(12 + data.length);
  new DataView(chunk.buffer).setUint32(0, data.length);
  chunk.set(new TextEncoder().encode(type), 4);
  chunk.set(data, 8);
  return chunk;
}

function webpFile(chunkType: string, data: Uint8Array): Uint8Array {
  const padding = data.length % 2;
  const chunk = new Uint8Array(8 + data.length + padding);
  chunk.set(new TextEncoder().encode(chunkType), 0);
  new DataView(chunk.buffer).setUint32(4, data.length, true);
  chunk.set(data, 8);

  const file = new Uint8Array(12 + chunk.length);
  file.set(new TextEncoder().encode('RIFF'), 0);
  new DataView(file.buffer).setUint32(4, file.length - 8, true);
  file.set(new TextEncoder().encode('WEBP'), 8);
  file.set(chunk, 12);
  return file;
}

function concat(...parts: Uint8Array[]): Uint8Array {
  const result = new Uint8Array(parts.reduce((total, part) => total + part.length, 0));
  let offset = 0;
  for (const part of parts) {
    result.set(part, offset);
    offset += part.length;
  }
  return result;
}