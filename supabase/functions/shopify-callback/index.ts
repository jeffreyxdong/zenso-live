import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get('code');
    const shop = url.searchParams.get('shop');
    const state = url.searchParams.get('state');

    if (!code || !shop) {
      // Return an HTML page that closes the popup with error
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Shopify Import - Error</title>
        </head>
        <body>
          <h2>Import Error</h2>
          <p>Missing authorization code or shop parameter.</p>
          <script>
            if (window.opener) {
              window.close();
            }
          </script>
        </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400
        }
      );
    }

    const SHOPIFY_API_KEY = Deno.env.get('SHOPIFY_API_KEY');
    const SHOPIFY_API_SECRET = Deno.env.get('SHOPIFY_API_SECRET');

    if (!SHOPIFY_API_KEY || !SHOPIFY_API_SECRET) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Shopify Import - Error</title>
        </head>
        <body>
          <h2>Configuration Error</h2>
          <p>Shopify credentials not configured.</p>
          <script>
            if (window.opener) {
              window.close();
            }
          </script>
        </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 500
        }
      );
    }

    // Exchange code for access token
    const tokenUrl = `https://${shop}/admin/oauth/access_token`;
    
    const tokenResponse = await fetch(tokenUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: SHOPIFY_API_KEY,
        client_secret: SHOPIFY_API_SECRET,
        code: code,
      }),
    });

    const tokenData = await tokenResponse.json();
    
    if (!tokenResponse.ok) {
      return new Response(
        `<!DOCTYPE html>
        <html>
        <head>
          <title>Shopify Import - Error</title>
        </head>
        <body>
          <h2>Authorization Error</h2>
          <p>Failed to exchange code for access token.</p>
          <script>
            if (window.opener) {
              window.close();
            }
          </script>
        </body>
        </html>`,
        {
          headers: { ...corsHeaders, 'Content-Type': 'text/html' },
          status: 400
        }
      );
    }

    // Return success page that passes data back to parent window
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Shopify Import - Success</title>
        <style>
          body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            min-height: 100vh;
            margin: 0;
            background-color: #f8f9fa;
          }
          .container {
            text-align: center;
            padding: 2rem;
            background: white;
            border-radius: 8px;
            box-shadow: 0 2px 10px rgba(0,0,0,0.1);
          }
          .success {
            color: #10b981;
            font-size: 3rem;
            margin-bottom: 1rem;
          }
          h2 {
            color: #1f2937;
            margin-bottom: 0.5rem;
          }
          p {
            color: #6b7280;
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="success">✅</div>
          <h2>Authorization Successful!</h2>
          <p>Closing window and importing products...</p>
        </div>
        <script>
          // Pass the access token back to the parent window
          if (window.opener) {
            localStorage.setItem('shopify-oauth-result', JSON.stringify({
              accessToken: '${tokenData.access_token}',
              shop: '${shop.replace('.myshopify.com', '')}'
            }));
            window.close();
          }
        </script>
      </body>
      </html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' }
      }
    );

  } catch (error: any) {
    console.error('Shopify callback error:', error);
    
    return new Response(
      `<!DOCTYPE html>
      <html>
      <head>
        <title>Shopify Import - Error</title>
      </head>
      <body>
        <h2>Import Error</h2>
        <p>An unexpected error occurred: ${error.message}</p>
        <script>
          if (window.opener) {
            window.close();
          }
        </script>
      </body>
      </html>`,
      {
        headers: { ...corsHeaders, 'Content-Type': 'text/html' },
        status: 500
      }
    );
  }
});