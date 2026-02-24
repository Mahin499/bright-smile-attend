import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";
import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface AttendanceRecord {
  id: string;
  student_id: string;
  date: string;
  period: number;
  status: string;
  students?: { full_name: string; roll_number: string };
}

export default function Attendance() {
  const { profile } = useAuth();
  const [records, setRecords] = useState<AttendanceRecord[]>([]);
  const [date, setDate] = useState(new Date().toISOString().split("T")[0]);
  const [periodFilter, setPeriodFilter] = useState<string>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecords = async () => {
      setLoading(true);
      let query = supabase
        .from("attendance_records")
        .select("*, students(full_name, roll_number)")
        .eq("date", date)
        .order("period");

      if (periodFilter !== "all") {
        query = query.eq("period", parseInt(periodFilter));
      }

      const { data } = await query;
      setRecords((data as any) || []);
      setLoading(false);
    };

    fetchRecords();
  }, [date, periodFilter]);

  const statusBadge = (status: string) => {
    const variants: Record<string, string> = {
      present: "bg-accent/10 text-accent border-accent/20",
      sleepy: "bg-warning/10 text-warning border-warning/20",
      absent: "bg-destructive/10 text-destructive border-destructive/20",
    };
    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold capitalize ${variants[status] || ""}`}>
        {status}
      </span>
    );
  };

  const periodTimes: Record<number, string> = {
    1: "9:50 - 10:50",
    2: "10:50 - 11:50",
    3: "11:50 - 12:50",
    4: "12:50 - 1:30 (Lunch)",
    5: "1:30 - 2:30",
    6: "2:30 - 3:30",
    7: "3:30 - 4:30",
    8: "4:30 - 5:30 (Optional)",
  };

  return (
    <DashboardLayout>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Attendance Records</h1>
          <p className="text-muted-foreground">View attendance records by date and period</p>
        </div>

        <div className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Date</Label>
            <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="w-48" />
          </div>
          <div className="space-y-2">
            <Label>Period</Label>
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-48">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Periods</SelectItem>
                {[1, 2, 3, 4, 5, 6, 7, 8].map((p) => (
                  <SelectItem key={p} value={p.toString()}>
                    Period {p} ({periodTimes[p]})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Roll No.</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Period</TableHead>
                  <TableHead>Time</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">Loading...</TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No records for this date</TableCell>
                  </TableRow>
                ) : (
                  records.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">{(r as any).students?.roll_number || "—"}</TableCell>
                      <TableCell>{(r as any).students?.full_name || "—"}</TableCell>
                      <TableCell>Period {r.period}</TableCell>
                      <TableCell className="text-muted-foreground text-sm">{periodTimes[r.period]}</TableCell>
                      <TableCell>{statusBadge(r.status)}</TableCell>
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
