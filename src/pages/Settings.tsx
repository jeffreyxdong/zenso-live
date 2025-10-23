import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { ArrowLeft, User, Store, CreditCard, Bell, Shield, Zap, Target, Download } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { CompetitorAnalytics } from "@/components/CompetitorAnalytics";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  const [storeId, setStoreId] = useState<string>("");
  
  // Account data
  const [profile, setProfile] = useState({
    company_name: "",
    company_website: ""
  });
  
  const [userEmail, setUserEmail] = useState("");
  const [newEmail, setNewEmail] = useState("");
  
  // Password change
  const [passwordData, setPasswordData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: ""
  });
  
  // Store data
  const [activeStore, setActiveStore] = useState({
    name: "",
    website: ""
  });

  // Notification preferences
  const [notifications, setNotifications] = useState({
    emailAlerts: true,
    weeklyReport: true,
    monthlyReport: false,
    scoreAlerts: true,
    competitorAlerts: true,
    promptCompletionAlerts: false
  });

  // Tracking preferences
  const [trackingSettings, setTrackingSettings] = useState({
    promptFrequency: "daily",
    trackingEnabled: true,
    autoScoring: true,
    platforms: {
      perplexity: true,
      chatgpt: true,
      gemini: true,
      claude: true
    }
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

      setUserEmail(session.user.email || "");

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
        setStoreId(storeData.id);
      }
    } catch (error) {
      console.error("Error loading user data:", error);
    }
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // Fetch all user data
      const [profileData, storesData, productsData, promptsData] = await Promise.all([
        supabase.from("profiles").select("*").eq("user_id", session.user.id),
        supabase.from("stores").select("*").eq("user_id", session.user.id),
        supabase.from("products").select("*").eq("user_id", session.user.id),
        supabase.from("prompts").select("*").eq("user_id", session.user.id)
      ]);

      const exportData = {
        profile: profileData.data,
        stores: storesData.data,
        products: productsData.data,
        prompts: promptsData.data,
        exportedAt: new Date().toISOString()
      };

      // Create and download JSON file
      const dataStr = JSON.stringify(exportData, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geo-dashboard-export-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded successfully."
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to export data.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSaveAccount = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      // First try to fetch existing profile
      const { data: existingProfile } = await supabase
        .from("profiles")
        .select("id")
        .eq("user_id", session.user.id)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("profiles")
          .update({
            company_name: profile.company_name,
            company_website: profile.company_website
          })
          .eq("user_id", session.user.id);
        
        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("profiles")
          .insert({
            user_id: session.user.id,
            company_name: profile.company_name,
            company_website: profile.company_website
          });
        
        if (error) throw error;
      }

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

  const handleChangeEmail = async () => {
    setLoading(true);
    try {
      if (!newEmail || !newEmail.trim()) {
        toast({
          title: "Error",
          description: "Please enter a new email address",
          variant: "destructive"
        });
        return;
      }

      if (newEmail === userEmail) {
        toast({
          title: "Error",
          description: "New email must be different from current email",
          variant: "destructive"
        });
        return;
      }

      // Email format validation
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(newEmail)) {
        toast({
          title: "Error",
          description: "Please enter a valid email address",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        email: newEmail,
      });

      if (error) {
        // Handle specific error for email already in use
        if (error.message.includes("already registered") || error.message.includes("already been registered")) {
          toast({
            title: "Error",
            description: "This email is already taken",
            variant: "destructive"
          });
        } else {
          toast({
            title: "Error",
            description: error.message || "Failed to change email",
            variant: "destructive"
          });
        }
        return;
      }

      toast({
        title: "Email update initiated",
        description: "Please check your inbox to confirm the change."
      });
      setNewEmail("");
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change email",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async () => {
    setLoading(true);
    try {
      if (!passwordData.newPassword || !passwordData.confirmPassword) {
        toast({
          title: "Error",
          description: "Please fill in all password fields",
          variant: "destructive"
        });
        return;
      }

      if (passwordData.newPassword !== passwordData.confirmPassword) {
        toast({
          title: "Error",
          description: "New passwords do not match",
          variant: "destructive"
        });
        return;
      }

      if (passwordData.newPassword.length < 6) {
        toast({
          title: "Error",
          description: "Password must be at least 6 characters long",
          variant: "destructive"
        });
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: passwordData.newPassword,
      });

      if (error) throw error;

      toast({
        title: "Password changed",
        description: "Your password has been updated successfully."
      });
      setPasswordData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to change password",
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
                <TabsTrigger value="notifications" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <Bell className="w-4 h-4" />
                  Notifications
                </TabsTrigger>
                <TabsTrigger value="tracking" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <Target className="w-4 h-4" />
                  Tracking
                </TabsTrigger>
                <TabsTrigger value="integrations" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <Zap className="w-4 h-4" />
                  Integrations
                </TabsTrigger>
                <TabsTrigger value="privacy" className="w-full justify-start gap-3 px-4 py-3 text-left">
                  <Shield className="w-4 h-4" />
                  Privacy & Data
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
                      <Label htmlFor="email">Email</Label>
                      <Input
                        id="email"
                        value={userEmail}
                        disabled
                        className="bg-muted/30"
                      />
                    </div>
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

                <Card>
                  <CardHeader>
                    <CardTitle>Change Email</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="currentEmail">Current Email</Label>
                      <Input
                        id="currentEmail"
                        type="email"
                        value={userEmail}
                        disabled
                        className="bg-muted/30"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="newEmail">New Email</Label>
                      <Input
                        id="newEmail"
                        type="email"
                        value={newEmail}
                        onChange={(e) => setNewEmail(e.target.value)}
                        placeholder="Enter new email address"
                      />
                    </div>
                    <Button onClick={handleChangeEmail} disabled={loading}>
                      {loading ? "Updating..." : "Change Email"}
                    </Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Change Password</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="newPassword">New Password</Label>
                      <Input
                        id="newPassword"
                        type="password"
                        value={passwordData.newPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                        placeholder="Enter new password"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="confirmPassword">Confirm New Password</Label>
                      <Input
                        id="confirmPassword"
                        type="password"
                        value={passwordData.confirmPassword}
                        onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                        placeholder="Confirm new password"
                      />
                    </div>
                    <Button onClick={handleChangePassword} disabled={loading}>
                      {loading ? "Updating..." : "Change Password"}
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

                {storeId && (
                  <div className="h-[600px]">
                    <CompetitorAnalytics storeId={storeId} />
                  </div>
                )}
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose what updates you want to receive via email</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailAlerts">Email Alerts</Label>
                        <p className="text-sm text-muted-foreground">Receive important alerts about your account</p>
                      </div>
                      <Switch
                        id="emailAlerts"
                        checked={notifications.emailAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, emailAlerts: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="weeklyReport">Weekly Reports</Label>
                        <p className="text-sm text-muted-foreground">Get a summary of your visibility scores every week</p>
                      </div>
                      <Switch
                        id="weeklyReport"
                        checked={notifications.weeklyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, weeklyReport: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="monthlyReport">Monthly Reports</Label>
                        <p className="text-sm text-muted-foreground">Comprehensive monthly performance analysis</p>
                      </div>
                      <Switch
                        id="monthlyReport"
                        checked={notifications.monthlyReport}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, monthlyReport: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="scoreAlerts">Score Change Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when your visibility scores change significantly</p>
                      </div>
                      <Switch
                        id="scoreAlerts"
                        checked={notifications.scoreAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, scoreAlerts: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="competitorAlerts">Competitor Activity Alerts</Label>
                        <p className="text-sm text-muted-foreground">Be notified about competitor visibility changes</p>
                      </div>
                      <Switch
                        id="competitorAlerts"
                        checked={notifications.competitorAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, competitorAlerts: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="promptCompletionAlerts">Prompt Completion Alerts</Label>
                        <p className="text-sm text-muted-foreground">Get notified when prompt runs complete</p>
                      </div>
                      <Switch
                        id="promptCompletionAlerts"
                        checked={notifications.promptCompletionAlerts}
                        onCheckedChange={(checked) => setNotifications({ ...notifications, promptCompletionAlerts: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Tracking Tab */}
              <TabsContent value="tracking" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Visibility Tracking Settings</CardTitle>
                    <CardDescription>Configure how your brand visibility is tracked across AI platforms</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="trackingEnabled">Enable Tracking</Label>
                        <p className="text-sm text-muted-foreground">Turn visibility tracking on or off</p>
                      </div>
                      <Switch
                        id="trackingEnabled"
                        checked={trackingSettings.trackingEnabled}
                        onCheckedChange={(checked) => setTrackingSettings({ ...trackingSettings, trackingEnabled: checked })}
                      />
                    </div>
                    <Separator />
                    <div className="space-y-2">
                      <Label htmlFor="promptFrequency">Prompt Run Frequency</Label>
                      <Select
                        value={trackingSettings.promptFrequency}
                        onValueChange={(value) => setTrackingSettings({ ...trackingSettings, promptFrequency: value })}
                      >
                        <SelectTrigger id="promptFrequency">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="hourly">Every Hour</SelectItem>
                          <SelectItem value="daily">Daily</SelectItem>
                          <SelectItem value="weekly">Weekly</SelectItem>
                          <SelectItem value="manual">Manual Only</SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-sm text-muted-foreground">How often should prompts be automatically executed</p>
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="autoScoring">Auto-Scoring</Label>
                        <p className="text-sm text-muted-foreground">Automatically calculate visibility scores after prompt runs</p>
                      </div>
                      <Switch
                        id="autoScoring"
                        checked={trackingSettings.autoScoring}
                        onCheckedChange={(checked) => setTrackingSettings({ ...trackingSettings, autoScoring: checked })}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>AI Platforms to Monitor</CardTitle>
                    <CardDescription>Select which AI platforms to track for brand visibility</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="perplexity">Perplexity AI</Label>
                        <p className="text-sm text-muted-foreground">Track visibility on Perplexity</p>
                      </div>
                      <Switch
                        id="perplexity"
                        checked={trackingSettings.platforms.perplexity}
                        onCheckedChange={(checked) => setTrackingSettings({
                          ...trackingSettings,
                          platforms: { ...trackingSettings.platforms, perplexity: checked }
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="chatgpt">ChatGPT</Label>
                        <p className="text-sm text-muted-foreground">Track visibility on ChatGPT</p>
                      </div>
                      <Switch
                        id="chatgpt"
                        checked={trackingSettings.platforms.chatgpt}
                        onCheckedChange={(checked) => setTrackingSettings({
                          ...trackingSettings,
                          platforms: { ...trackingSettings.platforms, chatgpt: checked }
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="gemini">Google Gemini</Label>
                        <p className="text-sm text-muted-foreground">Track visibility on Gemini</p>
                      </div>
                      <Switch
                        id="gemini"
                        checked={trackingSettings.platforms.gemini}
                        onCheckedChange={(checked) => setTrackingSettings({
                          ...trackingSettings,
                          platforms: { ...trackingSettings.platforms, gemini: checked }
                        })}
                      />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="claude">Claude</Label>
                        <p className="text-sm text-muted-foreground">Track visibility on Claude</p>
                      </div>
                      <Switch
                        id="claude"
                        checked={trackingSettings.platforms.claude}
                        onCheckedChange={(checked) => setTrackingSettings({
                          ...trackingSettings,
                          platforms: { ...trackingSettings.platforms, claude: checked }
                        })}
                      />
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Integrations Tab */}
              <TabsContent value="integrations" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Shopify Integration</CardTitle>
                    <CardDescription>Connect your Shopify store to automatically import products</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="font-medium mb-1">Shopify Store</h3>
                          <p className="text-sm text-muted-foreground">
                            {activeStore.website ? `Connected to ${activeStore.website}` : "Not connected"}
                          </p>
                        </div>
                        <Button variant="outline">
                          {activeStore.website ? "Reconnect" : "Connect Shopify"}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>API Access</CardTitle>
                    <CardDescription>Manage API keys for external integrations</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">API Key</h3>
                      <p className="text-sm text-muted-foreground mb-4">Use this key to access the GEO Dashboard API</p>
                      <div className="flex gap-2">
                        <Input value="••••••••••••••••" disabled className="font-mono" />
                        <Button variant="outline">Generate New</Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Privacy & Data Tab */}
              <TabsContent value="privacy" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Data Management</CardTitle>
                    <CardDescription>Export or delete your account data</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="space-y-4">
                      <div className="p-4 bg-muted/30 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <h3 className="font-medium mb-1">Export Your Data</h3>
                            <p className="text-sm text-muted-foreground">
                              Download a copy of all your data including products, prompts, and analytics
                            </p>
                          </div>
                          <Button variant="outline" onClick={handleExportData} disabled={loading} className="shrink-0 ml-4">
                            <Download className="w-4 h-4 mr-2" />
                            {loading ? "Exporting..." : "Export Data"}
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="p-4 border-destructive/50 border rounded-lg bg-destructive/5">
                        <h3 className="font-medium mb-1 text-destructive">Delete Account</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <Button variant="destructive" disabled>
                          Delete Account
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Privacy Settings</CardTitle>
                    <CardDescription>Control how your data is used</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Analytics Tracking</Label>
                        <p className="text-sm text-muted-foreground">Help us improve by sharing anonymous usage data</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
                    <Separator />
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label>Marketing Communications</Label>
                        <p className="text-sm text-muted-foreground">Receive product updates and tips</p>
                      </div>
                      <Switch defaultChecked />
                    </div>
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