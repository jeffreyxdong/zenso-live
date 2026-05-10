import React from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight } from "lucide-react";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

interface BlogPostLayoutProps {
  tag: string;
  title: string;
  date: string;
  readTime: string;
  tags: string[];
  children: React.ReactNode;
}

const BlogPostLayout = ({
  tag,
  title,
  date,
  readTime,
  tags,
  children,
}: BlogPostLayoutProps) => {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      {/* ── Header region ─────────────────────────────────────────── */}
      <div className="pt-32 pb-0 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto">

          {/* Back link */}
          <Link
            to="/#blog"
            className="inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-gray-700 transition-colors mb-10"
          >
            <ArrowLeft size={13} /> Back to Blog
          </Link>

          {/* Author row — above the title, Alhena-style */}
          <div className="flex items-center gap-3 mb-6">
            <div className="w-9 h-9 rounded-full bg-[#1F3271] flex items-center justify-center flex-shrink-0">
              <span className="text-white text-xs font-bold">Z</span>
            </div>
            <div>
              <p className="text-sm font-semibold text-gray-800 leading-none">Zenso Team</p>
              <p className="text-xs text-gray-400 mt-0.5">{date} · {readTime} read</p>
            </div>
          </div>

          {/* Category pill */}
          <span className="inline-block px-3 py-1 bg-pulse-100 text-pulse-700 text-xs font-semibold rounded-full mb-4">
            {tag}
          </span>

          {/* Title */}
          <h1
            className="section-title text-3xl sm:text-4xl lg:text-[2.6rem] leading-[1.18] tracking-tight mb-8"
            style={{ color: "#0a0a0a" }}
          >
            {title}
          </h1>
        </div>
      </div>

      {/* ── Article body ──────────────────────────────────────────── */}
      <article className="px-4 sm:px-6 pb-16">
        {/* Narrower than the hero — creates the margin effect */}
        <div
          className="mx-auto prose prose-gray prose-lg"
          style={{ maxWidth: "672px" }}
        >
          {children}

          {/* Tags at bottom of article, Alhena-style */}
          <div className="not-prose mt-12 pt-8 border-t border-gray-100 flex flex-wrap gap-2">
            {tags.map((t) => (
              <span
                key={t}
                className="px-3 py-1 bg-gray-100 text-gray-600 text-xs font-medium rounded-full hover:bg-gray-200 transition-colors cursor-default"
              >
                {t}
              </span>
            ))}
          </div>
        </div>
      </article>

      {/* ── CTA banner ────────────────────────────────────────────── */}
      <div className="bg-[#1F3271] text-white py-16 px-4 sm:px-6">
        <div className="max-w-2xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 leading-snug">
            Find out where your products stand in AI search
          </h2>
          <p className="text-white/65 mb-8 max-w-lg mx-auto text-base leading-relaxed">
            Zenso tracks every SKU across ChatGPT, Gemini, and Perplexity — so you always know who's recommending you, and who's recommending your competitor instead.
          </p>
          <a
            href="https://calendly.com/onboarding-zenso/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-2 bg-white text-[#1F3271] font-semibold px-8 py-3 rounded-full hover:bg-gray-100 transition-colors"
          >
            Schedule a Demo <ArrowRight size={16} />
          </a>
        </div>
      </div>

      <Footer />
    </div>
  );
};

export default BlogPostLayout;
