import React from "react";
import { useOutletContext } from "react-router-dom";
import { BrandCard } from "@/components/overview/BrandCard";
import BrandVisibilityOverview from "@/components/overview/BrandVisibilityOverview";
import ProductHealthMetrics from "@/components/overview/ProductHealthMetrics";
import CompetitiveBenchmark from "@/components/overview/CompetitiveBenchmark";
import AtRiskProducts from "@/components/overview/AtRiskProducts";
import RisingStarProducts from "@/components/overview/RisingStarProducts";
import HighestDailyChange from "@/components/overview/HighestDailyChange";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, AlertCircle, Sparkles } from "lucide-react";

const OverviewDraft = () => {
  const { activeStore } = useOutletContext<{ activeStore: { id: string; name: string; website: string; is_active: boolean } | null }>();

  if (!activeStore) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-muted-foreground">No active store selected</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Overview Draft</h1>
          <p className="text-muted-foreground mt-1">Comprehensive view of your brand and product performance</p>
        </div>
        <Badge variant="outline" className="gap-2">
          <Sparkles className="h-4 w-4" />
          Draft View
        </Badge>
      </div>

      {/* Top Row: Brand Score + Brand Visibility Trend */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1">
          <BrandCard storeId={activeStore.id} />
        </div>
        <div className="lg:col-span-2">
          <BrandVisibilityOverview storeId={activeStore.id} />
        </div>
      </div>

      {/* Second Row: Quick Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Rising Stars</CardTitle>
            <TrendingUp className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <RisingStarProducts storeId={activeStore.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">At Risk</CardTitle>
            <AlertCircle className="h-4 w-4 text-red-500" />
          </CardHeader>
          <CardContent>
            <AtRiskProducts storeId={activeStore.id} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Biggest Change</CardTitle>
            <TrendingUp className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <HighestDailyChange storeId={activeStore.id} />
          </CardContent>
        </Card>
      </div>

      {/* Third Row: Competitive Benchmark + Product Health */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 auto-rows-fr">
        <div className="lg:col-span-1 flex">
          <CompetitiveBenchmark storeId={activeStore.id} brandName={activeStore.name} />
        </div>
        <div className="lg:col-span-2 flex">
          <ProductHealthMetrics storeId={activeStore.id} />
        </div>
      </div>
    </div>
  );
};

export default OverviewDraft;
