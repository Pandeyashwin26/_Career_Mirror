import { Link, useLocation } from "wouter";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";

export default function Navigation() {
  const { user } = useAuth();
  const [location] = useLocation();

  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.charAt(0) || "";
    const last = lastName?.charAt(0) || "";
    return (first + last) || "U";
  };

  return (
    <nav className="bg-card border-b border-border sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <Link href="/" className="flex items-center space-x-2" data-testid="link-home">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary to-accent flex items-center justify-center">
                <i className="fas fa-graduation-cap text-white text-lg"></i>
              </div>
              <span className="text-xl font-bold text-foreground">Career Mirror</span>
            </Link>
          </div>
          
          <div className="hidden md:flex items-center space-x-6">
            <Link 
              href="/" 
              className={`transition-colors ${
                location === "/" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="link-dashboard"
            >
              Dashboard
            </Link>
            <Link 
              href="/profile" 
              className={`transition-colors ${
                location === "/profile" ? "text-foreground" : "text-muted-foreground hover:text-foreground"
              }`}
              data-testid="link-profile"
            >
              My Profile
            </Link>
            <a href="/#classes" className="text-muted-foreground hover:text-foreground transition-colors">
              Find Classes
            </a>
            <a href="/#career-guidance" className="text-muted-foreground hover:text-foreground transition-colors">
              Career Guidance
            </a>
          </div>
          
          <div className="flex items-center space-x-4">
            {user ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="relative h-8 w-8 rounded-full" data-testid="button-user-menu">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={(user as any)?.profileImageUrl || undefined} alt={(user as any)?.firstName || "User"} />
                      <AvatarFallback>{getInitials((user as any)?.firstName, (user as any)?.lastName)}</AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent className="w-56" align="end" forceMount>
                  <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-1">
                      <p className="text-sm font-medium leading-none">
                        {(user as any)?.firstName && (user as any)?.lastName ? `${(user as any).firstName} ${(user as any).lastName}` : "User"}
                      </p>
                      <p className="text-xs leading-none text-muted-foreground">
                        {(user as any)?.email}
                      </p>
                    </div>
                  </DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/profile" data-testid="menuitem-profile">
                      <i className="fas fa-user mr-2 h-4 w-4"></i>
                      <span>Profile</span>
                    </Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <i className="fas fa-cog mr-2 h-4 w-4"></i>
                    <span>Settings</span>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={() => window.location.href = "/api/logout"}
                    data-testid="menuitem-logout"
                  >
                    <i className="fas fa-sign-out-alt mr-2 h-4 w-4"></i>
                    <span>Log out</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <div className="flex items-center space-x-2">
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
            )}
          </div>
        </div>
      </div>
    </nav>
  );
}
