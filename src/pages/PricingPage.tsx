import React, { useState, useEffect } from "react";
import { Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

const PricingPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [currentPlan, setCurrentPlan] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [checkoutLoading, setCheckoutLoading] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserPlan = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          // Redirect to login if not authenticated
          navigate("/welcome-back");
          return;
        }

        const { data: profile } = await supabase
          .from("profiles")
          .select("subscription_plan")
          .eq("user_id", session.user.id)
          .single();
        
        if (profile) {
          setCurrentPlan(profile.subscription_plan);
        }
      } catch (error) {
        console.error("Error fetching user plan:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchUserPlan();
  }, [navigate]);

  // Payment links with free trial (for new users)
  const trialPaymentLinks: Record<string, string> = {
    "self-serve": "https://buy.stripe.com/4gM14hg0OdxCaMK9Ft6Vq03",
    "growth": "https://buy.stripe.com/28E28l8ymdxC4om6th6Vq04",
  };

  // Payment links without free trial (for existing subscribers switching plans)
  const switchPaymentLinks: Record<string, string> = {
    "self-serve": "https://buy.stripe.com/5kQ9ANaGu2SYf30g3R6Vq05",
    "growth": "https://buy.stripe.com/5kQeV77ui65adYWbNB6Vq06",
  };

  const handleSubscribe = async (plan: typeof plans[0]) => {
    setCheckoutLoading(plan.planId);
    
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        navigate("/welcome-back");
        return;
      }

      // Use switch links if user already has a plan, otherwise use trial links
      const hasExistingPlan = currentPlan && currentPlan.trim() !== '';
      const paymentLink = hasExistingPlan 
        ? switchPaymentLinks[plan.planId] 
        : trialPaymentLinks[plan.planId];

      // Construct Payment Link with client_reference_id for user tracking
      const paymentUrl = `${paymentLink}?client_reference_id=${session.user.id}`;
      
      // Redirect directly to Stripe Payment Link
      window.location.href = paymentUrl;
    } catch (error) {
      console.error("Error:", error);
      toast({
        title: "Error", 
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      });
      setCheckoutLoading(null);
    }
  };

  const plans = [
    {
      name: "Self-Serve",
      planId: "self-serve",
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
      cta: "Start for Free",
    },
    {
      name: "Growth",
      planId: "growth",
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
      cta: "Start for Free",
    },
    {
      name: "Enterprise",
      planId: "enterprise",
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
      cta: "Get in Touch",
    },
  ];

  const isCurrentPlan = (planId: string) => {
    return !isLoading && currentPlan === planId;
  };

  return (
    <div className="homepage-theme min-h-screen">
      <div
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: 'url("/homepage-background-4.jpg")',
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundAttachment: "fixed",
          filter: "brightness(1.25)",
        }}
      />
      <Navbar />
      
      <main className="pt-24 pb-16">
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          {/* Header Section */}
          <div className="text-center mb-12 space-y-4">
            <Badge 
              variant="secondary" 
              className="mb-4 px-4 py-2 text-base bg-pulse-100/80 text-pulse-700 border-pulse-200"
            >
              Pricing
            </Badge>
            
            <h1 className="text-4xl md:text-5xl lg:text-6xl font-bold text-gray-900 mb-4">
              Choose the Right Plan for your Business
            </h1>
            
            <p className="text-lg md:text-xl text-gray-600 max-w-3xl mx-auto">
              Scale your AI visibility with flexible options for every stage
            </p>
          </div>

          {/* Pricing Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 max-w-7xl mx-auto">
            {plans.map((plan, index) => {
              const isActive = isCurrentPlan(plan.planId);
              
              return (
                <div
                  key={index}
                  className={`
                    bg-white/90 backdrop-blur-sm rounded-2xl border-2 shadow-lg
                    transition-all duration-300 hover:shadow-xl hover:-translate-y-1
                    flex flex-col relative
                    ${isActive ? "border-pulse-500 ring-2 ring-pulse-500 ring-offset-2" : "border-gray-200"}
                  `}
                >
                  {isActive && (
                    <div className="absolute -top-3 left-1/2 transform -translate-x-1/2">
                      <Badge className="bg-pulse-600 text-white px-4 py-1 text-sm font-semibold">
                        Current Plan
                      </Badge>
                    </div>
                  )}
                <div className="p-8 flex-1 flex flex-col">
                  {/* Plan Header */}
                  <div className="mb-6">
                    <h3 className="text-sm font-medium text-gray-600 mb-2">
                      {plan.name}
                    </h3>
                    <div className="flex items-baseline gap-1 mb-2">
                      <span className="text-5xl font-bold text-gray-900">
                        {plan.price}
                      </span>
                      {plan.period && (
                        <span className="text-gray-600 text-lg">
                          {plan.period}
                        </span>
                      )}
                    </div>
                    <p className="text-gray-600">{plan.description}</p>
                  </div>

                  {/* Badge */}
                  <div className="mb-6">
                    <span className="text-sm font-semibold text-gray-900">
                      {plan.badge}
                    </span>
                  </div>

                  {/* Features List */}
                  <ul className="space-y-4 mb-8 flex-1">
                    {plan.features.map((feature, featureIndex) => (
                      <li key={featureIndex} className="flex items-start gap-3">
                        <Check className="w-5 h-5 text-pulse-600 flex-shrink-0 mt-0.5" />
                        <span className="text-gray-700 text-sm leading-relaxed">
                          {feature}
                        </span>
                      </li>
                    ))}
                  </ul>

                  {/* CTA Button */}
                  {isActive ? (
                    <Button
                      disabled
                      className="w-full py-6 text-base font-semibold rounded-lg bg-gray-200 text-gray-600 cursor-not-allowed"
                    >
                      Current Plan
                    </Button>
                  ) : (
                    <Button
                      onClick={() => {
                        if (plan.name === "Enterprise") {
                          window.open("https://calendly.com/onboarding-zenso/30min", "_blank", "noopener,noreferrer");
                        } else {
                          handleSubscribe(plan);
                        }
                      }}
                      disabled={checkoutLoading === plan.planId}
                      className={`
                        w-full py-6 text-base font-semibold rounded-lg
                        transition-all duration-300
                        ${
                          plan.name === "Enterprise"
                            ? "bg-white text-gray-900 border-2 border-gray-900 hover:bg-gray-50"
                            : "bg-pulse-600 text-white hover:bg-pulse-700"
                        }
                      `}
                    >
                      {checkoutLoading === plan.planId 
                        ? "Loading..." 
                        : plan.name === "Enterprise" 
                          ? plan.cta 
                          : (currentPlan && currentPlan !== null && !isLoading)
                            ? `Switch to ${plan.name}` 
                            : plan.cta}
                    </Button>
                  )}
                </div>
              </div>
              );
            })}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default PricingPage;
