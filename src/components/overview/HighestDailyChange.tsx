import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { TrendingUp, TrendingDown } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface ProductChange {
  id: string;
  handle: string;
  title: string;
  current_score: number;
  change_percent: number;
  direction: 'up' | 'down';
  priority: 'high' | 'medium' | 'low';
}

interface HighestDailyChangeProps {
  storeId: string;
}

const HighestDailyChange = ({ storeId }: HighestDailyChangeProps) => {
  const [products, setProducts] = useState<ProductChange[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchProductChanges();
    }
  }, [storeId]);

  const fetchProductChanges = async () => {
    try {
      setIsLoading(true);
      
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, handle, title')
        .eq('store_id', storeId)
        .eq('status', 'active');

      if (productsError) throw productsError;

      if (!products || products.length === 0) {
        setProducts([]);
        setIsLoading(false);
        return;
      }

      const productsWithChanges = await Promise.all(
        products.map(async (product) => {
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

          const { data: scores, error: scoresError } = await supabase
            .from('product_scores')
            .select('visibility_score, created_at')
            .eq('product_id', product.id)
            .not('visibility_score', 'is', null)
            .gte('created_at', sevenDaysAgo.toISOString())
            .order('created_at', { ascending: true });

          if (scoresError || !scores || scores.length < 2) {
            return null;
          }

          const earliestScore = scores[0].visibility_score;
          const latestScore = scores[scores.length - 1].visibility_score;
          
          if (!earliestScore || !latestScore || earliestScore === 0) {
            return null;
          }

          const changePercent = ((latestScore - earliestScore) / earliestScore) * 100;

          if (changePercent === 0) return null;

          const direction: 'up' | 'down' = changePercent > 0 ? 'up' : 'down';
          
          let priority: 'high' | 'medium' | 'low' = 'low';
          const absChange = Math.abs(changePercent);
          if (absChange > 30) priority = 'high';
          else if (absChange > 15) priority = 'medium';

          return {
            id: product.id,
            handle: product.handle,
            title: product.title,
            current_score: latestScore,
            change_percent: changePercent,
            direction,
            priority
          };
        })
      );

      const allChanges = productsWithChanges
        .filter((p): p is ProductChange => p !== null)
        .sort((a, b) => Math.abs(b.change_percent) - Math.abs(a.change_percent))
        .slice(0, 8);

      setProducts(allChanges);
    } catch (error) {
      console.error('Error fetching product changes:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getPriorityColor = (priority: 'high' | 'medium' | 'low') => {
    switch (priority) {
      case 'high': return 'destructive';
      case 'medium': return 'default';
      case 'low': return 'secondary';
    }
  };

  if (isLoading) {
    return (
      <Card className="min-h-[280px]">
        <CardHeader>
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Highest Daily Change
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center h-[200px]">
            <p className="text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="min-h-[280px]">
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <TrendingUp className="h-5 w-5" />
          Highest Daily Change
        </CardTitle>
      </CardHeader>
      <CardContent>
        {products.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No significant product changes detected
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>SKU</TableHead>
                <TableHead>Product Name</TableHead>
                <TableHead className="text-right">Change</TableHead>
                <TableHead className="text-right">Current Score</TableHead>
                <TableHead className="text-right">Priority</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((product) => (
                <TableRow key={product.id}>
                  <TableCell className="font-medium">{product.handle}</TableCell>
                  <TableCell>{product.title}</TableCell>
                  <TableCell className="text-right">
                    <span className={`font-semibold flex items-center justify-end gap-1 ${
                      product.direction === 'up' ? 'text-green-500' : 'text-destructive'
                    }`}>
                      {product.direction === 'up' ? (
                        <TrendingUp className="h-3.5 w-3.5" />
                      ) : (
                        <TrendingDown className="h-3.5 w-3.5" />
                      )}
                      {product.direction === 'up' ? '+' : ''}{product.change_percent.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-right">
                    {product.current_score}
                  </TableCell>
                  <TableCell className="text-right">
                    <Badge variant={getPriorityColor(product.priority)}>
                      {product.priority.toUpperCase()}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default HighestDailyChange;
