import React from "react";
import { Search, TrendingUp, Bell, FileText, Users, Sparkles } from "lucide-react";

const Features = () => {
  const features = [
    {
      icon: Search,
      title: "Visibility Score",
      description:
        "Track what percentage of category-relevant prompts mention your brand across all major generative engines. Your Domain Authority for AI Search.",
    },
    {
      icon: TrendingUp,
      title: "Sentiment Analysis",
      description:
        "Understand whether AI recommends, remains neutral, or criticizes your brand—and track how perception shifts over time.",
    },
    {
      icon: Users,
      title: "Competitive Positioning",
      description:
        "See your comparative rank vs. competitors across hundreds of prompts. Know where you're winning or losing mindshare.",
    },
    {
      icon: FileText,
      title: "Source Intelligence",
      description:
        "Discover which sites, reviews, or datasets AI models cite when referencing your brand. Optimize what matters.",
    },
    {
      icon: Bell,
      title: "Real-Time Scoring",
      description:
        "Track your visibility score in real-time as AI models respond to queries. See immediate changes in how generative engines reference your brand.",
    },
    {
      icon: Sparkles,
      title: "Category-First Analytics",
      description:
        "Filter by product line, query type, or time horizon. The first analytics platform built for the generative web.",
    },
  ];

  return (
    <section className="py-20 sm:py-32 bg-white" id="features">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16 animate-on-scroll">
          <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
            Core Metrics
          </div>
          <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
            The Intelligence Layer for Generative Search
          </h2>
          <p className="section-subtitle text-lg max-w-2xl mx-auto" style={{ color: "#000000" }}>
            Track the four metrics that define brand visibility in the AI era
          </p>
        </div>

        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div
              key={index}
              className="p-8 bg-gradient-to-br from-white to-gray-50 rounded-2xl border border-gray-200 hover:border-pulse-300 hover:shadow-elegant transition-all duration-300 animate-on-scroll"
              style={{ animationDelay: `${index * 0.1}s` }}
            >
              <div className="w-14 h-14 bg-gradient-to-br from-pulse-100 to-pulse-200 rounded-xl flex items-center justify-center mb-6">
                <feature.icon className="w-7 h-7 text-pulse-600" />
              </div>
              <h3 className="text-xl font-bold mb-3 text-gray-900">{feature.title}</h3>
              <p className="text-gray-600 leading-relaxed">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
