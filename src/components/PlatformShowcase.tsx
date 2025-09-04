import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { CheckCircle2, Lock } from "lucide-react";
import aiPlatformsBanner from "@/assets/ai-platforms-banner.jpg";

const PlatformShowcase = () => {
  const features = [
    "Track product recommendations in AI responses",
    "Monitor competitor mentions across platforms",
    "Discover which sources AI cites for your niche",
    "Get alerts when your brand gets mentioned"
  ];

  return (
    <Card className="w-full max-w-md shadow-lg">
      <CardContent className="p-8">
        {/* AI Platform Logos Banner */}
        <div className="mb-6 rounded-lg overflow-hidden bg-muted/30 p-4">
          <img 
            src={aiPlatformsBanner} 
            alt="AI platforms including ChatGPT, Claude, Gemini, and others"
            className="w-full h-24 object-cover rounded-md"
          />
        </div>

        {/* Header */}
        <div className="flex items-center gap-2 mb-4">
          <Lock className="text-primary w-5 h-5" />
          <h2 className="text-xl font-bold text-foreground">
            eCommerce AI Visibility Tracking
          </h2>
        </div>

        <p className="text-muted-foreground mb-6 leading-relaxed">
          BrandRefs helps eCommerce stores track how AI platforms recommend their products. 
          Monitor brand mentions across ChatGPT, Perplexity, Gemini when customers ask for shopping advice.
        </p>

        {/* Trust Indicators */}
        <div className="mb-6">
          <p className="text-sm text-muted-foreground mb-3">
            Trusted by eCommerce Brands & Digital Marketers:
          </p>
          <div className="flex items-center gap-4 text-muted-foreground/60 text-xs font-medium">
            <span>TechStore</span>
            <span>FashionPlus</span>
            <span>HomeGoods</span>
          </div>
        </div>

        {/* Features */}
        <div className="space-y-3 mb-6">
          <h3 className="font-semibold text-foreground mb-4">
            Unlock powerful insights:
          </h3>
          
          {features.map((feature, index) => (
            <div key={index} className="flex items-start gap-3">
              <CheckCircle2 className="text-success w-5 h-5 mt-0.5 flex-shrink-0" />
              <span className="text-sm text-foreground leading-relaxed">
                {feature}
              </span>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};

export default PlatformShowcase;