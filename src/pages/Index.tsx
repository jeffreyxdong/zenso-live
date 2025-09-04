import React from "react";
import { Link } from "react-router-dom";
import SignupForm from "@/components/SignupForm";
import PlatformShowcase from "@/components/PlatformShowcase";
import { Button } from "@/components/ui/button";

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-foreground">BrandRefs</h1>
            <div className="flex items-center gap-4">
              <Link to="/dashboard">
                <Button variant="outline" size="sm">
                  View Dashboard
                </Button>
              </Link>
              <Button size="sm">
                Login
              </Button>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-12">
        <div className="flex min-h-[600px] items-center justify-center">
          <div className="flex flex-col lg:flex-row gap-8 max-w-6xl w-full items-center">
            {/* Left Side - Signup Form */}
            <div className="flex-1 flex justify-center lg:justify-end">
              <SignupForm />
            </div>

            {/* Right Side - Platform Showcase */}
            <div className="flex-1 flex justify-center lg:justify-start">
              <PlatformShowcase />
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="text-center py-12">
          <div className="max-w-4xl mx-auto">
            <p className="text-muted-foreground text-sm leading-relaxed mb-6">
              Join thousands of eCommerce stores tracking their brand visibility across AI platforms. 
              Monitor how AI recommends your products when customers ask for shopping advice.
            </p>
            <div className="flex flex-wrap justify-center gap-8 text-xs text-muted-foreground/80">
              <span>Terms of Service</span>
              <span>Privacy Policy</span>
              <span>Contact</span>
              <span>Help Center</span>
            </div>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default Index;