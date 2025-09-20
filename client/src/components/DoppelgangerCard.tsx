import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface DoppelgangerCardProps {
  doppelganger: {
    userId: string;
    profileData: {
      name?: string;
      currentRole?: string;
      experience?: number;
      skills?: Array<{ skillName: string; proficiency: number }>;
      careerPaths?: Array<{
        role: string;
        company?: string;
        startDate?: string;
        endDate?: string;
        isCurrent?: boolean;
      }>;
    };
    similarity: number;
    careerPath?: string;
    currentRole?: string;
    skills?: string[];
  };
}

export default function DoppelgangerCard({ doppelganger }: DoppelgangerCardProps) {
  const getInitials = (name?: string) => {
    if (!name) return "??";
    const parts = name.split(" ");
    return parts.length >= 2 
      ? `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase()
      : name.slice(0, 2).toUpperCase();
  };

  const getGradientClass = (similarity: number) => {
    if (similarity >= 0.8) return "from-primary to-accent";
    if (similarity >= 0.6) return "from-accent to-primary";
    return "from-secondary to-muted";
  };

  const generateCareerSummary = () => {
    if (doppelganger.careerPath) {
      return doppelganger.careerPath;
    }
    
    const paths = doppelganger.profileData?.careerPaths;
    if (!paths || paths.length === 0) {
      return "Career path information not available";
    }

    const sortedPaths = paths.sort((a, b) => 
      new Date(a.startDate || "1970-01-01").getTime() - new Date(b.startDate || "1970-01-01").getTime()
    );

    const pathSummary = sortedPaths.map(path => path.role).join(" → ");
    const timeframe = paths.length > 1 ? `(${paths.length} roles)` : "(1 role)";
    
    return `${pathSummary} ${timeframe}`;
  };

  const displayName = doppelganger.profileData?.name || "Anonymous Professional";
  const displayRole = doppelganger.currentRole || doppelganger.profileData?.currentRole || "Professional";
  const displaySkills = doppelganger.skills || doppelganger.profileData?.skills?.map(s => s.skillName) || [];
  const matchPercentage = Math.round(doppelganger.similarity * 100);

  return (
    <div className="flex items-center p-4 bg-secondary rounded-lg hover:bg-secondary/80 transition-colors">
      <div className={`w-12 h-12 bg-gradient-to-br ${getGradientClass(doppelganger.similarity)} rounded-full flex items-center justify-center text-white font-semibold`}>
        {getInitials(displayName)}
      </div>
      
      <div className="ml-4 flex-1">
        <h4 className="font-semibold text-foreground" data-testid="text-doppelganger-name">
          {displayName} - {displayRole}
        </h4>
        <p className="text-sm text-muted-foreground mb-2" data-testid="text-doppelganger-path">
          {generateCareerSummary()}
        </p>
        
        {displaySkills.length > 0 && (
          <div className="flex items-center gap-1 flex-wrap">
            {displaySkills.slice(0, 3).map((skill, index) => (
              <Badge key={index} variant="outline" className="text-xs">
                {skill}
              </Badge>
            ))}
            {displaySkills.length > 3 && (
              <Badge variant="outline" className="text-xs">
                +{displaySkills.length - 3} more
              </Badge>
            )}
          </div>
        )}
      </div>
      
      <div className="text-right">
        <div className="text-sm font-semibold text-foreground mb-1" data-testid="text-doppelganger-match">
          {matchPercentage}% match
        </div>
        <Button 
          variant="link" 
          size="sm" 
          className="text-primary hover:underline p-0 h-auto"
          data-testid="button-view-path"
        >
          View Path
        </Button>
      </div>
    </div>
  );
}
