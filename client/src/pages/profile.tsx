import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useEffect } from "react";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import FileUpload from "@/components/FileUpload";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { isUnauthorizedError } from "@/lib/authUtils";
import { queryClient, apiRequest } from "@/lib/queryClient";

export default function Profile() {
  const { toast } = useToast();
  const { isAuthenticated, isLoading } = useAuth();
  const [newSkillName, setNewSkillName] = useState("");
  const [newSkillProficiency, setNewSkillProficiency] = useState("3");
  const [profileData, setProfileData] = useState({
    currentRole: "",
    targetRole: "",
    experience: "",
    education: "",
    location: "",
    salary: "",
  });

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

  const { data: profile, isLoading: isProfileLoading, error } = useQuery({
    queryKey: ["/api/profile"],
    enabled: isAuthenticated,
    retry: false,
  });

  // Initialize form data when profile loads
  useEffect(() => {
    if ((profile as any)?.profile) {
      setProfileData({
        currentRole: (profile as any).profile.currentRole || "",
        targetRole: (profile as any).profile.targetRole || "",
        experience: (profile as any).profile.experience?.toString() || "",
        education: (profile as any).profile.education || "",
        location: (profile as any).profile.location || "",
        salary: (profile as any).profile.salary?.toString() || "",
      });
    }
  }, [profile]);

  const updateProfileMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/profile", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Profile updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
        description: "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const addSkillMutation = useMutation({
    mutationFn: async (data: any) => {
      await apiRequest("POST", "/api/skills", data);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Skill added successfully",
      });
      setNewSkillName("");
      setNewSkillProficiency("3");
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
        description: "Failed to add skill",
        variant: "destructive",
      });
    },
  });

  const deleteSkillMutation = useMutation({
    mutationFn: async (skillName: string) => {
      await apiRequest("DELETE", `/api/skills/${encodeURIComponent(skillName)}`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Skill removed successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
        description: "Failed to remove skill",
        variant: "destructive",
      });
    },
  });

  const generateSkillGapMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      await apiRequest("POST", "/api/skill-gap-analysis", { targetRole });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Skill gap analysis generated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
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
        description: "Failed to generate skill gap analysis",
        variant: "destructive",
      });
    },
  });

  if (error && isUnauthorizedError(error as Error)) {
    return null; // Will redirect in useEffect
  }

  if (isLoading || isProfileLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex">
          <Sidebar />
          <main className="lg:pl-64 flex-1 p-8">
            <div className="animate-pulse space-y-6">
              <div className="h-8 bg-muted rounded w-1/3"></div>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="h-96 bg-muted rounded-xl"></div>
                <div className="h-96 bg-muted rounded-xl"></div>
              </div>
            </div>
          </main>
        </div>
      </div>
    );
  }

  const handleProfileSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateProfileMutation.mutate({
      ...profileData,
      experience: profileData.experience ? parseInt(profileData.experience) : null,
      salary: profileData.salary ? parseInt(profileData.salary) : null,
    });
  };

  const handleAddSkill = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSkillName.trim()) return;

    addSkillMutation.mutate({
      skillName: newSkillName.trim(),
      proficiency: parseInt(newSkillProficiency),
    });
  };

  const handleDeleteSkill = (skillName: string) => {
    deleteSkillMutation.mutate(skillName);
  };

  const handleGenerateSkillGap = () => {
    if (!profileData.targetRole.trim()) {
      toast({
        title: "Target Role Required",
        description: "Please set your target role first",
        variant: "destructive",
      });
      return;
    }
    generateSkillGapMutation.mutate(profileData.targetRole);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navigation />
      <div className="flex">
        <Sidebar />
        <main className="lg:pl-64 flex-1">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-8">
              <h1 className="text-3xl font-bold text-foreground" data-testid="text-profile-title">My Profile</h1>
              <p className="mt-1 text-muted-foreground">Manage your career information and skills</p>
            </div>

            <Tabs defaultValue="basic" className="space-y-6">
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="basic" data-testid="tab-basic">Basic Info</TabsTrigger>
                <TabsTrigger value="skills" data-testid="tab-skills">Skills</TabsTrigger>
                <TabsTrigger value="resume" data-testid="tab-resume">Resume</TabsTrigger>
                <TabsTrigger value="career" data-testid="tab-career">Career Path</TabsTrigger>
              </TabsList>

              <TabsContent value="basic" className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Basic Information</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <form onSubmit={handleProfileSubmit} className="space-y-6">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="space-y-2">
                          <Label htmlFor="currentRole">Current Role</Label>
                          <Input
                            id="currentRole"
                            value={profileData.currentRole}
                            onChange={(e) => setProfileData({ ...profileData, currentRole: e.target.value })}
                            placeholder="e.g., Software Engineer"
                            data-testid="input-current-role"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="targetRole">Target Role</Label>
                          <Input
                            id="targetRole"
                            value={profileData.targetRole}
                            onChange={(e) => setProfileData({ ...profileData, targetRole: e.target.value })}
                            placeholder="e.g., Senior Software Engineer"
                            data-testid="input-target-role"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="experience">Years of Experience</Label>
                          <Input
                            id="experience"
                            type="number"
                            min="0"
                            max="50"
                            value={profileData.experience}
                            onChange={(e) => setProfileData({ ...profileData, experience: e.target.value })}
                            placeholder="e.g., 3"
                            data-testid="input-experience"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="location">Location</Label>
                          <Input
                            id="location"
                            value={profileData.location}
                            onChange={(e) => setProfileData({ ...profileData, location: e.target.value })}
                            placeholder="e.g., San Francisco, CA"
                            data-testid="input-location"
                          />
                        </div>

                        <div className="space-y-2">
                          <Label htmlFor="salary">Current Salary (optional)</Label>
                          <Input
                            id="salary"
                            type="number"
                            min="0"
                            value={profileData.salary}
                            onChange={(e) => setProfileData({ ...profileData, salary: e.target.value })}
                            placeholder="e.g., 120000"
                            data-testid="input-salary"
                          />
                        </div>
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="education">Education</Label>
                        <Textarea
                          id="education"
                          value={profileData.education}
                          onChange={(e) => setProfileData({ ...profileData, education: e.target.value })}
                          placeholder="e.g., Bachelor's in Computer Science from Stanford University"
                          rows={3}
                          data-testid="textarea-education"
                        />
                      </div>

                      <div className="flex gap-4">
                        <Button
                          type="submit"
                          disabled={updateProfileMutation.isPending}
                          data-testid="button-save-profile"
                        >
                          {updateProfileMutation.isPending ? "Saving..." : "Save Profile"}
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          onClick={handleGenerateSkillGap}
                          disabled={generateSkillGapMutation.isPending || !profileData.targetRole}
                          data-testid="button-generate-skill-gap"
                        >
                          {generateSkillGapMutation.isPending ? "Analyzing..." : "Generate Skill Gap Analysis"}
                        </Button>
                      </div>
                    </form>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="skills" className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Skills & Expertise</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {/* Add New Skill */}
                      <form onSubmit={handleAddSkill} className="flex gap-4">
                        <div className="flex-1">
                          <Input
                            value={newSkillName}
                            onChange={(e) => setNewSkillName(e.target.value)}
                            placeholder="Enter skill name"
                            data-testid="input-new-skill"
                          />
                        </div>
                        <div className="w-32">
                          <Select value={newSkillProficiency} onValueChange={setNewSkillProficiency}>
                            <SelectTrigger data-testid="select-proficiency">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="1">Beginner</SelectItem>
                              <SelectItem value="2">Basic</SelectItem>
                              <SelectItem value="3">Intermediate</SelectItem>
                              <SelectItem value="4">Advanced</SelectItem>
                              <SelectItem value="5">Expert</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <Button
                          type="submit"
                          disabled={addSkillMutation.isPending || !newSkillName.trim()}
                          data-testid="button-add-skill"
                        >
                          {addSkillMutation.isPending ? "Adding..." : "Add Skill"}
                        </Button>
                      </form>

                      {/* Skills List */}
                      <div className="space-y-4">
                        <h3 className="text-lg font-semibold text-foreground">Your Skills</h3>
                        {(profile as any)?.skills && Array.isArray((profile as any).skills) && (profile as any).skills.length > 0 ? (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {((profile as any)?.skills || []).map((skill: any) => (
                              <div
                                key={skill.id}
                                className="flex items-center justify-between p-4 bg-secondary rounded-lg"
                                data-testid={`skill-item-${skill.skillName}`}
                              >
                                <div className="flex-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium text-foreground">{skill.skillName}</span>
                                    <Badge variant="secondary">
                                      {skill.proficiency === 1 && "Beginner"}
                                      {skill.proficiency === 2 && "Basic"}
                                      {skill.proficiency === 3 && "Intermediate"}
                                      {skill.proficiency === 4 && "Advanced"}
                                      {skill.proficiency === 5 && "Expert"}
                                    </Badge>
                                  </div>
                                  <div className="flex items-center mt-2">
                                    <div className="w-full bg-muted rounded-full h-2 mr-2">
                                      <div
                                        className="bg-primary h-2 rounded-full"
                                        style={{ width: `${(skill.proficiency / 5) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteSkill(skill.skillName)}
                                  disabled={deleteSkillMutation.isPending}
                                  data-testid={`button-delete-skill-${skill.skillName}`}
                                >
                                  <i className="fas fa-trash text-destructive"></i>
                                </Button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-8">
                            <i className="fas fa-plus-circle text-4xl text-muted-foreground mb-4"></i>
                            <h3 className="text-lg font-semibold text-foreground mb-2">No skills added yet</h3>
                            <p className="text-muted-foreground">Add your skills to get personalized recommendations.</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="resume" className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Resume Upload</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <FileUpload />
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="career" className="space-y-6">
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle>Career History</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {(profile as any)?.careerPaths && Array.isArray((profile as any).careerPaths) && (profile as any).careerPaths.length > 0 ? (
                      <div className="space-y-4">
                        {((profile as any)?.careerPaths || []).map((path: any) => (
                          <div
                            key={path.id}
                            className="flex items-start p-4 bg-secondary rounded-lg"
                            data-testid={`career-path-${path.id}`}
                          >
                            <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mr-4 flex-shrink-0">
                              <i className="fas fa-briefcase text-primary"></i>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold text-foreground">{path.role}</h4>
                              {path.company && (
                                <p className="text-muted-foreground">{path.company}</p>
                              )}
                              <div className="flex items-center text-sm text-muted-foreground mt-1">
                                {path.startDate && (
                                  <span>
                                    {new Date(path.startDate).toLocaleDateString()} -{" "}
                                    {path.isCurrent ? "Present" : path.endDate ? new Date(path.endDate).toLocaleDateString() : "Present"}
                                  </span>
                                )}
                                {path.isCurrent && (
                                  <Badge variant="default" className="ml-2">Current</Badge>
                                )}
                              </div>
                              {path.description && (
                                <p className="text-sm text-muted-foreground mt-2">{path.description}</p>
                              )}
                              {path.skills && path.skills.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-2">
                                  {path.skills.map((skill: string, index: number) => (
                                    <Badge key={index} variant="outline" className="text-xs">
                                      {skill}
                                    </Badge>
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <i className="fas fa-briefcase text-4xl text-muted-foreground mb-4"></i>
                        <h3 className="text-lg font-semibold text-foreground mb-2">No career history yet</h3>
                        <p className="text-muted-foreground">Upload your resume to automatically populate your career history.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </div>
  );
}
