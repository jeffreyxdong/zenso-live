import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { BarChart3, MessageCircle, Settings, Package, Target, Plus } from "lucide-react";
import { ProductSidebarList } from "@/components/ProductSidebarList";
import { PromptSidebarList } from "@/components/PromptSidebarList";
import { PromptViewModal } from "@/components/PromptViewModal";
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
  const [selectedProductId, setSelectedProductId] = useState<string | undefined>();
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);
  const [showPromptModal, setShowPromptModal] = useState(false);

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

  const handleProductSelect = (productId: string) => {
    setSelectedProductId(productId);
    navigate(`/product/${productId}`);
  };

  const handlePromptSelect = (prompt: any) => {
    setSelectedPrompt(prompt);
    setShowPromptModal(true);
  };

  const AppSidebar = () => {
    const { state } = useSidebar();

    const mainItems = [
      { title: "Overview", value: "overview", icon: BarChart3 },
      { title: "Products", value: "products-overview", icon: Package },
      { title: "Brand", value: "brand-overview", icon: Target },
      { title: "Prompts", value: "prompts", icon: MessageCircle },
      { title: "Settings", value: "settings", icon: Settings },
    ];

    const handleTabChange = (tabValue: string) => {
      setActiveTab(tabValue);
      setSelectedProductId(undefined);
      setSelectedPrompt(null);
      if (tabValue === "settings") {
        navigate("/settings");
      } else {
        navigate(`/dashboard?tab=${tabValue}`);
      }
    };

    // Check if we should show the item list
    const showProductList = activeTab === "products-overview" && activeStore?.id && state !== "collapsed";
    const showPromptList = activeTab === "prompts" && activeStore?.id && state !== "collapsed";
    const showNavigation = !showProductList && !showPromptList;

    return (
      <Sidebar className={state === "collapsed" ? "w-14" : "w-64"} collapsible="icon">
        <SidebarContent>
          {showNavigation && (
            <>
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
                    {mainItems.map((item) => (
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
            </>
          )}

          {showProductList && (
            <ProductSidebarList
              storeId={activeStore.id}
              selectedProductId={selectedProductId}
              onProductSelect={handleProductSelect}
            />
          )}

          {showPromptList && (
            <PromptSidebarList
              storeId={activeStore.id}
              selectedPromptId={selectedPrompt?.id}
              onPromptSelect={handlePromptSelect}
            />
          )}
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

      {selectedPrompt && (
        <PromptViewModal
          isOpen={showPromptModal}
          onClose={() => {
            setShowPromptModal(false);
            setSelectedPrompt(null);
          }}
          prompt={selectedPrompt}
        />
      )}
    </SidebarProvider>
  );
};

export default AppLayout;
