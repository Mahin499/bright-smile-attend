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
import { toast } from "sonner";
import { Plus, Upload, Trash2, User } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  roll_number: string;
  photo_url: string | null;
  principal_id: string;
}

export default function Students() {
  const { user, profile } = useAuth();
  const [students, setStudents] = useState<Student[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [fullName, setFullName] = useState("");
  const [rollNumber, setRollNumber] = useState("");
  const [photo, setPhoto] = useState<File | null>(null);

  const principalId = profile?.role === "principal" ? profile.id : profile?.principal_id;

  const fetchStudents = async () => {
    const { data } = await supabase.from("students").select("*").order("roll_number");
    setStudents(data || []);
    setLoading(false);
  };

  useEffect(() => {
    fetchStudents();
  }, []);

  const handleAddStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!principalId) {
      toast.error("No principal linked to your account");
      return;
    }

    let photoUrl: string | null = null;

    if (photo) {
      const ext = photo.name.split(".").pop();
      const path = `${principalId}/${Date.now()}.${ext}`;
      const { error: uploadError } = await supabase.storage
        .from("student_photos")
        .upload(path, photo);
      if (uploadError) {
        toast.error("Failed to upload photo");
        return;
      }
      const { data: urlData } = supabase.storage.from("student_photos").getPublicUrl(path);
      photoUrl = urlData.publicUrl;
    }

    const { error } = await supabase.from("students").insert({
      full_name: fullName,
      roll_number: rollNumber,
      principal_id: principalId,
      photo_url: photoUrl,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Student added!");
      setFullName("");
      setRollNumber("");
      setPhoto(null);
      setDialogOpen(false);
      fetchStudents();
    }
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("students").delete().eq("id", id);
    if (error) toast.error(error.message);
    else {
      toast.success("Student removed");
      fetchStudents();
    }
  };

  const handlePhotoUpload = async (studentId: string, file: File) => {
    if (!principalId) return;
    const ext = file.name.split(".").pop();
    const path = `${principalId}/${studentId}.${ext}`;
    const { error } = await supabase.storage.from("student_photos").upload(path, file, { upsert: true });
    if (error) {
      toast.error("Upload failed");
      return;
    }
    const { data: urlData } = supabase.storage.from("student_photos").getPublicUrl(path);
    await supabase.from("students").update({ photo_url: urlData.publicUrl }).eq("id", studentId);
    toast.success("Photo updated!");
    fetchStudents();
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-foreground">Students</h1>
            <p className="text-muted-foreground">Manage student records and photos</p>
          </div>
          {(profile?.role === "principal" || profile?.role === "faculty") && (
            <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" /> Add Student
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Add New Student</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleAddStudent} className="space-y-4">
                  <div className="space-y-2">
                    <Label>Full Name</Label>
                    <Input value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Roll Number</Label>
                    <Input value={rollNumber} onChange={(e) => setRollNumber(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label>Photo (for facial recognition)</Label>
                    <Input type="file" accept="image/*" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
                  </div>
                  <Button type="submit" className="w-full">Add Student</Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Photo</TableHead>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : students.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">No students added yet</TableCell>
                  </TableRow>
                ) : (
                  students.map((student) => (
                    <TableRow key={student.id}>
                      <TableCell>
                        {student.photo_url ? (
                          <img src={student.photo_url} alt={student.full_name} className="h-10 w-10 rounded-full object-cover" />
                        ) : (
                          <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted">
                            <User className="h-5 w-5 text-muted-foreground" />
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="font-medium">{student.roll_number}</TableCell>
                      <TableCell>{student.full_name}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <label className="cursor-pointer">
                            <Upload className="h-4 w-4 text-muted-foreground hover:text-foreground" />
                            <input
                              type="file"
                              className="hidden"
                              accept="image/*"
                              onChange={(e) => {
                                const file = e.target.files?.[0];
                                if (file) handlePhotoUpload(student.id, file);
                              }}
                            />
                          </label>
                          {profile?.role === "principal" && (
                            <button onClick={() => handleDelete(student.id)}>
                              <Trash2 className="h-4 w-4 text-destructive hover:text-destructive/80" />
                            </button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
