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
