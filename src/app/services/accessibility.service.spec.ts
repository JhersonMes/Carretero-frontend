import { DEFAULT_PREFS, isDefault, parsePrefs, prefsToClasses, storageKey } from './accessibility.service';

/**
 * Pruebas unitarias de la logica del widget de accesibilidad propio.
 */
describe('AccessibilityService', () => {
  it('storageKey_porOperario: cada usuario tiene su propia clave, sin importar mayusculas', () => {
    expect(storageKey('Mesero1')).toBe('carretero.a11y.mesero1');
    expect(storageKey('caja2') === storageKey('mesero1')).toBeFalsy();
  });

  it('parsePrefs_datosValidos: recupera lo guardado por el operario', () => {
    const prefs = parsePrefs('{"textSize":130,"highContrast":true,"readingMode":false,"colorCues":true}');
    expect(prefs).toEqual({ textSize: 130, highContrast: true, readingMode: false, colorCues: true });
  });

  it('parsePrefs_datosInvalidos: vuelve a los valores por defecto', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('no es json')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{"textSize":999,"highContrast":"si"}')).toEqual(DEFAULT_PREFS);
  });

  it('prefsToClasses_e_isDefault: activa solo las clases elegidas', () => {
    const prefs = { ...DEFAULT_PREFS, colorCues: true };
    expect(prefsToClasses(prefs)).toEqual({ 'a11y-contrast': false, 'a11y-reading': false, 'a11y-cues': true });
    expect(isDefault(prefs)).toBeFalsy();
    expect(isDefault(DEFAULT_PREFS)).toBeTruthy();
  });
});
