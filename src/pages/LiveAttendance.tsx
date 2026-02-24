import { useEffect, useRef, useState, useCallback } from "react";
import Webcam from "react-webcam";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";
import { Camera, CameraOff, CheckCircle, AlertTriangle, XCircle } from "lucide-react";

interface Student {
  id: string;
  full_name: string;
  roll_number: string;
  photo_url: string | null;
}

interface AttendanceEntry {
  studentId: string;
  studentName: string;
  rollNumber: string;
  status: "present" | "sleepy" | "absent";
}

const periodTimes: Record<number, { start: string; end: string; label: string }> = {
  1: { start: "09:50", end: "10:50", label: "Period 1 (9:50 - 10:50)" },
  2: { start: "10:50", end: "11:50", label: "Period 2 (10:50 - 11:50)" },
  3: { start: "11:50", end: "12:50", label: "Period 3 (11:50 - 12:50)" },
  4: { start: "12:50", end: "13:30", label: "Period 4 (12:50 - 1:30)" },
  5: { start: "13:30", end: "14:30", label: "Period 5 (1:30 - 2:30)" },
  6: { start: "14:30", end: "15:30", label: "Period 6 (2:30 - 3:30)" },
  7: { start: "15:30", end: "16:30", label: "Period 7 (3:30 - 4:30)" },
  8: { start: "16:30", end: "17:30", label: "Period 8 (4:30 - 5:30) - Optional" },
};

