import React, { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { ChevronLeft, ChevronRight, Search, Package } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Product {
  id: string;
  title: string;
  handle: string;
  visibility_score?: number;
  status: string;
}

interface ProductSidebarListProps {
  storeId: string;
  selectedProductId?: string;
  onProductSelect: (productId: string) => void;
}

export const ProductSidebarList = ({ storeId, selectedProductId, onProductSelect }: ProductSidebarListProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  useEffect(() => {
    fetchProducts();
  }, [storeId]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const { data: userData, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;

      const { data, error } = await supabase
        .from("products")
        .select("id, title, handle, visibility_score, status")
        .eq("user_id", userData.user.id)
        .eq("store_id", storeId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProducts(data || []);
    } catch (error) {
      console.error("Error fetching products:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredProducts = products.filter(product =>
    product.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const totalPages = Math.ceil(filteredProducts.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedProducts = filteredProducts.slice(startIndex, startIndex + itemsPerPage);

  const handlePageChange = (newPage: number) => {
    setCurrentPage(Math.max(1, Math.min(newPage, totalPages)));
  };

  const getScoreColor = (score?: number) => {
    if (!score) return "text-muted-foreground";
    if (score >= 80) return "text-green-600";
    if (score >= 60) return "text-yellow-600";
    return "text-red-600";
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b space-y-3">
        <div className="flex items-center gap-2">
          <Package className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-semibold text-sm">Products</h3>
          <Badge variant="secondary" className="ml-auto text-xs">
            {filteredProducts.length}
          </Badge>
        </div>
        
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="pl-8 h-9 text-sm"
          />
        </div>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {loading ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              Loading products...
            </div>
          ) : paginatedProducts.length === 0 ? (
            <div className="text-center py-8 text-sm text-muted-foreground">
              No products found
            </div>
          ) : (
            paginatedProducts.map((product) => (
              <button
                key={product.id}
                onClick={() => onProductSelect(product.id)}
                className={`w-full text-left p-3 rounded-lg hover:bg-accent transition-colors ${
                  selectedProductId === product.id ? "bg-accent" : ""
                }`}
              >
                <div className="space-y-1">
                  <div className="font-medium text-sm line-clamp-1">
                    {product.title}
                  </div>
                  <div className="flex items-center gap-2 text-xs">
                    <Badge variant="outline" className="text-xs capitalize">
                      {product.status}
                    </Badge>
                    {product.visibility_score !== null && product.visibility_score !== undefined && (
                      <span className={`font-medium ${getScoreColor(product.visibility_score)}`}>
                        Score: {product.visibility_score}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </ScrollArea>

      {totalPages > 1 && (
        <div className="p-3 border-t flex items-center justify-between">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage - 1)}
            disabled={currentPage === 1}
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="text-sm text-muted-foreground">
            {currentPage} / {totalPages}
          </span>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handlePageChange(currentPage + 1)}
            disabled={currentPage === totalPages}
          >
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      )}
    </div>
  );
};
