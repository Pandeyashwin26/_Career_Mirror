import { useState, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Slider } from "@/components/ui/slider";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";

interface LifestylePreferences {
  salaryImportance: number;
  wlbImportance: number;
  stressTolerance: number;
  remotePreference: number;
  travelWillingness: number;
}

interface SalaryData {
  role: string;
  location: string;
  p25: number;
  median: number;
  p75: number;
  currency: string;
  source: string;
  dataYear: number;
}

interface LifestyleMetrics {
  salary: SalaryData;
  workLifeBalance: number;
  stressLevel: number;
  remoteFlexibility: number;
  travelRequirement: number;
  careerGrowth: number;
}

export default function LifestyleSimulation() {
  const { toast } = useToast();
  const [targetRole, setTargetRole] = useState("");
  const [targetLocation, setTargetLocation] = useState("");
  const [preferences, setPreferences] = useState<LifestylePreferences>({
    salaryImportance: 5,
    wlbImportance: 5,
    stressTolerance: 5,
    remotePreference: 5,
    travelWillingness: 5,
  });

  const { data: profileData } = useQuery<{profile: any}>({
    queryKey: ["/api/profile"],
    retry: false,
  });

  const { data: simulationData, refetch: refetchSimulation } = useQuery<LifestyleMetrics>({
    queryKey: ["/api/lifestyle/simulate", { role: targetRole, location: targetLocation }],
    enabled: !!(targetRole && targetLocation),
    retry: false,
  });

  const updatePreferencesMutation = useMutation({
    mutationFn: async (newPreferences: LifestylePreferences) => {
      await apiRequest("PATCH", "/api/profile", newPreferences);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Lifestyle preferences updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
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
      toast({
        title: "Error",
        description: "Failed to update preferences",
        variant: "destructive",
      });
    },
  });

  // Set initial values from profile
  useEffect(() => {
    if (profileData?.profile) {
      const profile = (profileData as any).profile;
      setTargetRole(profile.targetRole || "");
      setTargetLocation(profile.location || "");
      
      if (profile.salaryImportance !== undefined) {
        setPreferences({
          salaryImportance: profile.salaryImportance || 5,
          wlbImportance: profile.wlbImportance || 5,
          stressTolerance: profile.stressTolerance || 5,
          remotePreference: profile.remotePreference || 5,
          travelWillingness: profile.travelWillingness || 5,
        });
      }
    }
  }, [profileData]);

  const handleSimulate = () => {
    if (!targetRole || !targetLocation) {
      toast({
        title: "Missing Information",
        description: "Please enter both target role and location",
        variant: "destructive",
      });
      return;
    }
    refetchSimulation();
  };

  const handlePreferenceChange = (key: keyof LifestylePreferences, value: number[]) => {
    const newPreferences = { ...preferences, [key]: value[0] };
    setPreferences(newPreferences);
    updatePreferencesMutation.mutate(newPreferences);
  };

  const getScoreColor = (score: number) => {
    if (score >= 8) return "text-green-600";
    if (score >= 6) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 8) return "Excellent";
    if (score >= 6) return "Good";
    if (score >= 4) return "Fair";
    return "Poor";
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="lg:pl-64 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Lifestyle Simulation
                </h1>
                <p className="text-muted-foreground">
                  Explore how different career choices impact your lifestyle, salary, and work-life balance
                </p>
              </div>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Input Section */}
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.1 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Simulation Parameters</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="target-role">Target Role</Label>
                          <Input
                            id="target-role"
                            value={targetRole}
                            onChange={(e) => setTargetRole(e.target.value)}
                            placeholder="e.g., Senior Software Engineer"
                            data-testid="input-target-role"
                          />
                        </div>
                        <div>
                          <Label htmlFor="target-location">Target Location</Label>
                          <Input
                            id="target-location"
                            value={targetLocation}
                            onChange={(e) => setTargetLocation(e.target.value)}
                            placeholder="e.g., San Francisco, CA"
                            data-testid="input-target-location"
                          />
                        </div>
                      </div>

                      <Separator />

                      <div className="space-y-6">
                        <h3 className="text-lg font-semibold">Your Preferences</h3>
                        
                        <div className="space-y-4">
                          <div>
                            <Label className="flex items-center justify-between">
                              <span>Salary Importance</span>
                              <Badge variant="outline" data-testid="text-salary-importance">
                                {preferences.salaryImportance}/10
                              </Badge>
                            </Label>
                            <Slider
                              value={[preferences.salaryImportance]}
                              onValueChange={(value) => handlePreferenceChange("salaryImportance", value)}
                              max={10}
                              min={1}
                              step={1}
                              className="mt-2"
                              data-testid="slider-salary-importance"
                            />
                          </div>

                          <div>
                            <Label className="flex items-center justify-between">
                              <span>Work-Life Balance Importance</span>
                              <Badge variant="outline" data-testid="text-wlb-importance">
                                {preferences.wlbImportance}/10
                              </Badge>
                            </Label>
                            <Slider
                              value={[preferences.wlbImportance]}
                              onValueChange={(value) => handlePreferenceChange("wlbImportance", value)}
                              max={10}
                              min={1}
                              step={1}
                              className="mt-2"
                              data-testid="slider-wlb-importance"
                            />
                          </div>

                          <div>
                            <Label className="flex items-center justify-between">
                              <span>Stress Tolerance</span>
                              <Badge variant="outline" data-testid="text-stress-tolerance">
                                {preferences.stressTolerance}/10
                              </Badge>
                            </Label>
                            <Slider
                              value={[preferences.stressTolerance]}
                              onValueChange={(value) => handlePreferenceChange("stressTolerance", value)}
                              max={10}
                              min={1}
                              step={1}
                              className="mt-2"
                              data-testid="slider-stress-tolerance"
                            />
                          </div>

                          <div>
                            <Label className="flex items-center justify-between">
                              <span>Remote Work Preference</span>
                              <Badge variant="outline" data-testid="text-remote-preference">
                                {preferences.remotePreference}/10
                              </Badge>
                            </Label>
                            <Slider
                              value={[preferences.remotePreference]}
                              onValueChange={(value) => handlePreferenceChange("remotePreference", value)}
                              max={10}
                              min={1}
                              step={1}
                              className="mt-2"
                              data-testid="slider-remote-preference"
                            />
                          </div>

                          <div>
                            <Label className="flex items-center justify-between">
                              <span>Travel Willingness</span>
                              <Badge variant="outline" data-testid="text-travel-willingness">
                                {preferences.travelWillingness}/10
                              </Badge>
                            </Label>
                            <Slider
                              value={[preferences.travelWillingness]}
                              onValueChange={(value) => handlePreferenceChange("travelWillingness", value)}
                              max={10}
                              min={1}
                              step={1}
                              className="mt-2"
                              data-testid="slider-travel-willingness"
                            />
                          </div>
                        </div>
                      </div>

                      <Button 
                        onClick={handleSimulate}
                        className="w-full"
                        disabled={!targetRole || !targetLocation}
                        data-testid="button-simulate"
                      >
                        Run Lifestyle Simulation
                      </Button>
                    </CardContent>
                  </Card>
                </motion.div>

                {/* Results Section */}
                <motion.div
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.5, delay: 0.2 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle>Simulation Results</CardTitle>
                    </CardHeader>
                    <CardContent>
                      {simulationData ? (
                        <div className="space-y-6">
                          {/* Salary Information */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Salary Range</h3>
                            <div className="bg-muted p-4 rounded-lg">
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-sm text-muted-foreground">25th Percentile</p>
                                  <p className="text-lg font-semibold" data-testid="text-salary-p25">
                                    ${simulationData.salary.p25.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">Median</p>
                                  <p className="text-lg font-semibold text-primary" data-testid="text-salary-median">
                                    ${simulationData.salary.median.toLocaleString()}
                                  </p>
                                </div>
                                <div>
                                  <p className="text-sm text-muted-foreground">75th Percentile</p>
                                  <p className="text-lg font-semibold" data-testid="text-salary-p75">
                                    ${simulationData.salary.p75.toLocaleString()}
                                  </p>
                                </div>
                              </div>
                              <p className="text-xs text-muted-foreground mt-2 text-center">
                                Data from {simulationData.salary.source} ({simulationData.salary.dataYear})
                              </p>
                            </div>
                          </div>

                          {/* Lifestyle Metrics */}
                          <div>
                            <h3 className="text-lg font-semibold mb-4">Lifestyle Metrics</h3>
                            <div className="space-y-4">
                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Work-Life Balance</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(simulationData.workLifeBalance)}`}>
                                    {getScoreLabel(simulationData.workLifeBalance)} ({simulationData.workLifeBalance}/10)
                                  </span>
                                </div>
                                <Progress value={simulationData.workLifeBalance * 10} data-testid="progress-work-life-balance" />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Stress Level</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(11 - simulationData.stressLevel)}`}>
                                    {getScoreLabel(11 - simulationData.stressLevel)} ({simulationData.stressLevel}/10)
                                  </span>
                                </div>
                                <Progress value={simulationData.stressLevel * 10} className="[&>[data-progress]]:bg-red-500" data-testid="progress-stress-level" />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Remote Flexibility</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(simulationData.remoteFlexibility)}`}>
                                    {getScoreLabel(simulationData.remoteFlexibility)} ({simulationData.remoteFlexibility}/10)
                                  </span>
                                </div>
                                <Progress value={simulationData.remoteFlexibility * 10} data-testid="progress-remote-flexibility" />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Travel Requirement</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(11 - simulationData.travelRequirement)}`}>
                                    {simulationData.travelRequirement <= 3 ? "Low" : simulationData.travelRequirement <= 6 ? "Medium" : "High"} ({simulationData.travelRequirement}/10)
                                  </span>
                                </div>
                                <Progress value={simulationData.travelRequirement * 10} className="[&>[data-progress]]:bg-orange-500" data-testid="progress-travel-requirement" />
                              </div>

                              <div>
                                <div className="flex items-center justify-between mb-2">
                                  <span className="text-sm font-medium">Career Growth Potential</span>
                                  <span className={`text-sm font-semibold ${getScoreColor(simulationData.careerGrowth)}`}>
                                    {getScoreLabel(simulationData.careerGrowth)} ({simulationData.careerGrowth}/10)
                                  </span>
                                </div>
                                <Progress value={simulationData.careerGrowth * 10} data-testid="progress-career-growth" />
                              </div>
                            </div>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-8">
                          <i className="fas fa-chart-line text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Simulation Yet</h3>
                          <p className="text-muted-foreground">
                            Enter your target role and location, then click "Run Simulation" to see detailed lifestyle insights.
                          </p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </motion.div>
              </div>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}