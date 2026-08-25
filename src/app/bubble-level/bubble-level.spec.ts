import { BubbleLevel } from './bubble-level';
import { SensorService } from '../services/sensor.service';
import { UtilityService } from '../services/utility.service';

describe('BubbleLevel', () => {
  beforeEach(() => {
    jasmine.clock().install();
  });

  afterEach(() => {
    jasmine.clock().uninstall();
  });

  it('stops listening when no populated sensor reading arrives', () => {
    const sensor = {
      secureContext: true,
      hasOrientation: true,
      orientationNeedsPermission: false,
    } as SensorService;
    const component = new BubbleLevel({} as UtilityService, sensor);
    const removeSpy = spyOn(window, 'removeEventListener').and.callThrough();

    component.ngOnInit();
    jasmine.clock().tick(2000);

    expect(component.status).toBe('unsupported');
    expect(removeSpy).toHaveBeenCalled();
    const [eventName, listener, capture] =
      removeSpy.calls.mostRecent().args as unknown as [string, EventListener, boolean];
    expect(eventName).toBe('deviceorientation');
    expect(listener).toEqual(jasmine.any(Function));
    expect(capture).toBeTrue();
    expect((component as any).listening).toBeFalse();
  });
});
