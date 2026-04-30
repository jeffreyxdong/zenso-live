import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";
import { ArrowRight } from "lucide-react";
import LottieAnimation from "./LottieAnimation";

const Hero = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const imageRef = useRef<HTMLImageElement>(null);
  const [lottieData, setLottieData] = useState<any>(null);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Check if mobile on mount and when window resizes
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    checkMobile();
    window.addEventListener("resize", checkMobile);

    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    fetch("/loop-header.lottie")
      .then((response) => response.json())
      .then((data) => setLottieData(data))
      .catch((error) => console.error("Error loading Lottie animation:", error));
  }, []);

  useEffect(() => {
    // Skip effect on mobile
    if (isMobile) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !imageRef.current) return;

      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const x = (e.clientX - left) / width - 0.5;
      const y = (e.clientY - top) / height - 0.5;

      imageRef.current.style.transform = `perspective(1000px) rotateY(${x * 2.5}deg) rotateX(${-y * 2.5}deg) scale3d(1.02, 1.02, 1.02)`;
    };

    const handleMouseLeave = () => {
      if (!imageRef.current) return;
      imageRef.current.style.transform = `perspective(1000px) rotateY(0deg) rotateX(0deg) scale3d(1, 1, 1)`;
    };

    const container = containerRef.current;
    if (container) {
      container.addEventListener("mousemove", handleMouseMove);
      container.addEventListener("mouseleave", handleMouseLeave);
    }

    return () => {
      if (container) {
        container.removeEventListener("mousemove", handleMouseMove);
        container.removeEventListener("mouseleave", handleMouseLeave);
      }
    };
  }, [isMobile]);

  useEffect(() => {
    // Skip parallax on mobile
    if (isMobile) return;

    const handleScroll = () => {
      const scrollY = window.scrollY;
      const elements = document.querySelectorAll(".parallax");
      elements.forEach((el) => {
        const element = el as HTMLElement;
        const speed = parseFloat(element.dataset.speed || "0.1");
        const yPos = -scrollY * speed;
        element.style.setProperty("--parallax-y", `${yPos}px`);
      });
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, [isMobile]);

  return (
    <section
      className="overflow-hidden relative bg-cover"
      id="hero"
      style={{
        padding: isMobile ? "100px 12px 80px" : "180px 20px 80px",
      }}
    >
      <div className="container px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto" ref={containerRef}>
        <div className="w-full text-center">
          {/* Badge */}
          <div 
            className="inline-block px-4 py-2 bg-pulse-100 rounded-full text-pulse-700 font-semibold mb-6 opacity-0 animate-fade-in"
            style={{ animationDelay: "0.1s" }}
          >
            Generative Visibility Analytics
          </div>

          <h1
            className="section-title text-black text-3xl sm:text-4xl lg:text-5xl xl:text-7xl leading-tight opacity-0 animate-fade-in mx-auto"
            style={{ animationDelay: "0.3s" }}
          >
            Get Your Products Mentioned in AI Search
          </h1>

          <p
            style={{ animationDelay: "0.5s" }}
            className="section-subtitle mt-3 sm:mt-6 mb-4 sm:mb-8 leading-relaxed opacity-0 animate-fade-in text-gray-950 font-normal text-base sm:text-lg lg:text-xl mx-auto max-w-4xl"
          >
            The only AI Search dashboard that tracks your products.<br></br>See where your brand ranks, and convert
            mentions to real traffic.
          </p>

          <div
            className="flex flex-col sm:flex-row gap-4 opacity-0 animate-fade-in justify-center mb-12"
            style={{ animationDelay: "0.7s" }}
          >
            <a
              href="https://calendly.com/onboarding-zenso/30min"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center group w-full sm:w-auto text-center"
              style={{
                backgroundColor: "#1F3271",
                borderRadius: "1440px",
                boxSizing: "border-box",
                color: "#FFFFFF",
                cursor: "pointer",
                fontSize: "14px",
                lineHeight: "20px",
                padding: "16px 24px",
                border: "1px solid white",
              }}
            >
              Schedule Demo
              <ArrowRight className="ml-2 w-4 h-4 transition-transform group-hover:translate-x-1" />
            </a>
          <a
            href="https://calendly.com/onboarding-zenso/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center group w-full sm:w-auto text-center"
            style={{
              backgroundColor: "transparent",
              borderRadius: "1440px",
              boxSizing: "border-box",
              color: "#1a1a1a",
              cursor: "pointer",
              fontSize: "14px",
              lineHeight: "20px",
              padding: "16px 24px",
              border: "2px solid #1a1a1a",
            }}
          >
            Book a Demo
          </a>
        </div>
        </div>
      </div>

      <div
        className="hidden lg:block absolute bottom-0 left-1/4 w-64 h-64 bg-pulse-100/30 rounded-full blur-3xl -z-10 parallax"
        data-speed="0.05"
      ></div>
    </section>
  );
};

export default Hero;
