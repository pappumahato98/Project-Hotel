import { supabase } from "@/integrations/supabase/client";
import { SupabaseClient } from "@supabase/supabase-js";
import { Database } from "@/integrations/supabase/types";

export const db = supabase as unknown as SupabaseClient<Database>;

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
};

export function getBuiltInConversion(fromUnit: string, toUnit: string): number | null {
  const fromLower = fromUnit.toLowerCase();
  const toLower = toUnit.toLowerCase();
  
  if (DEFAULT_MEASUREMENT_CONVERSIONS[fromLower]?.[toLower]) {
    return DEFAULT_MEASUREMENT_CONVERSIONS[fromLower][toLower];
  }
  
  if (DEFAULT_MEASUREMENT_CONVERSIONS[toLower]?.[fromLower]) {
    const reverseFactor = DEFAULT_MEASUREMENT_CONVERSIONS[toLower][fromLower];
    return reverseFactor ? 1 / reverseFactor : null;
  }
  
  return null;
}

export function buildMeasurement(
  quantity: number,
  fromUnit: string,
  toUnit: string,
  conversions?: Array<{ from_uom_id: string; to_uom_id: string; conversion_factor: number }>
): number {
  if (!fromUnit || !toUnit || fromUnit.toLowerCase() === toUnit.toLowerCase()) {
    return quantity;
  }

  const builtInFactor = getBuiltInConversion(fromUnit, toUnit);
  if (builtInFactor !== null) {
    return quantity * builtInFactor;
  }

  if (conversions && conversions.length > 0) {
    const directConv = conversions.find(
      c => c.from_uom_id.toLowerCase() === fromUnit.toLowerCase() && 
           c.to_uom_id.toLowerCase() === toUnit.toLowerCase()
    );
    if (directConv) {
      return quantity * directConv.conversion_factor;
    }

    const reverseConv = conversions.find(
      c => c.from_uom_id.toLowerCase() === toUnit.toLowerCase() && 
           c.to_uom_id.toLowerCase() === fromUnit.toLowerCase()
    );
    if (reverseConv) {
      return quantity / reverseConv.conversion_factor;
    }

    for (const conv of conversions) {
      if (conv.from_uom_id.toLowerCase() === fromUnit.toLowerCase()) {
        const intermediateToTarget = conversions.find(
          c => c.from_uom_id.toLowerCase() === conv.to_uom_id.toLowerCase() && 
               c.to_uom_id.toLowerCase() === toUnit.toLowerCase()
        );
        if (intermediateToTarget) {
          return quantity * conv.conversion_factor * intermediateToTarget.conversion_factor;
        }
      }
    }
  }

  return quantity;
}

export function calculateRecipeYield(
  baseQuantity: number,
  yieldPercentage: number,
  targetPortions: number,
  basePortions: number = 1
): { scaledQuantity: number; totalYield: number } {
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

export function convertToBaseUnit(
  quantity: number,
  unit: string,
  uomAbbrevMap: Record<string, string>
): { quantity: number; baseUnit: string } {
  const abbrev = uomAbbrevMap[unit] || unit.toLowerCase();
  
  const unitGroups: Record<string, string[]> = {
    mass: ['kg', 'g', 'mg', 'lb', 'oz', 'ton'],
    volume: ['L', 'ml', 'gal', 'cup', 'fl_oz', 'tsp', 'tbsp', 'cc'],
    length: ['m', 'cm', 'mm', 'inch', 'ft', 'yd'],
    count: ['piece', 'dozen', 'pack', 'box']
  };

  for (const [baseUnit, units] of Object.entries(unitGroups)) {
    const idx = units.indexOf(abbrev);
    if (idx > 0) {
      const conversionFactor = DEFAULT_MEASUREMENT_CONVERSIONS[units[0]]?.[abbrev] || 1;
      return {
        quantity: quantity * conversionFactor,
        baseUnit: units[0]
      };
    }
  }

  return { quantity, baseUnit: unit };
}

export async function convertUoM(fromId: string, toId: string, quantity: number) {
  if (!fromId || !toId || fromId === toId) return quantity;

  const builtInFactor = getBuiltInConversion(fromId, toId);
  if (builtInFactor !== null) {
    return quantity * builtInFactor;
  }

  try {
    const { data } = await db.from("inventory_uom_conversions")
      .select("conversion_factor")
      .eq("from_uom_id", fromId)
      .eq("to_uom_id", toId)
      .maybeSingle();

    if (data) return quantity * data.conversion_factor;

    const { data: revData } = await db.from("inventory_uom_conversions")
      .select("conversion_factor")
      .eq("from_uom_id", toId)
      .eq("to_uom_id", fromId)
      .maybeSingle();

    if (revData) return quantity / revData.conversion_factor;
  } catch (e) {
    console.warn("DB conversion lookup failed, using built-in defaults only");
  }

  return quantity;
}

export async function createFinanceEntry(description: string, lines: { account_id: string, debit: number, credit: number }[]) {
  try {
    const entryNo = `INV-JE-${Date.now()}`;
    const { data: je, error: jeErr } = await db.from('journal_entries').insert({
      entry_number: entryNo,
      date: new Date().toISOString().split('T')[0],
      description,
      is_posted: false
    }).select().single();

    if (je && !jeErr) {
      await db.from('journal_lines').insert(lines.map(l => ({ ...l, journal_entry_id: je.id })));
    }
  } catch (e) {
    console.warn("Finance entry creation skipped:", e);
  }
}

export async function getInventoryAccount(key: string) {
  try {
    const { data } = await db.from('inventory_settings').select('setting_value').eq('setting_key', key).single();
    return data?.setting_value || 'f2345678-1234-5678-1234-567812345678';
  } catch (e) {
    return 'f2345678-1234-5678-1234-567812345678';
  }
}

export async function updateStoreStock(itemId: string, storeId: string, quantity: number, mode: 'increment' | 'decrement' | 'set') {
  try {
    const { data: existing } = await db.from('inventory_item_stores').select('current_stock').eq('item_id', itemId).eq('store_id', storeId).maybeSingle();

    let newStock = quantity;
    if (mode === 'increment') newStock = (existing?.current_stock || 0) + quantity;
    else if (mode === 'decrement') newStock = (existing?.current_stock || 0) - quantity;

    await db.from('inventory_item_stores').upsert({
      item_id: itemId,
      store_id: storeId,
      current_stock: Math.max(0, newStock)
    }, { onConflict: 'item_id,store_id' });
  } catch (e) {
    console.warn("Store stock update skipped:", e);
  }
}
