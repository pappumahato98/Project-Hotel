export const DEFAULT_MEASUREMENT_CONVERSIONS: Record<string, Record<string, number>> = {
  kg: { g: 1000, lb: 2.20462, oz: 35.274, ton: 0.001 },
  g: { kg: 0.001, mg: 1000, lb: 0.00220462, oz: 0.035274 },
  mg: { g: 0.001, kg: 0.000001, mcg: 1000 },
  lb: { kg: 0.453592, g: 453.592, oz: 16 },
  oz: { lb: 0.0625, g: 28.3495, kg: 0.0283495 },
  ton: { kg: 1000, lb: 2204.62 },
  L: { ml: 1000, gal: 0.264172, cup: 4.22675, fl_oz: 33.814 },
  ml: { L: 0.001, cc: 1, tsp: 0.202884, tbsp: 0.067628 },
  gal: { L: 3.78541, ml: 3785.41, cup: 16 },
  cup: { L: 0.236588, ml: 236.588, fl_oz: 8 },
  fl_oz: { cup: 0.125, ml: 29.5735, L: 0.0295735 },
  tsp: { ml: 4.92892, tbsp: 0.333333, fl_oz: 0.166667 },
  tbsp: { ml: 14.7868, tsp: 3, fl_oz: 0.5 },
  cc: { ml: 1, L: 0.001 },
  m: { cm: 100, mm: 1000, inch: 39.3701, ft: 3.28084, yd: 1.09361 },
  cm: { m: 0.01, mm: 10, inch: 0.393701, ft: 0.0328084 },
  mm: { cm: 0.1, m: 0.001, inch: 0.0393701 },
  inch: { cm: 2.54, m: 0.0254, ft: 0.0833333 },
  ft: { inch: 12, m: 0.3048, cm: 30.48 },
  yd: { m: 0.9144, ft: 3 },
  piece: { dozen: 0.0833333, pack: 0.1, box: 0.05 },
  dozen: { piece: 12, pack: 1.2, box: 0.6 },
  pack: { piece: 10, dozen: 0.833333, box: 0.5 },
  box: { piece: 20, dozen: 1.66667, pack: 2 },
  each: { piece: 1, dozen: 0.0833333, pack: 0.1, box: 0.05 },
  unit: { piece: 1, each: 1, dozen: 0.0833333 },
  set: { piece: 1, each: 1, unit: 1 },
  pair: { piece: 2, each: 2, unit: 2 },
  roll: { piece: 1, each: 1 },
  sheet: { piece: 1, each: 1 },
  packet: { piece: 1, each: 1, pack: 0.1 },
  bottle: { piece: 1, each: 1, L: 0.75, ml: 750 },
  can: { piece: 1, each: 1, ml: 330, L: 0.33 },
  jar: { piece: 1, each: 1, g: 500, ml: 500 },
  tube: { piece: 1, each: 1, g: 50, ml: 50 },
  bag: { piece: 1, each: 1, kg: 1, g: 1000 },
};

export type MeasurementCategory = 'mass' | 'volume' | 'length' | 'count' | 'other';

export const UNIT_CATEGORIES: Record<string, MeasurementCategory> = {
  kg: 'mass', g: 'mass', mg: 'mass', lb: 'mass', oz: 'mass', ton: 'mass',
  L: 'volume', ml: 'volume', gal: 'volume', cup: 'volume', fl_oz: 'volume', tsp: 'volume', tbsp: 'volume', cc: 'volume',
  m: 'length', cm: 'length', mm: 'length', inch: 'length', ft: 'length', yd: 'length',
  piece: 'count', dozen: 'count', pack: 'count', box: 'count', each: 'count', unit: 'count', set: 'count', pair: 'count',
  roll: 'other', sheet: 'other', packet: 'other', bottle: 'other', can: 'other', jar: 'other', tube: 'other', bag: 'other'
};

