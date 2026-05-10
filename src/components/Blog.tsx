import React from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

const posts = [
  {
    tag: "GEO Strategy",
    emoji: "🔍",
    emojiBg: "bg-emerald-50",
    title: "Why your bestseller is invisible to ChatGPT — and how to fix it",
    excerpt:
      "AI engines don't crawl product pages the same way Google does. We break down the exact structural and content gaps that cause high-performing DTC SKUs to go unmentioned in AI recommendations.",
    date: "May 6, 2026",
    href: "/blog/chatgpt-invisible-products",
  },
  {
    tag: "Data & Trends",
    emoji: "📊",
    emojiBg: "bg-amber-50",
    title: "AI-referred traffic converts at 9.84% — here's what that means for DTC",
    excerpt:
      "A shopper arriving via a ChatGPT recommendation is already pre-sold. We dig into the conversion data, compare it to paid and organic channels, and explain why AI share is becoming the most valuable metric in e-commerce.",
    date: "Apr 22, 2026",
    href: "/blog/ai-traffic-conversion",
  },
  {
    tag: "Platform Deep-Dive",
    emoji: "🤖",
    emojiBg: "bg-blue-50",
    title: "ChatGPT vs. Gemini vs. Perplexity: which AI engine matters most for your category?",
    excerpt:
      "Not all AI engines weight the same signals or serve the same audiences. We analyzed 10,000+ product queries across platforms to show DTC brands where to focus their GEO effort first.",
    date: "Apr 10, 2026",
    href: "/blog/chatgpt-vs-gemini-vs-perplexity",
  },
];

const Blog = () => {
  return (
    <section id="blog" className="py-20 sm:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 max-w-7xl">
        {/* Header */}
        <div className="text-center mb-14">
          <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
            From the Blog
          </div>
          <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: "#000000" }}>
            Insights on AI Visibility &amp; GEO
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Practical strategies and data-backed research to help DTC brands win AI search.
          </p>
        </div>

        {/* Cards grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {posts.map((post, i) => (
            <article
              key={i}
              className="bg-card border rounded-xl flex flex-col hover:-translate-y-1 hover:shadow-md transition-all duration-200"
            >
              {/* Body */}
              <div className="p-6 flex flex-col flex-1">
                <span className="inline-block px-3 py-1 bg-pulse-100 text-pulse-700 text-xs font-semibold rounded-full mb-4 w-fit">
                  {post.tag}
                </span>
                <Link to={post.href}>
                  <h3 className="font-semibold text-foreground text-lg leading-snug mb-3 hover:text-pulse-600 transition-colors">
                    {post.title}
                  </h3>
                </Link>
                <p className="text-muted-foreground text-sm leading-relaxed flex-1 mb-6">
                  {post.excerpt}
                </p>
                <div className="flex items-center justify-between pt-4 border-t">
                  <span className="text-xs text-muted-foreground">{post.date}</span>
                  <Link
                    to={post.href}
                    className="inline-flex items-center gap-1 text-sm font-medium text-pulse-600 hover:text-pulse-700 transition-colors"
                  >
                    Read more <ArrowRight size={14} />
                  </Link>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Blog;
