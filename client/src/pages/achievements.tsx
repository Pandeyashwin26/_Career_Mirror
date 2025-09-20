import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Navigation from "@/components/Navigation";
import Sidebar from "@/components/Sidebar";
import { motion } from "framer-motion";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";

interface Achievement {
  id: string;
  name: string;
  description: string;
  category: string;
  icon: string;
  points: number;
  isUnlocked: boolean;
  unlockedAt?: string;
  progress?: number;
  maxProgress?: number;
  requirements: string[];
}

interface UserStats {
  totalPoints: number;
  level: number;
  pointsToNextLevel: number;
  totalAchievements: number;
  unlockedAchievements: number;
  streakDays: number;
  profileCompletionPercent: number;
}

interface Milestone {
  id: string;
  title: string;
  description: string;
  category: string;
  targetValue: number;
  currentValue: number;
  isCompleted: boolean;
  reward: string;
  deadline?: string;
}

export default function Achievements() {
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const { toast } = useToast();

  const { data: achievementsData, isLoading: achievementsLoading } = useQuery<{
    achievements: Achievement[];
    userStats: UserStats;
    milestones: Milestone[];
  }>({
    queryKey: ["/api/achievements"],
    retry: false,
  });

  const claimRewardMutation = useMutation({
    mutationFn: async (achievementId: string) => {
      return apiRequest(`/api/achievements/${achievementId}/claim`, "POST");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/achievements"] });
      toast({
        title: "Reward Claimed!",
        description: "Your achievement reward has been added to your account.",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to claim reward. Please try again.",
        variant: "destructive",
      });
    },
  });

  const achievements = achievementsData?.achievements || [];
  const userStats = achievementsData?.userStats || {
    totalPoints: 0,
    level: 1,
    pointsToNextLevel: 100,
    totalAchievements: 0,
    unlockedAchievements: 0,
    streakDays: 0,
    profileCompletionPercent: 0,
  };
  const milestones = achievementsData?.milestones || [];

  const categories = [
    { id: "all", name: "All", icon: "fas fa-trophy" },
    { id: "profile", name: "Profile", icon: "fas fa-user" },
    { id: "learning", name: "Learning", icon: "fas fa-graduation-cap" },
    { id: "career", name: "Career", icon: "fas fa-briefcase" },
    { id: "social", name: "Social", icon: "fas fa-users" },
    { id: "milestone", name: "Milestones", icon: "fas fa-flag" },
  ];

  const filteredAchievements = selectedCategory === "all" 
    ? achievements 
    : achievements.filter(achievement => achievement.category === selectedCategory);

  const getXPForLevel = (level: number) => {
    return level * 100; // Simple progression: 100 XP per level
  };

  const getLevelProgress = () => {
    const currentLevelXP = getXPForLevel(userStats.level - 1);
    const nextLevelXP = getXPForLevel(userStats.level);
    const progressXP = userStats.totalPoints - currentLevelXP;
    const neededXP = nextLevelXP - currentLevelXP;
    return (progressXP / neededXP) * 100;
  };

  if (achievementsLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="flex">
          <Sidebar />
          <main className="lg:pl-64 flex-1">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
              <div className="flex items-center justify-center h-64">
                <div className="text-center">
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
                  <p className="text-muted-foreground">Loading achievements...</p>
                </div>
              </div>
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
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="mb-8">
                <h1 className="text-3xl font-bold text-foreground mb-2">
                  Achievements & Progress
                </h1>
                <p className="text-muted-foreground">
                  Track your career development journey and unlock rewards
                </p>
              </div>

              {/* User Stats Dashboard */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-primary mb-2" data-testid="user-level">
                        Level {userStats.level}
                      </div>
                      <p className="text-sm text-muted-foreground">Current Level</p>
                      <div className="mt-3">
                        <Progress value={getLevelProgress()} className="h-2" />
                        <p className="text-xs text-muted-foreground mt-1">
                          {userStats.pointsToNextLevel} XP to next level
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-green-600 mb-2" data-testid="total-points">
                        {userStats.totalPoints.toLocaleString()}
                      </div>
                      <p className="text-sm text-muted-foreground">Total XP</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-blue-600 mb-2" data-testid="achievements-unlocked">
                        {userStats.unlockedAchievements}/{userStats.totalAchievements}
                      </div>
                      <p className="text-sm text-muted-foreground">Achievements</p>
                    </div>
                  </CardContent>
                </Card>

                <Card>
                  <CardContent className="pt-6">
                    <div className="text-center">
                      <div className="text-3xl font-bold text-orange-600 mb-2" data-testid="streak-days">
                        {userStats.streakDays}
                      </div>
                      <p className="text-sm text-muted-foreground">Day Streak</p>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <Tabs value={selectedCategory} onValueChange={setSelectedCategory} className="w-full">
                <TabsList className="grid w-full grid-cols-6">
                  {categories.map((category) => (
                    <TabsTrigger 
                      key={category.id} 
                      value={category.id}
                      className="text-xs"
                      data-testid={`tab-${category.id}`}
                    >
                      <i className={`${category.icon} mr-1`}></i>
                      {category.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                <TabsContent value={selectedCategory} className="mt-6">
                  {selectedCategory === "milestone" ? (
                    /* Milestones View */
                    <div className="space-y-4">
                      <h2 className="text-xl font-semibold mb-4">Current Milestones</h2>
                      {milestones.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {milestones.map((milestone, index) => (
                            <motion.div
                              key={milestone.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              <Card className={`${milestone.isCompleted ? 'bg-green-50 dark:bg-green-900/20' : ''}`}>
                                <CardHeader className="pb-3">
                                  <div className="flex items-center justify-between">
                                    <CardTitle className="text-lg">{milestone.title}</CardTitle>
                                    {milestone.isCompleted && (
                                      <Badge variant="default" className="bg-green-600">
                                        <i className="fas fa-check mr-1"></i>
                                        Complete
                                      </Badge>
                                    )}
                                  </div>
                                </CardHeader>
                                <CardContent>
                                  <p className="text-sm text-muted-foreground mb-4">
                                    {milestone.description}
                                  </p>
                                  
                                  <div className="mb-4">
                                    <div className="flex justify-between text-sm mb-2">
                                      <span>Progress</span>
                                      <span className="font-medium">
                                        {milestone.currentValue}/{milestone.targetValue}
                                      </span>
                                    </div>
                                    <Progress 
                                      value={(milestone.currentValue / milestone.targetValue) * 100} 
                                      className="h-2"
                                    />
                                  </div>

                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-muted-foreground">Reward:</span>
                                    <Badge variant="outline">{milestone.reward}</Badge>
                                  </div>

                                  {milestone.deadline && (
                                    <div className="flex items-center justify-between text-sm mt-2">
                                      <span className="text-muted-foreground">Deadline:</span>
                                      <span className="text-xs">
                                        {new Date(milestone.deadline).toLocaleDateString()}
                                      </span>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <i className="fas fa-flag text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Active Milestones</h3>
                          <p className="text-muted-foreground">
                            Complete more activities to unlock career milestones
                          </p>
                        </div>
                      )}
                    </div>
                  ) : (
                    /* Achievements View */
                    <div className="space-y-4">
                      {filteredAchievements.length > 0 ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {filteredAchievements.map((achievement, index) => (
                            <motion.div
                              key={achievement.id}
                              initial={{ opacity: 0, y: 20 }}
                              animate={{ opacity: 1, y: 0 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                            >
                              <Card 
                                className={`relative transition-all duration-300 hover:shadow-lg ${
                                  achievement.isUnlocked 
                                    ? 'bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-900/20 dark:to-orange-900/20' 
                                    : 'opacity-75'
                                }`}
                                data-testid={`achievement-${achievement.id}`}
                              >
                                {achievement.isUnlocked && (
                                  <div className="absolute top-2 right-2">
                                    <i className="fas fa-crown text-yellow-500 text-lg"></i>
                                  </div>
                                )}
                                
                                <CardHeader className="pb-3">
                                  <div className="flex items-center space-x-3">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-xl ${
                                      achievement.isUnlocked 
                                        ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400' 
                                        : 'bg-gray-100 text-gray-400 dark:bg-gray-800 dark:text-gray-600'
                                    }`}>
                                      <i className={achievement.icon}></i>
                                    </div>
                                    <div className="flex-1">
                                      <CardTitle className={`text-lg ${achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                        {achievement.name}
                                      </CardTitle>
                                      <Badge 
                                        variant={achievement.isUnlocked ? "default" : "secondary"}
                                        className="mt-1"
                                      >
                                        {achievement.points} XP
                                      </Badge>
                                    </div>
                                  </div>
                                </CardHeader>
                                
                                <CardContent>
                                  <p className={`text-sm mb-4 ${achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'}`}>
                                    {achievement.description}
                                  </p>

                                  {achievement.progress !== undefined && achievement.maxProgress && (
                                    <div className="mb-4">
                                      <div className="flex justify-between text-sm mb-2">
                                        <span>Progress</span>
                                        <span className="font-medium">
                                          {achievement.progress}/{achievement.maxProgress}
                                        </span>
                                      </div>
                                      <Progress 
                                        value={(achievement.progress / achievement.maxProgress) * 100} 
                                        className="h-2"
                                      />
                                    </div>
                                  )}

                                  <div className="space-y-2">
                                    <p className="text-xs font-medium text-muted-foreground">Requirements:</p>
                                    <ul className="text-xs space-y-1">
                                      {achievement.requirements.map((req, reqIndex) => (
                                        <li key={reqIndex} className="flex items-center space-x-2">
                                          <i className={`fas fa-${achievement.isUnlocked ? 'check text-green-500' : 'circle text-gray-400'} text-xs`}></i>
                                          <span className={achievement.isUnlocked ? 'text-foreground' : 'text-muted-foreground'}>
                                            {req}
                                          </span>
                                        </li>
                                      ))}
                                    </ul>
                                  </div>

                                  {achievement.isUnlocked && achievement.unlockedAt && (
                                    <div className="mt-4 pt-4 border-t border-border">
                                      <div className="flex items-center justify-between">
                                        <span className="text-xs text-muted-foreground">
                                          Unlocked: {new Date(achievement.unlockedAt).toLocaleDateString()}
                                        </span>
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => claimRewardMutation.mutate(achievement.id)}
                                          disabled={claimRewardMutation.isPending}
                                          data-testid={`claim-${achievement.id}`}
                                        >
                                          {claimRewardMutation.isPending ? "Claiming..." : "Claim Reward"}
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </CardContent>
                              </Card>
                            </motion.div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-12">
                          <i className="fas fa-trophy text-4xl text-muted-foreground mb-4"></i>
                          <h3 className="text-lg font-semibold text-foreground mb-2">No Achievements Found</h3>
                          <p className="text-muted-foreground">
                            {selectedCategory === "all" 
                              ? "Start your career journey to unlock achievements!" 
                              : `No ${selectedCategory} achievements available yet.`}
                          </p>
                        </div>
                      )}
                    </div>
                  )}
                </TabsContent>
              </Tabs>
            </motion.div>
          </div>
        </main>
      </div>
    </div>
  );
}