export function getBuiltInConversion(fromUnit: string, toUnit: string): number | null {
  const fromLower = fromUnit.toLowerCase();
  const toLower = toUnit.toLowerCase();
  
  if (fromLower === toLower) return 1;
  
  if (DEFAULT_MEASUREMENT_CONVERSIONS[fromLower]?.[toLower]) {
    return DEFAULT_MEASUREMENT_CONVERSIONS[fromLower][toLower];
  }
  
  if (DEFAULT_MEASUREMENT_CONVERSIONS[toLower]?.[fromLower]) {
    const reverseFactor = DEFAULT_MEASUREMENT_CONVERSIONS[toLower][fromLower];
    return reverseFactor ? 1 / reverseFactor : null;
  }
  
  return null;
}

export function convertMeasurement(
  quantity: number,
  fromUnit: string,
  toUnit: string
): number {
  if (!fromUnit || !toUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return quantity;
  }

  const fromCat = UNIT_CATEGORIES[fromUnit.toLowerCase()];
  const toCat = UNIT_CATEGORIES[toUnit.toLowerCase()];

  if (fromCat && toCat && fromCat !== toCat) {
    console.warn(`Cannot convert between different categories: ${fromCat} to ${toCat}`);
    return quantity;
  }

  const builtInFactor = getBuiltInConversion(fromUnit, toUnit);
  if (builtInFactor !== null) {
    return Math.round(quantity * builtInFactor * 10000) / 10000;
  }

  return quantity;
}

export function getConversionFactor(fromUnit: string, toUnit: string): number {
  return convertMeasurement(1, fromUnit, toUnit);
}

export function formatMeasurement(quantity: number, unit: string): string {
  if (quantity >= 1000 && (unit === 'g' || unit === 'ml')) {
    const converted = convertMeasurement(quantity, unit, unit === 'g' ? 'kg' : 'L');
    return `${converted.toFixed(2)} ${unit === 'g' ? 'kg' : 'L'}`;
  }
  return `${quantity.toFixed(2)} ${unit}`;
}

export function calculateRecipeYield(
  baseQuantity: number,
  yieldPercentage: number,
  targetPortions: number,
  basePortions: number = 1
): { scaledQuantity: number; totalYield: number } {
  if (yieldPercentage <= 0 || basePortions <= 0) {
    return { scaledQuantity: baseQuantity, totalYield: baseQuantity };
  }
  
  const yieldFactor = yieldPercentage / 100;
  const portionScale = targetPortions / basePortions;
  const scaledQuantity = baseQuantity * portionScale / yieldFactor;
  const totalYield = baseQuantity * yieldPercentage / 100 * portionScale;
  
  return {
    scaledQuantity: Math.round(scaledQuantity * 100) / 100,
    totalYield: Math.round(totalYield * 100) / 100
  };
}

export function calculatePortionCost(
  totalCost: number,
  totalYield: number,
  portions: number
): number {
  if (portions <= 0 || totalYield <= 0) return 0;
  return Math.round((totalCost / totalYield) * portions * 100) / 100;
}

export function getUnitsByCategory(category: MeasurementCategory): string[] {
  return Object.entries(UNIT_CATEGORIES)
    .filter(([, cat]) => cat === category)
    .map(([unit]) => unit);
}

export function getAllUnits(): string[] {
  return Object.keys(DEFAULT_MEASUREMENT_CONVERSIONS);
}

export function validateUnit(unit: string): boolean {
  return !!DEFAULT_MEASUREMENT_CONVERSIONS[unit.toLowerCase()];
}

export function getUnitCategory(unit: string): MeasurementCategory {
  return UNIT_CATEGORIES[unit.toLowerCase()] || 'other';
}

export function addCustomConversion(
  fromUnit: string,
  toUnit: string,
  factor: number
): void {
  const fromLower = fromUnit.toLowerCase();
  const toLower = toUnit.toLowerCase();
  
  if (!DEFAULT_MEASUREMENT_CONVERSIONS[fromLower]) {
    DEFAULT_MEASUREMENT_CONVERSIONS[fromLower] = {};
  }
  DEFAULT_MEASUREMENT_CONVERSIONS[fromLower][toLower] = factor;
  
  if (!DEFAULT_MEASUREMENT_CONVERSIONS[toLower]) {
    DEFAULT_MEASUREMENT_CONVERSIONS[toLower] = {};
  }
  DEFAULT_MEASUREMENT_CONVERSIONS[toLower][fromLower] = 1 / factor;
}