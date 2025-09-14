import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Mail, ArrowRight, Lock, Loader2 } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const SignupForm = () => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLogin, setIsLogin] = useState(false);
  const navigate = useNavigate();

  // Listen for auth state changes
  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log('Auth state change:', event, session?.user?.id);
        if (event === "SIGNED_IN" && session) {
          // Defer database check to avoid deadlocks
          setTimeout(async () => {
            const { data: store, error } = await supabase
              .from('stores')
              .select('*')
              .eq('user_id', session.user.id)
              .maybeSingle();

            console.log('Store check:', store, error);

            if (store) {
              toast({
                title: "Welcome back!",
                description: "Redirecting to dashboard...",
              });
              navigate("/dashboard");
            } else {
              toast({
                title: "Welcome!",
                description: "Redirecting you to onboarding...",
              });
              navigate("/onboarding");
            }
          }, 0);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, [navigate]);

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: { 
          data: { email_signup: true },
        },
      });

      if (error) {
        if (error.message === "User already registered") {
          toast({
            title: "Account already exists",
            description: "This email is already registered. Try logging in instead.",
            variant: "destructive",
          });
          return;
        }
        toast({
          title: "Sign up failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      // User exists: Supabase returns identities = []
      if (data?.user?.identities?.length === 0) {
        toast({
          title: "Account already exists",
          description: "This email is already registered. Try logging in instead.",
          variant: "destructive",
        });
        return;
      }

      console.log('Signup success:', data);
      toast({
        title: "Account created!",
        description: "Redirecting to onboarding...",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) return;

    setLoading(true);
    try {
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        toast({
          title: "Login failed",
          description: error.message,
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Welcome back!",
        description: "Redirecting...",
      });
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    try {
      const redirectUrl = `${window.location.origin}/`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: { redirectTo: redirectUrl },
      });

      if (error) {
        toast({
          title: `${isLogin ? "Login" : "Sign up"} failed`,
          description: error.message,
          variant: "destructive",
        });
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive",
      });
    }
  };

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-foreground mb-2">
            {isLogin ? "Welcome Back" : "Track Your Brand in AI"}
          </h1>
          <p className="text-muted-foreground">
            {isLogin 
              ? "Sign in to your account to continue monitoring your brand visibility."
              : "Monitor product recommendations across ChatGPT, Perplexity & Gemini."
            }
          </p>
        </div>

        <form onSubmit={isLogin ? handleLogin : handleEmailSignup} className="space-y-4 mb-6">
          <div className="relative">
            <Input
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-11 pl-4 pr-12"
              required
            />
            <Mail className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          </div>

          <div className="relative">
            <Input
              type="password"
              placeholder={isLogin ? "Enter your password" : "Create a password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="h-11 pl-4 pr-12"
              required
              minLength={isLogin ? 1 : 6}
            />
            <Lock className="absolute right-4 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
          </div>

          <Button
            type="submit"
            className="w-full h-11 font-medium"
            size="lg"
            disabled={loading}
          >
            {loading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin mr-2" />
                {isLogin ? "Signing in..." : "Signing up..."}
              </>
            ) : (
              <>
                {isLogin ? "Sign in with email" : "Sign up with email"}
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </form>

        <div className="relative mb-6">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-border"></div>
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">OR</span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="w-full h-11"
            onClick={handleGoogleAuth}
          >
            <svg className="w-4 h-4 mr-2" viewBox="0 0 24 24">
              <path
                fill="currentColor"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="currentColor"
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="currentColor"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="currentColor"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            {isLogin ? "Sign in with Google" : "Sign up with Google"}
          </Button>
        </div>

        <div className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="text-primary hover:underline font-medium"
          >
            {isLogin ? "Sign up instead" : "Login instead"}
          </button>
        </div>
      </CardContent>
    </Card>
  );
};

export default SignupForm;
