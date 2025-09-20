import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import ClassCard from "@/components/ClassCard";
import DoppelgangerCard from "@/components/DoppelgangerCard";
import SkillGapAnalysis from "@/components/SkillGapAnalysis";
import ProfileCompletion from "@/components/ProfileCompletion";
import AIGuidance from "@/components/AIGuidance";
import ChatWidget from "@/components/ChatWidget";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { isUnauthorizedError } from "@/lib/authUtils";
import { useState } from "react";

export default function Dashboard() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [selectedLocation, setSelectedLocation] = useState("");

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      toast({
        title: "Unauthorized",
        description: "You are logged out. Logging in again...",
        variant: "destructive",
      });
      setTimeout(() => {
        window.location.href = "/api/login";
      }, 500);
      return;
    }
  }, [isAuthenticated, isLoading, toast]);

  const { data: dashboardData, isLoading: isDashboardLoading, error } = useQuery({
    queryKey: ["/api/dashboard"],
    enabled: isAuthenticated,
    retry: false,
  });

  const { data: classes, refetch: refetchClasses } = useQuery({
    queryKey: ["/api/classes/recommended", { search: searchQuery, category: selectedCategory, location: selectedLocation }],
    enabled: isAuthenticated,
    retry: false,
  });

  // Handle search
  const handleSearch = () => {
    refetchClasses();
  };

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect in useEffect
  }

  if (isLoading || isDashboardLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex">
          <Sidebar />
          <main className="lg:pl-64 flex-1 p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                <div className="lg:col-span-2 space-y-6">
                  <div className="h-48 bg-muted rounded-xl"></div>
                  <div className="h-96 bg-muted rounded-xl"></div>
                </div>
                <div className="space-y-6">
                  <div className="h-48 bg-muted rounded-xl"></div>
                  <div className="h-48 bg-muted rounded-xl"></div>
                </div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex">
          <Sidebar />
          <main className="lg:pl-64 flex-1 p-8">
            <div className="text-center">
              <h2 className="text-2xl font-semibold text-foreground">Unable to load dashboard</h2>
              <p className="text-muted-foreground mt-2">Please try refreshing the page.</p>
            </div>
          </main>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="lg:pl-64 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            {/* Welcome Header */}
            <div className="mb-8">
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h1 className="text-3xl font-bold text-foreground" data-testid="text-welcome">
                    Welcome back, {(dashboardData as any)?.user?.firstName || 'there'}!
                  </h1>
                  <p className="mt-1 text-muted-foreground">Discover new opportunities and advance your career path</p>
                </div>
                <div className="mt-4 sm:mt-0">
                  <div className="flex items-center space-x-2 text-sm text-muted-foreground">
                    <i className="fas fa-circle text-green-500 text-xs"></i>
                    <span data-testid="text-profile-completion">
                      Profile {(dashboardData as any)?.profile?.profileCompletion || 0}% complete
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Quick Actions Bar */}
            <div className="mb-8">
              <Card className="border-border">
                <CardContent className="p-6">
                  <div className="flex flex-col lg:flex-row gap-4">
                    <div className="flex-1">
                      <div className="relative">
                        <i className="fas fa-search absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground"></i>
                        <Input
                          type="text"
                          placeholder="Search classes, workshops, or skills..."
                          className="pl-10"
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                          data-testid="input-search"
                        />
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                        <SelectTrigger className="w-48" data-testid="select-category">
                          <SelectValue placeholder="All Categories" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">All Categories</SelectItem>
                          <SelectItem value="Programming">Programming</SelectItem>
                          <SelectItem value="Design">Design</SelectItem>
                          <SelectItem value="Business">Business</SelectItem>
                          <SelectItem value="Marketing">Marketing</SelectItem>
                          <SelectItem value="Data Science">Data Science</SelectItem>
                        </SelectContent>
                      </Select>
                      <Select value={selectedLocation} onValueChange={setSelectedLocation}>
                        <SelectTrigger className="w-48" data-testid="select-location">
                          <SelectValue placeholder="Near Me" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Near Me</SelectItem>
                          <SelectItem value="Online">Online</SelectItem>
                          <SelectItem value="Downtown Campus">Downtown Campus</SelectItem>
                          <SelectItem value="North Campus">North Campus</SelectItem>
                          <SelectItem value="South Campus">South Campus</SelectItem>
                        </SelectContent>
                      </Select>
                      <Button onClick={handleSearch} data-testid="button-search">
                        Search
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-2 space-y-8">
                {/* Available Classes Section */}
