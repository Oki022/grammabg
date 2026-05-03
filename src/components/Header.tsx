import { useState, useEffect } from "react";
import { Menu, X, LogOut, User as UserIcon } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import Logo from "./Logo";
import ThemeToggle from "./ThemeToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/useAuth";
import { toast } from "sonner";

const links = [
  { href: "/#editor", label: "Editor" },
  { href: "/#pricing", label: "Pricing" },
  { href: "/#faq", label: "FAQ" },
  { href: "/contact", label: "Contact" },
];

const Header = () => {
  const [isVisible, setIsVisible] = useState(true);
  const [open, setOpen] = useState(false);
  const { user, signOut } = useAuth();
  const navigate = useNavigate();

  // Scroll Mantığı (Tamamen yenilendi ve hatasızlaştırıldı)
  useEffect(() => {
    let lastScrollY = window.scrollY;

    const handleScroll = () => {
      const currentScrollY = window.scrollY;

      if (currentScrollY < 50) {
        // Sayfanın en üstündeyken her zaman göster
        setIsVisible(true);
      } else if (currentScrollY > lastScrollY) {
        // Aşağı doğru kaydırıyorsan gizle
        setIsVisible(false);
      } else {
        // Yukarı doğru kaydırıyorsan anında göster
        setIsVisible(true);
      }

      lastScrollY = currentScrollY;
    };

    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleSignOut = async () => {
    await signOut();
    toast.success("Signed out");
    setOpen(false);
  };

  const userInitial = (user?.user_metadata?.display_name || user?.email || "?")
    .charAt(0)
    .toUpperCase();

  return (
    <header
      className={`fixed top-0 z-50 w-full border-b border-white/10 bg-transparent backdrop-blur-xl transition-transform duration-300 ${
        isVisible ? "translate-y-0" : "-translate-y-full"
      }`}
    >
      <div className="container flex h-16 items-center justify-between">
        <Logo />

        <nav className="hidden md:flex items-center gap-8">
          {links.map((l) => (
            <a
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-smooth"
            >
              {l.label}
            </a>
          ))}
        </nav>

        <div className="hidden md:flex items-center gap-2">
          <ThemeToggle />
          {user ? (
            <>
              <Link
                to="/profile"
                aria-label="Open profile"
                title={user.email ?? "Profile"}
                className="h-9 w-9 rounded-full bg-gradient-emerald flex items-center justify-center text-primary-foreground shadow-emerald hover:opacity-90 transition-smooth focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <UserIcon className="h-4 w-4" strokeWidth={2.25} />
              </Link>
              <Button variant="ghost" size="sm" onClick={handleSignOut}>
                <LogOut className="h-4 w-4" /> Sign out
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => navigate("/login")}>
                Log in
              </Button>
              <Button variant="emerald" size="sm" onClick={() => navigate("/register")}>
                Sign up
              </Button>
            </>
          )}
        </div>

        <div className="md:hidden flex items-center gap-1">
          <ThemeToggle />
          <button
            aria-label="Toggle menu"
            className="text-foreground p-2"
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
      </div>

      {open && (
        <div className="md:hidden border-t border-white/10 bg-[#050505]/95 backdrop-blur-xl">
          <div className="container py-4 flex flex-col gap-3">
            {links.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="text-sm font-medium text-muted-foreground hover:text-foreground py-2"
              >
                {l.label}
              </a>
            ))}
            <div className="flex gap-2 pt-2">
              {user ? (
                <>
                  <Link to="/profile" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="outline" size="sm" className="w-full">
                      <UserIcon className="h-4 w-4 mr-2" /> Profile
                    </Button>
                  </Link>
                  <Button variant="ghost" size="sm" className="flex-1" onClick={handleSignOut}>
                    <LogOut className="h-4 w-4 mr-2" /> Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Link to="/login" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="ghost" size="sm" className="w-full text-foreground">Log in</Button>
                  </Link>
                  <Link to="/register" className="flex-1" onClick={() => setOpen(false)}>
                    <Button variant="emerald" size="sm" className="w-full">Sign up</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;