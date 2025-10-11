import React, { useState, useEffect } from "react";
import { useNavigate, useLocation, Outlet } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  BarChart3,
  MessageCircle,
  Settings,
  Package,
  Target,
  Plus,
  ChevronDown,
  FileText,
} from "lucide-react";
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
  const [activeStore, setActiveStore] = useState<{
    id: string;
    name: string;
    website: string;
    is_active: boolean;
  } | null>(null);
  const [companyName, setCompanyName] = useState("BrandRefs");
  const [products, setProducts] = useState<any[]>([]);
  const [prompts, setPrompts] = useState<any[]>([]);
  const [productsExpanded, setProductsExpanded] = useState(true);
  const [promptsExpanded, setPromptsExpanded] = useState(true);

  // Load company info
  useEffect(() => {
    const loadProfile = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (session) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("company_name")
          .eq("user_id", session.user.id)
          .single();
        if (profileData?.company_name) setCompanyName(profileData.company_name);
      }
    };
    loadProfile();
  }, []);

  // Realtime profile updates
  useEffect(() => {
    const setupRealtime = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session) return;
      const channel = supabase
        .channel("profile-changes")
        .on(
          "postgres_changes",
          {
            event: "UPDATE",
            schema: "public",
            table: "profiles",
            filter: `user_id=eq.${session.user.id}`,
          },
          (payload) => {
            if (payload.new.company_name) {
              setCompanyName(payload.new.company_name);
            }
          }
        )
        .subscribe();
      return () => supabase.removeChannel(channel);
    };
    setupRealtime();
  }, []);

  // Load data (products + prompts)
  useEffect(() => {
    if (!activeStore) return;

    const loadData = async () => {
      const { data: productsData } = await supabase
        .from("products")
        .select("id, title")
        .eq("store_id", activeStore.id)
        .order("title");

      if (productsData) setProducts(productsData);

      const { data: promptsData } = await supabase
        .from("user_generated_prompts")
        .select("id, content, product_id, brand_name, status")
        .eq("store_id", activeStore.id)
        .eq("active", true)
        .neq("status", "suggested")
        .order("created_at", { ascending: false });

      if (promptsData) setPrompts(promptsData);
    };

    loadData();

    // realtime updates
    const subs = [
      supabase
        .channel("products-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "products",
            filter: `store_id=eq.${activeStore.id}`,
          },
          () => loadData()
        )
        .subscribe(),
      supabase
        .channel("prompts-updates")
        .on(
          "postgres_changes",
          {
            event: "*",
            schema: "public",
            table: "user_generated_prompts",
            filter: `store_id=eq.${activeStore.id}`,
          },
          () => loadData()
        )
        .subscribe(),
    ];

    return () => subs.forEach((ch) => supabase.removeChannel(ch));
  }, [activeStore]);

  const AppSidebar = () => {
    const { state } = useSidebar();
    const handleTabChange = (tab: string) => {
      setActiveTab(tab);
      navigate(tab === "settings" ? "/settings" : `/dashboard?tab=${tab}`);
    };
    const handleProductClick = (id: string) => navigate(`/product/${id}`);
    const handlePromptClick = (id: string) => navigate(`/prompt/${id}`);

    // Detect active prompt
    const promptMatch = location.pathname.match(/^\/prompt\/(.+)$/);
    const activePromptId = promptMatch ? promptMatch[1] : null;

    return (
      <Sidebar
        className={state === "collapsed" ? "w-14" : "w-[264px]"}
        collapsible="icon"
      >
        <SidebarContent>
          {/* Quick Actions */}
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

          {/* Pages */}
          <SidebarGroup>
            <SidebarGroupLabel>Pages</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {/* Overview */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleTabChange("overview")}
                    className={
                      activeTab === "overview"
                        ? "bg-muted text-primary font-medium"
                        : "hover:bg-muted/50"
                    }
                  >
                    <BarChart3 className="w-4 h-4" />
                    {state !== "collapsed" && <span>Overview</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Products */}
                <Collapsible
                  open={
                    productsExpanded || location.pathname.startsWith("/product/")
                  }
                  onOpenChange={setProductsExpanded}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("products-overview")}
                      className={
                        activeTab === "products-overview"
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted/50"
                      }
                    >
                      <Package className="w-4 h-4" />
                      {state !== "collapsed" && (
                        <>
                          <span>Products</span>
                          <ChevronDown
                            onClick={(e) => {
                              e.stopPropagation();
                              setProductsExpanded(!productsExpanded);
                            }}
                            className={`ml-auto h-4 w-4 cursor-pointer transition-transform ${
                              productsExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                    <CollapsibleContent>
                      {state !== "collapsed" && products.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1 pl-2 border-l border-border/50">
                          {products.map((product) => {
                            const productMatch =
                              location.pathname.match(/^\/product\/(.+)$/);
                            const activeProductId = productMatch
                              ? productMatch[1]
                              : null;
                            const isActive = activeProductId === product.id;
                            return (
                              <SidebarMenuButton
                                key={product.id}
                                onClick={() => handleProductClick(product.id)}
                                 className={`w-full justify-start text-sm ${
                                  isActive
                                    ? "bg-muted text-primary font-medium"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <span className="truncate block" title={product.title}>
                                  {product.title}
                                </span>
                              </SidebarMenuButton>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Brand */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleTabChange("brand-overview")}
                    className={
                      activeTab === "brand-overview"
                        ? "bg-muted text-primary font-medium"
                        : "hover:bg-muted/50"
                    }
                  >
                    <Target className="w-4 h-4" />
                    {state !== "collapsed" && <span>Brand</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Prompts */}
                <Collapsible
                  open={
                    promptsExpanded || location.pathname.startsWith("/prompt/")
                  }
                  onOpenChange={setPromptsExpanded}
                >
                  <SidebarMenuItem>
                    <SidebarMenuButton
                      onClick={() => handleTabChange("prompts")}
                      className={`${
                        activeTab === "prompts"
                          ? "bg-muted text-primary font-medium"
                          : "hover:bg-muted/50"
                      }`}
                    >
                      <MessageCircle className="w-4 h-4" />
                      {state !== "collapsed" && (
                        <>
                          <span>Prompts</span>
                          <ChevronDown
                            onClick={(e) => {
                              e.stopPropagation();
                              setPromptsExpanded(!promptsExpanded);
                            }}
                            className={`ml-auto h-4 w-4 cursor-pointer transition-transform ${
                              promptsExpanded ? "rotate-180" : ""
                            }`}
                          />
                        </>
                      )}
                    </SidebarMenuButton>
                    <CollapsibleContent>
                      {state !== "collapsed" && prompts.length > 0 && (
                        <div className="ml-8 mt-1 space-y-1 pl-2 border-l border-border/50">
                          {prompts.map((prompt) => {
                            const isActive = activePromptId === prompt.id;
                            return (
                              <SidebarMenuButton
                                key={prompt.id}
                                onClick={() => handlePromptClick(prompt.id)}
                                 className={`w-full justify-start text-sm ${
                                  isActive
                                    ? "bg-muted text-primary font-medium"
                                    : "hover:bg-muted/50"
                                }`}
                              >
                                <span
                                  title={prompt.content}
                                  className="truncate block"
                                >
                                  {prompt.content}
                                </span>
                              </SidebarMenuButton>
                            );
                          })}
                        </div>
                      )}
                    </CollapsibleContent>
                  </SidebarMenuItem>
                </Collapsible>

                {/* Settings */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => handleTabChange("settings")}
                    className={
                      activeTab === "settings"
                        ? "bg-muted text-primary font-medium"
                        : "hover:bg-muted/50"
                    }
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
    if (error)
      toast({ title: "Logout failed", description: error.message });
    else {
      toast({ title: "Signed out" });
      navigate("/", { replace: true });
    }
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen bg-background flex w-full">
        <AppSidebar />
        <div className="flex-1 min-w-0 flex flex-col">
          <header className="border-b border-border bg-card">
            <div className="px-6 py-4 flex justify-between items-center">
              <div className="flex items-center gap-4 min-w-0">
                <SidebarTrigger className="lg:hidden" />
                <h1 className="text-2xl font-bold truncate">
                  {activeStore?.name || companyName}'s Dashboard
                </h1>
                <Badge variant="secondary" className="text-xs">
                  eCommerce Pro
                </Badge>
              </div>
              <div className="flex items-center gap-3">
                <StoreSelector
                  onStoreChange={setActiveStore}
                  onAddStore={() => setShowAddStoreModal(true)}
                />
                <Button variant="outline" size="sm" onClick={handleLogout}>
                  Logout
                </Button>
              </div>
            </div>
          </header>

          <main className="flex-1 px-6 py-8">
            <Outlet context={{ activeStore, setActiveStore }} />
          </main>
        </div>
      </div>

      <AddStoreModal
        open={showAddStoreModal}
        onOpenChange={setShowAddStoreModal}
        onStoreAdded={(store) => {
          setActiveStore(store);
          window.location.reload();
        }}
      />
    </SidebarProvider>
  );
};

export default AppLayout;
