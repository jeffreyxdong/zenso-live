
import React, { useEffect } from "react";
import Navbar from "@/components/Navbar";
import Hero from "@/components/Hero";
import DashboardShowcase from "@/components/DashboardShowcase";
import MetricsOverview from "@/components/MetricsOverview";
import Features from "@/components/Features";
import Testimonials from "@/components/Testimonials";
import FAQ from "@/components/FAQ";
import Footer from "@/components/Footer";
import { Separator } from "@/components/ui/separator";

const Index = () => {
  // Initialize intersection observer to detect when elements enter viewport
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("animate-fade-in");
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    
    const elements = document.querySelectorAll(".animate-on-scroll");
    elements.forEach((el) => observer.observe(el));
    
    return () => {
      elements.forEach((el) => observer.unobserve(el));
    };
  }, []);

  useEffect(() => {
    // This helps ensure smooth scrolling for the anchor links
    document.querySelectorAll('a[href^="#"]').forEach(anchor => {
      anchor.addEventListener('click', function (e) {
        e.preventDefault();
        
        const targetId = this.getAttribute('href')?.substring(1);
        if (!targetId) return;
        
        const targetElement = document.getElementById(targetId);
        if (!targetElement) return;
        
        // Increased offset to account for mobile nav
        const offset = window.innerWidth < 768 ? 100 : 80;
        
        window.scrollTo({
          top: targetElement.offsetTop - offset,
          behavior: 'smooth'
        });
      });
    });
  }, []);

  return (
    <div className="min-h-screen">
      <div 
        className="fixed inset-0 -z-10"
        style={{
          backgroundImage: 'url("/homepage-background-4.jpg")',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed',
          filter: 'brightness(1.25)',
        }}
      />
      <Navbar />
      <main>
        <Hero />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Separator className="my-0" />
        </div>
        <DashboardShowcase />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Separator className="my-0" />
        </div>
        <MetricsOverview />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Separator className="my-0" />
        </div>
        <Features />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Separator className="my-0" />
        </div>
        <Testimonials />
        <div className="container mx-auto px-4 sm:px-6 lg:px-8 max-w-7xl">
          <Separator className="my-0" />
        </div>
        <FAQ />
      </main>
      <Footer />
    </div>
  );
};

export default Index;
