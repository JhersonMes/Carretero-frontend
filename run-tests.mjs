import '@angular/compiler';
import assert from 'node:assert';
import { createRequire } from 'node:module';
import path from 'node:path';
import fs from 'node:fs';

const require = createRequire(import.meta.url);

const createStorageMock = () => {
  let store = {};
  return {
    getItem: (key) => store[key] ?? null,
    setItem: (key, value) => { store[key] = String(value); },
    removeItem: (key) => { delete store[key]; },
    clear: () => { store = {}; }
  };
};
globalThis.sessionStorage = createStorageMock();
globalThis.localStorage = createStorageMock();

let currentSuite = '';
let passed = 0;
let failed = 0;
let total = 0;
const results = [];
let beforeHooks = [];
let afterHooks = [];

globalThis.describe = (name, fn) => {
  currentSuite = name;
  beforeHooks = [];
  afterHooks = [];
  console.log(`\n\x1b[36mSuite: ${name}\x1b[0m`);
  fn();
};

globalThis.beforeEach = (fn) => {
  beforeHooks.push(fn);
};

globalThis.afterEach = (fn) => {
  afterHooks.push(fn);
};

globalThis.expect = (actual) => ({
  toBe: (expected) => assert.strictEqual(actual, expected),
  toEqual: (expected) => assert.deepStrictEqual(actual, expected),
  toBeTruthy: () => assert.ok(actual),
  toBeFalsy: () => assert.ok(!actual),
  toBeNull: () => assert.strictEqual(actual, null),
  toBeUndefined: () => assert.strictEqual(actual, undefined),
  toBeDefined: () => assert.notStrictEqual(actual, undefined),
  toContain: (item) => {
    if (Array.isArray(actual) || typeof actual === 'string') {
      assert.ok(actual.includes(item));
    } else {
      assert.ok(item in actual);
    }
  },
  toBeGreaterThan: (expected) => assert.ok(actual > expected),
  toBeLessThan: (expected) => assert.ok(actual < expected),
  toBeCloseTo: (expected, precision = 2) => {
    const diff = Math.abs(actual - expected);
    assert.ok(diff < Math.pow(10, -precision) / 2);
  },
  toHaveBeenCalled: () => assert.ok(actual?.called),
  toHaveBeenCalledWith: (...args) => assert.deepStrictEqual(actual?.args, args),
  not: {
    toBe: (expected) => assert.notStrictEqual(actual, expected),
    toEqual: (expected) => assert.notDeepStrictEqual(actual, expected),
  }
});

globalThis.jasmine = {
  createSpy: (name) => {
    const spy = (...args) => {
      spy.called = true;
      spy.calls.push(args);
      spy.args = args;
    };
    spy.called = false;
    spy.calls = [];
    return spy;
  },
  clock: () => ({
    install: () => {},
    uninstall: () => {},
    mockDate: () => {},
    tick: () => {},
  }),
};

globalThis.it = (testName, fn) => {
  total++;
  try {
    for (const b of beforeHooks) b();
    fn();
    for (const a of afterHooks) a();
    passed++;
    console.log(`  \x1b[32m✔ [PASSED]\x1b[0m ${testName}`);
    results.push({ suite: currentSuite, test: testName, status: 'PASSED' });
  } catch (err) {
    failed++;
    console.error(`  \x1b[31m✖ [FAILED]\x1b[0m ${testName}`);
    console.error(`    \x1b[31m${err.message}\x1b[0m`);
    results.push({ suite: currentSuite, test: testName, status: 'FAILED', error: err.message });
  }
};

function run() {
  const testDir = path.resolve('dist/test-out');
  if (!fs.existsSync(testDir)) {
    console.error('El directorio dist/test-out no existe. Ejecuta tsc primero.');
    process.exit(1);
  }

  function findSpecFiles(dir) {
    let files = [];
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        files = files.concat(findSpecFiles(full));
      } else if (entry.name.endsWith('.spec.js')) {
        files.push(full);
      }
    }
    return files;
  }

  const specFiles = findSpecFiles(testDir);
  console.log(`\n======================================================`);
  console.log(`   CARRETERO FRONTEND - EJECUTOR DE PRUEBAS UNITARIAS`);
  console.log(`   Archivos encontrados: ${specFiles.length}`);
  console.log(`======================================================`);

  for (const file of specFiles) {
    require(file);
  }

  console.log(`\n======================================================`);
  console.log(`RESUMEN DE PRUEBAS UNITARIAS (FRONTEND ANGULAR):`);
  console.log(`Total pruebas: ${total}`);
  console.log(`\x1b[32mSuperadas:     ${passed}\x1b[0m`);
  if (failed > 0) {
    console.log(`\x1b[31mFalladas:      ${failed}\x1b[0m`);
    console.log(`======================================================\n`);
    process.exit(1);
  } else {
    console.log(`\x1b[32mRESULTADO:     TODAS LAS PRUEBAS EN VERDE (100% OK)\x1b[0m`);
    console.log(`======================================================\n`);
  }
}

run();
