import { useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { Link, Navigate } from "react-router-dom";
import { Eye, EyeOff } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

export default function Login() {
  const { user, login } = useAuth();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  if (user) return <Navigate to="/dashboard" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (await login(email, password)) {
      toast({ title: "Welcome back!", description: "You have logged in successfully." });
    } else {
      toast({ title: "Login failed", description: "Invalid email or password.", variant: "destructive" });
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <div className="w-full max-w-md space-y-8">
        {/* Header */}
        <div className="text-center space-y-3">
          <div className="mx-auto w-16 h-16 rounded-2xl bg-card ring-1 ring-border flex items-center justify-center shadow-lg">
            <img src="/wmsu-seal.png" alt="WMSU seal" className="w-10 h-10" />
          </div>
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">WMSU HRMS</h1>
            <p className="text-sm text-muted-foreground mt-1">Job Hiring Monitoring System</p>
            <p className="text-xs text-muted-foreground">Western Mindanao State University</p>
          </div>
        </div>

        {/* Login Card */}
        <Card className="shadow-lg border-border/50">
          <CardContent className="pt-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="email">Email Address</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="admin@wmsu.edu.ph"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
              <Button type="submit" className="w-full">
                Sign In
              </Button>
              <Button variant="outline" className="w-full" asChild>
                <Link to="/">←</Link>
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Test Accounts */}
        <Card className="bg-accent border-accent">
          <CardContent className="pt-4 pb-4">
            <p className="text-xs font-semibold text-accent-foreground mb-2">Test Accounts</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <p><strong>Admin:</strong> admin@wmsu.edu.ph / password123</p>
              <p><strong>Staff:</strong> hrstaff@wmsu.edu.ph / password123</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
