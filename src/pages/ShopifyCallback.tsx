import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Loader2 } from 'lucide-react';

const ShopifyCallback = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  useEffect(() => {
    const handleCallback = async () => {
      try {
        console.log('ShopifyCallback component mounted');
        console.log('Current URL:', window.location.href);
        
        // Extract parameters from URL
        const urlParams = new URLSearchParams(window.location.search);
        const code = urlParams.get('code');
        const shop = urlParams.get('shop');
        const state = urlParams.get('state');
        
        console.log('URL parameters:', { code, shop, state });

        // Verify state parameter (CSRF protection)
        const storedState = sessionStorage.getItem('shopify_oauth_state');
        console.log('State verification:', { received: state, stored: storedState });
        
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
        console.log('Session token available:', !!sessionToken);
        
        if (!sessionToken) {
          throw new Error('Session expired. Please try again.');
        }
        sessionStorage.removeItem('shopify_session_token');

        // Show loading state
        toast({
          title: "Processing...",
          description: "Exchanging authorization code and importing products...",
        });

        console.log('Calling shopify-oauth function with callback action...');

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

        console.log('Shopify OAuth function response:', { result, error });

        if (error) throw error;

        // Send success message to parent window and close popup
        if (window.opener) {
          console.log('Sending success message to parent window');
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
          console.log('No opener window, redirecting to dashboard');
          toast({
            title: "✅ Products imported successfully",
            description: `Imported ${result?.imported || 0} products, skipped ${result?.skipped || 0} duplicates`,
          });
          navigate('/dashboard');
        }

      } catch (error: any) {
        console.error('Shopify callback error:', error);
        
        // Clean up session storage
        sessionStorage.removeItem('shopify_oauth_state');
        sessionStorage.removeItem('shopify_session_token');

        // Send error message to parent window and close popup
        if (window.opener) {
          console.log('Sending error message to parent window');
          window.opener.postMessage({
            type: 'shopify-import-error',
            error: error.message || "Failed to complete Shopify import"
          }, '*');
          window.close();
        } else {
          // Fallback for direct navigation
          console.log('No opener window, redirecting to dashboard with error');
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
  }, [navigate, toast]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-4">
        <Loader2 className="w-8 h-8 animate-spin mx-auto text-primary" />
        <h2 className="text-xl font-semibold text-foreground">
          Completing Shopify Authorization
        </h2>
        <p className="text-muted-foreground">
          Please wait while we import your products...
        </p>
      </div>
    </div>
  );
};

export default ShopifyCallback;