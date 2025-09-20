import { Link, useLocation } from "wouter";

export default function Sidebar() {
  const [location] = useLocation();

  const navItems = [
    { href: "/", icon: "fas fa-home", label: "Dashboard" },
    { href: "/#classes", icon: "fas fa-search", label: "Find Classes" },
    { href: "/career-map", icon: "fas fa-route", label: "Career Map" },
    { href: "/#doppelgangers", icon: "fas fa-users", label: "Parallel Identities" },
    { href: "/achievements", icon: "fas fa-trophy", label: "Achievements" },
    { href: "/lifestyle", icon: "fas fa-chart-pie", label: "Lifestyle" },
    { href: "/profile", icon: "fas fa-user", label: "Profile" },
  ];

  return (
    <aside className="hidden lg:flex lg:flex-col lg:w-64 lg:fixed lg:inset-y-0 lg:pt-16 bg-card border-r border-border">
      <div className="flex-1 flex flex-col min-h-0 pt-5 pb-4 overflow-y-auto">
        <div className="flex-1 px-3 space-y-1">
          <nav className="space-y-2">
            {navItems.map((item) => {
              const isActive = item.href === location;
              
              if (item.href.startsWith("/#")) {
                return (
                  <a
                    key={item.label}
                    href={item.href}
                    className="text-muted-foreground hover:bg-secondary hover:text-secondary-foreground group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors"
                    data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                  >
                    <i className={`${item.icon} mr-3 text-sm`}></i>
                    {item.label}
                  </a>
                );
              }

              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`group flex items-center px-3 py-2 text-sm font-medium rounded-md transition-colors ${
                    isActive
                      ? "bg-secondary text-secondary-foreground"
                      : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
                  }`}
                  data-testid={`nav-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <i className={`${item.icon} mr-3 text-sm`}></i>
                  {item.label}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>
    </aside>
  );
}
