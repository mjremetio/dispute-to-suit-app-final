import { useState, useEffect } from "react";
import { trpc } from "@/lib/trpc";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Shield, Loader2, AlertCircle } from "lucide-react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [, navigate] = useLocation();
  const utils = trpc.useUtils();
  const { user, loading } = useAuth();

  // Redirect already-logged-in users to their dashboard
  useEffect(() => {
    if (loading) return; // Wait for auth check to complete
    if (!user) return; // Not logged in, stay on login page

    // User is logged in, redirect to appropriate dashboard
    if (user.mustChangePassword) {
      navigate("/change-password");
    } else if (user.role === "cro") {
      navigate("/cro-portal");
    } else if (user.role === "client") {
      navigate("/client-portal");
    } else {
      navigate("/admin/dashboard");
    }
  }, [user, loading, navigate]);

  const loginMutation = trpc.auth.login.useMutation({
    onSuccess: async () => {
      await utils.auth.me.invalidate();
      navigate("/admin/dashboard");
    },
    onError: (err) => {
      setError(err.message || "Invalid credentials or insufficient permissions");
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!email || !password) {
      setError("Please enter both email and password");
      return;
    }
    loginMutation.mutate({ email, password, loginType: "admin" });
  };

  // Show loading state while checking auth
  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
        <div className="flex flex-col items-center gap-4">
          <Loader2 className="h-8 w-8 animate-spin text-red-500" />
          <p className="text-slate-400">Checking your session...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        {/* Logo */}
        <div className="flex items-center justify-center gap-3 mb-8">
          <Shield className="h-10 w-10 text-red-500" />
          <span className="text-3xl font-serif font-bold text-white">Admin Portal</span>
        </div>

        <Card className="bg-slate-900/80 border-slate-800 shadow-2xl">
          <CardHeader className="text-center pb-4">
            <CardTitle className="text-2xl font-serif text-white">Admin Sign In</CardTitle>
            <CardDescription className="text-slate-400">
              Restricted to administrators and paralegals only
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {error && (
                <div className="flex items-center gap-2 p-3 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-sm">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>{error}</span>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="admin-email" className="text-slate-300">Email Address</Label>
                <Input
                  id="admin-email"
                  type="email"
                  placeholder="admin@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="admin-password" className="text-slate-300">Password</Label>
                <Input
                  id="admin-password"
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="bg-slate-800/50 border-slate-700 text-white placeholder:text-slate-500 focus:border-red-500 focus:ring-red-500/20"
                  autoComplete="current-password"
                />
              </div>

              <Button
                type="submit"
                className="w-full bg-red-600 hover:bg-red-700 text-white font-semibold py-5"
                disabled={loginMutation.isPending}
              >
                {loginMutation.isPending ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Authenticating...
                  </>
                ) : (
                  "Sign In to Admin"
                )}
              </Button>
            </form>

            <div className="mt-6 pt-4 border-t border-slate-800 space-y-3">
              <p className="text-center text-sm">
                <button
                  type="button"
                  className="text-red-400 hover:text-red-300 font-medium"
                  onClick={() => navigate("/forgot-password?from=admin")}
                >
                  Forgot your password?
                </button>
              </p>
              <p className="text-center text-sm text-slate-600">
                Dispute2Suit Administration Panel
              </p>
            </div>
          </CardContent>
        </Card>

        <p className="text-center text-xs text-slate-600 mt-6">
          &copy; {new Date().getFullYear()} Dispute2Suit. All rights reserved.
        </p>
      </div>
    </div>
  );
}
