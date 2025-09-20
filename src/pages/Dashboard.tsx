import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Globe, BarChart3, Plus, Settings, Store, Target, MessageCircle } from "lucide-react";
import BrandMentions from "@/components/BrandMentions";
import { PromptsTab } from "@/components/PromptsTab";
import MyProducts from "@/components/MyProducts";
import AddStoreModal from "@/components/AddStoreModal";
import StoreSelector from "@/components/StoreSelector";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

const Dashboard = () => {
  const [activeTab, setActiveTab] = useState("overview");
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [refreshStores, setRefreshStores] = useState(0);
  const [activeStore, setActiveStore] = useState<{ id: string; name: string; website: string; is_active: boolean } | null>(null);
  const navigate = useNavigate();

  // Protect route: redirect unauthenticated users and ensure onboarding complete
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      // Defer profile check to avoid deadlocks
      setTimeout(async () => {
        const { data, error } = await supabase
          .from("stores")
          .select("id")
          .eq("user_id", session.user.id)
          .limit(1);
        if (error || !data || data.length === 0) {
          navigate("/onboarding", { replace: true });
        }
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      const { data, error } = await supabase
        .from("stores")
        .select("id")
        .eq("user_id", session.user.id)
        .limit(1);
      if (error || !data || data.length === 0) {
        navigate("/onboarding", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  const handleLogout = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast({ title: "Logout failed", description: error.message });
    } else {
      toast({ title: "Signed out" });
      navigate("/", { replace: true });
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">BrandRefs</h1>
              <Badge variant="secondary" className="text-xs">
                eCommerce Pro
              </Badge>
            </div>
            <div className="flex items-center gap-3">
              <StoreSelector onStoreChange={setActiveStore} onAddStore={() => setShowAddStoreModal(true)} />
              <Button variant="outline" size="sm">
                <Settings className="w-4 h-4" />
                Settings
              </Button>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="w-4 h-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="my-products" className="flex items-center gap-2">
              <Store className="w-4 h-4" />
              My Products
            </TabsTrigger>
            <TabsTrigger value="prompts" className="flex items-center gap-2">
              <MessageCircle className="w-4 h-4" />
              My Prompts
            </TabsTrigger>
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              {/* Stats Overview */}
              <div className="lg:col-span-2 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Brand Visibility Score
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-primary">87</div>
                      <div className="flex items-center gap-1 text-xs text-success">
                        <TrendingUp className="w-3 h-3" />
                        +12% from last month
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Product Mentions
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">156</div>
                      <div className="text-xs text-muted-foreground">
                        Across 3 AI platforms
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm font-medium text-muted-foreground">
                        Store Traffic
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="text-2xl font-bold text-foreground">2.4K</div>
                      <div className="text-xs text-muted-foreground">
                        From AI referrals
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* Recent Activity */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Store className="w-5 h-5" />
                      Recent Product Queries
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {[
                      {
                        query: "best wireless headphones under $200",
                        platform: "ChatGPT",
                        mentioned: true,
                        time: "2 hours ago"
                      },
                      {
                        query: "top bluetooth speakers 2024",
                        platform: "Perplexity",
                        mentioned: false,
                        time: "4 hours ago"
                      },
                      {
                        query: "gaming accessories for PC setup",
                        platform: "Gemini",
                        mentioned: true,
                        time: "6 hours ago"
                      }
                    ].map((search, index) => (
                      <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                        <div className="flex-1">
                          <div className="font-medium text-sm text-foreground">
                            "{search.query}"
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {search.platform} • {search.time}
                          </div>
                        </div>
                        <Badge variant={search.mentioned ? "default" : "secondary"} className="text-xs">
                          {search.mentioned ? "Product Mentioned" : "Not mentioned"}
                        </Badge>
                      </div>
                    ))}
                  </CardContent>
                </Card>
              </div>

              {/* Sidebar */}
              <div className="space-y-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Globe className="w-5 h-5" />
                      AI Platform Performance
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    {[
                      { name: "ChatGPT", coverage: 92, color: "bg-green-500" },
                      { name: "Perplexity", coverage: 68, color: "bg-orange-500" },
                      { name: "Gemini", coverage: 76, color: "bg-purple-500" }
                    ].map((platform, index) => (
                      <div key={index} className="space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-foreground">{platform.name}</span>
                          <span className="text-muted-foreground">{platform.coverage}%</span>
                        </div>
                        <div className="w-full bg-muted rounded-full h-2">
                          <div 
                            className={`${platform.color} h-2 rounded-full transition-all duration-300`}
                            style={{ width: `${platform.coverage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Store className="w-5 h-5" />
                      eCommerce Actions
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button variant="outline" className="w-full justify-start">
                      <Search className="w-4 h-4" />
                      Track Keywords
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <TrendingUp className="w-4 h-4" />
                      View Reports
                    </Button>
                    <Button variant="outline" className="w-full justify-start">
                      <Target className="w-4 h-4" />
                      Monitor Competitors
                    </Button>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="my-products">
            <MyProducts activeStore={activeStore} />
          </TabsContent>

          <TabsContent value="prompts">
            <PromptsTab activeStore={activeStore} />
          </TabsContent>
        </Tabs>
      </main>

      <AddStoreModal 
        open={showAddStoreModal} 
        onOpenChange={setShowAddStoreModal}
        onStoreAdded={() => {
          setRefreshStores(prev => prev + 1);
          // Refresh the page to reload all data with the new store
          window.location.reload();
        }}
      />
    </div>
  );
};

export default Dashboard;