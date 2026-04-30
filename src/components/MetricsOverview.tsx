import React from "react";
import { ArrowRight, BarChart3, TrendingUp, Lightbulb } from "lucide-react";
import competitiveChart from "@/assets/competitive-chart.png";

const MetricsOverview = () => {
  return (
    <section className="py-0 bg-white">
      <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
        {/* Section 1: Monitor Brand Presence */}
        <div className="py-20 sm:py-32 animate-fade-in opacity-0" style={{ animationDelay: "0.1s" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div>
              <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
                AI Search Analytics
              </div>

              <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
                Monitor brand presence across AI platforms
              </h2>

              <p className="text-gray-700 text-lg mb-8 leading-relaxed">
                Stay informed with real-time monitoring of your visibility in AI environments. Access detailed analytics
                to understand mentions, citations and sentiment to guide marketing strategies effectively.
              </p>

              <a
                href="#get-access"
                className="inline-flex items-center text-black hover:text-purple-600 transition-colors group"
              >
                <span className="font-medium">Get started</span>
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Visibility</p>
                    <p className="text-black text-2xl font-bold">62%</p>
                  </div>
                  <div className="text-green-600 text-sm font-semibold">+3.2%</div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: "62%" }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">AI-referred traffic</p>
                    <p className="text-black text-2xl font-bold">1.2K</p>
                  </div>
                  <div className="text-green-600 text-sm font-semibold">+29.7%</div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: "45%" }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">First position</p>
                    <p className="text-black text-2xl font-bold">79%</p>
                  </div>
                  <div className="text-green-600 text-sm font-semibold">+11.64%</div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: "79%" }}
                  ></div>
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-gray-600 text-sm mb-1">Positive sentiment</p>
                    <p className="text-black text-2xl font-bold">86%</p>
                  </div>
                  <div className="text-green-600 text-sm font-semibold">+8.1%</div>
                </div>
                <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-purple-500 to-purple-400 rounded-full"
                    style={{ width: "86%" }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300"></div>

        {/* Section 2: Competitive Benchmarking */}
        <div className="py-20 sm:py-32 animate-fade-in opacity-0" style={{ animationDelay: "0.3s" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
            <div className="rounded-2xl overflow-hidden order-2 lg:order-1">
              <img
                src={competitiveChart}
                alt="Competitive benchmarking analytics chart showing performance trends"
                className="w-full h-auto"
              />
            </div>

            <div className="order-1 lg:order-2">
              <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
                Competitive Benchmarking
              </div>

              <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
                Understand your competitive position
              </h2>

              <p className="text-gray-700 text-lg mb-8 leading-relaxed">
                Track how your brand performs against competitors in AI responses. Monitor share of voice, uncover the
                most cited domains and how often they mention you to maximize your reach.
              </p>

              <a
                href="#get-access"
                className="inline-flex items-center text-black hover:text-purple-600 transition-colors group"
              >
                <span className="font-medium">Get started</span>
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>
          </div>
        </div>

        <div className="border-t border-gray-300"></div>

        {/* Section 3: Optimization Opportunities */}
        <div className="py-20 sm:py-32 animate-fade-in opacity-0" style={{ animationDelay: "0.5s" }}>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-start">
            <div>
              <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
                Answer Engine Optimization
              </div>

              <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
                Identify opportunities to increase visibility
              </h2>

              <p className="text-gray-700 text-lg mb-8 leading-relaxed">
                Get customized recommendations to improve your presence in AI conversations. Continuously refine your
                strategies to ensure your brand is prominently featured when customers seek solutions.
              </p>

              <a
                href="#get-access"
                className="inline-flex items-center text-black hover:text-purple-600 transition-colors group"
              >
                <span className="font-medium">Get started</span>
                <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
              </a>
            </div>

            <div className="bg-gray-50 rounded-2xl p-8 border border-gray-200">
              <h3 className="text-black text-xl font-bold mb-6">Content optimization opportunities</h3>

              <div className="space-y-6">
                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <Lightbulb className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-black font-semibold mb-1">Prompt</p>
                      <p className="text-gray-600 text-sm">What are the most fuel efficient SUVs?</p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-red-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <span className="text-red-600 text-xs">✕</span>
                    </div>
                    <div>
                      <p className="text-black font-semibold mb-1">Missed citation</p>
                      <p className="text-gray-600 text-sm">
                        Your content was found in ChatGPT search results but wasn't cited in the response.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3 mb-2">
                    <div className="w-6 h-6 rounded-full bg-purple-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <TrendingUp className="w-4 h-4 text-purple-600" />
                    </div>
                    <div>
                      <p className="text-black font-semibold mb-1">Recommendation</p>
                      <p className="text-gray-600 text-sm">
                        Optimize your content for LLMs. Update metadata, revise headings and align with prompt intent.
                      </p>
                    </div>
                  </div>
                </div>

                <div>
                  <div className="flex items-start gap-3">
                    <div className="w-6 h-6 rounded-full bg-green-500/20 flex items-center justify-center flex-shrink-0 mt-0.5">
                      <BarChart3 className="w-4 h-4 text-green-600" />
                    </div>
                    <div>
                      <p className="text-black font-semibold mb-1">Potential visibility</p>
                      <p className="text-gray-600 text-sm">
                        Projected visibility for the prompt: <span className="text-green-600 font-semibold">+24%</span>
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default MetricsOverview;
