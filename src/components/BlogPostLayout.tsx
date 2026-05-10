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
  children: React.ReactNode;
}

const BlogPostLayout = ({ tag, title, date, readTime, children }: BlogPostLayoutProps) => {
  return (
    <div className="min-h-screen bg-background">
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

      {/* Hero header */}
      <div className="pt-32 pb-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto">
          <Link
            to="/#blog"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors mb-8"
          >
            <ArrowLeft size={14} /> Back to Blog
          </Link>

          <span className="inline-block px-3 py-1 bg-pulse-100 text-pulse-700 text-xs font-semibold rounded-full mb-5">
            {tag}
          </span>

          <h1
            className="section-title text-3xl sm:text-4xl lg:text-5xl leading-tight mb-6"
            style={{ color: "#000000" }}
          >
            {title}
          </h1>

          <div className="flex items-center gap-4 text-sm text-muted-foreground border-b pb-8">
            <span>{date}</span>
            <span>·</span>
            <span>{readTime} read</span>
          </div>
        </div>
      </div>

      {/* Article body */}
      <article className="px-4 sm:px-6 pb-24">
        <div className="max-w-3xl mx-auto prose prose-gray prose-lg max-w-none">
          {children}
        </div>
      </article>

      {/* CTA banner */}
      <div className="bg-[#1F3271] text-white py-16 px-4 sm:px-6">
        <div className="max-w-3xl mx-auto text-center">
          <h2 className="text-2xl sm:text-3xl font-bold mb-4 leading-snug">
            Find out where your products stand in AI search
          </h2>
          <p className="text-white/70 mb-8 max-w-xl mx-auto">
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
