import CROLayout from "@/components/CROLayout";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc";
import { Users, FileText, Clock, CheckCircle, XCircle } from "lucide-react";

export default function CRODashboard() {
  const { data: stats, isLoading } = trpc.cro.dashboardStats.useQuery();

  const cards = [
    { label: "Total Clients", value: stats?.totalClients ?? 0, icon: Users, color: "text-blue-600", bg: "bg-blue-50" },
    { label: "Active Cases", value: stats?.activeCases ?? 0, icon: FileText, color: "text-green-600", bg: "bg-green-50" },
    { label: "Pending Inquiries", value: stats?.pendingInquiries ?? 0, icon: Clock, color: "text-amber-600", bg: "bg-amber-50" },
    { label: "Accepted Inquiries", value: stats?.acceptedInquiries ?? 0, icon: CheckCircle, color: "text-emerald-600", bg: "bg-emerald-50" },
    { label: "Rejected Inquiries", value: stats?.rejectedInquiries ?? 0, icon: XCircle, color: "text-red-600", bg: "bg-red-50" },
  ];

  return (
    <CROLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        <div className="border-b border-slate-200 pb-6">
          <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">CRO Dashboard</h1>
          <p className="text-slate-600 mt-2 text-lg">Overview of your clients, cases, and intake inquiries</p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
          {cards.map((card) => (
            <Card key={card.label} className="border-slate-200 hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium text-slate-600">{card.label}</CardTitle>
                <div className={`p-2 rounded-lg ${card.bg}`}>
                  <card.icon className={`h-4 w-4 ${card.color}`} />
                </div>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-slate-900">
                  {isLoading ? <span className="animate-pulse">--</span> : card.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </CROLayout>
  );
}
