import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageCircle, Settings, Package, Target, Plus, ChevronDown } from "lucide-react";
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
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import StoreSelector from "@/components/StoreSelector";
import AddStoreModal from "@/components/AddStoreModal";

const AppLayout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("tab") || "overview";
  });
  const [showAddStoreModal, setShowAddStoreModal] = useState(false);
  const [activeStore, setActiveStore] = useState<{ id: string; name: string; website: string; is_active: boolean } | null>(null);
  const [companyName, setCompanyName] = useState("BrandRefs");
  const [products, setProducts] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [productsExpanded, setProductsExpanded] = useState(false);
  const [promptsExpanded, setPromptsExpanded] = useState(false);

  useEffect(() => {
    if (location.pathname === "/dashboard") {
      const urlParams = new URLSearchParams(location.search);
      setActiveTab(urlParams.get("tab") || "overview");
    }
  }, [location]);

  // Load company profile data and set up store subscription
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

  // Load products and prompts for sidebar
  useEffect(() => {
    const loadData = async () => {
      if (!activeStore) return;

      // Load products
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title, handle")
        .eq("store_id", activeStore.id)
        .order("title");
      
      if (productsData) setProducts(productsData);

      // Load prompts - only show user-entered prompts (not suggested ones)
      const { data: promptsData } = await supabase
        .from("prompts")
        .select("id, content, product_id, brand_name, status")
        .eq("store_id", activeStore.id)
        .eq("active", true)
        .neq("status", "suggested")
        .order("created_at", { ascending: false });
      
      if (promptsData) setPrompts(promptsData);
    };

    loadData();
  }, [activeStore]);

  const AppSidebar = () => {
    const { state } = useSidebar();

    const handleTabChange = (tabValue: string) => {
      setActiveTab(tabValue);
      if (tabValue === "settings") {
        navigate("/settings");
      } else {
        navigate(`/dashboard?tab=${tabValue}`);
      }
    };

    const handleProductClick = (productId: string) => {
      navigate(`/product/${productId}`);
    };

    const handlePromptClick = (promptId: string) => {
      navigate(`/prompt/${promptId}`);
    };

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
                    onClick={() => handleTabChange("overview")}
                    className={activeTab === "overview" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <BarChart3 className="w-4 h-4" />
                    {state !== "collapsed" && <span>Overview</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Products - Collapsible */}
                <Collapsible open={productsExpanded} onOpenChange={setProductsExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        onClick={() => {
                          handleTabChange("products-overview");
                          setProductsExpanded(!productsExpanded);
                        }}
                        className={activeTab === "products-overview" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                      >
                        <Package className="w-4 h-4" />
                        {state !== "collapsed" && (
                          <>
                            <span>Products</span>
                            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${productsExpanded ? "rotate-180" : ""}`} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {state !== "collapsed" && products.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {products.slice(0, 10).map((product) => (
                            <SidebarMenuButton
                              key={product.id}
                              className="w-full justify-start text-sm hover:bg-muted/50"
                              onClick={() => handleProductClick(product.id)}
                            >
                              {product.title}
                            </SidebarMenuButton>
                          ))}
                          {products.length > 10 && (
                            <div className="text-xs text-muted-foreground px-2">
                              +{products.length - 10} more
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Brand */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => handleTabChange("brand-overview")}
                    className={activeTab === "brand-overview" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <Target className="w-4 h-4" />
                    {state !== "collapsed" && <span>Brand</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Prompts - Collapsible */}
                <Collapsible open={promptsExpanded} onOpenChange={setPromptsExpanded}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton 
                        onClick={() => {
                          handleTabChange("prompts");
                          setPromptsExpanded(!promptsExpanded);
                        }}
                        className={activeTab === "prompts" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                      >
                        <MessageCircle className="w-4 h-4" />
                        {state !== "collapsed" && (
                          <>
                            <span>Prompts</span>
                            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${promptsExpanded ? "rotate-180" : ""}`} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    <CollapsibleContent>
                      {state !== "collapsed" && prompts.length > 0 && (
                        <div className="ml-6 mt-1 space-y-1">
                          {prompts.slice(0, 10).map((prompt) => (
                            <SidebarMenuButton
                              key={prompt.id}
                              className="w-full justify-start text-sm hover:bg-muted/50"
                              onClick={() => handlePromptClick(prompt.id)}
                            >
                              {prompt.content.slice(0, 30)}...
                            </SidebarMenuButton>
                          ))}
                          {prompts.length > 10 && (
                            <div className="text-xs text-muted-foreground px-2">
                              +{prompts.length - 10} more
                            </div>
                          )}
                        </div>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Settings */}
                <SidebarMenuItem>
                  <SidebarMenuButton 
                    onClick={() => handleTabChange("settings")}
                    className={activeTab === "settings" ? "bg-muted text-primary font-medium" : "hover:bg-muted/50"}
                  >
                    <Settings className="w-4 h-4" />
                    {state !== "collapsed" && <span>Settings</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>
      </Sidebar>
    );
  };

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
        <AppSidebar />
        
        <div className="flex-1 flex flex-col">
          {/* Header */}
          <header className="border-b border-border bg-card">
            <div className="px-6 py-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <SidebarTrigger className="lg:hidden" />
                  <h1 className="text-2xl font-bold text-foreground">{activeStore?.name || companyName}'s Dashboard</h1>
                  <Badge variant="secondary" className="text-xs">
                    eCommerce Pro
                  </Badge>
                </div>
                
                {/* Header filters and store selector */}
                <div className="flex items-center gap-3">
                  <StoreSelector onStoreChange={setActiveStore} onAddStore={() => setShowAddStoreModal(true)} />
                  <Button variant="outline" size="sm" onClick={handleLogout}>
                    Logout
                  </Button>
                </div>
              </div>
              
              {/* Tab-specific summary - only show on dashboard */}
              {location.pathname === "/dashboard" && (
                <div className="mt-4">
                  {activeTab === "overview" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <BarChart3 className="w-4 h-4" />
                      Overview • {activeStore?.name || companyName}'s Visibility trending up by 5.2% this month
                    </div>
                  )}
                  {activeTab === "products-overview" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Package className="w-4 h-4" />
                      Products • Manage your product catalog and AI visibility
                    </div>
                  )}
                  {activeTab === "brand-overview" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="w-4 h-4" />
                      Brand Overview • Track your brand's AI visibility performance
                    </div>
                  )}
                  {activeTab === "brand-competitors" && (
                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Target className="w-4 h-4" />
                      Brand Competitors • Compare your brand with competitors
                    </div>
                  )}
                </div>
              )}
            </div>
          </header>

          {/* Main Content */}
          <main className="flex-1 px-6 py-8">
            <Outlet context={{ activeStore, setActiveStore }} />
          </main>
        </div>
      </div>

      {/* Modals */}
      <AddStoreModal 
        open={showAddStoreModal}
        onOpenChange={setShowAddStoreModal}
        onStoreAdded={(newStore) => {
          setActiveStore(newStore);
          // Force a page reload to refresh all data with the new active store
          window.location.reload();
        }}
      />
    </SidebarProvider>
  );
};

export default AppLayout;
