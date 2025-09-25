import React, { useState, useEffect } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, TrendingUp, MapPin, Heart } from "lucide-react";
import ProductMetrics from "@/components/ProductMetrics";
import ProductCharts from "@/components/ProductCharts";
import SuggestionsList from "@/components/SuggestionsList";
import PreviewModal from "@/components/PreviewModal";

// Mock data types
interface Product {
  id: string;
  name: string;
  slug: string;
  status: "active" | "draft" | "archived";
  visibilityHistory: { date: string; value: number }[];
  sentimentHistory: { date: string; value: number }[];
  positionHistory: { date: string; value: number }[];
  suggestions: Suggestion[];
  competitors: Competitor[];
  currentMetrics: {
    visibility: "High" | "Medium" | "Low";
    sentiment: "Positive" | "Neutral" | "Negative";
    position: number;
  };
}

interface Suggestion {
  id: string;
  title: string; 
  description: string;
  type: "content" | "schema" | "faq" | "description";
  estimatedImpact: "High" | "Medium" | "Low";
  status: "pending" | "applied" | "generating";
}

interface Competitor {
  id: string;
  name: string;
  position: number;
  visibilityScore: number;
}

// Mock product data mapping
const mockProducts: Record<string, Product> = {
  "3a3b17c4-b668-4990-a9bb-0e00346ec454": {
    id: "3a3b17c4-b668-4990-a9bb-0e00346ec454",
    name: "Organic Cotton T-Shirt - Sustainable Fashion",
    slug: "organic-cotton-t-shirt-sustainable",
    status: "active",
    currentMetrics: {
      visibility: "Medium",
      sentiment: "Positive", 
      position: 7
    },
    visibilityHistory: [
      { date: "2024-01-01", value: 45 },
      { date: "2024-01-02", value: 52 },
      { date: "2024-01-03", value: 48 },
      { date: "2024-01-04", value: 65 },
      { date: "2024-01-05", value: 58 },
      { date: "2024-01-06", value: 62 },
      { date: "2024-01-07", value: 68 }
    ],
    sentimentHistory: [
      { date: "2024-01-01", value: 8.1 },
      { date: "2024-01-02", value: 8.3 },
      { date: "2024-01-03", value: 7.9 },
      { date: "2024-01-04", value: 8.5 },
      { date: "2024-01-05", value: 8.2 },
      { date: "2024-01-06", value: 8.7 },
      { date: "2024-01-07", value: 8.9 }
    ],
    positionHistory: [
      { date: "2024-01-01", value: 12 },
      { date: "2024-01-02", value: 10 },
      { date: "2024-01-03", value: 11 },
      { date: "2024-01-04", value: 8 },
      { date: "2024-01-05", value: 9 },
      { date: "2024-01-06", value: 7 },
      { date: "2024-01-07", value: 7 }
    ],
    suggestions: [
      {
        id: "s1",
        title: "Highlight Sustainability Certifications",
        description: "Add GOTS and OEKO-TEX certifications to product description for better eco-conscious visibility",
        type: "description",
        estimatedImpact: "High",
        status: "pending"
      },
      {
        id: "s2", 
        title: "Generate Care Instructions FAQ",
        description: "Create detailed care guide FAQ to reduce returns and improve customer satisfaction",
        type: "faq",
        estimatedImpact: "Medium",
        status: "pending"
      },
      {
        id: "s3",
        title: "Add Sustainable Product Schema",
        description: "Implement sustainability-focused structured data to improve visibility in eco searches",
        type: "schema", 
        estimatedImpact: "High",
        status: "pending"
      }
    ],
    competitors: [
      { id: "c1", name: "Patagonia Basic Tee", position: 1, visibilityScore: 92 },
      { id: "c2", name: "Everlane Organic Cotton Crew", position: 3, visibilityScore: 85 },
      { id: "c3", name: "Pact Organic Cotton Tee", position: 5, visibilityScore: 78 }
    ]
  },
  "default": {
    id: "1",
    name: "Wireless Bluetooth Headphones - Premium Sound Quality",
    slug: "wireless-bluetooth-headphones-premium",
    status: "active",
    currentMetrics: {
      visibility: "High",
      sentiment: "Positive", 
      position: 3
    },
    visibilityHistory: [
      { date: "2024-01-01", value: 65 },
      { date: "2024-01-02", value: 72 },
      { date: "2024-01-03", value: 68 },
      { date: "2024-01-04", value: 85 },
      { date: "2024-01-05", value: 78 },
      { date: "2024-01-06", value: 82 },
      { date: "2024-01-07", value: 88 }
    ],
    sentimentHistory: [
      { date: "2024-01-01", value: 7.2 },
      { date: "2024-01-02", value: 7.8 },
      { date: "2024-01-03", value: 7.5 },
      { date: "2024-01-04", value: 8.1 },
      { date: "2024-01-05", value: 7.9 },
      { date: "2024-01-06", value: 8.3 },
      { date: "2024-01-07", value: 8.5 }
    ],
    positionHistory: [
      { date: "2024-01-01", value: 8 },
      { date: "2024-01-02", value: 6 },
      { date: "2024-01-03", value: 7 },
      { date: "2024-01-04", value: 4 },
      { date: "2024-01-05", value: 5 },
      { date: "2024-01-06", value: 3 },
      { date: "2024-01-07", value: 3 }
    ],
    suggestions: [
      {
        id: "s1",
        title: "Optimize Product Description with Key Features",
        description: "Add structured bullet points highlighting battery life, sound quality, and comfort features to improve AI visibility",
        type: "description",
        estimatedImpact: "High",
        status: "pending"
      },
      {
        id: "s2", 
        title: "Generate FAQ Section",
        description: "Create comprehensive FAQ covering shipping, warranty, and compatibility questions",
        type: "faq",
        estimatedImpact: "Medium",
        status: "pending"
      },
      {
        id: "s3",
        title: "Add Product Review Schema",
        description: "Implement structured data markup to enhance visibility in AI search results",
        type: "schema", 
        estimatedImpact: "High",
        status: "pending"
      },
      {
        id: "s4",
        title: "Enhance Content with Use Cases",
        description: "Add specific use case scenarios (gaming, commuting, fitness) to improve search relevance",
        type: "content",
        estimatedImpact: "Medium",
        status: "pending"
      }
    ],
    competitors: [
      { id: "c1", name: "Sony WH-1000XM4", position: 1, visibilityScore: 95 },
      { id: "c2", name: "Bose QuietComfort 35", position: 2, visibilityScore: 89 },
      { id: "c3", name: "Apple AirPods Max", position: 4, visibilityScore: 82 },
      { id: "c4", name: "Sennheiser Momentum 4", position: 5, visibilityScore: 76 }
    ]
  }
};

