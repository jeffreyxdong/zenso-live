import React, { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Search,
  TrendingUp,
  Globe,
  BarChart3,
  Eye,
  Heart,
  MapPin,
  FileText,
  Database,
  Cpu,
  Target,
  Sparkles,
  CheckCircle,
  RefreshCw,
} from "lucide-react";
import { PromptsTab } from "@/components/PromptsTab";
import MyProducts from "@/components/MyProducts";
import ProductMetrics from "@/components/ProductMetrics";
import BrandVisibilityChart from "@/components/BrandVisibilityChart";
import { CompetitorAnalytics } from "@/components/CompetitorAnalytics";
import BrandVisibilityOverview from "@/components/overview/BrandVisibilityOverview";
import ProductHealthMetrics from "@/components/overview/ProductHealthMetrics";
import CompetitiveBenchmark from "@/components/overview/CompetitiveBenchmark";
import TopSourcesFeed from "@/components/overview/TopSourcesFeed";
import { BrandCard } from "@/components/overview/BrandCard";
import { useNavigate, useLocation, useOutletContext } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { formatInTimeZone } from "date-fns-tz";

const Dashboard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { activeStore } = useOutletContext<{
    activeStore: { id: string; name: string; website: string; is_active: boolean } | null;
  }>();
  const [activeTab, setActiveTab] = useState(() => {
    const urlParams = new URLSearchParams(location.search);
    return urlParams.get("tab") || "overview";
  });
  const [companyName, setCompanyName] = useState("BrandRefs");
  const [brandVisibility, setBrandVisibility] = useState<number | null>(null);
  const [brandVisibilityUpdatedAt, setBrandVisibilityUpdatedAt] = useState<string | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const [brandRecommendations, setBrandRecommendations] = useState<any[]>([]);
  const [isLoadingRecommendations, setIsLoadingRecommendations] = useState(false);

  // Update activeTab when URL changes
  useEffect(() => {
    const urlParams = new URLSearchParams(location.search);
    setActiveTab(urlParams.get("tab") || "overview");
  }, [location.search]);

  // Load brand analytics when brand-overview tab is active
  useEffect(() => {
    if (activeTab === "brand-overview" && activeStore?.id) {
      loadBrandAnalytics();
      loadBrandRecommendations();
    }
  }, [activeTab, activeStore?.id]);

  // Set up realtime subscription and polling fallback for brand recommendations
  useEffect(() => {
    if (!activeStore?.id) return;

    // Set up polling fallback (every 3 seconds while loading)
    const pollInterval = setInterval(() => {
      if (isLoadingRecommendations) {
        loadBrandRecommendations();
      }
    }, 3000);

    const channel = supabase
      .channel("brand-recommendations-changes")
      .on(
        "postgres_changes",
        {
          event: "INSERT",
          schema: "public",
          table: "brand_recommendations",
          filter: `store_id=eq.${activeStore.id}`,
        },
        (payload) => {
          console.log("New recommendation added:", payload);
          setIsLoadingRecommendations(false);
          loadBrandRecommendations();
        },
      )
      .subscribe();

    return () => {
      clearInterval(pollInterval);
      supabase.removeChannel(channel);
    };
  }, [activeStore?.id, isLoadingRecommendations]);

  const loadBrandRecommendations = async () => {
    if (!activeStore?.id) return;

    try {
      const { data, error } = await supabase
        .from("brand_recommendations")
        .select("*")
        .eq("store_id", activeStore.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      // If no data, keep loading state active (will show generating UI)
      if (!data || data.length === 0) {
        setIsLoadingRecommendations(true);
      } else {
        setBrandRecommendations(data);
        setIsLoadingRecommendations(false);
      }
    } catch (error) {
      console.error("Error loading brand recommendations:", error);
      setIsLoadingRecommendations(false);
    }
  };

  const handleGenerateBrandRecommendations = async () => {
    if (!activeStore?.id) return;

    try {
      setIsLoadingRecommendations(true);

      const { data, error } = await supabase.functions.invoke("generate-brand-recommendations", {
        body: { storeId: activeStore.id },
      });

      if (error) throw error;

      console.log("Generated brand recommendations:", data);

      // Reload recommendations
      await loadBrandRecommendations();
    } catch (error) {
      console.error("Error generating brand recommendations:", error);
    } finally {
      setIsLoadingRecommendations(false);
    }
  };

  const loadBrandAnalytics = async (forceRescore = false) => {
    if (!activeStore?.id) return;

    try {
      setIsLoadingAnalytics(true);

      // Check if we already have brand score (skip if forcing rescore)
      if (!forceRescore) {
        const { data: latestScore } = await supabase
          .from("brand_scores")
          .select("visibility_score, updated_at")
          .eq("store_id", activeStore.id)
          .order("date", { ascending: false })
          .limit(1)
          .single();

        if (latestScore?.visibility_score !== null && latestScore?.visibility_score !== undefined) {
          setBrandVisibility(latestScore.visibility_score);
          setBrandVisibilityUpdatedAt(latestScore.updated_at);
          setIsLoadingAnalytics(false);
          return;
        }
      }

      // Generate new analytics
      const userTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
      const userDate = formatInTimeZone(new Date(), userTimeZone, "yyyy-MM-dd");

      const { data, error } = await supabase.functions.invoke("brand-analytics", {
        body: {
          storeId: activeStore.id,
          userDate: userDate,
        },
      });

      if (error) {
        console.error("Error calling brand-analytics:", error);
        throw error;
      }

      if (data?.visibilityScore !== undefined) {
        setBrandVisibility(data.visibilityScore);
        // Fetch the updated_at from the newly created score
        const { data: newScore } = await supabase
          .from("brand_scores")
          .select("updated_at")
          .eq("store_id", activeStore.id)
          .order("date", { ascending: false })
          .limit(1)
          .single();
        if (newScore?.updated_at) {
          setBrandVisibilityUpdatedAt(newScore.updated_at);
        }
      }
    } catch (error) {
      console.error("Error loading brand analytics:", error);
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  // Load company profile data
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

        if (profileData?.company_name) {
          setCompanyName(profileData.company_name);
        }
      }
    };

    loadProfile();
  }, []);

  // Protect route: redirect unauthenticated users and ensure onboarding complete
  useEffect(() => {
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      // Defer profile check to avoid deadlocks
      setTimeout(async () => {
        const { data, error } = await supabase.from("stores").select("id").eq("user_id", session.user.id).limit(1);
        if (error || !data || data.length === 0) {
          navigate("/onboarding", { replace: true });
        }
      }, 0);
    });

    supabase.auth.getSession().then(async ({ data: { session } }) => {
      if (!session) {
        navigate("/", { replace: true });
        return;
      }
      const { data, error } = await supabase.from("stores").select("id").eq("user_id", session.user.id).limit(1);
      if (error || !data || data.length === 0) {
        navigate("/onboarding", { replace: true });
      }
    });

    return () => subscription.unsubscribe();
  }, [navigate]);

  return (
    <div className="space-y-6">
      {/* Main tabs for different content */}
      {activeTab === "overview" && activeStore?.id && (
        <div className="space-y-6">
          {/* Brand Card + Brand Visibility Score - Side by side */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1">
              <BrandCard storeId={activeStore.id} />
            </div>
            <div className="lg:col-span-2">
              <BrandVisibilityOverview storeId={activeStore.id} />
            </div>
          </div>

          {/* Competitive Benchmark (Left) + Product Health Metrics (Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
            {/* Competitive Benchmark and Top Sources Feed */}
            <div className="lg:col-span-1 flex flex-col gap-6">
              {/* Competitive Benchmark (height determined by its content) */}
              <div>
                <CompetitiveBenchmark storeId={activeStore.id} brandName={activeStore.name} />
              </div>

              {/* Top Sources Feed with Fixed Height (e.g., h-96 = 24rem) */}
              <div className="h-96">
                <TopSourcesFeed storeId={activeStore.id} />
              </div>
            </div>

            {/* Product Health Metrics with Tabs */}
            <div className="lg:col-span-2 flex flex-col">
              {/* Product Health Metrics with Fixed Height (e.g., h-96 = 24rem) */}
              <div className="h-96">
                <ProductHealthMetrics storeId={activeStore.id} />
              </div>
            </div>
          </div>
        </div>
      )}

      {activeTab === "products-overview" && (
        <MyProducts activeStore={activeStore} onProductClick={(productId) => navigate(`/product/${productId}`)} />
      )}
      {activeTab === "brand-overview" && (
        <div className="grid grid-cols-2 gap-6 auto-rows-fr">
          {/* Left Column - Score & Trend */}
          <div className="space-y-6 flex flex-col">
            {/* Brand AI Visibility Score */}
            <Card className="flex-none">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle>AI Visibility Score</CardTitle>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => loadBrandAnalytics(true)}
                  disabled={isLoadingAnalytics}
                  className="gap-2"
                >
                  <RefreshCw className={`h-4 w-4 ${isLoadingAnalytics ? "animate-spin" : ""}`} />
                  Rescore
                </Button>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    {isLoadingAnalytics ? (
                      <div className="flex flex-col items-center space-y-4">
                        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                        <div className="space-y-2">
                          <p className="font-medium">Calculating AI visibility score...</p>
                          <p className="text-sm text-muted-foreground">This may take a moment</p>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="text-6xl font-bold text-primary mb-2">
                          {brandVisibility !== null ? brandVisibility : "--"}
                        </div>
                        <p className="text-muted-foreground">Average visibility across brand prompts</p>
                        {brandVisibilityUpdatedAt && (
                          <p className="text-xs text-muted-foreground mt-2">
                            Last updated: {new Date(brandVisibilityUpdatedAt).toLocaleString()}
                          </p>
                        )}
                        {brandVisibility === null && !isLoadingAnalytics && (
                          <Button onClick={() => loadBrandAnalytics(true)} className="mt-4" size="sm">
                            Generate Analytics
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Brand AI Visibility Trends */}
            <div className="flex-none">{activeStore?.id && <BrandVisibilityChart storeId={activeStore.id} />}</div>

            {/* Competitor Analytics */}
            {activeStore?.id && (
              <div className="flex-1">
                <CompetitorAnalytics storeId={activeStore.id} />
              </div>
            )}
          </div>

          {/* Right Column - AI Optimization Suggestions */}
          <div>
            <Card className="h-full flex flex-col">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                    AI Optimization Suggestions
                  </CardTitle>
                  {brandRecommendations.length === 0 && (
                    <Button onClick={handleGenerateBrandRecommendations} disabled={isLoadingRecommendations} size="sm">
                      {isLoadingRecommendations ? (
                        <>
                          <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Sparkles className="h-4 w-4 mr-2" />
                          Generate Recommendations
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardHeader>
              <CardContent className="flex-1 overflow-y-auto">
                {isLoadingRecommendations ? (
                  <div className="flex flex-col items-center justify-center py-12 space-y-4">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
                    <div className="text-center space-y-2">
                      <p className="font-medium">Generating AI optimization suggestions...</p>
                      <p className="text-sm text-muted-foreground">This may take a moment</p>
                    </div>
                  </div>
                ) : brandRecommendations.length > 0 ? (
                  <div className="space-y-4">
                    {brandRecommendations.map((rec) => (
                      <div key={rec.id} className="p-4 border rounded-lg hover:bg-accent/50 transition-colors">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold">{rec.title}</h3>
                              <Badge
                                variant={
                                  rec.impact === "high" ? "default" : rec.impact === "medium" ? "secondary" : "outline"
                                }
                                className="capitalize"
                              >
                                {rec.impact} Impact
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {rec.effort} Effort
                              </Badge>
                              <Badge variant="outline" className="capitalize">
                                {rec.category}
                              </Badge>
                            </div>
                            <p className="text-sm text-muted-foreground">{rec.description}</p>
                            {rec.site_url && (
                              <a
                                href={rec.site_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-xs text-primary hover:underline inline-flex items-center gap-1"
                              >
                                View brand website
                                <Globe className="h-3 w-3" />
                              </a>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-8">
                    <p className="text-muted-foreground mb-4">
                      No AI optimization recommendations yet. Generate recommendations to improve your brand's
                      visibility in AI-powered search.
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}
      {activeTab === "brand-competitors" && (
        <Card>
          <CardHeader>
            <CardTitle>Brand Competitor Analysis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                {
                  name: "Top Competitor Brand",
                  visibility: "85%",
                  mentions: "456",
                  avgPosition: "1.8",
                  sentiment: "8.2",
                },
                {
                  name: "Second Place Brand",
                  visibility: "78%",
                  mentions: "389",
                  avgPosition: "2.1",
                  sentiment: "7.9",
                },
                {
                  name: `${companyName} (You)`,
                  visibility: "73%",
                  mentions: "342",
                  avgPosition: "2.4",
                  sentiment: "8.6",
                },
                { name: "Third Competitor", visibility: "68%", mentions: "298", avgPosition: "2.9", sentiment: "7.5" },
              ].map((competitor, index) => (
                <div key={index} className="flex items-center justify-between p-4 rounded-lg border border-border">
                  <div className="flex items-center gap-3">
                    <span className="text-muted-foreground text-sm">{index + 1}</span>
                    <span className={`font-medium ${competitor.name.includes("You") ? "text-primary" : ""}`}>
                      {competitor.name}
                    </span>
                  </div>
                  <div className="flex gap-6 text-sm">
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Visibility</div>
                      <div className="font-medium">{competitor.visibility}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Mentions</div>
                      <div className="font-medium">{competitor.mentions}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Avg Position</div>
                      <div className="font-medium">{competitor.avgPosition}</div>
                    </div>
                    <div className="text-center">
                      <div className="text-muted-foreground text-xs">Sentiment</div>
                      <div className="font-medium">{competitor.sentiment}/10</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
      {activeTab === "prompts" && <PromptsTab activeStore={activeStore} />}
    </div>
  );
};

export default Dashboard;
