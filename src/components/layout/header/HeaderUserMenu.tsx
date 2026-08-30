import { User, LogOut, Settings, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link } from "react-router-dom";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/AuthContext";

export function HeaderUserMenu() {
  const { profile, signOut } = useAuth();

  const getInitials = () => {
    const first = profile?.first_name || "";
    const last = profile?.last_name || "";
    return `${first.charAt(0)}${last.charAt(0)}`.toUpperCase() || "U";
  };

  return (
    <div className="flex items-center gap-1 sm:gap-2">
      <Link to="/staff?tab=details" className="flex-shrink-0">
        <Button variant="ghost" className="p-0 h-8 w-8 rounded-full hover:bg-transparent flex-shrink-0 group">
          <Avatar className="h-8 w-8 ring-2 ring-primary/10 shadow-3d-blue transition-transform group-hover:scale-105">
            <AvatarImage src={profile?.avatar_url || ""} />
            <AvatarFallback className="bg-gradient-blue text-primary-foreground text-xs font-semibold">
              {getInitials()}
            </AvatarFallback>
          </Avatar>
        </Button>
      </Link>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" className="flex items-center gap-1 px-1 sm:px-2 py-1 h-8 hover:bg-secondary/50 rounded-lg">
            <div className="hidden sm:flex items-center gap-1.5 min-w-0">
              <span className="text-sm font-medium text-foreground truncate max-w-[100px]">
                {profile?.first_name || "User"}
              </span>
              <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />
            </div>
            <div className="sm:hidden">
              <ChevronDown className="h-4 w-4 text-muted-foreground" />
            </div>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>
          <div>
            <p className="font-medium">{profile?.first_name} {profile?.last_name}</p>
            <p className="text-xs text-muted-foreground">{profile?.email}</p>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link to="/staff?tab=details" className="flex items-center gap-2 cursor-pointer">
            <User className="h-4 w-4" />
            My Account
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link to="/staff?tab=preferences" className="flex items-center gap-2 cursor-pointer">
            <Settings className="h-4 w-4" />
            Preferences
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem onClick={signOut} className="text-destructive cursor-pointer">
          <LogOut className="h-4 w-4 mr-2" />
          Sign Out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
    </div>
  );
}
