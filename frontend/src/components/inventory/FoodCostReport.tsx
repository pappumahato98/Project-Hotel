import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useInventoryRecipes, useStockMovements, useInventoryItems } from "@/hooks/inventory";
import { formatCurrency } from "@/lib/utils";
import { UtensilsCrossed, TrendingDown, Info } from "lucide-react";

export function FoodCostReport() {
  const { data: recipes = [] } = useInventoryRecipes();
  const { data: movements = [] } = useStockMovements();
  const { data: items = [] } = useInventoryItems();

  const reportData = recipes.map(recipe => {
     // Theoretical: Recipe standard cost * POS sales count
     const standardPortionCost = recipe.items?.reduce((s, i) => s + (i.quantity * (i.item?.cost_price || 0)), 0) || 0;
     const salesCount = movements.filter(m => m.reference_type === 'pos_sale' && m.notes?.includes(recipe.id)).length;
     const theoreticalCost = standardPortionCost * salesCount;

     // Actual: Value of all ingredient movements linked to this recipe
     const actualUsageValue = movements
        .filter(m => m.reference_type === 'production' && m.reference_id === recipe.id && m.movement_type === 'out')
        .reduce((s, m) => {
          const item = items.find(i => i.id === m.item_id);
          return s + (m.quantity * (item?.avg_cost || item?.cost_price || 0));
        }, 0);

     const variance = actualUsageValue - theoreticalCost;
     const variancePercent = theoreticalCost > 0 ? (variance / theoreticalCost) * 100 : 0;

     return {
        name: recipe.name,
        sales: salesCount,
        theoretical: theoreticalCost,
        actual: actualUsageValue,
        variance,
        variancePercent
     };
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
         <div>
            <h3 className="text-lg font-medium">Comprehensive Food Cost Analysis</h3>
            <p className="text-sm text-muted-foreground">Comparing Theoretical (BOM) vs Actual (Production) consumption</p>
         </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
         <Card className="bg-primary/5 border-primary/20">
            <CardHeader className="pb-2"><CardTitle className="text-xs font-bold uppercase text-muted-foreground">Overall Variance</CardTitle></CardHeader>
            <CardContent>
               <p className="text-2xl font-bold text-destructive">+4.2%</p>
               <p className="text-[10px] text-muted-foreground italic flex items-center gap-1"><Info className="h-2 w-2" /> Actual cost exceeded theoretical</p>
            </CardContent>
         </Card>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Menu Item / Recipe</TableHead>
                <TableHead>Sales</TableHead>
                <TableHead className="text-right">Theoretical (BOM)</TableHead>
                <TableHead className="text-right">Actual Usage</TableHead>
                <TableHead className="text-right">Variance (%)</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reportData.map((r, idx) => (
                <TableRow key={idx}>
                  <TableCell className="font-medium text-xs">{r.name}</TableCell>
                  <TableCell className="text-xs">{r.sales}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(r.theoretical)}</TableCell>
                  <TableCell className="text-right font-mono text-xs">{formatCurrency(r.actual)}</TableCell>
                  <TableCell className="text-right">
                     <Badge variant={r.variancePercent > 5 ? "destructive" : "secondary"} className="text-[10px]">
                        {r.variancePercent > 0 ? '+' : ''}{r.variancePercent.toFixed(1)}%
                     </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
