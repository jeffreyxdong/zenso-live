import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

const ShopifyCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const shop = urlParams.get('shop');
        const state = urlParams.get('state');

        // Verify state
        const storedState = sessionStorage.getItem('shopify-oauth-state');
        if (!state || state !== storedState) {
          throw new Error('Invalid OAuth state parameter');
        }

        // Clean up state
        sessionStorage.removeItem('shopify-oauth-state');

        if (!code || !shop) {
          throw new Error('Missing authorization code or shop parameter');
        }

        // Get stored session
        const sessionToken = sessionStorage.getItem('shopify-import-session');
        if (!sessionToken) {
          throw new Error('Session expired. Please try again.');
        }
        sessionStorage.removeItem('shopify-import-session');

        // Show loading state
        toast({
          title: "Processing...",
          description: "Exchanging authorization code and importing products...",
        });

        // Exchange code for access token and import products
        const { data: result, error } = await supabase.functions.invoke('shopify-oauth', {
          body: {
            action: 'exchange-and-import',
            code,
            shop: shop.replace('.myshopify.com', ''), // Normalize shop name
          },
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (error) throw error;

        toast({
          title: "✅ Products imported successfully",
          description: `Imported ${result.imported} products, skipped ${result.skipped} duplicates`,
        });

        // Redirect back to dashboard
        navigate('/dashboard');

      } catch (error: any) {
        console.error('Shopify callback error:', error);
        toast({
          title: "Import Error",
          description: error.message || "Failed to complete Shopify import",
          variant: "destructive",
        });
        
        // Redirect back to dashboard even on error
        navigate('/dashboard');
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background">
      <div className="text-center p-8">
        <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
        <h2 className="text-xl font-semibold mb-2">Processing Shopify Authorization</h2>
        <p className="text-muted-foreground">
          Importing your products... Please wait.
        </p>
      </div>
    </div>
  );
};

export default ShopifyCallback;