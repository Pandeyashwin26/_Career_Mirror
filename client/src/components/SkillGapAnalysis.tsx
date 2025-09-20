import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface SkillGapAnalysisProps {
  skillGap?: {
    id: string;
    targetRole: string;
    missingSkills: string[];
    improvementSkills: string[];
    strongSkills: string[];
    recommendations: any[];
    createdAt: string;
  };
  userSkills: Array<{
    skillName: string;
    proficiency: number;
  }>;
}

export default function SkillGapAnalysis({ skillGap, userSkills }: SkillGapAnalysisProps) {
  const { toast } = useToast();

  const generateAnalysisMutation = useMutation({
    mutationFn: async (targetRole: string) => {
      await apiRequest("POST", "/api/skill-gap-analysis", { targetRole });
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Skill gap analysis updated successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/skill-gap-analysis"] });
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

  const handleFindCourse = (skill: string) => {
    // In a real implementation, this would search for courses
    toast({
      title: "Coming Soon",
      description: `Finding courses for ${skill}...`,
    });
  };

  if (!skillGap) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">Skill Gap Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <i className="fas fa-chart-line text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold text-foreground mb-2">No analysis yet</h3>
            <p className="text-muted-foreground mb-4">
              Set your target role in your profile to get personalized skill gap analysis.
            </p>
            <Button 
              variant="outline"
              onClick={() => window.location.href = "/profile"}
              data-testid="button-set-target-role"
            >
              Set Target Role
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">Skill Gap Analysis</CardTitle>
        <p className="text-sm text-muted-foreground" data-testid="text-target-role">
          Based on your target role: <strong>{skillGap.targetRole}</strong>
        </p>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {/* Missing Skills */}
          {skillGap.missingSkills && skillGap.missingSkills.length > 0 && (
            <>
              <h4 className="font-medium text-foreground mb-2">Missing Skills</h4>
              {skillGap.missingSkills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-800 rounded-lg"
                  data-testid={`missing-skill-${index}`}
                >
                  <div>
                    <span className="text-sm font-medium text-red-800 dark:text-red-200">{skill}</span>
                    <p className="text-xs text-red-600 dark:text-red-400">Missing skill</p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary hover:underline p-0 h-auto"
                    onClick={() => handleFindCourse(skill)}
                    data-testid={`button-find-course-${index}`}
                  >
                    Find Course
                  </Button>
                </div>
              ))}
            </>
          )}

          {/* Improvement Skills */}
          {skillGap.improvementSkills && skillGap.improvementSkills.length > 0 && (
            <>
              <h4 className="font-medium text-foreground mb-2 mt-4">Needs Improvement</h4>
              {skillGap.improvementSkills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-yellow-50 dark:bg-yellow-950/20 border border-yellow-200 dark:border-yellow-800 rounded-lg"
                  data-testid={`improvement-skill-${index}`}
                >
                  <div>
                    <span className="text-sm font-medium text-yellow-800 dark:text-yellow-200">{skill}</span>
                    <p className="text-xs text-yellow-600 dark:text-yellow-400">Needs improvement</p>
                  </div>
                  <Button
                    variant="link"
                    size="sm"
                    className="text-primary hover:underline p-0 h-auto"
                    onClick={() => handleFindCourse(skill)}
                    data-testid={`button-improve-skill-${index}`}
                  >
                    Find Course
                  </Button>
                </div>
              ))}
            </>
          )}

          {/* Strong Skills */}
          {skillGap.strongSkills && skillGap.strongSkills.length > 0 && (
            <>
              <h4 className="font-medium text-foreground mb-2 mt-4">Strong Skills</h4>
              {skillGap.strongSkills.map((skill, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-3 bg-green-50 dark:bg-green-950/20 border border-green-200 dark:border-green-800 rounded-lg"
                  data-testid={`strong-skill-${index}`}
                >
                  <div>
                    <span className="text-sm font-medium text-green-800 dark:text-green-200">{skill}</span>
                    <p className="text-xs text-green-600 dark:text-green-400">Strong skill</p>
                  </div>
                  <i className="fas fa-check-circle text-green-500"></i>
                </div>
              ))}
            </>
          )}
        </div>

        <div className="mt-4 pt-4 border-t border-border">
          <Button
            variant="outline"
            size="sm"
            onClick={() => generateAnalysisMutation.mutate(skillGap.targetRole)}
            disabled={generateAnalysisMutation.isPending}
            data-testid="button-refresh-analysis"
          >
            {generateAnalysisMutation.isPending ? "Analyzing..." : "Refresh Analysis"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
