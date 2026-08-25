import { PDFDocument } from 'pdf-lib';
import { PdfSplit } from './pdf-split';
import { ToastService } from '../services/toast.service';
import { UtilityService } from '../services/utility.service';

describe('PdfSplit', () => {
  let component: PdfSplit;

  beforeEach(() => {
    component = new PdfSplit(
      {} as UtilityService,
      jasmine.createSpyObj<ToastService>('ToastService', ['info', 'success'])
    );
  });

  it('supports ordered, duplicate, and descending page selections', () => {
    component.pageCount = 5;

    expect(component.parseSelection('5-3, 1, 1')).toEqual([4, 3, 2, 0, 0]);
  });

  it('keeps a newer PDF when an older read finishes last', async () => {
    const source = await PDFDocument.create();
    source.addPage();
    const bytes = await source.save();
    const buffer = bytes.slice().buffer as ArrayBuffer;
    let resolveFirst!: (value: ArrayBuffer) => void;
    let resolveSecond!: (value: ArrayBuffer) => void;
    const firstBuffer = new Promise<ArrayBuffer>(resolve => resolveFirst = resolve);
    const secondBuffer = new Promise<ArrayBuffer>(resolve => resolveSecond = resolve);
    const first = pdfFile('first.pdf', firstBuffer);
    const second = pdfFile('second.pdf', secondBuffer);

    const firstLoad = (component as any).handleFiles(asFileList(first));
    const secondLoad = (component as any).handleFiles(asFileList(second));
    resolveSecond(buffer.slice(0));
    await secondLoad;
    resolveFirst(buffer.slice(0));
    await firstLoad;

    expect(component.fileName).toBe('second.pdf');
    expect(component.pageCount).toBe(1);
  });
});

function pdfFile(name: string, content: Promise<ArrayBuffer>): File {
  return {
    name,
    type: 'application/pdf',
    size: 100,
    arrayBuffer: () => content,
  } as File;
}

function asFileList(file: File): FileList {
  return { 0: file, length: 1, item: () => file } as unknown as FileList;
}