<section id="classes" className="scroll-mt-24">
                  <div className="flex items-center justify-between mb-6">
                    <h2 className="text-2xl font-semibold text-foreground">Recommended Classes & Workshops</h2>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <i className="fas fa-circle text-green-500 text-xs mr-2"></i>
                      <span>Live availability</span>
                    </div>
                  </div>

                  <div className="space-y-4">
                    {classes && Array.isArray(classes) && classes.length > 0 ? (
                      classes.slice(0, 5).map((classItem: any) => (
                        <ClassCard
                          key={classItem.id}
                          classData={classItem}
                          data-testid={`card-class-${classItem.id}`}
                        />
                      ))
                    ) : (
                      <Card className="border-border">
                        <CardContent className="p-6 text-center">
                          <i className="fas fa-search text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No classes found</h3>
                          <p className="text-muted-foreground">Try adjusting your search criteria or check back later for new opportunities.</p>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {classes && Array.isArray(classes) && classes.length > 5 ? (
                    <div className="text-center mt-6">
                      <Button variant="outline" data-testid="button-view-all-classes">
                        View All Classes
                      </Button>
                    </div>
                  ) : null}
                </section>

                {/* Career Doppelgängers Section */}
<section id="doppelgangers" className="scroll-mt-24">
                  <h2 className="text-2xl font-semibold text-foreground mb-6">Your Career Doppelgängers</h2>
                  <Card className="border-border">
                    <CardHeader>
                      <CardTitle className="text-base">Similar Career Paths</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <p className="text-muted-foreground mb-4">
                        Based on your profile, here are professionals with similar backgrounds and their career journeys:
                      </p>

                      {(dashboardData as any)?.doppelgangers && Array.isArray((dashboardData as any).doppelgangers) && (dashboardData as any).doppelgangers.length > 0 ? (
                        <div className="space-y-4">
                          {((dashboardData as any)?.doppelgangers || []).map((doppelganger: any, index: number) => (
                            <DoppelgangerCard
                              key={index}
                              doppelganger={doppelganger}
                              data-testid={`card-doppelganger-${index}`}
                            />
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="fas fa-users text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No matches yet</h3>
                          <p className="text-muted-foreground">Complete your profile to find career doppelgängers with similar backgrounds.</p>
                        </div>
                      )}

                      {(dashboardData as any)?.doppelgangers && Array.isArray((dashboardData as any).doppelgangers) && (dashboardData as any).doppelgangers.length > 0 && (
                        <div className="mt-4 text-center">
                          <Button variant="link" className="text-primary" data-testid="button-view-all-matches">
                            View All Matches
                          </Button>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </section>
              </div>

              <div className="space-y-8">
                {/* Profile Completion Card */}
                <ProfileCompletion
                  user={(dashboardData as any)?.user}
                  profile={(dashboardData as any)?.profile}
                  skills={(dashboardData as any)?.skills}
                />

                {/* Skill Gap Analysis */}
                <SkillGapAnalysis
                  skillGap={(dashboardData as any)?.skillGap}
                  userSkills={(dashboardData as any)?.skills}
                />

                {/* AI Career Guidance */}
<section id="career-guidance" className="scroll-mt-24">
                  <AIGuidance
                    guidance={(dashboardData as any)?.latestGuidance}
                    userProfile={(dashboardData as any)?.profile}
                  />
                </section>
              </div>
            </div>
          </div>
        </main>
      </div>

      {/* Chat Widget */}
      <ChatWidget />
    </div>
  );
}
