/**
 * Daily Brand Analytics Runner
 * ----------------------------
 * Runs brand-analytics for all active stores every morning
 * This function is triggered by a cron job
 */
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.2";

const supabaseUrl = Deno.env.get("SUPABASE_URL");
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const supabase = createClient(supabaseUrl, supabaseServiceKey);

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting daily brand analytics runner...");

    // Get all active stores
    const { data: stores, error: storesError } = await supabase
      .from("stores")
      .select("id, name, website")
      .eq("is_active", true);

    if (storesError) {
      console.error("Error fetching stores:", storesError);
      throw storesError;
    }

    if (!stores || stores.length === 0) {
      console.log("No active stores found");
      return new Response(
        JSON.stringify({ success: true, message: "No active stores to process" }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Found ${stores.length} active store(s) to process`);

    const results = [];

    // Process each store
    for (const store of stores) {
      try {
        console.log(`\n▶ Processing store: ${store.name} (${store.id})`);

        // Call the brand-analytics function for this store
        const { data, error } = await supabase.functions.invoke("brand-analytics", {
          body: { storeId: store.id },
        });

        if (error) {
          console.error(`Error processing store ${store.name}:`, error);
          results.push({
            storeId: store.id,
            storeName: store.name,
            success: false,
            error: error.message,
          });
        } else {
          console.log(`✅ Successfully processed store: ${store.name}`);
          results.push({
            storeId: store.id,
            storeName: store.name,
            success: true,
            visibilityScore: data?.visibilityScore,
          });
        }
      } catch (error) {
        console.error(`Error processing store ${store.id}:`, error);
        results.push({
          storeId: store.id,
          storeName: store.name,
          success: false,
          error: error instanceof Error ? error.message : "Unknown error",
        });
      }
    }

    const successCount = results.filter((r) => r.success).length;
    console.log(`\n✅ Daily brand analytics runner completed`);
    console.log(`   Processed: ${stores.length} stores`);
    console.log(`   Successful: ${successCount}`);
    console.log(`   Failed: ${stores.length - successCount}`);

    return new Response(
      JSON.stringify({
        success: true,
        totalStores: stores.length,
        successfulStores: successCount,
        results,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in daily brand analytics runner:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error occurred";
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
