import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, ClipboardList, UserPlus, Camera } from "lucide-react";

export default function Dashboard() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ students: 0, todayRecords: 0, faculty: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      const today = new Date().toISOString().split("T")[0];

      const [studentsRes, attendanceRes, facultyRes] = await Promise.all([
        supabase.from("students").select("id", { count: "exact", head: true }),
        supabase.from("attendance_records").select("id", { count: "exact", head: true }).eq("date", today),
        profile?.role === "principal"
          ? supabase.from("profiles").select("id", { count: "exact", head: true }).eq("principal_id", profile.id)
          : Promise.resolve({ count: 0 }),
      ]);

      setStats({
        students: studentsRes.count || 0,
        todayRecords: attendanceRes.count || 0,
        faculty: (facultyRes as any).count || 0,
      });
    };

    if (profile) fetchStats();
  }, [profile]);

  const cards = [
    { title: "Total Students", value: stats.students, icon: Users, color: "text-primary" },
    { title: "Today's Records", value: stats.todayRecords, icon: ClipboardList, color: "text-accent" },
    ...(profile?.role === "principal"
      ? [{ title: "Faculty Members", value: stats.faculty, icon: UserPlus, color: "text-primary" }]
      : []),
  ];

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">
            Welcome, {profile?.full_name || "User"}
          </h1>
          <p className="text-muted-foreground">
            {profile?.role === "principal" ? "Principal Dashboard" : "Faculty Dashboard"} — {new Date().toLocaleDateString()}
          </p>
        </div>

        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {cards.map((card) => (
            <Card key={card.title}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">{card.title}</CardTitle>
                <card.icon className={`h-5 w-5 ${card.color}`} />
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold">{card.value}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </DashboardLayout>
  );
}
