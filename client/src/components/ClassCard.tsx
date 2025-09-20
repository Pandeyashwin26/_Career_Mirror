import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ClassCardProps {
  classData: {
    id: string;
    title: string;
    description: string;
    category: string;
    instructor?: string;
    price: string;
    duration: string;
    location: string;
    isOnline: boolean;
    startDate: string;
    maxStudents: number;
    currentStudents: number;
    skills: string[];
    difficulty: string;
    spotsLeft: number;
    relevanceScore?: number;
  };
}

export default function ClassCard({ classData }: ClassCardProps) {
  const { toast } = useToast();

  const enrollMutation = useMutation({
    mutationFn: async () => {
      await apiRequest("POST", `/api/classes/${classData.id}/enroll`);
    },
    onSuccess: () => {
      toast({
        title: "Success",
        description: "Successfully enrolled in class",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/classes"] });
      queryClient.invalidateQueries({ queryKey: ["/api/enrollments"] });
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
        description: error.message || "Failed to enroll in class",
        variant: "destructive",
      });
    },
  });

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
    });
  };

  const getCategoryColor = (category: string) => {
    switch (category.toLowerCase()) {
      case "programming":
        return "bg-accent/10 text-accent";
      case "design":
        return "bg-blue-100 text-blue-800";
      case "business":
        return "bg-green-100 text-green-800";
      case "marketing":
        return "bg-purple-100 text-purple-800";
      case "data science":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-secondary text-secondary-foreground";
    }
  };

  const getSpotsColor = (spotsLeft: number) => {
    if (spotsLeft <= 2) return "text-red-600";
    if (spotsLeft <= 5) return "text-orange-600";
    return "text-green-600";
  };

  return (
    <Card className="border-border hover:shadow-lg transition-shadow">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center mb-2">
              <Badge className={`${getCategoryColor(classData.category)} mr-2`}>
                {classData.category}
              </Badge>
              <span className={`text-sm font-medium ${getSpotsColor(classData.spotsLeft)}`}>
                {classData.spotsLeft > 0 ? `${classData.spotsLeft} spots left` : "Full"}
              </span>
            </div>
            
            <h3 className="text-lg font-semibold text-foreground mb-2" data-testid="text-class-title">
              {classData.title}
            </h3>
            
            <p className="text-muted-foreground text-sm mb-3 line-clamp-2" data-testid="text-class-description">
              {classData.description}
            </p>
            
            <div className="flex items-center text-sm text-muted-foreground space-x-4 mb-3">
              <div className="flex items-center">
                <i className="fas fa-calendar mr-1"></i>
                <span data-testid="text-class-date">
                  {classData.startDate ? `Starts ${formatDate(classData.startDate)}` : "Date TBD"}
                </span>
              </div>
              <div className="flex items-center">
                <i className="fas fa-clock mr-1"></i>
                <span data-testid="text-class-duration">{classData.duration}</span>
              </div>
              <div className="flex items-center">
                <i className={`${classData.isOnline ? "fas fa-globe" : "fas fa-map-marker-alt"} mr-1`}></i>
                <span data-testid="text-class-location">
                  {classData.isOnline ? "Online" : classData.location}
                </span>
              </div>
            </div>

            {classData.instructor && (
              <div className="flex items-center text-sm text-muted-foreground mb-3">
                <i className="fas fa-user mr-1"></i>
                <span data-testid="text-class-instructor">{classData.instructor}</span>
              </div>
            )}

            {classData.skills && classData.skills.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-3">
                {classData.skills.slice(0, 4).map((skill, index) => (
                  <Badge key={index} variant="outline" className="text-xs">
                    {skill}
                  </Badge>
                ))}
                {classData.skills.length > 4 && (
                  <Badge variant="outline" className="text-xs">
                    +{classData.skills.length - 4} more
                  </Badge>
                )}
              </div>
            )}

            {classData.difficulty && (
              <Badge variant="secondary" className="text-xs">
                {classData.difficulty.charAt(0).toUpperCase() + classData.difficulty.slice(1)}
              </Badge>
            )}
          </div>
          
          <div className="text-right ml-4">
            <div className="text-2xl font-bold text-foreground mb-2" data-testid="text-class-price">
              ${classData.price}
            </div>
            <Button
              onClick={() => enrollMutation.mutate()}
              disabled={enrollMutation.isPending || classData.spotsLeft <= 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
              data-testid="button-enroll"
            >
              {enrollMutation.isPending ? "Enrolling..." : classData.spotsLeft > 0 ? "Enroll Now" : "Full"}
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