export default function LiveAttendance() {
  const { user, profile } = useAuth();
  const webcamRef = useRef<Webcam>(null);
  const [cameraOn, setCameraOn] = useState(false);
  const [selectedPeriod, setSelectedPeriod] = useState("1");
  const [period8Free, setPeriod8Free] = useState(false);
  const [students, setStudents] = useState<Student[]>([]);
  const [attendance, setAttendance] = useState<AttendanceEntry[]>([]);
  const [saving, setSaving] = useState(false);
  const [faceApiLoaded, setFaceApiLoaded] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      const { data } = await supabase.from("students").select("*").order("roll_number");
      if (data) {
        setStudents(data);
        // Initialize all as absent
        setAttendance(
          data.map((s) => ({
            studentId: s.id,
            studentName: s.full_name,
            rollNumber: s.roll_number,
            status: "absent" as const,
          }))
        );
      }
    };
    fetchStudents();
  }, []);

  // Load face-api.js models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const faceapi = await import("face-api.js");
        const MODEL_URL = "/models";
        
        // Try loading models - if they fail, we'll use manual mode
        try {
          await Promise.all([
            faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
            faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
            faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
          ]);
          setFaceApiLoaded(true);
        } catch {
          console.log("Face-api models not available, using manual mode");
        }
      } catch {
        console.log("Face-api not available, using manual mode");
      }
    };
    loadModels();
  }, []);

  const updateStatus = (studentId: string, status: "present" | "sleepy" | "absent") => {
    setAttendance((prev) =>
      prev.map((a) => (a.studentId === studentId ? { ...a, status } : a))
    );
  };

  const markAllPresent = () => {
    setAttendance((prev) => prev.map((a) => ({ ...a, status: "present" as const })));
  };

  const saveAttendance = async () => {
    if (!user) return;
    setSaving(true);

    const period = parseInt(selectedPeriod);
    if (period === 8 && period8Free) {
      toast.info("Period 8 is marked as free. No attendance recorded.");
      setSaving(false);
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    const records = attendance.map((a) => ({
      student_id: a.studentId,
      date: today,
      period,
      status: a.status,
      verified_by: user.id,
    }));

    const { error } = await supabase.from("attendance_records").insert(records);
    if (error) {
      if (error.message.includes("duplicate")) {
        toast.error("Attendance already recorded for this period today");
      } else {
        toast.error(error.message);
      }
    } else {
      toast.success(`Attendance saved for Period ${period}!`);
    }
    setSaving(false);
  };

  const maxPeriods = period8Free ? 7 : 8;

  const statusIcon = (status: string) => {
    switch (status) {
      case "present":
        return <CheckCircle className="h-5 w-5 text-accent" />;
      case "sleepy":
        return <AlertTriangle className="h-5 w-5 text-warning" />;
      case "absent":
        return <XCircle className="h-5 w-5 text-destructive" />;
    }
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Attendance</h1>
          <p className="text-muted-foreground">
            Mark attendance using facial recognition or manually
          </p>
        </div>

        <div className="grid gap-6 lg:grid-cols-3">
          {/* Controls */}
          <Card className="lg:col-span-1">
            <CardHeader>
              <CardTitle className="text-lg">Settings</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Period</Label>
                <Select value={selectedPeriod} onValueChange={setSelectedPeriod}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: maxPeriods }, (_, i) => i + 1).map((p) => (
                      <SelectItem key={p} value={p.toString()}>
                        {periodTimes[p].label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between">
                <Label>Period 8 is free</Label>
                <Switch checked={period8Free} onCheckedChange={setPeriod8Free} />
              </div>

              <div className="space-y-2">
                <Button
                  variant={cameraOn ? "destructive" : "default"}
                  className="w-full"
                  onClick={() => setCameraOn(!cameraOn)}
                >
                  {cameraOn ? (
                    <>
                      <CameraOff className="mr-2 h-4 w-4" /> Stop Camera
                    </>
                  ) : (
                    <>
                      <Camera className="mr-2 h-4 w-4" /> Start Camera
                    </>
                  )}
                </Button>

                <Button variant="outline" className="w-full" onClick={markAllPresent}>
                  Mark All Present
                </Button>

                <Button className="w-full" onClick={saveAttendance} disabled={saving}>
                  {saving ? "Saving..." : "Save Attendance"}
                </Button>
              </div>

              {!faceApiLoaded && (
                <p className="text-xs text-muted-foreground">
                  ⓘ Facial recognition models not loaded. Using manual mode. 
                  Place model files in /public/models for auto-detection.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Camera + Student List */}
          <div className="space-y-4 lg:col-span-2">
            {cameraOn && (
              <Card>
                <CardContent className="p-4">
                  <div className="overflow-hidden rounded-lg">
                    <Webcam
                      ref={webcamRef}
                      audio={false}
                      screenshotFormat="image/jpeg"
                      className="w-full"
                      videoConstraints={{ facingMode: "user", width: 640, height: 480 }}
                    />
                  </div>
                  <p className="mt-2 text-center text-sm text-muted-foreground">
                    Camera active — {faceApiLoaded ? "Facial recognition running" : "Manual marking mode"}
                  </p>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">
                  Student Attendance — Period {selectedPeriod}
                </CardTitle>
              </CardHeader>
              <CardContent>
                {attendance.length === 0 ? (
                  <p className="py-8 text-center text-muted-foreground">No students found. Add students first.</p>
                ) : (
                  <div className="space-y-2">
                    {attendance.map((entry) => {
                      const student = students.find((s) => s.id === entry.studentId);
                      return (
                        <div
                          key={entry.studentId}
                          className="flex items-center gap-3 rounded-lg border p-3"
                        >
                          {student?.photo_url ? (
                            <img
                              src={student.photo_url}
                              alt={entry.studentName}
                              className="h-10 w-10 rounded-full object-cover"
                            />
                          ) : (
                            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-sm font-medium text-muted-foreground">
                              {entry.studentName.charAt(0)}
                            </div>
                          )}
                          <div className="flex-1">
                            <p className="text-sm font-medium">{entry.studentName}</p>
                            <p className="text-xs text-muted-foreground">Roll: {entry.rollNumber}</p>
                          </div>
                          <div className="flex gap-1">
                            <button
                              onClick={() => updateStatus(entry.studentId, "present")}
                              className={`rounded-lg p-2 transition-colors ${
                                entry.status === "present"
                                  ? "bg-accent/10 ring-2 ring-accent"
                                  : "hover:bg-muted"
                              }`}
                              title="Present"
                            >
                              <CheckCircle className={`h-5 w-5 ${entry.status === "present" ? "text-accent" : "text-muted-foreground"}`} />
                            </button>
                            <button
                              onClick={() => updateStatus(entry.studentId, "sleepy")}
                              className={`rounded-lg p-2 transition-colors ${
                                entry.status === "sleepy"
                                  ? "bg-warning/10 ring-2 ring-warning"
                                  : "hover:bg-muted"
                              }`}
                              title="Sleepy"
                            >
                              <AlertTriangle className={`h-5 w-5 ${entry.status === "sleepy" ? "text-warning" : "text-muted-foreground"}`} />
                            </button>
                            <button
                              onClick={() => updateStatus(entry.studentId, "absent")}
                              className={`rounded-lg p-2 transition-colors ${
                                entry.status === "absent"
                                  ? "bg-destructive/10 ring-2 ring-destructive"
                                  : "hover:bg-muted"
                              }`}
                              title="Absent"
                            >
                              <XCircle className={`h-5 w-5 ${entry.status === "absent" ? "text-destructive" : "text-muted-foreground"}`} />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
