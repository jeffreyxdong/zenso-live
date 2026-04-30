import React, { useState, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Menu, X } from "lucide-react";
import { Link } from "react-router-dom";

const Navbar = () => {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  return (
    <header
      className={cn(
        "fixed top-0 left-0 right-0 z-50 py-4 transition-all duration-300",
        isScrolled 
          ? "bg-white/95 backdrop-blur-md shadow-sm" 
          : "bg-white/80 backdrop-blur-sm"
      )}
    >
      <div className="container flex items-center justify-between px-4 sm:px-6 lg:px-8">
        <a href="/" className="flex items-center">
          <img src="/zenso-logo.png" alt="Zenso Logo" className="h-[34px] w-auto" />
        </a>

        <nav className="hidden md:flex items-center space-x-8">
          <a href="#hero" className="text-gray-700 hover:text-pulse-600 transition-colors font-medium">Home</a>
          <a href="#features" className="text-gray-700 hover:text-pulse-600 transition-colors font-medium">Features</a>
          <a href="#testimonials" className="text-gray-700 hover:text-pulse-600 transition-colors font-medium">Customers</a>
        </nav>

        <div className="hidden md:flex items-center space-x-4">
          <Link
            to="/welcome-back"
            className="px-4 py-2 text-gray-700 hover:text-pulse-600 transition-colors font-medium"
          >
            Sign In
          </Link>
          <a
            href="https://calendly.com/onboarding-zenso/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-2.5 bg-pulse-500 text-white rounded-full hover:bg-pulse-600 transition-colors font-semibold"
          >
            Schedule Demo
          </a>
        </div>

        <button 
          className="md:hidden text-gray-700 p-3"
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {isMenuOpen && (
        <div className="md:hidden bg-white border-t border-gray-200 px-4 py-4">
          <a href="#hero" className="block py-2 text-gray-700 hover:text-pulse-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Home</a>
          <a href="#features" className="block py-2 text-gray-700 hover:text-pulse-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Features</a>
          <a href="#testimonials" className="block py-2 text-gray-700 hover:text-pulse-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Customers</a>
          <Link to="/welcome-back" className="block py-2 text-gray-700 hover:text-pulse-600 transition-colors" onClick={() => setIsMenuOpen(false)}>Sign In</Link>
          <a
            href="https://calendly.com/onboarding-zenso/30min"
            target="_blank"
            rel="noopener noreferrer"
            className="block mt-4 px-6 py-2.5 bg-pulse-500 text-white rounded-full hover:bg-pulse-600 transition-colors text-center font-semibold"
            onClick={() => setIsMenuOpen(false)}
          >
            Schedule Demo
          </a>
        </div>
      )}
    </header>
  );
};

export default Navbar;
