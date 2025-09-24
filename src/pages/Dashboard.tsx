import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, TrendingUp, Globe, BarChart3, Plus, Settings, Store, Target, MessageCircle, Eye, Heart, MapPin, FileText, Database, Cpu, Filter, Package, ChevronDown } from "lucide-react";
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarProvider,
  SidebarTrigger,
  useSidebar,
} from "@/components/ui/sidebar";
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
  const [activeStore, setActiveStore] = useState<{ id: string; name: string; website: string; is_active: boolean } | null>(null);
  const [companyName, setCompanyName] = useState("BrandRefs");
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [brandExpanded, setBrandExpanded] = useState(true);
  const navigate = useNavigate();

  // Sidebar component
  const DashboardSidebar = () => {
    const { state } = useSidebar();

    const mainItems = [
      { title: "Overview", value: "overview", icon: BarChart3 },
      { title: "Prompts", value: "prompts", icon: MessageCircle },
      { title: "Settings", value: "settings", icon: Settings },
    ];

    const productItems = [
      { title: "Overview", value: "products-overview" },
      { title: "Metrics", value: "products-metrics" },
      { title: "AI Optimizations", value: "products-ai" },
    ];

    const brandItems = [
      { title: "Overview", value: "brand-overview" },
      { title: "Competitors", value: "brand-competitors" },
    ];

    const isProductsActive = activeTab.startsWith("products-");
    const isBrandActive = activeTab.startsWith("brand-");

    return (
      <Sidebar className={state === "collapsed" ? "w-14" : "w-60"} collapsible="icon">
        <SidebarContent>
          {/* Quick Actions Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Quick Actions</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton onClick={() => setShowAddStoreModal(true)}>
                    <Plus className="w-4 h-4" />
                    {state !== "collapsed" && <span>Add Store</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>

          {/* Main Pages Section */}
          <SidebarGroup>
            <SidebarGroupLabel>Pages</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Overview */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setActiveTab("overview")}
                    className={activeTab === "overview" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {state !== "collapsed" && <span>Overview</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Products Collapsible Section */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setProductsExpanded(!productsExpanded)}
                    className={`${isProductsActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"} justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <Package className="w-4 h-4" />
                      {state !== "collapsed" && <span>Products</span>}
                    </div>
                    {state !== "collapsed" && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${productsExpanded ? "rotate-0" : "-rotate-90"}`} />
                    )}
                  </SidebarMenuButton>

                  {/* Products Subsections */}
                  {productsExpanded && state !== "collapsed" && (
                    <div className="ml-6 mt-1">
                      {productItems.map((item) => (
                        <SidebarMenuButton 
                          key={item.value}
                          onClick={() => setActiveTab(item.value)}
                          className={`${activeTab === item.value ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"} w-full justify-start text-sm py-1 mb-1`}
                        >
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>

                {/* Brand Collapsible Section */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => setBrandExpanded(!brandExpanded)}
                    className={`${isBrandActive ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"} justify-between`}
                  >
                    <div className="flex items-center gap-2">
                      <Target className="w-4 h-4" />
                      {state !== "collapsed" && <span>Brand</span>}
                    </div>
                    {state !== "collapsed" && (
                      <ChevronDown className={`w-4 h-4 transition-transform ${brandExpanded ? "rotate-0" : "-rotate-90"}`} />
                    )}
                  </SidebarMenuButton>

                  {/* Brand Subsections */}
                  {brandExpanded && state !== "collapsed" && (
                    <div className="ml-6 mt-1">
                      {brandItems.map((item) => (
                        <SidebarMenuButton 
                          key={item.value}
                          onClick={() => setActiveTab(item.value)}
                          className={`${activeTab === item.value ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"} w-full justify-start text-sm py-1 mb-1`}
                        >
                          <span>{item.title}</span>
                        </SidebarMenuButton>
                      ))}
                    </div>
                  )}
                </SidebarMenuItem>

                {/* Other main items */}
                {mainItems.slice(1).map((item) => (
                  <SidebarMenuItem key={item.value}>
                    <SidebarMenuButton 
                      onClick={() => {
                        if (item.value === "settings") {
                          navigate("/settings");
                        } else {
                          setActiveTab(item.value);
                        }
                      }}
                      className={activeTab === item.value ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                    >
                      <item.icon className="w-4 h-4" />
                      {state !== "collapsed" && <span>{item.title}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

  // Load company profile data
  useEffect(() => {
    const loadProfile = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("user_id", session.user.id)
          .single();
        
        if (profileData?.company_name) {
          setCompanyName(profileData.company_name);
        }
      }
    };
    
    loadProfile();
  }, []);

  // Listen for profile updates
  useEffect(() => {
    const setupRealtimeSubscription = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const channel = supabase
        .channel('profile-changes')
        .on(
          'postgres_changes',
          {
            event: 'UPDATE',
            schema: 'public',
            table: 'profiles',
            filter: `user_id=eq.${session.user.id}`
          },
          (payload) => {
            console.log('Profile updated:', payload.new);
            if (payload.new.company_name) {
              setCompanyName(payload.new.company_name);
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, []);

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
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <DashboardSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="lg:hidden" />
                  <h1 className="text-2xl font-bold text-foreground">{companyName}'s Dashboard</h1>
                  <Badge variant="secondary" className="text-xs">
                    eCommerce Pro
                  </Badge>
                </div>
                
                {/* Header filters */}
                <div className="flex items-center gap-3">
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm">
                      <Filter className="w-4 h-4" />
                      Last 7 days
                    </Button>
                    <Button variant="outline" size="sm">
                      All tags
                    </Button>
                    <Button variant="outline" size="sm">
                      All Models
                    </Button>
                  </div>
                  
                  <StoreSelector onStoreChange={setActiveStore} onAddStore={() => setShowAddStoreModal(true)} />
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
              
              {/* Tab-specific summary */}
              {activeTab === "overview" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <BarChart3 className="w-4 h-4" />
                  Overview • {companyName}'s Visibility trending up by 5.2% this month
                </div>
              )}
              {activeTab === "products-overview" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Package className="w-4 h-4" />
                  Products • Manage your product catalog and AI visibility
                </div>
              )}
              {activeTab === "products-metrics" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="w-4 h-4" />
                  Metrics • Track product performance and AI impact
                </div>
              )}
              {activeTab === "products-competitors" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  Competitors • Compare your products with competitors
                </div>
              )}
              {activeTab === "products-ai" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Search className="w-4 h-4" />
                  AI Optimizations • Optimize products for better AI visibility
                </div>
              )}
              {activeTab === "brand-overview" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  Brand Overview • Track your brand's AI visibility performance
                </div>
              )}
              {activeTab === "brand-competitors" && (
                <div className="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
                  <Target className="w-4 h-4" />
                  Brand Competitors • Compare your brand with competitors
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-6 py-8">
            <div className="space-y-6">
              {/* Main tabs for different content */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Top metrics tabs */}
                  <Tabs defaultValue="visibility" className="space-y-6">
                    <TabsList className="grid w-fit grid-cols-3">
                      <TabsTrigger value="visibility" className="flex items-center gap-2">
                        <Eye className="w-4 h-4" />
                        Visibility
                      </TabsTrigger>
                      <TabsTrigger value="sentiment" className="flex items-center gap-2">
                        <Heart className="w-4 h-4" />
                        Sentiment
                      </TabsTrigger>
                      <TabsTrigger value="position" className="flex items-center gap-2">
                        <MapPin className="w-4 h-4" />
                        Position
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="visibility" className="space-y-6">
                      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                        {/* Main Chart Area */}
                        <div className="lg:col-span-2 space-y-6">
                          {/* Stats Overview */}
                          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                            <Card>
                              <CardHeader className="pb-3">
                                <CardTitle className="text-sm font-medium text-muted-foreground">
                                  Brand Visibility Score
                                </CardTitle>
                              </CardHeader>
                              <CardContent>
                                <div className="text-2xl font-bold text-primary">87</div>
                                <div className="flex items-center gap-1 text-xs text-green-600">
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

                          {/* Chart placeholder */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Visibility Trends</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                                <div className="text-center">
                                  <BarChart3 className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                                  <p className="text-muted-foreground">Chart visualization will go here</p>
                                </div>
                              </div>
                            </CardContent>
                          </Card>

                          {/* Domains table */}
                          <Card>
                            <CardHeader>
                              <CardTitle>Domains</CardTitle>
                            </CardHeader>
                            <CardContent>
                              <div className="space-y-4">
                                {[
                                  { domain: "reddit.com", type: "UGC", used: "32%", citations: "41%" },
                                  { domain: "techradar.com", type: "Editorial", used: "43%", citations: "46%" },
                                  { domain: "wikipedia.org", type: "Reference", used: "21%", citations: "40%" },
                                ].map((item, index) => (
                                  <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border">
                                    <div className="flex items-center gap-3">
                                      <span className="font-medium text-sm">{item.domain}</span>
                                      <Badge variant="secondary" className="text-xs">{item.type}</Badge>
                                    </div>
                                    <div className="flex gap-6 text-sm">
                                      <span>Used: {item.used}</span>
                                      <span>Avg. Citations: {item.citations}</span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        </div>

                        {/* Right Sidebar */}
                        <div className="space-y-6">
                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Target className="w-5 h-5" />
                                {companyName}'s competitors
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">Compare {companyName} with it's competitors</p>
                            </CardHeader>
                            <CardContent className="space-y-3">
                              {[
                                { name: "HubSpot", visibility: "65%", sentiment: "86", position: "2.7" },
                                { name: "Salesforce", visibility: "62%", sentiment: "62", position: "2.9" },
                                { name: companyName, visibility: "47%", sentiment: "89", position: "3.6" },
                                { name: "Pipedrive", visibility: "41%", sentiment: "76", position: "3.9" },
                              ].map((competitor, index) => (
                                <div key={index} className="flex items-center justify-between p-2 rounded">
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground text-sm">{index + 1}</span>
                                    <span className="font-medium text-sm">{competitor.name}</span>
                                  </div>
                                  <div className="flex gap-4 text-sm">
                                    <span>{competitor.visibility}</span>
                                    <span>{competitor.sentiment}</span>
                                    <span>{competitor.position}</span>
                                  </div>
                                </div>
                              ))}
                            </CardContent>
                          </Card>

                          <Card>
                            <CardHeader>
                              <CardTitle className="flex items-center gap-2 text-base">
                                <Globe className="w-5 h-5" />
                                Domains by Type
                              </CardTitle>
                              <p className="text-sm text-muted-foreground">Most used domains categorized by type</p>
                            </CardHeader>
                            <CardContent>
                              <div className="h-32 bg-muted/50 rounded-lg flex items-center justify-center">
                                <p className="text-muted-foreground text-sm">Chart visualization</p>
                              </div>
                            </CardContent>
                          </Card>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="sentiment">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <Heart className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Sentiment analysis will be displayed here</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                    
                    <TabsContent value="position">
                      <Card>
                        <CardContent className="pt-6">
                          <div className="text-center py-8">
                            <MapPin className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                            <p className="text-muted-foreground">Position tracking will be displayed here</p>
                          </div>
                        </CardContent>
                      </Card>
                    </TabsContent>
                  </Tabs>
                </div>
              )}

{activeTab === "products-overview" && (
                <MyProducts 
                  activeStore={activeStore} 
                  onProductClick={(productId) => navigate(`/product/${productId}`)}
                />
              )}

              {activeTab === "products-metrics" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Product Performance Metrics</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            AI Mentions
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-primary">234</div>
                          <div className="flex items-center gap-1 text-xs text-green-600">
                            <TrendingUp className="w-3 h-3" />
                            +18% from last week
                          </div>
                        </CardContent>
                      </Card>
                      
                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Conversion Rate
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground">3.2%</div>
                          <div className="text-xs text-muted-foreground">
                            From AI referrals
                          </div>
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader className="pb-3">
                          <CardTitle className="text-sm font-medium text-muted-foreground">
                            Revenue Impact
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="text-2xl font-bold text-foreground">$12.4K</div>
                          <div className="text-xs text-muted-foreground">
                            This month
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                    
                    <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                      <div className="text-center">
                        <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                        <p className="text-muted-foreground">Product metrics visualization will go here</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "products-competitors" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Competitor Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Competitor A", visibility: "78%", mentions: "342", avgPosition: "2.1" },
                        { name: "Competitor B", visibility: "65%", mentions: "287", avgPosition: "2.8" },
                        { name: "Your Products", visibility: "62%", mentions: "234", avgPosition: "3.2" },
                        { name: "Competitor C", visibility: "45%", mentions: "189", avgPosition: "4.1" },
                      ].map((competitor, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm">{index + 1}</span>
                            <span className="font-medium">{competitor.name}</span>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Visibility</div>
                              <div className="font-medium">{competitor.visibility}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Mentions</div>
                              <div className="font-medium">{competitor.mentions}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Avg Position</div>
                              <div className="font-medium">{competitor.avgPosition}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "products-ai" && (
                <Card>
                  <CardHeader>
                    <CardTitle>AI Optimization Recommendations</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        {
                          type: "High Priority",
                          title: "Optimize product descriptions for AI queries",
                          description: "Add specific keywords that AI models commonly search for",
                          impact: "Potential +25% visibility increase"
                        },
                        {
                          type: "Medium Priority",
                          title: "Improve product categorization",
                          description: "Better categorize products to match AI understanding",
                          impact: "Potential +15% visibility increase"
                        },
                        {
                          type: "Low Priority",
                          title: "Add structured data markup",
                          description: "Include schema markup for better AI comprehension",
                          impact: "Potential +8% visibility increase"
                        }
                      ].map((optimization, index) => (
                        <div key={index} className="p-4 rounded-lg border border-border">
                          <div className="flex items-center justify-between mb-2">
                            <Badge variant={optimization.type === "High Priority" ? "destructive" : optimization.type === "Medium Priority" ? "default" : "secondary"}>
                              {optimization.type}
                            </Badge>
                            <span className="text-sm text-green-600">{optimization.impact}</span>
                          </div>
                          <h4 className="font-medium mb-1">{optimization.title}</h4>
                          <p className="text-sm text-muted-foreground">{optimization.description}</p>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "brand-overview" && (
                <div className="space-y-6">
                  {/* Brand AI Visibility Stats */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Brand Mention Rate
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-primary">73%</div>
                        <div className="flex items-center gap-1 text-xs text-green-600">
                          <TrendingUp className="w-3 h-3" />
                          +8% from last month
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Average Position
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">2.4</div>
                        <div className="text-xs text-muted-foreground">
                          In AI recommendations
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm font-medium text-muted-foreground">
                          Sentiment Score
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="text-2xl font-bold text-foreground">8.6/10</div>
                        <div className="text-xs text-green-600">
                          Positive sentiment
                        </div>
                      </CardContent>
                    </Card>
                  </div>

                  {/* Brand Visibility Chart */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Brand AI Visibility Trends</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="h-64 bg-muted/50 rounded-lg flex items-center justify-center">
                        <div className="text-center">
                          <TrendingUp className="w-12 h-12 mx-auto text-muted-foreground mb-2" />
                          <p className="text-muted-foreground">Brand visibility chart will go here</p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Recent Brand Mentions */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Recent Brand Mentions</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-4">
                        {[
                          {
                            platform: "ChatGPT",
                            query: "best ecommerce tools for small business",
                            position: 2,
                            sentiment: "Positive",
                            date: "2 hours ago"
                          },
                          {
                            platform: "Claude",
                            query: "reliable online store solutions",
                            position: 1,
                            sentiment: "Very Positive", 
                            date: "5 hours ago"
                          },
                          {
                            platform: "Gemini",
                            query: "ecommerce platform comparison",
                            position: 3,
                            sentiment: "Neutral",
                            date: "1 day ago"
                          }
                        ].map((mention, index) => (
                          <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <Badge variant="outline">{mention.platform}</Badge>
                                <span className="text-sm text-muted-foreground">Position #{mention.position}</span>
                              </div>
                              <p className="text-sm font-medium mb-1">{mention.query}</p>
                              <div className="flex items-center gap-4 text-xs text-muted-foreground">
                                <span>Sentiment: <span className={mention.sentiment === "Very Positive" || mention.sentiment === "Positive" ? "text-green-600" : "text-muted-foreground"}>{mention.sentiment}</span></span>
                                <span>{mention.date}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              )}

              {activeTab === "brand-competitors" && (
                <Card>
                  <CardHeader>
                    <CardTitle>Brand Competitor Analysis</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {[
                        { name: "Your Brand", visibility: "73%", avgPosition: "2.4", sentiment: "8.6", mentions: "342" },
                        { name: "Competitor Alpha", visibility: "81%", avgPosition: "1.8", sentiment: "8.2", mentions: "456" },
                        { name: "Competitor Beta", visibility: "68%", avgPosition: "2.9", sentiment: "7.8", mentions: "298" },
                        { name: "Competitor Gamma", visibility: "52%", avgPosition: "3.5", sentiment: "7.2", mentions: "201" },
                      ].map((competitor, index) => (
                        <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                          <div className="flex items-center gap-3">
                            <span className="text-muted-foreground text-sm">{index + 1}</span>
                            <span className={`font-medium ${competitor.name === "Your Brand" ? "text-primary" : ""}`}>
                              {competitor.name}
                            </span>
                          </div>
                          <div className="flex gap-6 text-sm">
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Visibility</div>
                              <div className="font-medium">{competitor.visibility}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Avg Position</div>
                              <div className="font-medium">{competitor.avgPosition}</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Sentiment</div>
                              <div className="font-medium">{competitor.sentiment}/10</div>
                            </div>
                            <div className="text-center">
                              <div className="text-muted-foreground text-xs">Mentions</div>
                              <div className="font-medium">{competitor.mentions}</div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeTab === "prompts" && (
                <PromptsTab activeStore={activeStore} />
              )}

            </div>
          </main>
        </div>
      </div>

      <AddStoreModal 
        open={showAddStoreModal} 
        onOpenChange={setShowAddStoreModal}
        onStoreAdded={(newStore) => {
          setActiveStore(newStore);
          toast({
            title: "Success",
            description: `Switched to ${newStore.name}. Loading store data...`,
          });
          setTimeout(() => {
            window.location.reload();
          }, 500);
        }}
      />
    </SidebarProvider>
  );
};

export default Dashboard;