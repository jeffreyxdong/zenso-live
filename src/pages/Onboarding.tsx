import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/use-toast";
import { supabase } from "@/integrations/supabase/client";

const Onboarding: React.FC = () => {
  const navigate = useNavigate();
  const [companyName, setCompanyName] = useState("");
  const [companyWebsite, setCompanyWebsite] = useState("");
  const [loading, setLoading] = useState(false);
  const [initializing, setInitializing] = useState(true);

  // SEO basics
  useEffect(() => {
    const title = "Company Details - Zenso";
    document.title = title;

    const metaDesc = document.querySelector('meta[name="description"]');
    if (!metaDesc) {
      const m = document.createElement("meta");
      m.name = "description";
      m.content = "Provide your company name and website to complete setup.";
      document.head.appendChild(m);
    } else {
      metaDesc.setAttribute("content", "Provide your company name and website to complete setup.");
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = window.location.href;
  }, []);

  // Ensure user is authenticated; if already has profile, go to dashboard
  useEffect(() => {
    const init = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.user) {
        navigate("/", { replace: true });
        return;
      }
      const { data } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1);
      if (data && data.length > 0) {
        navigate("/pricing", { replace: true });
      } else {
        setInitializing(false);
      }
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (!companyName.trim()) {
      toast({ title: "Company name is required", description: "Please enter your company name." });
      return;
    }
    
    if (!companyWebsite.trim()) {
      toast({ title: "Company website is required", description: "Please enter your company website." });
      return;
    }

    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      // Create both profile and store entries
      const [profileResult, storeResult] = await Promise.allSettled([
        supabase
          .from("profiles")
          .insert({
            user_id: user.id,
            company_name: companyName.trim(),
            company_website: companyWebsite.trim()
          }),
        supabase
          .from("stores")
          .insert({
            user_id: user.id, 
            name: companyName.trim(), 
            website: companyWebsite.trim(),
            is_active: true
          })
          .select()
          .single()
      ]);

      if (profileResult.status === 'rejected' || storeResult.status === 'rejected') {
        const errors = [];
        if (profileResult.status === 'rejected') errors.push(`Profile: ${profileResult.reason?.message}`);
        if (storeResult.status === 'rejected') errors.push(`Store: ${storeResult.reason?.message}`);
        throw new Error(errors.join(', '));
      }

      // Get the created store ID and trigger brand recommendations generation
      const createdStore = storeResult.status === 'fulfilled' ? storeResult.value.data : null;
      if (createdStore?.id) {
        // Fire and forget - don't wait for recommendations to complete
        supabase.functions.invoke('generate-brand-recommendations', {
          body: { storeId: createdStore.id }
        }).then(() => {
          console.log('Brand recommendations generation started');
        }).catch(err => console.error('Failed to start brand recommendations:', err));

        // Trigger competitor analytics generation
        supabase.functions.invoke('analyze-competitors', {
          body: { storeId: createdStore.id }
        }).then(() => {
          console.log('Competitor analytics generation started');
        }).catch(err => console.error('Failed to start competitor analytics:', err));

        // Trigger brand analytics to calculate initial visibility score
        supabase.functions.invoke('brand-analytics', {
          body: { storeId: createdStore.id }
        }).then(() => {
          console.log('Brand analytics generation started');
        }).catch(err => console.error('Failed to start brand analytics:', err));
      }

      toast({
        title: "Setup complete!",
        description: "Now pick a plan to activate your account."
      });
      navigate("/pricing", { replace: true });
    } catch (error: any) {
      toast({ title: "Could not save company details", description: error.message });
    } finally {
      setLoading(false);
    }
  };

  if (initializing) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p className="text-muted-foreground">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4">
      <main className="w-full max-w-md">
        <Card className="shadow-lg">
          <CardContent className="p-8">
            <header className="mb-6 text-center">
              <h1 className="text-2xl font-bold text-foreground">Tell us about your company</h1>
              <p className="text-sm text-muted-foreground mt-1">We use this to personalize your dashboard.</p>
            </header>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input
                  id="companyName"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}                 
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyWebsite">Company Website</Label>
                <Input
                  id="companyWebsite"
                  type="text"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}                  
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Continue to Pricing"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Onboarding;
