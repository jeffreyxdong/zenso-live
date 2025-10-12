import React, { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { Progress } from "@/components/ui/progress";
import { DialogDescription } from "@/components/ui/dialog";
import {
  Store,
  Package,
  Download,
  Plus,
  Search,
  CheckCircle,
  AlertCircle,
  Image,
  Trash2,
  MoreVertical,
  Eye,
  TrendingUp,
  MapPin,
  Heart,
  Loader2,
} from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import Papa from "papaparse";
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
  images?: any;
  created_at: string;
  variants?: ProductVariant[];
  visibility_score?: number;
  sentiment_score?: number;
  position_score?: number;
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

interface Store {
  id: string;
  name: string;
  website: string;
  is_active: boolean;
}

interface MyProductsProps {
  activeStore: Store | null;
  onProductClick?: (productId: string) => void;
}

const productSchema = z.object({
  title: z.string().min(1, "Product title is required"),
  handle: z.string().optional(),
});

type ProductFormData = z.infer<typeof productSchema>;

const MyProducts = ({ activeStore, onProductClick }: MyProductsProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [showAddProductDialog, setShowAddProductDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [importing, setImporting] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [showProductDetail, setShowProductDetail] = useState(false);
  const [sortBy, setSortBy] = useState<string>("name-asc");
  const [showCsvImportDialog, setShowCsvImportDialog] = useState(false);
  const [csvFile, setCsvFile] = useState<File | null>(null);
  const [importProgress, setImportProgress] = useState(0);

  const form = useForm<ProductFormData>({
    resolver: zodResolver(productSchema),
    defaultValues: {
      title: "",
      handle: "",
    },
  });

  useEffect(() => {
    fetchProducts();
  }, [activeStore]);

  const generateHandle = (title: string) => {
    return title
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
  };

  const handleAddProduct = async (data: ProductFormData) => {
    setIsSubmitting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!activeStore?.id) {
        throw new Error("No active store selected");
      }

      const handle = data.handle || generateHandle(data.title);

      // Create product
      const { data: productData, error: productError } = await supabase
        .from("products")
        .insert({
          user_id: userData.user.id,
          store_id: activeStore.id,
          shopify_id: `manual-${Date.now()}`,
          title: data.title,
          handle: handle,
          product_type: null,
          vendor: null,
          status: "active",
        })
        .select()
        .single();

      if (productError) throw productError;

      // Create product variant
      const { error: variantError } = await supabase.from("product_variants").insert({
        product_id: productData.id,
        shopify_variant_id: `manual-variant-${Date.now()}`,
        title: "Default Title",
        price: 0,
        compare_at_price: null,
        inventory_quantity: 0,
        sku: null,
      });

      if (variantError) throw variantError;

      // Close dialog and redirect immediately to PDP
      form.reset();
      setShowAddProductDialog(false);

      toast({
        title: "Success",
        description: "Product created! Redirecting to product page...",
      });

      // Redirect to product overview page
      if (onProductClick) {
        onProductClick(productData.id);
      }

      // Start background processes (non-blocking)
      (async () => {
        try {
          const { data: session } = await supabase.auth.getSession();
          if (session?.session) {
            const authHeaders = {
              Authorization: `Bearer ${session.session.access_token}`,
            };

            // Step 1: Generate buyer-intent prompts
            console.log("Generating buyer-intent prompts...");
            await supabase.functions.invoke("generate-buyer-intent-prompts", {
              body: {
                productId: productData.id,
                storeId: activeStore.id,
                productTitle: data.title,
                productType: null,
                vendor: null,
                tags: [],
              },
              headers: authHeaders,
            });

            // Step 2: Generate responses for the prompts
            console.log("Generating responses for prompts...");
            await supabase.functions.invoke("generate-buyer-intent-outputs", {
              body: {
                productId: productData.id,
              },
              headers: authHeaders,
            });

            // Step 3: Score the responses
            console.log("Scoring the generated responses...");
            await supabase.functions.invoke("score-buyer-intent-outputs", {
              body: {
                productId: productData.id,
                productTitle: data.title,
              },
              headers: authHeaders,
            });

            // Step 4: Generate PDP recommendations
            console.log("Generating AI optimization recommendations...");
            await supabase.functions.invoke("generate-pdp-recommendations", {
              body: {
                productId: productData.id,
              },
              headers: authHeaders,
            });

            console.log("Buyer-intent analysis and AI recommendations pipeline completed successfully");
          }
        } catch (promptError) {
          console.error("Error in buyer-intent analysis pipeline:", promptError);
        }
      })();
    } catch (error: any) {
      console.error("Error adding product:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to add product",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
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

  const generateShopifyId = (title: string): string => {
    // Generate a consistent hash-based ID from the title
    let hash = 0;
    for (let i = 0; i < title.length; i++) {
      const char = title.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `csv-import-${Math.abs(hash)}-${Date.now()}`;
  };

  const handleImportProducts = () => {
    setShowCsvImportDialog(true);
  };

  const handleCsvFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (!file.name.endsWith(".csv")) {
        toast({
          title: "Invalid file",
          description: "Please upload a CSV file",
          variant: "destructive",
        });
        return;
      }
      setCsvFile(file);
    }
  };

  const handleCsvImport = async () => {
    if (!csvFile) {
      toast({
        title: "No file selected",
        description: "Please select a CSV file to import",
        variant: "destructive",
      });
      return;
    }

    setImporting(true);
    setImportProgress(0);

    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        throw new Error("User not authenticated");
      }

      if (!activeStore) {
        throw new Error("No active store found. Please add a store first.");
      }

      // Parse CSV file
      Papa.parse(csvFile, {
        header: true,
        skipEmptyLines: true,
        complete: async (results) => {
          try {
            const rows = results.data as any[];

            // Find title column (case-insensitive)
            const titleColumn = rows.length > 0 
              ? Object.keys(rows[0]).find(key => key.toLowerCase() === "title")
              : null;

            if (!titleColumn) {
              throw new Error('CSV must contain a "Title" or "title" column');
            }

            console.log(`Parsed ${rows.length} rows from CSV using column "${titleColumn}"`);

            let imported = 0;
            let skipped = 0;
            const batchSize = 50; // Insert in batches of 50

            const newlyInsertedProducts: Array<{ id: string; title: string }> = [];

            for (let i = 0; i < rows.length; i += batchSize) {
              const batch = rows.slice(i, i + batchSize);

              const productsToInsert = batch
                .filter((row) => row[titleColumn] && row[titleColumn].trim())
                .map((row) => {
                  const title = row[titleColumn].trim();
                  return {
                    user_id: user.id,
                    store_id: activeStore.id,
                    shopify_id: generateShopifyId(title),
                    title: title,
                    handle: generateHandle(title),
                    status: "active",
                    images: [],
                    tags: [],
                  };
                });

              if (productsToInsert.length > 0) {
                // Use upsert to skip duplicates
                const { data, error } = await supabase
                  .from("products")
                  .upsert(productsToInsert, {
                    onConflict: "user_id,shopify_id",
                    ignoreDuplicates: true,
                  })
                  .select();

                if (error) {
                  console.error("Batch insert error:", error);
                  skipped += productsToInsert.length;
                } else {
                  const insertedCount = data?.length || 0;
                  imported += insertedCount;
                  skipped += productsToInsert.length - insertedCount;
                  
                  // Track newly inserted products
                  if (data && data.length > 0) {
                    newlyInsertedProducts.push(
                      ...data.map((p) => ({ id: p.id, title: p.title }))
                    );
                  }
                }
              }

              // Update progress
              const progress = Math.min(100, Math.round(((i + batchSize) / rows.length) * 100));
              setImportProgress(progress);
            }

            // Close dialog and refresh products
            setShowCsvImportDialog(false);
            setCsvFile(null);
            setImportProgress(0);
            fetchProducts();

            toast({
              title: "Import Complete",
              description: `Successfully imported ${imported} products. Skipped ${skipped} duplicates or invalid rows.`,
            });

            // Trigger AI analysis for up to 25 new products in batches (non-blocking)
            if (newlyInsertedProducts.length > 0) {
              const productsToAnalyze = newlyInsertedProducts.slice(0, 25);
              
              (async () => {
                try {
                  const { data: session } = await supabase.auth.getSession();
                  if (!session?.session) {
                    console.error("No active session for AI analysis");
                    return;
                  }

                  const authHeaders = {
                    Authorization: `Bearer ${session.session.access_token}`,
                  };

                  console.log(`Starting AI analysis for ${productsToAnalyze.length} imported products in batches of 3...`);

                  let successCount = 0;
                  let failureCount = 0;
                  const failedProducts: Array<{ title: string; step: string; error: string }> = [];

                  // Process products in batches of 3 (parallel)
                  const batchSize = 3;
                  for (let i = 0; i < productsToAnalyze.length; i += batchSize) {
                    const batch = productsToAnalyze.slice(i, i + batchSize);
                    
                    // Process batch in parallel
                    await Promise.allSettled(
                      batch.map(async (product) => {
                        try {
                          console.log(`[${product.title}] Starting analysis...`);

                          // Step 1: Generate buyer-intent prompts
                          const { data: promptData, error: promptError } = await supabase.functions.invoke(
                            "generate-buyer-intent-prompts",
                            {
                              body: {
                                productId: product.id,
                                storeId: activeStore.id,
                                productTitle: product.title,
                                productType: null,
                                vendor: null,
                                tags: [],
                              },
                              headers: authHeaders,
                            }
                          );

                          if (promptError) {
                            throw new Error(`Prompt generation failed: ${promptError.message || JSON.stringify(promptError)}`);
                          }
                          console.log(`[${product.title}] ✓ Prompts generated`);

                          // Step 2: Generate responses
                          const { data: outputData, error: outputError } = await supabase.functions.invoke(
                            "generate-buyer-intent-outputs",
                            {
                              body: { productId: product.id },
                              headers: authHeaders,
                            }
                          );

                          if (outputError) {
                            throw new Error(`Output generation failed: ${outputError.message || JSON.stringify(outputError)}`);
                          }
                          console.log(`[${product.title}] ✓ Responses generated`);

                          // Step 3: Score responses
                          const { data: scoreData, error: scoreError } = await supabase.functions.invoke(
                            "score-buyer-intent-outputs",
                            {
                              body: {
                                productId: product.id,
                                productTitle: product.title,
                              },
                              headers: authHeaders,
                            }
                          );

                          if (scoreError) {
                            throw new Error(`Scoring failed: ${scoreError.message || JSON.stringify(scoreError)}`);
                          }
                          console.log(`[${product.title}] ✓ Scores calculated`);

                          // Step 4: Generate PDP recommendations
                          const { data: recData, error: recError } = await supabase.functions.invoke(
                            "generate-pdp-recommendations",
                            {
                              body: { productId: product.id },
                              headers: authHeaders,
                            }
                          );

                          if (recError) {
                            throw new Error(`Recommendation generation failed: ${recError.message || JSON.stringify(recError)}`);
                          }
                          console.log(`[${product.title}] ✓ Recommendations generated`);

                          successCount++;
                          console.log(`[${product.title}] ✅ Completed successfully`);
                        } catch (productError: any) {
                          failureCount++;
                          const errorMsg = productError?.message || String(productError);
                          console.error(`[${product.title}] ❌ Failed:`, errorMsg);
                          
                          // Extract which step failed
                          let failedStep = "Unknown";
                          if (errorMsg.includes("Prompt generation")) failedStep = "Prompt Generation";
                          else if (errorMsg.includes("Output generation")) failedStep = "Response Generation";
                          else if (errorMsg.includes("Scoring")) failedStep = "Scoring";
                          else if (errorMsg.includes("Recommendation")) failedStep = "Recommendations";

                          failedProducts.push({
                            title: product.title,
                            step: failedStep,
                            error: errorMsg,
                          });
                        }
                      })
                    );

                    // Log batch completion
                    console.log(`Batch ${Math.floor(i / batchSize) + 1} complete. Progress: ${successCount + failureCount}/${productsToAnalyze.length}`);
                  }

                  // Show summary toast
                  const summaryMsg = failureCount > 0 
                    ? `${successCount} products analyzed successfully. ${failureCount} failed (check console for details).`
                    : `All ${successCount} products analyzed successfully!`;

                  toast({
                    title: "AI Analysis Complete",
                    description: summaryMsg,
                    variant: failureCount > 0 ? "destructive" : "default",
                  });

                  // Log detailed failure summary
                  if (failedProducts.length > 0) {
                    console.group("❌ Failed Products Summary");
                    failedProducts.forEach(({ title, step, error }) => {
                      console.error(`• ${title} (failed at: ${step})\n  Error: ${error}`);
                    });
                    console.groupEnd();
                  }

                  console.log(`AI analysis pipeline completed: ${successCount} succeeded, ${failureCount} failed`);
                } catch (error) {
                  console.error("Critical error in AI analysis pipeline:", error);
                  toast({
                    title: "Analysis Error",
                    description: "Failed to start AI analysis. Check console for details.",
                    variant: "destructive",
                  });
                }
              })();
            }
          } catch (error: any) {
            console.error("Import error:", error);
            toast({
              title: "Import Failed",
              description: error.message || "Failed to import products",
              variant: "destructive",
            });
          } finally {
            setImporting(false);
          }
        },
        error: (error) => {
          console.error("CSV parse error:", error);
          toast({
            title: "Parse Error",
            description: "Failed to parse CSV file. Please ensure it's properly formatted.",
            variant: "destructive",
          });
          setImporting(false);
        },
      });
    } catch (error: any) {
      console.error("Import error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to import products",
        variant: "destructive",
      });
      setImporting(false);
    }
  };

  const handleDeleteProducts = async (productIds: string[]) => {
    setIsDeleting(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      // Delete variants first (due to foreign key constraint)
      const { error: variantError } = await supabase.from("product_variants").delete().in("product_id", productIds);

      if (variantError) throw variantError;

      // Delete products
      const { error: productError } = await supabase
        .from("products")
        .delete()
        .in("id", productIds)
        .eq("user_id", userData.user.id);

      if (productError) throw productError;

      toast({
        title: "Success",
        description: `${productIds.length} product(s) deleted successfully`,
      });

      // Reset selection and refresh
      setSelectedProducts([]);
      setProductToDelete(null);
      setShowDeleteDialog(false);
      await fetchProducts();
    } catch (error: any) {
      console.error("Error deleting products:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete products",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteSingle = (productId: string) => {
    setProductToDelete(productId);
    setShowDeleteDialog(true);
  };

  const handleDeleteSelected = () => {
    if (selectedProducts.length > 0) {
      setProductToDelete(null);
      setShowDeleteDialog(true);
    }
  };

  const confirmDelete = () => {
    const idsToDelete = productToDelete ? [productToDelete] : selectedProducts;
    handleDeleteProducts(idsToDelete);
  };

  const getInventoryDisplay = (product: Product) => {
    if (!product.variants || product.variants.length === 0) {
      return "Inventory not tracked";
    }

    const totalInventory = product.variants.reduce((sum, variant) => sum + (variant.inventory_quantity || 0), 0);
    const variantCount = product.variants.length;

    if (totalInventory === 0) {
      return "0 in stock";
    }

    if (variantCount > 1) {
      return `${totalInventory} in stock for ${variantCount} variants`;
    }

    return `${totalInventory} in stock`;
  };

  const getScoreBadge = (score: number | undefined, productCreatedAt: string) => {
    // Check if product was created recently (within last 5 minutes) and has no score
    const isRecentlyCreated = new Date().getTime() - new Date(productCreatedAt).getTime() < 5 * 60 * 1000;
    
    if (score == null || score === 0) {
      if (isRecentlyCreated) {
        return (
          <div className="flex items-center justify-center gap-2 text-sm font-semibold px-3 py-1.5 rounded-md border text-muted-foreground bg-muted/50 border-muted">
            <Loader2 className="w-3 h-3 animate-spin" />
            <span>Processing...</span>
          </div>
        );
      }
      return <span className="text-xs text-muted-foreground px-2 py-1 rounded bg-muted/50">No Data</span>;
    }
    
    if (score >= 80) {
      return (
        <span className="text-sm font-semibold px-3 py-1.5 rounded-md border text-green-700 bg-green-50 border-green-200">
          {score}/100
        </span>
      );
    }
    if (score >= 60) {
      return (
        <span className="text-sm font-semibold px-3 py-1.5 rounded-md border text-yellow-700 bg-yellow-50 border-yellow-200">
          {score}/100
        </span>
      );
    }
    return (
      <span className="text-sm font-semibold px-3 py-1.5 rounded-md border text-red-700 bg-red-50 border-red-200">
        {score}/100
      </span>
    );
  };

  const handleProductClick = (product: Product) => {
    if (onProductClick) {
      onProductClick(product.id);
    } else {
      setSelectedProduct(product);
      setShowProductDetail(true);
    }
  };

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!activeStore?.id) {
        setProducts([]);
        setLoading(false);
        return;
      }

      const { data: productsData, error } = await supabase
        .from("products")
        .select(
          `
          *,
          variants:product_variants(*)
        `,
        )
        .eq("user_id", userData.user.id)
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // Fetch the latest scores for each product from product_scores table
      const productsWithScores = await Promise.all(
        (productsData || []).map(async (product) => {
          const { data: latestScore } = await supabase
            .from("product_scores")
            .select("visibility_score, sentiment_score, position_score")
            .eq("product_id", product.id)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

          return {
            ...product,
            visibility_score: latestScore?.visibility_score || 0,
            sentiment_score: latestScore?.sentiment_score || 0,
            position_score: latestScore?.position_score || 0,
          };
        }),
      );

      setProducts(productsWithScores);
    } catch (error: any) {
      console.error("Error fetching products:", error);
      toast({
        title: "Error",
        description: "Failed to fetch products",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products
    .filter(
      (product) =>
        product.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.vendor?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.product_type?.toLowerCase().includes(searchQuery.toLowerCase()),
    )
    .sort((a, b) => {
      switch (sortBy) {
        case "name-asc":
          return a.title.localeCompare(b.title);
        case "name-desc":
          return b.title.localeCompare(a.title);
        case "status":
          return a.status.localeCompare(b.status);
        case "visibility-high":
          return (b.visibility_score ?? 0) - (a.visibility_score ?? 0);
        case "visibility-low":
          return (a.visibility_score ?? 0) - (b.visibility_score ?? 0);
        case "sentiment-high":
          return (b.sentiment_score ?? 0) - (a.sentiment_score ?? 0);
        case "sentiment-low":
          return (a.sentiment_score ?? 0) - (b.sentiment_score ?? 0);
        case "position-high":
          return (b.position_score ?? 0) - (a.position_score ?? 0);
        case "position-low":
          return (a.position_score ?? 0) - (b.position_score ?? 0);
        default:
          return 0;
      }
    });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="text-center">
          <Package className="w-8 h-8 text-muted-foreground mx-auto mb-2 animate-spin" />
          <p className="text-muted-foreground">Loading products...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-foreground">My Products</h2>
          <p className="text-sm text-muted-foreground">{products.length} products</p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            className="flex items-center gap-2"
            onClick={handleImportProducts}
            disabled={loading || importing}
          >
            <Download className="w-4 h-4" />
            {importing ? "Importing..." : "Import from CSV"}
          </Button>
          <Button
            className="flex items-center gap-2"
            onClick={() => {
              console.log("Add Product button clicked!");
              setShowAddProductDialog(true);
            }}
          >
            <Plus className="w-4 h-4" />
            Add Product
          </Button>
        </div>
      </div>

      {/* Search and Bulk Actions */}
      <div className="flex items-center gap-4">
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={sortBy} onValueChange={setSortBy}>
          <SelectTrigger className="w-[240px]">
            <SelectValue placeholder="Sort by..." />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="name-asc">Product Name A-Z</SelectItem>
            <SelectItem value="name-desc">Product Name Z-A</SelectItem>
            <SelectItem value="status">Product Status</SelectItem>
            <SelectItem value="visibility-high">Visibility Score (High to Low)</SelectItem>
            <SelectItem value="visibility-low">Visibility Score (Low to High)</SelectItem>
            <SelectItem value="sentiment-high">Sentiment Score (High to Low)</SelectItem>
            <SelectItem value="sentiment-low">Sentiment Score (Low to High)</SelectItem>
            <SelectItem value="position-high">Position Score (High to Low)</SelectItem>
            <SelectItem value="position-low">Position Score (Low to High)</SelectItem>
          </SelectContent>
        </Select>
        {selectedProducts.length > 0 && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleDeleteSelected}
            className="flex items-center gap-2 text-destructive hover:text-destructive"
          >
            <Trash2 className="w-4 h-4" />
            Delete Selected ({selectedProducts.length})
          </Button>
        )}
      </div>

      {/* Products Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
                <Checkbox
                  checked={selectedProducts.length === filteredProducts.length && filteredProducts.length > 0}
                  onCheckedChange={handleSelectAll}
                />
              </TableHead>
              <TableHead>
                <div className="flex items-center gap-2">
                  Product
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Eye className="w-3 h-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>Click any product row to view detailed analytics</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              </TableHead>
              <TableHead className="text-center">Status</TableHead>
              <TableHead className="text-center">Visibility</TableHead>
              <TableHead className="text-center">Sentiment</TableHead>
              <TableHead className="text-center">Position</TableHead>
              <TableHead className="w-12 text-center">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts.map((product) => (
              <TooltipProvider key={product.id}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50 hover:shadow-md transition-all duration-200 group"
                      onClick={() => handleProductClick(product)}
                    >
                      <TableCell onClick={(e) => e.stopPropagation()}>
                        <Checkbox
                          checked={selectedProducts.includes(product.id)}
                          onCheckedChange={(checked) => handleSelectProduct(product.id, !!checked)}
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-muted rounded flex items-center justify-center">
                            {product.images && product.images[0] ? (
                              <img
                                src={product.images[0].src}
                                alt={product.title}
                                className="w-10 h-10 object-cover rounded"
                              />
                            ) : (
                              <Package className="w-5 h-5 text-muted-foreground" />
                            )}
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{product.title}</span>
                              <Eye className="w-4 h-4 text-muted-foreground opacity-0 group-hover:opacity-100 transition-opacity" />
                            </div>
                            <div className="text-sm text-muted-foreground">{product.handle}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <Badge
                          variant={
                            product.status === "active"
                              ? "default"
                              : product.status === "draft"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {product.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-center">{getScoreBadge(product.visibility_score, product.created_at)}</TableCell>
                      <TableCell className="text-center">{getScoreBadge(product.sentiment_score, product.created_at)}</TableCell>
                      <TableCell className="text-center">{getScoreBadge(product.position_score, product.created_at)}</TableCell>
                      <TableCell onClick={(e) => e.stopPropagation()} className="text-center">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={() => handleDeleteSingle(product.id)}
                              className="text-destructive focus:text-destructive"
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete Product
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  </TooltipTrigger>
                  <TooltipContent side="right">
                    <p>Click to view detailed analytics and performance metrics</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ))}
          </TableBody>
        </Table>
      </div>

      {filteredProducts.length === 0 && searchQuery && (
        <div className="text-center py-8">
          <AlertCircle className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
          <p className="text-muted-foreground">No products found matching "{searchQuery}"</p>
        </div>
      )}

      {/* Add Product Dialog */}
      <Dialog open={showAddProductDialog} onOpenChange={setShowAddProductDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add New Product</DialogTitle>
          </DialogHeader>

          <Form {...form}>
            <form onSubmit={form.handleSubmit(handleAddProduct)} className="space-y-6">
              <div className="grid grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="title"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Product Title</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter product title" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="handle"
                  render={({ field }) => (
                    <FormItem className="col-span-2">
                      <FormLabel>Handle (URL)</FormLabel>
                      <FormControl>
                        <Input placeholder="auto-generated-if-empty" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowAddProductDialog(false)}
                  className="flex-1"
                >
                  Cancel
                </Button>
                <Button type="submit" disabled={isSubmitting} className="flex-1">
                  {isSubmitting ? "Adding..." : "Add Product"}
                </Button>
              </div>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Products</AlertDialogTitle>
            <AlertDialogDescription>
              {productToDelete
                ? "Are you sure you want to delete this product? This action cannot be undone."
                : `Are you sure you want to delete ${selectedProducts.length} selected products? This action cannot be undone.`}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* CSV Import Dialog */}
      <Dialog
        open={showCsvImportDialog}
        onOpenChange={(open) => {
          setShowCsvImportDialog(open);
          if (!open) {
            setCsvFile(null);
            setImportProgress(0);
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Products from CSV</DialogTitle>
            <DialogDescription>Upload your product CSV file. Only the "Title" or "title" column is required.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border-2 border-dashed rounded-lg p-6 text-center">
              <input
                type="file"
                accept=".csv"
                onChange={handleCsvFileChange}
                className="hidden"
                id="csv-upload"
                disabled={importing}
              />
              <label htmlFor="csv-upload" className="cursor-pointer flex flex-col items-center gap-2">
                <Download className="w-12 h-12 text-muted-foreground" />
                <div>
                  <p className="font-medium">{csvFile ? csvFile.name : "Choose CSV file"}</p>
                  <p className="text-sm text-muted-foreground">Click to browse or drag and drop</p>
                </div>
              </label>
            </div>

            {importing && (
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Importing products...</span>
                  <span>{importProgress}%</span>
                </div>
                <Progress value={importProgress} />
              </div>
            )}

            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setShowCsvImportDialog(false);
                  setCsvFile(null);
                  setImportProgress(0);
                }}
                disabled={importing}
              >
                Cancel
              </Button>
              <Button onClick={handleCsvImport} disabled={!csvFile || importing}>
                {importing ? "Importing..." : "Import"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Product Detail Dialog */}
      <Dialog open={showProductDetail} onOpenChange={setShowProductDetail}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Package className="w-5 h-5" />
              Product Details
            </DialogTitle>
          </DialogHeader>

          {selectedProduct && (
            <div className="space-y-6">
              {/* Product Info */}
              <div className="flex gap-4">
                <div className="w-20 h-20 bg-muted rounded-lg flex items-center justify-center">
                  {selectedProduct.images && selectedProduct.images[0] ? (
                    <img
                      src={selectedProduct.images[0].src}
                      alt={selectedProduct.title}
                      className="w-20 h-20 object-cover rounded-lg"
                    />
                  ) : (
                    <Package className="w-8 h-8 text-muted-foreground" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-semibold">{selectedProduct.title}</h3>
                  <p className="text-muted-foreground">{selectedProduct.handle}</p>
                  <div className="flex items-center gap-2 mt-2">
                    <Badge
                      variant={
                        selectedProduct.status === "active"
                          ? "default"
                          : selectedProduct.status === "draft"
                            ? "secondary"
                            : "outline"
                      }
                    >
                      {selectedProduct.status}
                    </Badge>
                    {selectedProduct.product_type && <Badge variant="outline">{selectedProduct.product_type}</Badge>}
                  </div>
                </div>
              </div>

              {/* Metrics Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Eye className="w-5 h-5 text-blue-600" />
                      <span className="font-medium text-sm">Visibility</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <div className="text-3xl font-bold tracking-tight tabular-nums">
                        {selectedProduct.visibility_score ?? 0}
                      </div>
                      <div className="text-lg text-muted-foreground font-light">/100</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (selectedProduct.visibility_score ?? 0) >= 80
                            ? "bg-green-600"
                            : (selectedProduct.visibility_score ?? 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-red-600"
                        }`}
                        style={{ width: `${selectedProduct.visibility_score ?? 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <Heart className="w-5 h-5 text-pink-600" />
                      <span className="font-medium text-sm">Sentiment</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <div className="text-3xl font-bold tracking-tight tabular-nums">
                        {selectedProduct.sentiment_score ?? 0}
                      </div>
                      <div className="text-lg text-muted-foreground font-light">/100</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (selectedProduct.sentiment_score ?? 0) >= 80
                            ? "bg-green-600"
                            : (selectedProduct.sentiment_score ?? 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-red-600"
                        }`}
                        style={{ width: `${selectedProduct.sentiment_score ?? 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-2 mb-4">
                      <MapPin className="w-5 h-5 text-green-600" />
                      <span className="font-medium text-sm">Position</span>
                    </div>
                    <div className="flex items-baseline gap-2 mb-3">
                      <div className="text-3xl font-bold tracking-tight tabular-nums">
                        {selectedProduct.position_score ?? 0}
                      </div>
                      <div className="text-lg text-muted-foreground font-light">/100</div>
                    </div>
                    <div className="h-2 bg-muted rounded-full overflow-hidden">
                      <div
                        className={`h-full transition-all duration-500 ${
                          (selectedProduct.position_score ?? 0) >= 80
                            ? "bg-green-600"
                            : (selectedProduct.position_score ?? 0) >= 60
                              ? "bg-yellow-500"
                              : "bg-red-600"
                        }`}
                        style={{ width: `${selectedProduct.position_score ?? 0}%` }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Product Details */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <h4 className="font-semibold mb-3">Product Information</h4>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">SKU:</span>
                      <span>{selectedProduct.variants?.[0]?.sku || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Price:</span>
                      <span>${selectedProduct.variants?.[0]?.price || "0.00"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Inventory:</span>
                      <span>{getInventoryDisplay(selectedProduct)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Vendor:</span>
                      <span>{selectedProduct.vendor || "N/A"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-muted-foreground">Created:</span>
                      <span>{new Date(selectedProduct.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold mb-3">Performance Metrics</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Brand Visibility</span>
                        <span>{selectedProduct.visibility_score ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-blue-600 h-2 rounded-full"
                          style={{ width: `${selectedProduct.visibility_score ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Sentiment Score</span>
                        <span>{selectedProduct.sentiment_score ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-pink-600 h-2 rounded-full"
                          style={{ width: `${selectedProduct.sentiment_score ?? 0}%` }}
                        ></div>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Position Score</span>
                        <span>{selectedProduct.position_score ?? 0}</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className="bg-green-600 h-2 rounded-full"
                          style={{ width: `${selectedProduct.position_score ?? 0}%` }}
                        ></div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyProducts;
