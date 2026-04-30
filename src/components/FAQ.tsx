import React from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

const FAQ = () => {
  const faqs = [
    {
      question: "Is there any difference between GEO and SEO?",
      answer: "Yes, GEO (Generative Engine Optimization) focuses on optimizing content for AI-powered search engines and large language models, while SEO (Search Engine Optimization) targets traditional search engines like Google. GEO requires understanding how AI models process and present information, while SEO focuses on keywords, backlinks, and traditional ranking factors."
    },
    {
      question: "How can I increase my AI visibility?",
      answer: "To increase AI visibility, focus on creating high-quality, authoritative content that AI models can easily understand and cite. This includes structured data, clear attribution, comprehensive coverage of topics, and building authority in your domain. Our platform provides specific recommendations and tracking to help you optimize for AI visibility."
    },
    {
      question: "Is GEO going to be more important that SEO?",
      answer: "As AI-powered search continues to grow, GEO is becoming increasingly important alongside SEO. Many experts predict that AI search will complement and eventually surpass traditional search in certain use cases. Smart brands are investing in both SEO and GEO to ensure they're visible across all search modalities."
    },
    {
      question: "Is there a benefit to optimize for GEO now when most people still use normal search engines?",
      answer: "Absolutely. Early adoption of GEO provides a significant competitive advantage. As AI search adoption grows, brands that have already optimized their content and built authority with AI models will be well-positioned. Additionally, many GEO best practices (like authoritative content and clear structure) also benefit traditional SEO."
    },
    {
      question: "How is Zenso different from other AI Visibility trackers?",
      answer: "Zenso is the only GEO tracker that provides product-level tracking, allowing you to quickly see how each SKU is performing relative to competitors."
    }
  ];

  return (
    <section className="py-20 sm:py-32 bg-background">
      <div className="container mx-auto px-4 sm:px-6 max-w-4xl">
        <div className="text-center mb-12">
          <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
            FAQs
          </div>
          <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: '#000000' }}>
            Frequently Asked Questions
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Get answers to common questions about AI visibility and optimization
          </p>
        </div>
        
        <Accordion type="single" collapsible className="space-y-4">
          {faqs.map((faq, index) => (
            <AccordionItem 
              key={index} 
              value={`item-${index}`}
              className="bg-card rounded-lg px-6 border"
            >
              <AccordionTrigger className="text-left hover:no-underline">
                <span className="text-base font-medium text-foreground pr-4">
                  {faq.question}
                </span>
              </AccordionTrigger>
              <AccordionContent className="text-muted-foreground">
                {faq.answer}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
};

export default FAQ;
