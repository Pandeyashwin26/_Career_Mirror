import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface AIGuidanceProps {
  guidance?: {
    id: string;
    response: string;
    createdAt: string;
    guidanceType: string;
  };
  userProfile?: {
    currentRole?: string;
    targetRole?: string;
  };
}

export default function AIGuidance({ guidance, userProfile }: AIGuidanceProps) {
  const { toast } = useToast();

  const generateGuidanceMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("POST", "/api/ai-guidance");
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "AI guidance generated successfully",
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
        description: "Failed to generate AI guidance",
        variant: "destructive",
      });
    },
  });

  if (!guidance) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-lg">AI Career Guidance</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <i className="fas fa-robot text-4xl text-muted-foreground mb-4"></i>
            <h3 className="text-lg font-semibold text-foreground mb-2">No guidance yet</h3>
            <p className="text-muted-foreground mb-4">
              Get personalized AI-powered career advice based on your profile and goals.
            </p>
            <Button
              onClick={() => generateGuidanceMutation.mutate()}
              disabled={generateGuidanceMutation.isPending || !userProfile?.targetRole}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-generate-guidance"
            >
              {generateGuidanceMutation.isPending ? "Generating..." : "Get AI Guidance"}
            </Button>
            {!userProfile?.targetRole && (
              <p className="text-xs text-muted-foreground mt-2">
                Set your target role in profile to get guidance
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    );
  }

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <Card className="border-border">
      <CardHeader>
        <CardTitle className="text-lg">AI Career Guidance</CardTitle>
        <p className="text-xs text-muted-foreground">
          Generated {formatDate(guidance.createdAt)}
        </p>
      </CardHeader>
      <CardContent>
        <div className="bg-gradient-to-r from-primary/10 to-accent/10 rounded-lg p-4 border border-primary/20">
          <div className="flex items-start">
            <div className="w-8 h-8 bg-primary rounded-full flex items-center justify-center mr-3 flex-shrink-0">
              <i className="fas fa-robot text-white text-sm"></i>
            </div>
            <div className="flex-1">
              <p className="text-sm text-foreground leading-relaxed mb-3" data-testid="text-ai-guidance">
                {guidance.response}
              </p>
              <div className="flex gap-2">
                <Button
                  variant="link"
                  size="sm"
                  onClick={() => generateGuidanceMutation.mutate()}
                  disabled={generateGuidanceMutation.isPending}
                  className="text-primary hover:underline p-0 h-auto"
                  data-testid="button-refresh-guidance"
                >
                  {generateGuidanceMutation.isPending ? "Generating..." : "Get new guidance"}
                </Button>
                <Button
                  variant="link"
                  size="sm"
                  className="text-primary hover:underline p-0 h-auto"
                  data-testid="button-detailed-guidance"
                >
                  Get detailed guidance
                </Button>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
