import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export default function Landing() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();

  // Redirect to home if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      // Don't show toast on initial load, only if user was logged out
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-pulse">
          <div className="w-8 h-8 rounded-lg bg-primary/20 mb-4"></div>
          <div className="text-lg text-muted-foreground">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="bg-card border-b border-border sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                  <i className="fas fa-graduation-cap text-white text-lg"></i>
                </div>
                <span className="text-xl font-bold text-foreground">Career Mirror</span>
              </div>
            </div>
            
            <div className="hidden md:flex items-center space-x-6">
              <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">Features</a>
              <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">How It Works</a>
              <a href="#about" className="text-muted-foreground hover:text-foreground transition-colors">About</a>
            </div>
            
            <div className="flex items-center space-x-4">
              <Button 
                variant="outline" 
                onClick={() => window.location.href = "/api/login"}
                data-testid="button-signin"
              >
                Sign In
              </Button>
              <Button 
                onClick={() => window.location.href = "/api/login"}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-getstarted"
              >
                Get Started
              </Button>
            </div>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative py-20 px-4 text-center bg-gradient-to-br from-background to-secondary/20">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-5xl font-bold text-foreground mb-6" data-testid="text-hero-title">
            Find Your Career Mirror
          </h1>
          <p className="text-xl text-muted-foreground mb-8 max-w-2xl mx-auto" data-testid="text-hero-subtitle">
            Discover professionals with similar backgrounds, identify skill gaps, and get AI-powered guidance to accelerate your career journey.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button 
              size="lg" 
              onClick={() => window.location.href = "/api/login"}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-start-journey"
            >
              Start Your Journey
            </Button>
            <Button 
              size="lg" 
              variant="outline"
              data-testid="button-learn-more"
            >
              Learn More
            </Button>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-20 px-4 bg-background">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4" data-testid="text-features-title">
              Powerful Career Intelligence
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-features-subtitle">
              Our AI-powered platform provides deep insights into your career potential and connects you with the right opportunities.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-doppelgangers">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <i className="fas fa-users text-primary text-xl"></i>
                </div>
                <CardTitle>Parallel Identities</CardTitle>
                <CardDescription>
                  Find professionals with similar backgrounds and see their career trajectories to inspire your own path.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-skillgap">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <i className="fas fa-chart-line text-accent text-xl"></i>
                </div>
                <CardTitle>Skill Gap Analysis</CardTitle>
                <CardDescription>
                  Identify missing skills for your target role and get personalized recommendations for courses and resources.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-ai">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <i className="fas fa-robot text-primary text-xl"></i>
                </div>
                <CardTitle>AI Career Guidance</CardTitle>
                <CardDescription>
                  Get personalized advice from your "future self" and receive actionable next steps for your career.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-classes">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <i className="fas fa-graduation-cap text-accent text-xl"></i>
                </div>
                <CardTitle>Smart Class Recommendations</CardTitle>
                <CardDescription>
                  Discover relevant courses and workshops based on your skill gaps and career goals.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-lifestyle">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <i className="fas fa-balance-scale text-primary text-xl"></i>
                </div>
                <CardTitle>Lifestyle Simulation</CardTitle>
                <CardDescription>
                  Understand the impact of career choices on salary, work-life balance, and stress levels.
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-border hover:shadow-lg transition-shadow" data-testid="card-feature-progress">
              <CardHeader>
                <div className="w-12 h-12 rounded-lg bg-accent/10 flex items-center justify-center mb-4">
                  <i className="fas fa-trophy text-accent text-xl"></i>
                </div>
                <CardTitle>Progress Tracking</CardTitle>
                <CardDescription>
                  Monitor your skill development and career advancement with detailed analytics and milestones.
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* How It Works Section */}
      <section id="how-it-works" className="py-20 px-4 bg-secondary/20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-foreground mb-4" data-testid="text-how-it-works-title">
              How Career Mirror Works
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto" data-testid="text-how-it-works-subtitle">
              Get started in minutes and unlock personalized career insights powered by AI.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center" data-testid="step-upload">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                1
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Upload Your Profile</h3>
              <p className="text-muted-foreground">
                Upload your CV or manually input your skills, experience, and career goals. Our AI will parse and analyze your background.
              </p>
            </div>

            <div className="text-center" data-testid="step-analyze">
              <div className="w-16 h-16 rounded-full bg-accent text-accent-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                2
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Get AI Analysis</h3>
              <p className="text-muted-foreground">
                Receive detailed skill gap analysis, parallel identity matches, and personalized recommendations for your target role.
              </p>
            </div>

            <div className="text-center" data-testid="step-grow">
              <div className="w-16 h-16 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-2xl font-bold mx-auto mb-4">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground mb-3">Accelerate Growth</h3>
              <p className="text-muted-foreground">
                Follow AI-guided career advice, enroll in recommended courses, and track your progress toward your career goals.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-4 bg-gradient-to-br from-primary to-accent text-white">
        <div className="max-w-4xl mx-auto text-center">
          <h2 className="text-3xl font-bold mb-4" data-testid="text-cta-title">
            Ready to Mirror Your Success?
          </h2>
          <p className="text-xl mb-8 opacity-90" data-testid="text-cta-subtitle">
            Join thousands of professionals who have accelerated their careers with AI-powered insights.
          </p>
          <Button 
            size="lg" 
            variant="secondary"
            onClick={() => window.location.href = "/api/login"}
            className="bg-white text-primary hover:bg-white/90"
            data-testid="button-cta-start"
          >
            Start Free Today
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 px-4 bg-card border-t border-border">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <div className="w-6 h-6 rounded bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <i className="fas fa-graduation-cap text-white text-sm"></i>
              </div>
              <span className="font-semibold text-foreground">Career Mirror</span>
            </div>
            <div className="flex space-x-6 text-sm text-muted-foreground">
              <a href="#" className="hover:text-foreground transition-colors">Privacy</a>
              <a href="#" className="hover:text-foreground transition-colors">Terms</a>
              <a href="#" className="hover:text-foreground transition-colors">Support</a>
            </div>
          </div>
          <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
            © 2025 Career Mirror. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}
