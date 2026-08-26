/**
 * Metadatos de presentacion para cada rol/area de trabajo de Carretero.
 * El backend ya modela estas areas como roles (ver DataInitializer.initRoles):
 * ADMIN, CAJERO, MESERO, COCINA, PARRILLA, BEBIDAS.
 */
export interface RoleDisplay {
  label: string;
  group: 'Administracion' | 'Salon' | 'Produccion';
  monogram: string;
  color: string;
}

export const ROLE_DISPLAY: Record<string, RoleDisplay> = {
  ADMIN: { label: 'Administrador', group: 'Administracion', monogram: 'AD', color: '#2b2b2b' },
  CAJERO: { label: 'Cajero', group: 'Salon', monogram: 'CJ', color: '#e31b22' },
  MESERO: { label: 'Mesero', group: 'Salon', monogram: 'ME', color: '#c4161c' },
  COCINA: { label: 'Cocina', group: 'Produccion', monogram: 'CO', color: '#b3381c' },
  PARRILLA: { label: 'Parrilla', group: 'Produccion', monogram: 'PA', color: '#991a1f' },
  BEBIDAS: { label: 'Bebidas', group: 'Produccion', monogram: 'BE', color: '#a1323d' },
};

const FALLBACK: RoleDisplay = { label: 'Trabajador', group: 'Salon', monogram: '--', color: '#6f2222' };

export function roleDisplayOf(roleName: string | null | undefined): RoleDisplay {
  if (!roleName) return FALLBACK;
  return ROLE_DISPLAY[roleName.toUpperCase()] ?? { ...FALLBACK, label: roleName };
}
