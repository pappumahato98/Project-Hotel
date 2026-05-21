import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface MenuCategory {
  id: string;
  name: string;
  display_order: number;
  is_active: boolean;
}

export interface MenuItem {
  id: string;
  category: string;
  item_name: string;
  item_price: number;
  description: string | null;
  is_active: boolean;
}

export const useMenuCategories = () => {
  return useQuery({
    queryKey: ["pos-menu-categories"],
    queryFn: async () => {
      // If pos_menu_categories doesn't exist or is empty, we derive categories from pos_menu_items
      const { data: items, error: itemsError } = await supabase
        .from("pos_menu_items")
        .select("category")
        .eq("is_active", true);

      if (itemsError) throw itemsError;

      const categories = Array.from(new Set(items?.map(i => i.category) || [])).map((name, index) => ({
        id: name,
        name: name,
        display_order: index,
        is_active: true
      }));

      return categories as MenuCategory[];
    },
  });
};

export const useMenuItems = () => {
  return useQuery({
    queryKey: ["pos-menu-items"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pos_menu_items")
        .select("*")
        .eq("is_active", true)
        .order("item_name", { ascending: true });

      if (error) throw error;
      return data as MenuItem[];
    },
  });
};
