import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, Activity } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface TopProduct {
  id: string;
  handle: string;
  title: string;
  visibility_score: number;
  mention_count: number;
}

interface ProductChange {
  id: string;
  product_title: string;
  product_handle: string;
  current_score: number;
  previous_score: number;
  change: number;
  change_percentage: number;
}

interface ProductHealthMetricsProps {
  storeId: string;
}

const ProductHealthMetrics = ({ storeId }: ProductHealthMetricsProps) => {
  const [topProducts, setTopProducts] = useState<TopProduct[]>([]);
  const [productChanges, setProductChanges] = useState<ProductChange[]>([]);
  const [isLoadingTop, setIsLoadingTop] = useState(true);
  const [isLoadingChanges, setIsLoadingChanges] = useState(true);

  useEffect(() => {
    if (storeId) {
      fetchTopProducts();
      fetchProductChanges();
    }
  }, [storeId]);

  const fetchTopProducts = async () => {
    try {
      setIsLoadingTop(true);
      
      const { data: products, error } = await supabase
        .from('products')
        .select('id, handle, title, visibility_score')
        .eq('store_id', storeId)
        .eq('status', 'active')
        .not('visibility_score', 'is', null)
        .order('visibility_score', { ascending: false })
        .limit(5);

      if (error) throw error;

      const productsWithMentions = await Promise.all(
        (products || []).map(async (product) => {
          const { count } = await supabase
            .from('prompt_responses_with_prompts')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id);

          return {
            ...product,
            mention_count: count || 0
          };
        })
      );

      setTopProducts(productsWithMentions);
    } catch (error) {
      console.error('Error fetching top products:', error);
    } finally {
      setIsLoadingTop(false);
    }
  };

  const fetchProductChanges = async () => {
    try {
      setIsLoadingChanges(true);
      
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      const todayStr = today.toISOString().split('T')[0];
      const yesterdayStr = yesterday.toISOString().split('T')[0];

      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, title, handle')
        .eq('store_id', storeId)
        .eq('status', 'active');

      if (productsError) throw productsError;

      const changesPromises = (products || []).map(async (product) => {
        const [todayScores, yesterdayScores] = await Promise.all([
          supabase
            .from('prompt_daily_scores')
            .select('visibility_score, prompt_id')
            .eq('date', todayStr)
            .in('prompt_id', 
              (await supabase
                .from('prompts')
                .select('id')
                .eq('product_id', product.id)
                .eq('active', true))
                .data?.map(p => p.id) || []
            ),
          supabase
            .from('prompt_daily_scores')
            .select('visibility_score, prompt_id')
            .eq('date', yesterdayStr)
            .in('prompt_id',
              (await supabase
                .from('prompts')
                .select('id')
                .eq('product_id', product.id)
                .eq('active', true))
                .data?.map(p => p.id) || []
            )
        ]);

        const todayAvg = todayScores.data && todayScores.data.length > 0
          ? todayScores.data.reduce((sum, s) => sum + (s.visibility_score || 0), 0) / todayScores.data.length
          : null;

        const yesterdayAvg = yesterdayScores.data && yesterdayScores.data.length > 0
          ? yesterdayScores.data.reduce((sum, s) => sum + (s.visibility_score || 0), 0) / yesterdayScores.data.length
          : null;

        if (todayAvg !== null && yesterdayAvg !== null) {
          const change = todayAvg - yesterdayAvg;
          const changePercentage = (change / yesterdayAvg) * 100;

          return {
            id: product.id,
            product_title: product.title,
            product_handle: product.handle,
            current_score: Math.round(todayAvg),
            previous_score: Math.round(yesterdayAvg),
            change: Math.round(change),
            change_percentage: changePercentage
          };
        }
        return null;
      });

      const changes = (await Promise.all(changesPromises))
        .filter((c): c is ProductChange => c !== null)
        .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
        .slice(0, 5);

      setProductChanges(changes);
    } catch (error) {
      console.error('Error fetching product changes:', error);
    } finally {
      setIsLoadingChanges(false);
    }
  };

  const getPriorityColor = (change: number): string => {
    if (change >= 10) return "text-green-600";
    if (change <= -10) return "text-red-600";
    return "text-yellow-600";
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Product Health Metrics
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="top-performers" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="top-performers">Top Performers</TabsTrigger>
            <TabsTrigger value="daily-changes">Daily Changes</TabsTrigger>
          </TabsList>
          
          <TabsContent value="top-performers" className="mt-4">
            {isLoadingTop ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : topProducts.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No product data available yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Visibility Score</TableHead>
                    <TableHead className="text-right">AI Mentions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {topProducts.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell className="font-medium">{product.handle}</TableCell>
                      <TableCell>{product.title}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold text-primary">
                          {product.visibility_score}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{product.mention_count}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
          
          <TabsContent value="daily-changes" className="mt-4">
            {isLoadingChanges ? (
              <div className="flex items-center justify-center h-[200px]">
                <p className="text-muted-foreground">Loading...</p>
              </div>
            ) : productChanges.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No daily changes available yet
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SKU</TableHead>
                    <TableHead>Product Name</TableHead>
                    <TableHead className="text-right">Current</TableHead>
                    <TableHead className="text-right">Previous</TableHead>
                    <TableHead className="text-right">Change</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {productChanges.map((change) => (
                    <TableRow key={change.id}>
                      <TableCell className="font-medium">{change.product_handle}</TableCell>
                      <TableCell>{change.product_title}</TableCell>
                      <TableCell className="text-right">
                        <span className="font-semibold">{change.current_score}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <span className="text-muted-foreground">{change.previous_score}</span>
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          {change.change > 0 ? (
                            <TrendingUp className="h-4 w-4 text-green-600" />
                          ) : (
                            <TrendingDown className="h-4 w-4 text-red-600" />
                          )}
                          <span className={`font-semibold ${getPriorityColor(change.change)}`}>
                            {change.change > 0 ? '+' : ''}{change.change}
                          </span>
                          <Badge 
                            variant={Math.abs(change.change) >= 10 ? "default" : "outline"}
                            className="ml-1"
                          >
                            {change.change_percentage > 0 ? '+' : ''}
                            {change.change_percentage.toFixed(1)}%
                          </Badge>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default ProductHealthMetrics;
