import { useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { z } from "zod";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card } from "@/components/ui/card";
import Logo from "@/components/Logo";

const emailSchema = z.string().trim().email("Invalid email address").max(255);
const passwordSchema = z.string().min(6, "Password must be at least 6 characters").max(100);
const nameSchema = z.string().trim().min(1, "Name is required").max(80);

type Props = { mode: "signin" | "signup" };

const Auth = ({ mode }: Props) => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const passwordMismatch =
    mode === "signup" && confirmPassword.length > 0 && password !== confirmPassword;

  useEffect(() => {
    if (!loading && user) navigate("/", { replace: true });
  }, [user, loading, navigate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const validEmail = emailSchema.parse(email);
      const validPassword = passwordSchema.parse(password);

      if (mode === "signup" && password !== confirmPassword) {
        toast.error("Passwords do not match");
        return;
      }

      setSubmitting(true);
      if (mode === "signup") {
        const validName = nameSchema.parse(name);
        const { error } = await supabase.auth.signUp({
          email: validEmail,
          password: validPassword,
          options: {
            emailRedirectTo: `${window.location.origin}/`,
            data: { display_name: validName },
          },
        });
        if (error) throw error;
        toast.success("Account created! You're now signed in. ✅");
        navigate("/", { replace: true });
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: validEmail,
          password: validPassword,
        });
        if (error) throw error;
        toast.success("Welcome back! 👋");
        navigate("/", { replace: true });
      }
    } catch (err: any) {
      if (err instanceof z.ZodError) {
        toast.error(err.errors[0].message);
      } else {
        const msg = err.message ?? "Something went wrong";
        if (msg.toLowerCase().includes("invalid login")) {
          toast.error("Invalid email or password");
        } else if (msg.toLowerCase().includes("already registered") || msg.toLowerCase().includes("already exists")) {
          toast.error("This email is already registered. Please sign in.");
        } else {
          toast.error(msg);
        }
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    setSubmitting(true);
    const { error } = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: `${window.location.origin}/`,
    });
    if (error) {
      toast.error(error.message ?? "Google sign-in failed");
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background px-4 py-12">
      <Link to="/" className="mb-8">
        <Logo />
      </Link>

      <Card className="w-full max-w-md p-8 border-border/60 bg-card/60 backdrop-blur-xl rounded-2xl">
        <h1 className="text-2xl font-bold tracking-tight mb-2">
          {mode === "signin" ? "Welcome back" : "Create your account"}
        </h1>
        <p className="text-sm text-muted-foreground mb-6">
          {mode === "signin"
            ? "Sign in to continue improving your Bulgarian text."
            : "Join GrammaBG and write flawless Bulgarian."}
        </p>

        <Button
          type="button"
          variant="outline"
          className="w-full mb-4 rounded-xl"
          onClick={handleGoogle}
          disabled={submitting}
        >
          <svg className="h-4 w-4" viewBox="0 0 24 24" aria-hidden="true">
            <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
            <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 13 24 13c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
            <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.3 0-9.7-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z"/>
            <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.3-2.3 4.3-4.1 5.6l6.2 5.2C41.4 35.6 44 30.2 44 24c0-1.3-.1-2.3-.4-3.5z"/>
          </svg>
          Continue with Google
        </Button>

        <div className="relative my-4">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t border-border/60" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-card px-2 text-muted-foreground">or</span>
          </div>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input
                id="name"
                type="text"
                placeholder="Ivan Ivanov"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                className="rounded-xl"
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              className="rounded-xl"
            />
          </div>

          {mode === "signup" && (
            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm Password</Label>
              <Input
                id="confirmPassword"
                type="password"
                placeholder="••••••••"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                aria-invalid={passwordMismatch}
                className={`rounded-xl ${passwordMismatch ? "border-destructive focus-visible:ring-destructive" : ""}`}
              />
              {passwordMismatch && (
                <p className="text-sm text-destructive">Passwords do not match</p>
              )}
            </div>
          )}

          <Button
            type="submit"
            variant="emerald"
            size="lg"
            className="w-full"
            disabled={submitting || passwordMismatch}
          >
            {submitting ? "Please wait..." : mode === "signin" ? "Sign in" : "Create account"}
          </Button>
        </form>

        <p className="mt-6 text-sm text-center text-muted-foreground">
          {mode === "signin" ? "Don't have an account?" : "Already have an account?"}{" "}
          <Link
            to={mode === "signin" ? "/register" : "/login"}
            className="text-primary font-medium hover:underline"
          >
            {mode === "signin" ? "Sign up" : "Sign in"}
          </Link>
        </p>
      </Card>
    </div>
  );
};

export default Auth;
