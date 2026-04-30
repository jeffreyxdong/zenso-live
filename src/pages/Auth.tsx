import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

const Auth = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const handleAuthCallback = async () => {
      try {
        // Handle the auth callback and get the session
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (error) {
          console.error('Auth callback error:', error);
          toast({
            title: "Authentication failed",
            description: error.message,
            variant: "destructive",
          });
          navigate("/");
          return;
        }

        if (session?.user) {
          // Check if user has a store profile
          const { data: store, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('user_id', session.user.id)
            .maybeSingle();

          if (storeError) {
            console.error('Store check error:', storeError);
            toast({
              title: "Error checking profile",
              description: "Please try again.",
              variant: "destructive",
            });
            navigate("/");
            return;
          }

          if (store) {
            toast({
              title: "Welcome back!",
              description: "Redirecting to dashboard...",
            });
            navigate("/dashboard");
          } else {
            toast({
              title: "Account created!",
              description: "Pick a plan to get started...",
            });
            navigate("/pricing");
          }
        } else {
          // No session found
          toast({
            title: "Authentication failed",
            description: "No valid session found. Please try signing in again.",
            variant: "destructive",
          });
          navigate("/");
        }
      } catch (err) {
        console.error('Auth callback error:', err);
        toast({
          title: "Something went wrong",
          description: "Please try signing in again.",
          variant: "destructive",
        });
        navigate("/");
      } finally {
        setLoading(false);
      }
    };

    // Handle auth state changes for OAuth and email confirmations
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('Auth state change in callback:', event, session?.user?.id);
        
        if (event === 'SIGNED_IN' && session) {
          // Wait a moment for any additional processing
          setTimeout(() => handleAuthCallback(), 100);
        } else if (event === 'TOKEN_REFRESHED') {
          // Session was refreshed, proceed with callback handling
          setTimeout(() => handleAuthCallback(), 100);
        }
      }
    );

    // Also check immediately in case we already have a session
    handleAuthCallback();

    return () => {
      subscription.unsubscribe();
    };
  }, [navigate]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Completing authentication...</p>
        </div>
      </div>
    );
  }

  return null;
};

export default Auth;