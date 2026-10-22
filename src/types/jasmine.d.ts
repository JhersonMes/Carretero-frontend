// Type declarations for Jasmine testing environment
declare function describe(description: string, specDefinitions: () => void): void;
declare function fdescribe(description: string, specDefinitions: () => void): void;
declare function xdescribe(description: string, specDefinitions: () => void): void;
declare function it(expectation: string, assertion?: () => void | Promise<void>): void;
declare function fit(expectation: string, assertion?: () => void | Promise<void>): void;
declare function xit(expectation: string, assertion?: () => void | Promise<void>): void;
declare function beforeEach(action: () => void | Promise<void>): void;
declare function afterEach(action: () => void | Promise<void>): void;
declare function beforeAll(action: () => void | Promise<void>): void;
declare function afterAll(action: () => void | Promise<void>): void;
declare function expect(actual: any): {
  toBe(expected: any): void;
  toEqual(expected: any): void;
  toBeTruthy(): void;
  toBeFalsy(): void;
  toBeNull(): void;
  toBeUndefined(): void;
  toBeDefined(): void;
  toContain(expected: any): void;
  toBeGreaterThan(expected: number): void;
  toBeLessThan(expected: number): void;
  toBeCloseTo(expected: number, precision?: number): void;
  toHaveBeenCalled(): void;
  toHaveBeenCalledWith(...params: any[]): void;
  toHaveBeenCalledTimes(expected: number): void;
  not: any;
};
declare const jasmine: {
  createSpy(name?: string): any;
  createSpyObj(baseName: string, methodNames: string[]): any;
  clock(): {
    install(): void;
    uninstall(): void;
    mockDate(initialDate?: Date): void;
    tick(millis: number): void;
  };
  any(type: any): any;
};
