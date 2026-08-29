import { useState, useCallback, useRef, useEffect } from "react";
import { Search, X, User, Users, Home, ClipboardList, ArrowRight, Command } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";

export function HeaderSearch() {
  const navigate = useNavigate();
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [searching, setSearching] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, []);

  const performSearch = useCallback(async (query: string) => {
    setSearching(true);
    try {
      const [{ data: guests }, { data: profiles }, { data: rooms }, { data: reservations }] = await Promise.all([
        supabase
          .from("guests")
          .select("id, first_name, last_name, email, phone")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%,phone.ilike.%${query}%`)
          .limit(5),
        supabase
          .from("profiles")
          .select("user_id, first_name, last_name, email")
          .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,email.ilike.%${query}%`)
          .limit(5),
        supabase
          .from("rooms")
          .select("id, room_number, room_type")
          .ilike("room_number", `%${query}%`)
          .limit(5),
        supabase
          .from("reservations")
          .select("id, reservation_code, status")
          .ilike("reservation_code", `%${query}%`)
          .limit(5),
      ]);

      const results = [
        ...(guests || []).map(g => ({ type: "guest", ...g })),
        ...(profiles || []).map(p => ({ type: "staff", ...p })),
        ...(rooms || []).map(r => ({ type: "room", ...r })),
        ...(reservations || []).map(r => ({ type: "reservation", ...r })),
      ];
      setSearchResults(results);
      setSelectedIndex(0);
    } catch (error) {
      console.error("Search error:", error);
    } finally {
      setSearching(false);
    }
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    if (query.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }

    debounceTimerRef.current = setTimeout(() => {
      performSearch(query);
    }, 400);
  };

  const handleResultClick = (result: any) => {
    setSearchOpen(false);
    setSearchQuery("");
    setSearchResults([]);
    
    if (result.type === "guest") navigate("/guests");
    else if (result.type === "staff") navigate("/staff");
    else if (result.type === "room") navigate("/rooms");
    else if (result.type === "reservation") navigate("/reservations");
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (searchResults.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev + 1) % searchResults.length);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setSelectedIndex((prev) => (prev - 1 + searchResults.length) % searchResults.length);
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleResultClick(searchResults[selectedIndex]);
    }
  };

  useEffect(() => {
    if (scrollContainerRef.current) {
      const selectedElement = scrollContainerRef.current.children[selectedIndex] as HTMLElement;
      if (selectedElement) {
        selectedElement.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === "k" && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setSearchOpen((open) => !open);
      }
    };

    document.addEventListener("keydown", down);
    return () => document.removeEventListener("keydown", down);
  }, []);

  return (
    <>
      <Button
        variant="outline"
        onClick={() => setSearchOpen(true)}
        className="hidden lg:flex items-center justify-start gap-3 w-full max-w-[450px] h-9 px-3 text-muted-foreground hover:text-foreground bg-secondary/30 border-border/40 hover:bg-secondary/50 transition-all rounded-full group"
      >
        <div className="flex items-center gap-2">
          <Search className="h-3.5 w-3.5 shrink-0 transition-colors group-hover:text-primary" />
          <span className="text-xs font-normal">Global Search...</span>
        </div>
        <div className="ml-auto flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
            <Command className="h-2 w-2" />
          </kbd>
          <kbd className="pointer-events-none h-5 select-none items-center gap-1 rounded border bg-muted px-1.5 font-mono text-[10px] font-medium sm:flex">
            K
          </kbd>
        </div>
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={() => setSearchOpen(true)}
        className="lg:hidden text-muted-foreground hover:text-foreground hover:bg-secondary w-9 h-9 sm:w-10 sm:h-10"
      >
        <Search className="h-4 w-4" />
      </Button>

      <Dialog open={searchOpen} onOpenChange={setSearchOpen}>
        <DialogContent className="sm:max-w-2xl p-0 gap-0 overflow-hidden border-none shadow-2xl">
          <DialogHeader className="p-4 border-b bg-muted/30">
            <DialogTitle className="flex items-center gap-2">
              <Search className="h-4 w-4 text-primary" />
              <span>Global Search</span>
            </DialogTitle>
          </DialogHeader>

          <div className="p-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search guests, staff, rooms, reservations..."
                value={searchQuery}
                onChange={(e) => handleSearch(e.target.value)}
                onKeyDown={handleKeyDown}
                className="pl-9 h-12 text-base bg-secondary/50 border-none focus-visible:ring-1 focus-visible:ring-primary/50"
                autoFocus
              />
              {searchQuery && (
                <Button
                  variant="ghost"
                  size="icon"
                  className="absolute right-1 top-1/2 -translate-y-1/2 h-8 w-8 hover:bg-transparent"
                  onClick={() => { setSearchQuery(""); setSearchResults([]); }}
                >
                  <X className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                </Button>
              )}
            </div>
          </div>
            
          <div className="flex flex-col min-h-[100px] max-h-[450px] overflow-hidden">
            {searching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 animate-pulse mb-2" />
                <p className="text-sm">Searching the database...</p>
              </div>
            )}

            {!searching && searchResults.length > 0 && (
              <div
                ref={scrollContainerRef}
                className="flex-1 overflow-y-auto p-2 space-y-1"
              >
                {searchResults.map((result, index) => (
                  <div
                    key={index}
                    className={cn(
                      "group flex items-center justify-between p-3 rounded-xl cursor-pointer transition-all duration-200",
                      selectedIndex === index ? "bg-primary text-primary-foreground shadow-md scale-[1.01]" : "hover:bg-secondary"
                    )}
                    onClick={() => handleResultClick(result)}
                  >
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        selectedIndex === index ? "bg-white/20" : "bg-muted"
                      )}>
                        {result.type === "guest" && <User className="h-4 w-4" />}
                        {result.type === "staff" && <Users className="h-4 w-4" />}
                        {result.type === "room" && <Home className="h-4 w-4" />}
                        {result.type === "reservation" && <ClipboardList className="h-4 w-4" />}
                      </div>
                      <div className="flex flex-col">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-sm">
                            {result.type === "guest" && `${result.first_name} ${result.last_name}`}
                            {result.type === "staff" && `${result.first_name} ${result.last_name}`}
                            {result.type === "room" && `Room ${result.room_number}`}
                            {result.type === "reservation" && result.reservation_code}
                          </span>
                          <Badge
                            variant={selectedIndex === index ? "secondary" : "outline"}
                            className={cn(
                              "text-[10px] uppercase font-bold px-1.5 h-4",
                              selectedIndex === index ? "bg-white/20 border-none text-white" : ""
                            )}
                          >
                            {result.type}
                          </Badge>
                        </div>
                        <p className={cn(
                          "text-xs mt-0.5",
                          selectedIndex === index ? "text-white/80" : "text-muted-foreground"
                        )}>
                          {result.type === "guest" && (result.email || result.phone)}
                          {result.type === "staff" && result.email}
                          {result.type === "room" && result.room_type}
                          {result.type === "reservation" && `Status: ${result.status}`}
                        </p>
                      </div>
                    </div>
                    <ArrowRight className={cn(
                      "h-4 w-4 transition-transform group-hover:translate-x-1",
                      selectedIndex === index ? "opacity-100" : "opacity-0"
                    )} />
                  </div>
                ))}
              </div>
            )}

            {!searching && searchQuery.length >= 2 && searchResults.length === 0 && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <Search className="h-8 w-8 mb-2 opacity-20" />
                <p className="text-sm">No results found for "{searchQuery}"</p>
              </div>
            )}

            {searchQuery.length < 2 && !searching && (
              <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                <p className="text-sm">Type at least 2 characters to search...</p>
              </div>
            )}
          </div>

          <div className="border-t bg-muted/30 p-3 flex items-center justify-between">
            <div className="flex gap-4">
              <button
                onClick={() => { setSearchOpen(false); navigate("/guests"); }}
                className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                View all Guests <ArrowRight className="h-3 w-3" />
              </button>
              <button
                onClick={() => { setSearchOpen(false); navigate("/staff"); }}
                className="text-xs font-medium text-muted-foreground hover:text-primary flex items-center gap-1 transition-colors"
              >
                View all Staff <ArrowRight className="h-3 w-3" />
              </button>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-muted-foreground font-medium uppercase tracking-wider">
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border shadow-sm text-foreground font-sans">↑↓</kbd> Navigate</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border shadow-sm text-foreground font-sans">↵</kbd> Select</span>
              <span className="flex items-center gap-1"><kbd className="px-1 py-0.5 rounded bg-muted border shadow-sm text-foreground font-sans">esc</kbd> Close</span>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
