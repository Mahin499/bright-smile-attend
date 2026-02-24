import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { Plus, Copy, UserPlus } from "lucide-react";

interface FacultyProfile {
  id: string;
  full_name: string | null;
  role: string;
  created_at: string;
}

interface FacultyCode {
  id: string;
  code: string;
  is_used: boolean | null;
  created_at: string;
}

export default function Faculty() {
  const { user, profile } = useAuth();
  const [faculty, setFaculty] = useState<FacultyProfile[]>([]);
  const [codes, setCodes] = useState<FacultyCode[]>([]);
  const [loading, setLoading] = useState(true);
  const [codeDialogOpen, setCodeDialogOpen] = useState(false);
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [newFacultyName, setNewFacultyName] = useState("");
  const [newFacultyEmail, setNewFacultyEmail] = useState("");
  const [newFacultyPassword, setNewFacultyPassword] = useState("");

  const fetchData = async () => {
    if (!user) return;
    const [facultyRes, codesRes] = await Promise.all([
      supabase.from("profiles").select("*").eq("principal_id", user.id).eq("role", "faculty"),
      supabase.from("faculty_codes").select("*").eq("principal_id", user.id).order("created_at", { ascending: false }),
    ]);
    setFaculty(facultyRes.data || []);
    setCodes(codesRes.data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const generateCode = async () => {
    if (!user) return;
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { error } = await supabase.from("faculty_codes").insert({
      code,
      principal_id: user.id,
    });
    if (error) toast.error(error.message);
    else {
      toast.success(`Code generated: ${code}`);
      fetchData();
    }
  };

  const copyCode = (code: string) => {
    navigator.clipboard.writeText(code);
    toast.success("Code copied!");
  };

  const handleAddFaculty = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    // Create user via edge function or directly - for now we show credentials approach
    toast.info(`Faculty credentials:\nEmail: ${newFacultyEmail}\nPassword: ${newFacultyPassword}\n\nShare these with the faculty member to login.`);
    
    // Sign up the faculty member
    const { data, error } = await supabase.auth.signUp({
      email: newFacultyEmail,
      password: newFacultyPassword,
    });

    if (error) {
      toast.error(error.message);
      return;
    }

    if (data.user) {
      // We can't insert the profile here as we'd be authenticated as principal
      // The faculty member will need to verify email and login
      toast.success("Faculty account created. They need to verify their email.");
      setNewFacultyName("");
      setNewFacultyEmail("");
      setNewFacultyPassword("");
      setAddDialogOpen(false);
    }
  };

  if (profile?.role !== "principal") {
    return (
      <DashboardLayout>
        <p className="text-muted-foreground">Only principals can manage faculty.</p>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Faculty Management</h1>
            <p className="text-muted-foreground">Manage faculty members and invitation codes</p>
          </div>
        </div>

        <Tabs defaultValue="faculty">
          <TabsList>
            <TabsTrigger value="faculty">Faculty Members</TabsTrigger>
            <TabsTrigger value="codes">Invitation Codes</TabsTrigger>
          </TabsList>

          <TabsContent value="faculty" className="space-y-4">
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Joined</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {loading ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                      </TableRow>
                    ) : faculty.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="text-center py-8 text-muted-foreground">No faculty members yet</TableCell>
                      </TableRow>
                    ) : (
                      faculty.map((f) => (
                        <TableRow key={f.id}>
                          <TableCell className="font-medium">{f.full_name || "—"}</TableCell>
                          <TableCell>{new Date(f.created_at).toLocaleDateString()}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="codes" className="space-y-4">
            <Button onClick={generateCode}>
              <Plus className="mr-2 h-4 w-4" /> Generate Code
            </Button>
            <Card>
              <CardContent className="p-0">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Created</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {codes.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No codes generated yet</TableCell>
                      </TableRow>
                    ) : (
                      codes.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell className="font-mono font-bold">{c.code}</TableCell>
                          <TableCell>
                            <span className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${c.is_used ? "bg-muted text-muted-foreground" : "bg-accent/10 text-accent"}`}>
                              {c.is_used ? "Used" : "Available"}
                            </span>
                          </TableCell>
                          <TableCell>{new Date(c.created_at).toLocaleDateString()}</TableCell>
                          <TableCell className="text-right">
                            {!c.is_used && (
                              <button onClick={() => copyCode(c.code)}>
                                <Copy className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                              </button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </DashboardLayout>
  );
}
