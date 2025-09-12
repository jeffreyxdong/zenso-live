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
        const storedState = sessionStorage.getItem('shopify_oauth_state');
        if (!state || state !== storedState) {
          throw new Error('Invalid OAuth state parameter');
        }

        // Clean up state
        sessionStorage.removeItem('shopify_oauth_state');

        if (!code || !shop) {
          throw new Error('Missing authorization code or shop parameter');
        }

        // Get stored session
        const sessionToken = sessionStorage.getItem('shopify_session_token');
        if (!sessionToken) {
          throw new Error('Session expired. Please try again.');
        }
        sessionStorage.removeItem('shopify_session_token');

        // Show loading state
        toast({
          title: "Processing...",
          description: "Exchanging authorization code and importing products...",
        });

        // Exchange code for access token and import products
        const { data: result, error } = await supabase.functions.invoke('shopify-oauth', {
          body: {
            action: 'callback',
            code,
            shop: shop.replace('.myshopify.com', ''), // Normalize shop name
          },
          headers: {
            Authorization: `Bearer ${sessionToken}`,
          },
        });

        if (error) throw error;

        // Send success message to parent window and close popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'shopify-import-complete',
            success: true,
            imported: result?.imported || 0,
            skipped: result?.skipped || 0,
            total: result?.total || 0
          }, '*');
          window.close();
        } else {
          // Fallback for direct navigation
          toast({
            title: "✅ Products imported successfully",
            description: `Imported ${result?.imported || 0} products, skipped ${result?.skipped || 0} duplicates`,
          });
          navigate('/dashboard');
        }

      } catch (error: any) {
        console.error('Shopify callback error:', error);
        // Send error message to parent window and close popup
        if (window.opener) {
          window.opener.postMessage({
            type: 'shopify-import-error',
            error: error.message || "Failed to complete Shopify import"
          }, '*');
          window.close();
        } else {
          // Fallback for direct navigation
          toast({
            title: "Import Error",
            description: error.message || "Failed to complete Shopify import",
            variant: "destructive",
          });
          navigate('/dashboard');
        }
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