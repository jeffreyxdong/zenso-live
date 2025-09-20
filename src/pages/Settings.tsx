import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, User, Store, CreditCard } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  
  // Account data
  const [profile, setProfile] = useState({
    company_name: "",
    company_website: ""
  });
  
  // Store data
  const [activeStore, setActiveStore] = useState({
    name: "",
    website: ""
  });

  useEffect(() => {
    loadUserData();
  }, []);

  const loadUserData = async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        navigate("/", { replace: true });
        return;
      }

      // Load profile
      const { data: profileData } = await supabase
        .from("profiles")
        .select("*")
        .eq("user_id", session.user.id)
        .single();

      if (profileData) {
        setProfile({
          company_name: profileData.company_name || "",
          company_website: profileData.company_website || ""
        });
      }

      // Load active store
      const { data: storeData } = await supabase
        .from("stores")
        .select("*")
        .eq("user_id", session.user.id)
        .eq("is_active", true)
        .single();

      if (storeData) {
        setActiveStore({
          name: storeData.name || "",
          website: storeData.website || ""
        });
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleSaveAccount = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("profiles")
        .update({
          company_name: profile.company_name,
          company_website: profile.company_website
        })
        .eq("user_id", session.user.id);

      if (error) throw error;

      toast({
        title: "Account updated",
        description: "Your account information has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save account information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStore = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const { error } = await supabase
        .from("stores")
        .update({
          name: activeStore.name,
          website: activeStore.website
        })
        .eq("user_id", session.user.id)
        .eq("is_active", true);

      if (error) throw error;

      toast({
        title: "Store updated",
        description: "Your store information has been saved successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save store information.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/dashboard")}
              className="flex items-center gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <h1 className="text-2xl font-bold text-foreground">Settings</h1>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="container mx-auto px-6 py-8">
        <div className="flex gap-8">
          {/* Vertical Tabs */}
          <div className="w-64">
            <Tabs value={activeTab} onValueChange={setActiveTab} orientation="vertical" className="w-full">
              <TabsList className="flex flex-col w-full h-auto bg-muted/30 p-1">
                <TabsTrigger value="account" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <User className="w-4 h-4" />
                  My Account
                </TabsTrigger>
                <TabsTrigger value="store" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <Store className="w-4 h-4" />
                  My Store
                </TabsTrigger>
                <TabsTrigger value="billing" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <CreditCard className="w-4 h-4" />
                  Billing
                </TabsTrigger>
              </TabsList>
            </Tabs>
          </div>

          {/* Content Area */}
          <div className="flex-1">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              {/* My Account Tab */}
              <TabsContent value="account" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Account Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="companyName">Company Name</Label>
                      <Input
                        id="companyName"
                        value={profile.company_name}
                        onChange={(e) => setProfile({ ...profile, company_name: e.target.value })}
                        placeholder="Enter your company name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="companyWebsite">Company Website</Label>
                      <Input
                        id="companyWebsite"
                        value={profile.company_website}
                        onChange={(e) => setProfile({ ...profile, company_website: e.target.value })}
                        placeholder="Enter your company website"
                      />
                    </div>
                    <Button onClick={handleSaveAccount} disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* My Store Tab */}
              <TabsContent value="store" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Store Information</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="storeName">Store Name</Label>
                      <Input
                        id="storeName"
                        value={activeStore.name}
                        onChange={(e) => setActiveStore({ ...activeStore, name: e.target.value })}
                        placeholder="Enter your store name"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="storeWebsite">Store Website</Label>
                      <Input
                        id="storeWebsite"
                        value={activeStore.website}
                        onChange={(e) => setActiveStore({ ...activeStore, website: e.target.value })}
                        placeholder="Enter your store website"
                      />
                    </div>
                    <Button onClick={handleSaveStore} disabled={loading}>
                      {loading ? "Saving..." : "Save Changes"}
                    </Button>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Billing & Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">Current Plan</h3>
                      <p className="text-muted-foreground mb-4">eCommerce Pro - Active</p>
                      <Button variant="outline">Manage Subscription</Button>
                    </div>
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">Payment Method</h3>
                      <p className="text-muted-foreground mb-4">No payment method on file</p>
                      <Button variant="outline">Add Payment Method</Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Settings;