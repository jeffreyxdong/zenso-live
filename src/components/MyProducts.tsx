import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Store, Package, Download, Plus, Search, CheckCircle, AlertCircle, Image } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";

interface Product {
  id: string;
  shopify_id: string;
  title: string;
  handle: string;
  status: string;
  product_type?: string;
  vendor?: string;
  tags?: string[];
  images?: any;
  created_at: string;
  variants?: ProductVariant[];
}

interface ProductVariant {
  id: string;
  shopify_variant_id: string;
  title: string;
  sku?: string;
  price: number;
  compare_at_price?: number;
  inventory_quantity: number;
}

const productSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().optional(),
  product_type: z.string().optional(),
  vendor: z.string().optional(),
  status: z.enum(["active", "draft", "archived"]),
  price: z.number().min(0, "Price must be positive"),
  compare_at_price: z.number().optional(),
  sku: z.string().optional(),
  inventory_quantity: z.number().int().min(0, "Inventory must be non-negative"),
  tags: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

// ...imports and interfaces stay the same

const MyProducts = () => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      handle: "",
      product_type: "",
      vendor: "",
      status: "active",
      price: 0,
      compare_at_price: undefined,
      sku: "",
      inventory_quantity: 0,
      tags: "",
    },
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const generateHandle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleAddProduct = async (data: ProductFormData) => {
    // ... your existing add product logic unchanged
  };

  const handleSelectProduct = (productId: string, checked: boolean) => {
    if (checked) {
      setSelectedProducts([...selectedProducts, productId]);
    } else {
      setSelectedProducts(selectedProducts.filter((id) => id !== productId));
    }
  };

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProducts(filteredProducts.map((p) => p.id));
    } else {
      setSelectedProducts([]);
    }
  };

  // ✅ FIXED: put the whole import flow into a proper async function
  const handleImportProducts = async () => {
    setImporting(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) throw new Error("Please log in to import products");

      // Get API key from backend
      const { data: keyData, error: keyError } = await supabase.functions.invoke(
        "shopify-oauth",
        {
          body: { action: "get-api-key" },
          headers: { Authorization: `Bearer ${session.access_token}` },
        }
      );

      if (keyError || !keyData?.apiKey) {
        throw new Error(
          "Shopify API key not configured. Please ensure SHOPIFY_API_KEY secret is set."
        );
      }

      const shopDomain = prompt(
        'Enter your Shopify shop domain (e.g., "mystore" for mystore.myshopify.com):'
      );
      if (!shopDomain) {
        setImporting(false);
        return;
      }

      const state =
        Math.random().toString(36).substring(2, 15) +
        Math.random().toString(36).substring(2, 15);
      sessionStorage.setItem("shopify_oauth_state", state);
      sessionStorage.setItem("shopify_session_token", session.access_token);

      const redirectUri =
        "https://id-preview--e8261a88-908d-4b6a-b764-a02dcc966558.lovable.app/auth/shopify/callback";
      const scopes = "read_products,read_inventory";

      const authUrl = `https://${shopDomain}.myshopify.com/admin/oauth/authorize?client_id=${keyData.apiKey}&scope=${scopes}&redirect_uri=${encodeURIComponent(
        redirectUri
      )}&state=${state}`;

      const popup = window.open(
        authUrl,
        "shopify-oauth",
        "width=600,height=700,scrollbars=yes,resizable=yes,status=yes"
      );

      if (!popup) {
        throw new Error("Popup blocked. Please allow popups and try again.");
      }

      const messageHandler = (event: MessageEvent) => {
        if (event.data?.type === "shopify-import-complete") {
          popup?.close();
          window.removeEventListener("message", messageHandler);
          fetchProducts();
          setImporting(false);
          toast({
            title: "Success",
            description: `✅ Imported: ${event.data.imported}, Skipped: ${event.data.skipped}`,
          });
        } else if (event.data?.type === "shopify-import-error") {
          popup?.close();
          window.removeEventListener("message", messageHandler);
          setImporting(false);
          toast({
            title: "Import Error",
            description: "❌ Import failed.",
            variant: "destructive",
          });
        }
      };

      window.addEventListener("message", messageHandler);

      const checkClosed = setInterval(() => {
        if (popup?.closed) {
          clearInterval(checkClosed);
          window.removeEventListener("message", messageHandler);
          setImporting(false);
        }
      }, 1000);
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Import Error",
        description: error.message,
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  const getInventoryDisplay = (product: Product) => {
    // ... unchanged
  };

  const fetchProducts = async () => {
    // ... unchanged
  };

  const filteredProducts = products.filter((product) => {
    // ... unchanged
  });

  // ... render JSX unchanged, button already calls handleImportProducts
};

export default MyProducts;
