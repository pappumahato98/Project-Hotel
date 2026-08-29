import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Loader2, Zap, Coffee, Utensils, Wine, IceCream } from "lucide-react";
import { CardSkeleton } from "@/components/skeletons";

// All available menu items matching POS system
const allMenuItems = [
  { id: "1", name: "Coffee", price: 4.50, category: "Beverages", icon: Coffee },
  { id: "2", name: "Tea", price: 3.50, category: "Beverages", icon: Coffee },
  { id: "3", name: "Fresh Juice", price: 6.00, category: "Beverages", icon: Coffee },
  { id: "4", name: "Water", price: 2.00, category: "Beverages", icon: Coffee },
  { id: "5", name: "Breakfast Combo", price: 15.00, category: "Food", icon: Utensils },
  { id: "6", name: "Lunch Special", price: 22.00, category: "Food", icon: Utensils },
  { id: "7", name: "Dinner Platter", price: 35.00, category: "Food", icon: Utensils },
  { id: "8", name: "Club Sandwich", price: 12.00, category: "Food", icon: Utensils },
  { id: "9", name: "Caesar Salad", price: 10.00, category: "Food", icon: Utensils },
  { id: "10", name: "Wine Glass", price: 12.00, category: "Bar", icon: Wine },
  { id: "11", name: "Cocktail", price: 14.00, category: "Bar", icon: Wine },
  { id: "12", name: "Beer", price: 8.00, category: "Bar", icon: Wine },
  { id: "13", name: "Ice Cream", price: 7.00, category: "Desserts", icon: IceCream },
  { id: "14", name: "Cake Slice", price: 9.00, category: "Desserts", icon: IceCream },
  { id: "15", name: "Fruit Bowl", price: 8.00, category: "Desserts", icon: IceCream },
];

const categoryIcons: Record<string, typeof Coffee> = {
  Beverages: Coffee,
  Food: Utensils,
  Bar: Wine,
  Desserts: IceCream,
};

export interface QuickMenuSettings {
  enabled_items: string[];
}

interface QuickMenuSettingsCardProps {
  settings?: QuickMenuSettings;
  isLoading: boolean;
  isPending: boolean;
  onToggleItem: (itemId: string, enabled: boolean) => void;
}

export function QuickMenuSettingsCard({
  settings,
  isLoading,
  isPending,
  onToggleItem,
}: QuickMenuSettingsCardProps) {
  if (isLoading) {
    return <CardSkeleton />;
  }

  const enabledItems = settings?.enabled_items || ["1", "4", "5", "6", "12", "13"];
  const categories = [...new Set(allMenuItems.map(item => item.category))];

  return (
    <Card variant="elevated">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Zap className="h-5 w-5 text-amber-500" />
          Quick Menu Items
          {isPending && <Loader2 className="h-4 w-4 animate-spin" />}
        </CardTitle>
        <CardDescription>
          Select which items appear in the POS Quick Menu for faster order entry
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {categories.map((category) => {
          const Icon = categoryIcons[category] || Utensils;
          const categoryItems = allMenuItems.filter(item => item.category === category);
          
          return (
            <div key={category} className="space-y-3">
              <div className="flex items-center gap-2">
                <Icon className="h-4 w-4 text-muted-foreground" />
                <h4 className="font-medium text-sm">{category}</h4>
                <Badge variant="outline" className="text-xs">
                  {categoryItems.filter(item => enabledItems.includes(item.id)).length}/{categoryItems.length}
                </Badge>
              </div>
              <div className="grid gap-3 pl-6">
                {categoryItems.map((item) => (
                  <div key={item.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Label htmlFor={`quick-menu-${item.id}`} className="cursor-pointer">
                        {item.name}
                      </Label>
                      <span className="text-sm text-muted-foreground">
                        ${item.price.toFixed(2)}
                      </span>
                    </div>
                    <Switch
                      id={`quick-menu-${item.id}`}
                      checked={enabledItems.includes(item.id)}
                      onCheckedChange={(checked) => onToggleItem(item.id, checked)}
                      disabled={isPending}
                    />
                  </div>
                ))}
              </div>
            </div>
          );
        })}
        
        <div className="pt-4 border-t border-border">
          <p className="text-sm text-muted-foreground">
            <strong>{enabledItems.length}</strong> items selected for Quick Menu
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
