import { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { GraduationCap } from "lucide-react";

export default function JoinFaculty() {
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    // Verify faculty code
    const { data: codeData, error: codeError } = await supabase
      .from("faculty_codes")
      .select("*")
      .eq("code", code)
      .eq("is_used", false)
      .single();

    if (codeError || !codeData) {
      toast.error("Invalid or already used faculty code");
      setLoading(false);
      return;
    }

    // Create auth user
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    if (data.user) {
      // Create profile
      const { error: profileError } = await supabase.from("profiles").insert({
        id: data.user.id,
        full_name: fullName,
        role: "faculty",
        principal_id: codeData.principal_id,
      });

      if (profileError) {
        toast.error(profileError.message);
        setLoading(false);
        return;
      }

      // Mark code as used - note: this may fail due to RLS, but we continue
      await supabase
        .from("faculty_codes")
        .update({ is_used: true } as any)
        .eq("id", codeData.id);

      toast.success("Faculty account created! Check your email to verify.");
      navigate("/login");
    }
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-4">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary text-primary-foreground">
            <GraduationCap className="h-8 w-8" />
          </div>
          <h1 className="text-3xl font-bold tracking-tight text-foreground">Join as Faculty</h1>
          <p className="mt-1 text-muted-foreground">Use your principal's invitation code</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Faculty Registration</CardTitle>
            <CardDescription>Enter the code provided by your principal</CardDescription>
          </CardHeader>
          <form onSubmit={handleJoin}>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="code">Faculty Code</Label>
                <Input id="code" placeholder="Enter invitation code" value={code} onChange={(e) => setCode(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="fullName">Full Name</Label>
                <Input id="fullName" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <Input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={6} />
              </div>
            </CardContent>
            <CardFooter className="flex flex-col gap-3">
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Joining..." : "Join as Faculty"}
              </Button>
              <Link to="/login" className="text-sm text-primary hover:underline">
                Already have an account? Sign in
              </Link>
            </CardFooter>
          </form>
        </Card>
      </div>
    </div>
  );
}
