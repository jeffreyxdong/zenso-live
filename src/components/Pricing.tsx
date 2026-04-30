import React from "react";
import { Check } from "lucide-react";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

const Pricing = () => {
  const plans = [
    {
      name: "Self-Serve",
      price: "$99",
      period: "/month",
      description: "Get started right away",
      badge: "Essential Features",
      features: [
        "Track brand visibility across all major LLMs (ChatGPT, Perplexity, Gemini, Claude)",
        "Import custom product catalogs for product-level insights",
        "Daily scoring of up to 5 products and 3 prompts",
        "Basic competitor visibility snapshot",
        "Identify citation sources for tracked products",
      ],
      buttonText: "Start for Free",
      buttonVariant: "default" as const,
      buttonLink: "https://buy.stripe.com/4gM14hg0OdxCaMK9Ft6Vq03",
      highlighted: false,
    },
    {
      name: "Growth",
      price: "$199",
      period: "/month",
      description: "Scale your business and brand",
      badge: "Everything in Self-Serve plus",
      features: [
        "Daily scoring of up to 25 products",
        "Track up to 15 prompts",
        "Weekly visibility trend reports",
        "Automated GEO recommendations via schema and prompt optimization)",
        "Priority email support",
      ],
      buttonText: "Start for Free",
      buttonVariant: "default" as const,
      buttonLink: "https://buy.stripe.com/28E28l8ymdxC4om6th6Vq04",
      highlighted: false,
    },
    {
      name: "Enterprise",
      price: "Custom",
      period: "",
      description: "Comprehensive GEO Platform",
      badge: "Everything in Growth plus",
      features: [
        "LLM traffic analysis and insights",
        "Unlimited product tracking and one-click import via bulk upload",
        "Track up to 100 prompts",
        "White-glove platform configuration and training",
        "Dedicated GEO specialist",
        "Priority Support SLA (under 2h response)",
      ],
      buttonText: "Get in Touch",
      buttonVariant: "outline" as const,
      buttonLink: "https://calendly.com/onboarding-zenso/30min",
      highlighted: true,
    },
  ];

  return (
    <section id="pricing" className="py-20 sm:py-32 bg-gradient-to-b from-background to-secondary/20">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
            Pricing
          </div>
          <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
            Choose the Right Plan for your Business
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Scale your AI visibility with flexible options for every stage
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-6 max-w-6xl mx-auto">
          {plans.map((plan) => (
            <Card key={plan.name} className="flex flex-col border-primary/50">
              <CardHeader>
                <div className="flex items-center justify-between mb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">{plan.name}</CardTitle>
                </div>
                <div className="mb-2">
                  <span className="text-4xl font-bold text-foreground">{plan.price}</span>
                  {plan.period && <span className="text-muted-foreground ml-1">{plan.period}</span>}
                </div>
                <CardDescription>{plan.description}</CardDescription>
                {plan.badge && (
                  <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-xs font-semibold w-fit mt-4">
                    {plan.badge}
                  </div>
                )}
              </CardHeader>
              <CardContent className="flex-1">
                <ul className="space-y-3">
                  {plan.features.map((feature, index) => (
                    <li key={index} className="flex items-start gap-2">
                      <Check className="h-5 w-5 text-primary shrink-0 mt-0.5" />
                      <span className="text-sm text-foreground">{feature}</span>
                    </li>
                  ))}
                </ul>
              </CardContent>
              <CardFooter>
                {plan.buttonLink ? (
                  <Button variant={plan.buttonVariant} className="w-full" size="lg" asChild>
                    <a href={plan.buttonLink} target="_blank" rel="noopener noreferrer">
                      {plan.buttonText}
                    </a>
                  </Button>
                ) : (
                  <Button variant={plan.buttonVariant} className="w-full" size="lg">
                    {plan.buttonText}
                  </Button>
                )}
              </CardFooter>
            </Card>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Pricing;
