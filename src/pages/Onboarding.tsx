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

  // SEO basics
  useEffect(() => {
    const title = "Company Details - BrandRefs";
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
        .maybeSingle();
      if (data) {
        navigate("/dashboard", { replace: true });
      }
    };
    init();
  }, [navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        navigate("/", { replace: true });
        return;
      }

      // Basic URL normalization
      let website = companyWebsite.trim();
      if (website && !/^https?:\/\//i.test(website)) {
        website = `https://${website}`;
      }

      const { error } = await supabase
        .from("stores")
        .insert([
          { 
            user_id: user.id, 
            name: companyName.trim(), 
            website: website,
            is_active: true
          }
        ]);

      if (error) {
        toast({ title: "Could not save company details", description: error.message });
      } else {
        toast({ title: "Setup complete", description: "Your company profile has been saved." });
        navigate("/dashboard", { replace: true });
      }
    } finally {
      setLoading(false);
    }
  };

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
                  type="url"
                  value={companyWebsite}
                  onChange={(e) => setCompanyWebsite(e.target.value)}                  
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Saving..." : "Continue to Dashboard"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default Onboarding;
