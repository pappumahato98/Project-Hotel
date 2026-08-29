import { supabase } from "@/integrations/supabase/client";

export const trackActivity = async (action: string, entityType: string = "button_click", details: any = {}) => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    await supabase.from('audit_log').insert({
      user_id: user.id,
      action,
      entity_type: entityType,
      new_values: details,
    });
  } catch (error) {
    // Silently fail as logging shouldn't break the UI
    console.error("Failed to track activity:", error);
  }
};
