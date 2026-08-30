// ═══════════════════════════════════════════════════════════════════════════
// Edge Function: realtime-notify
// ═══════════════════════════════════════════════════════════════════════════
//
// Sends a notification to a user when a database event occurs.
// Called via Supabase Database Webhooks (pg_net) or manually.
//
// Usage:
//   POST /functions/v1/realtime-notify
//   Authorization: Bearer <service_role_key>
//   Body: { "type": "new_reservation", "user_id": "...", "title": "...", "message": "...", "data": {} }
//
// ═══════════════════════════════════════════════════════════════════════════

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

Deno.serve(async (req: Request) => {
  try {
    const body = await req.json();

    const { type, user_id, title, message, data } = body;

    if (!type || !user_id) {
      return new Response(JSON.stringify({ error: "Missing required fields: type, user_id" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Insert notification
    const { data: notification, error } = await supabase
      .from("notifications")
      .insert({
        user_id,
        type,
        title: title || type,
        message: message || "",
        data: data || {},
        read: false,
      })
      .select()
      .single();

    if (error) {
      return new Response(JSON.stringify({ error: error.message }), {
        status: 500,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Realtime will automatically push this to the user's client
    // (the notifications table is in the realtime publication)

    return new Response(JSON.stringify({
      success: true,
      notification,
    }), { headers: { "Content-Type": "application/json" } });

  } catch (e) {
    return new Response(JSON.stringify({ error: e.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
