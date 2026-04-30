import React from "react";

const Testimonials = () => {
  const testimonials = [
    {
      name: "Sarah Chen",
      role: "VP Marketing, TechFlow",
      content:
        "Within weeks of using this platform, we went from invisible to being cited alongside industry leaders in AI search results. The insights are invaluable.",
      image: "/lovable-uploads/dc13e94f-beeb-4671-8a22-0968498cdb4c.png",
    },
    {
      name: "Marcus Rodriguez",
      role: "Head of SEO, BrandCorp",
      content:
        "Game-changing visibility into how AI platforms see our brand. Our GEO strategy is now data-driven and results have been phenomenal.",
      image: "/lovable-uploads/af412c03-21e4-4856-82ff-d1a975dc84a9.png",
    },
    {
      name: "Emily Watson",
      role: "Digital Strategy Lead",
      content:
        "The competitor analysis alone is worth it. We've identified and capitalized on opportunities our competitors missed in AI search.",
      image: "/lovable-uploads/5663820f-6c97-4492-9210-9eaa1a8dc415.png",
    },
  ];

  return (
    <section className="py-20 sm:py-32 bg-gradient-to-b from-white to-gray-50" id="testimonials">
      <div className="container mx-auto px-4 sm:px-6">
        <div className="text-center mb-16">
          <div className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-4">
            Customer Stories
          </div>
          <h2 className="section-title text-4xl md:text-5xl mb-4" style={{ color: '#000000' }}>
            See What Others Are Saying About Zenso
          </h2>
          <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
            Marketing teams achieving breakthrough results in AI search
          </p>
        </div>

        <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
          {testimonials.map((testimonial, index) => (
            <div
              key={index}
              className="bg-white p-8 rounded-2xl shadow-elegant hover:shadow-elegant-hover transition-all duration-300"
            >
              <p className="text-gray-700 mb-6 leading-relaxed">"{testimonial.content}"</p>
              <div className="mt-6 pt-6 border-t border-gray-200">
                <h4 className="font-bold text-gray-900 text-lg">{testimonial.name}</h4>
                <p className="text-sm text-gray-600 mt-1">{testimonial.role}</p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Testimonials;