const ProductOverview = () => {
  const { productId } = useParams();
  const navigate = useNavigate();
  const [product, setProduct] = useState<Product | null>(null);
  const [loading, setLoading] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [previewContent, setPreviewContent] = useState("");
  const [previewType, setPreviewType] = useState<string>("");

  useEffect(() => {
    // Simulate API call to fetch product data
    const fetchProduct = async () => {
      setLoading(true);
      // Mock API delay
      await new Promise(resolve => setTimeout(resolve, 500));
      // Get product based on productId, fallback to default
      const selectedProduct = mockProducts[productId || ""] || mockProducts["default"];
      setProduct(selectedProduct);
      setLoading(false);
    };

    fetchProduct();
  }, [productId]);

  const handleGenerateContent = async (suggestion: Suggestion) => {
    // Mock AI content generation
    const mockContent = {
      description: `
# Enhanced Product Description

## Key Features
• **Premium Sound Quality**: Advanced 40mm drivers deliver rich, detailed audio
• **30-Hour Battery Life**: All-day listening with quick charge capability
• **Active Noise Cancellation**: Block out distractions for immersive audio
• **Comfort Fit**: Soft ear cushions and adjustable headband for extended wear
• **Universal Compatibility**: Works with all Bluetooth-enabled devices

## Perfect For
- Music enthusiasts seeking studio-quality sound
- Travelers needing noise cancellation
- Professionals working from home
- Gamers wanting immersive audio experiences
      `,
      faq: `
# Frequently Asked Questions

**Q: What's the battery life?**
A: Up to 30 hours of playback time, with quick charge providing 3 hours of use in 10 minutes.

**Q: Are these compatible with my device?**
A: Yes, these headphones work with any Bluetooth-enabled device including phones, tablets, and computers.

**Q: What's included in the box?**
A: Headphones, USB-C charging cable, 3.5mm audio cable, carrying case, and user manual.

**Q: What's the warranty?**
A: 2-year manufacturer warranty covering defects and normal wear.
      `,
      schema: `
{
  "@context": "https://schema.org",
  "@type": "Product",
  "name": "Wireless Bluetooth Headphones - Premium Sound Quality",
  "description": "Premium wireless headphones with active noise cancellation",
  "brand": {
    "@type": "Brand", 
    "name": "Your Brand"
  },
  "offers": {
    "@type": "Offer",
    "price": "199.99",
    "priceCurrency": "USD",
    "availability": "https://schema.org/InStock"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.5",
    "reviewCount": "127"
  }
}
      `,
      content: `
# Use Case Scenarios

## For Music Lovers
Experience your favorite tracks like never before with studio-grade sound quality that brings out every detail in your music.

## For Travelers  
Block out airplane noise and crying babies with our advanced active noise cancellation technology.

## For Gamers
Immerse yourself in your games with precise audio positioning and crystal-clear communication.

## For Remote Workers
Stay focused during calls with noise cancellation and enjoy music during breaks without disturbing others.
      `
    };

    setPreviewContent(mockContent[suggestion.type as keyof typeof mockContent]);
    setPreviewType(suggestion.type);
    setShowPreview(true);
  };

  const handleApplyContent = (suggestionId: string) => {
    if (product) {
      const updatedSuggestions = product.suggestions.map(s => 
        s.id === suggestionId ? { ...s, status: "applied" as const } : s
      );
      setProduct({ ...product, suggestions: updatedSuggestions });
    }
    setShowPreview(false);
    console.log("Applied content to store for suggestion:", suggestionId);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Loading product details...</div>
      </div>
    );
  }

  if (!product) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-muted-foreground">Product not found</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => navigate("/dashboard")}
            className="hover:bg-muted"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>

        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-foreground">{product.name}</h1>
            <p className="text-muted-foreground mt-1">Product slug: {product.slug}</p>
          </div>
          <Badge 
            variant={product.status === "active" ? "default" : "secondary"}
            className="capitalize"
          >
            {product.status}
          </Badge>
        </div>

        {/* Metrics Cards */}
        <ProductMetrics metrics={product.currentMetrics} />

        {/* Charts */}
        <ProductCharts 
          visibilityData={product.visibilityHistory}
          sentimentData={product.sentimentHistory}
          positionData={product.positionHistory}
        />

        {/* Suggestions */}
        <SuggestionsList 
          suggestions={product.suggestions}
          onGenerateContent={handleGenerateContent}
        />

        {/* Competitors Section */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Top Competitors
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {product.competitors.map((competitor, index) => (
                <div key={competitor.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-muted flex items-center justify-center text-sm font-medium">
                      #{competitor.position}
                    </div>
                    <div>
                      <h3 className="font-medium">{competitor.name}</h3>
                      <p className="text-sm text-muted-foreground">Position #{competitor.position}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium">{competitor.visibilityScore}%</div>
                    <div className="text-sm text-muted-foreground">Visibility Score</div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <PreviewModal 
        open={showPreview}
        onOpenChange={setShowPreview}
        content={previewContent}
        type={previewType}
        onApply={() => {
          const suggestion = product.suggestions.find(s => s.type === previewType);
          if (suggestion) {
            handleApplyContent(suggestion.id);
          }
        }}
      />
    </div>
  );
};

export default ProductOverview;