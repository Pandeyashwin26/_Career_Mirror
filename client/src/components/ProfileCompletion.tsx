import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

interface ProfileCompletionProps {
  user?: {
    firstName?: string;
    lastName?: string;
    email?: string;
  };
  profile?: {
    currentRole?: string;
    targetRole?: string;
    education?: string;
    resumeText?: string;
    profileCompletion?: number;
  };
  skills?: Array<{
    skillName: string;
    proficiency: number;
  }>;
}

export default function ProfileCompletion({ user, profile, skills }: ProfileCompletionProps) {
  const completionScore = profile?.profileCompletion || 0;

  const completionItems = [
    {
      label: "Basic information",
      completed: !!(user?.firstName && user?.email),
      icon: "fas fa-user",
    },
    {
      label: "Current role",
      completed: !!profile?.currentRole,
      icon: "fas fa-briefcase",
    },
    {
      label: "Target role",
      completed: !!profile?.targetRole,
      icon: "fas fa-target",
    },
    {
      label: "Skills & interests",
      completed: !!(skills && skills.length > 0),
      icon: "fas fa-cogs",
    },
    {
      label: "Upload CV/Resume",
      completed: !!profile?.resumeText,
      icon: "fas fa-file-alt",
    },
  ];

  const nextIncompleteItem = completionItems.find(item => !item.completed);

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">Complete Your Profile</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Profile completion</span>
            <span className="text-sm font-medium text-foreground" data-testid="text-completion-percentage">
              {completionScore}%
            </span>
          </div>
          
          <Progress value={completionScore} className="w-full h-2" />
          
          <div className="space-y-3 mt-4">
            {completionItems.map((item, index) => (
              <div key={index} className="flex items-center text-sm" data-testid={`completion-item-${index}`}>
                <i className={`${item.completed ? "fas fa-check-circle text-green-500" : "fas fa-circle text-muted-foreground/40"} mr-2`}></i>
                <span className={item.completed ? "text-foreground" : "text-muted-foreground"}>
                  {item.label}
                </span>
              </div>
            ))}
          </div>
          
          {nextIncompleteItem && (
            <div className="mt-4 pt-4 border-t border-border">
              <div className="mb-2">
                <span className="text-sm font-medium text-foreground">Next step:</span>
                <span className="text-sm text-muted-foreground ml-1">{nextIncompleteItem.label}</span>
              </div>
              
              {nextIncompleteItem.label === "Upload CV/Resume" ? (
                <Button 
                  className="w-full bg-accent text-accent-foreground hover:bg-accent/90"
                  onClick={() => window.location.href = "/profile"}
                  data-testid="button-upload-resume"
                >
                  <i className="fas fa-upload mr-2"></i>
                  Upload CV/Resume
                </Button>
              ) : (
                <Button 
                  variant="outline"
                  className="w-full"
                  onClick={() => window.location.href = "/profile"}
                  data-testid="button-complete-profile"
                >
                  <i className={`${nextIncompleteItem.icon} mr-2`}></i>
                  Complete Profile
                </Button>
              )}
            </div>
          )}
          
          {completionScore === 100 && (
            <div className="mt-4 pt-4 border-t border-border text-center">
              <div className="flex items-center justify-center text-green-600 mb-2">
                <i className="fas fa-trophy mr-2"></i>
                <span className="font-medium">Profile Complete!</span>
              </div>
              <p className="text-sm text-muted-foreground">
                Your profile is fully optimized for the best career recommendations.
              </p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
