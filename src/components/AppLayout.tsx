import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageCircle, Settings, Package, Target, ChevronDown, Plus, Filter } from "lucide-react";
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
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [brandExpanded, setBrandExpanded] = useState(true);

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

  const AppSidebar = () => {
    const { state } = useSidebar();

    const mainItems = [
      { title: "Overview", value: "overview", icon: BarChart3 },
      { title: "Prompts", value: "prompts", icon: MessageCircle },
      { title: "Settings", value: "settings", icon: Settings },
    ];

    const productItems = [
      { title: "Overview", value: "products-overview" },
    ];

    const brandItems = [
      { title: "Overview", value: "brand-overview" },
      { title: "Competitors", value: "brand-competitors" },
    ];

    const isProductsActive = activeTab.startsWith("products-") || location.pathname.startsWith("/product");
    const isBrandActive = activeTab.startsWith("brand-");

    const handleTabChange = (tabValue: string) => {
      setActiveTab(tabValue);
      if (tabValue === "settings") {
        navigate("/settings");
      } else {
        navigate(`/dashboard?tab=${tabValue}`);
      }
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
                          onClick={() => handleTabChange(item.value)}
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
                          onClick={() => handleTabChange(item.value)}
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
                      onClick={() => handleTabChange(item.value)}
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
                  <h1 className="text-2xl font-bold text-foreground">{companyName}'s Dashboard</h1>
                  <Badge variant="secondary" className="text-xs">
                    eCommerce Pro
                  </Badge>
                </div>
                
                {/* Header filters and store selector */}
                <div className="flex items-center gap-3">
                  {location.pathname === "/dashboard" && (
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
                  )}
                  
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
                      Overview • {companyName}'s Visibility trending up by 5.2% this month
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
