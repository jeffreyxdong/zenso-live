import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { ArrowLeft, User, Store, CreditCard, Bell, Shield, Download, Trash2 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";

const Settings = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("account");
  const [loading, setLoading] = useState(false);
  
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
    emailAlerts: true
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

      // Combine all data into a single array with type labels
      const combinedData = [
        ...(profileData.data || []).map(item => ({ ...item, data_type: 'profile' })),
        ...(storesData.data || []).map(item => ({ ...item, data_type: 'store' })),
        ...(productsData.data || []).map(item => ({ ...item, data_type: 'product' })),
        ...(promptsData.data || []).map(item => ({ ...item, data_type: 'prompt' }))
      ];

      // Convert to CSV
      const csv = Papa.unparse(combinedData);
      const csvBlob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(csvBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `geo-dashboard-export-${new Date().toISOString().split('T')[0]}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        title: "Data exported",
        description: "Your data has been downloaded as CSV successfully."
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

  const handleDeleteAccount = async () => {
    setLoading(true);
    try {
      // Call the database function to delete the account and all associated data
      const { error: deleteError } = await supabase.rpc('delete_user_account');

      if (deleteError) throw deleteError;

      toast({
        title: "Account deleted",
        description: "Your account and all data has been permanently deleted."
      });

      // Sign out (user is already deleted from auth)
      await supabase.auth.signOut();
      navigate("/", { replace: true });
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to delete account.",
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
              </TabsContent>

              {/* Notifications Tab */}
              <TabsContent value="notifications" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Email Notifications</CardTitle>
                    <CardDescription>Choose what updates you want to receive via email</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="space-y-0.5">
                        <Label htmlFor="emailAlerts">Email Alerts</Label>
                        <p className="text-sm text-muted-foreground">Receive important alerts about your account</p>
                      </div>
                      <Switch
                        id="emailAlerts"
                        checked={notifications.emailAlerts}
                        onCheckedChange={(checked) => setNotifications({ emailAlerts: checked })}
                      />
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
                              Download a CSV file with all your data including products, prompts, and analytics
                            </p>
                          </div>
                          <Button variant="outline" onClick={handleExportData} disabled={loading} className="shrink-0 ml-4">
                            <Download className="w-4 h-4 mr-2" />
                            {loading ? "Exporting..." : "Export CSV"}
                          </Button>
                        </div>
                      </div>
                      <Separator />
                      <div className="p-4 border-destructive/50 border rounded-lg bg-destructive/5">
                        <h3 className="font-medium mb-1 text-destructive">Delete Account</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Permanently delete your account and all associated data. This action cannot be undone.
                        </p>
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" disabled={loading}>
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Account
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                              <AlertDialogDescription>
                                This action cannot be undone. This will permanently delete your account and remove all your data from our servers, including:
                                <ul className="list-disc list-inside mt-2 space-y-1">
                                  <li>All products and product data</li>
                                  <li>All prompts and tracking history</li>
                                  <li>All stores and store configurations</li>
                                  <li>Your profile and account information</li>
                                  <li>All analytics and visibility scores</li>
                                </ul>
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancel</AlertDialogCancel>
                              <AlertDialogAction onClick={handleDeleteAccount} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                Delete Account
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Billing Tab */}
              <TabsContent value="billing" className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Subscription</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="p-4 bg-muted/30 rounded-lg">
                      <h3 className="font-medium mb-2">Current Plan</h3>
                      <p className="text-muted-foreground mb-4">eCommerce Pro - Active</p>
                      <Button variant="outline" onClick={() => window.location.href = "/pricing"}>Manage Subscription</Button>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Payment Method</CardTitle>
                    <CardDescription>Add or update your payment information</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="cardNumber">Card Number</Label>
                      <Input
                        id="cardNumber"
                        placeholder="1234 5678 9012 3456"
                        maxLength={19}
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="expiry">Expiry Date</Label>
                        <Input
                          id="expiry"
                          placeholder="MM/YY"
                          maxLength={5}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="cvc">CVC</Label>
                        <Input
                          id="cvc"
                          placeholder="123"
                          maxLength={3}
                        />
                      </div>
                    </div>
                    <Button>Save Payment Method</Button>
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