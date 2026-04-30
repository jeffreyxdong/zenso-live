import React from "react";
import { BarChart3, LineChart, PieChart } from "lucide-react";

const DashboardShowcase = () => {
  return (
    <section className="py-20 sm:py-32">
      <div className="container px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
        {/* Dashboard Preview Image */}
        <div className="flex justify-center animate-fade-in opacity-0" style={{ animationDelay: "0.1s" }}>
          <img
            src="/dashboard-screenshot.png"
            alt="GEO Analytics Dashboard - Real-time AI search performance tracking"
            className="w-[110%] h-auto max-w-none -mx-[5%]"
          />
        </div>

        {/* Analytics Cards */}
        <div
          className="grid grid-cols-1 lg:grid-cols-3 gap-20 mt-16 sm:mt-20 max-w-7xl mx-auto animate-fade-in opacity-0 px-8"
          style={{ animationDelay: "0.3s" }}
        >
          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all scale-[1.15]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-purple-100 rounded-lg">
                <BarChart3 className="w-5 h-5 text-purple-600" />
              </div>
              <h3 className="font-bold text-lg">SKU-Level Insights</h3>
            </div>
            <p className="text-gray-600 mb-4">Track visibility for every product. See which SKUs win or fall behind.</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Products tracked</span>
                <span className="text-sm font-semibold text-green-600">↑ 24%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-purple-500 rounded-full" style={{ width: "82%" }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all scale-[1.15]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-blue-100 rounded-lg">
                <LineChart className="w-5 h-5 text-blue-600" />
              </div>
              <h3 className="font-bold text-lg">Competitor Benchmarking</h3>
            </div>
            <p className="text-gray-600 mb-4">Compare your product scores across generative engines.</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Competitive position</span>
                <span className="text-sm font-semibold text-blue-600">#2</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-blue-500 rounded-full" style={{ width: "68%" }}></div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl p-6 border border-gray-200 shadow-sm hover:shadow-lg transition-all scale-[1.15]">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 bg-green-100 rounded-lg">
                <PieChart className="w-5 h-5 text-green-600" />
              </div>
              <h3 className="font-bold text-lg">Visibility Optimization</h3>
            </div>
            <p className="text-gray-600 mb-4">Get actionable insights to boost product visibility across AI Search.</p>
            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-600">Optimization score</span>
                <span className="text-sm font-semibold text-green-600">↑ 15%</span>
              </div>
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                <div className="h-full bg-green-500 rounded-full" style={{ width: "73%" }}></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default DashboardShowcase;
