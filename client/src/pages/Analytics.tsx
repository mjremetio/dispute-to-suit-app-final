import DashboardLayout from "@/components/DashboardLayout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { trpc } from "@/lib/trpc";
import { TrendingUp, DollarSign, Users, Target, Calendar, BarChart3 } from "lucide-react";
import { useState, useMemo } from "react";
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { format, subDays, subMonths, startOfMonth, endOfMonth, eachDayOfInterval, eachMonthOfInterval } from "date-fns";

const COLORS = {
  primary: "#d97706", // amber-600
  success: "#059669", // emerald-600
  warning: "#dc2626", // red-600
  info: "#475569", // slate-600
  purple: "#7c3aed", // violet-600
};

const STATUS_COLORS = [COLORS.info, COLORS.warning, COLORS.success, COLORS.purple, COLORS.primary];

export default function Analytics() {
  const [timeRange, setTimeRange] = useState<string>("30");
  const { data: cases } = trpc.cases.list.useQuery();

  // Calculate date range
  const dateRange = useMemo(() => {
    const end = new Date();
    const start = timeRange === "7" ? subDays(end, 7) :
                  timeRange === "30" ? subDays(end, 30) :
                  timeRange === "90" ? subDays(end, 90) :
                  subMonths(end, 12);
    return { start, end };
  }, [timeRange]);

  // Filter cases by date range
  const filteredCases = useMemo(() => {
    if (!cases) return [];
    return cases.filter(c => {
      const caseDate = new Date(c.createdAt);
      return caseDate >= dateRange.start && caseDate <= dateRange.end;
    });
  }, [cases, dateRange]);

  // Case trend data (cases created over time)
  const caseTrendData = useMemo(() => {
    if (!filteredCases.length) return [];
    
    const intervals = timeRange === "365" 
      ? eachMonthOfInterval(dateRange)
      : eachDayOfInterval(dateRange);

    return intervals.map(date => {
      const dateStr = timeRange === "365" 
        ? format(date, "MMM yyyy")
        : format(date, "MMM d");
      
      const count = filteredCases.filter(c => {
        const caseDate = new Date(c.createdAt);
        if (timeRange === "365") {
          return caseDate.getMonth() === date.getMonth() && 
                 caseDate.getFullYear() === date.getFullYear();
        }
        return format(caseDate, "yyyy-MM-dd") === format(date, "yyyy-MM-dd");
      }).length;

      return {
        date: dateStr,
        cases: count,
      };
    });
  }, [filteredCases, dateRange, timeRange]);

  // Status distribution
  const statusDistribution = useMemo(() => {
    if (!filteredCases.length) return [];
    
    const statusCounts: Record<string, number> = {};
    filteredCases.forEach(c => {
      statusCounts[c.status] = (statusCounts[c.status] || 0) + 1;
    });

    return Object.entries(statusCounts).map(([status, count]) => ({
      name: status.replace(/_/g, " ").toUpperCase(),
      value: count,
    }));
  }, [filteredCases]);

  // Priority distribution
  const priorityDistribution = useMemo(() => {
    if (!filteredCases.length) return [];
    
    const priorityCounts: Record<string, number> = {
      urgent: 0,
      high: 0,
      medium: 0,
      low: 0,
    };

    filteredCases.forEach(c => {
      priorityCounts[c.priority] = (priorityCounts[c.priority] || 0) + 1;
    });

    return Object.entries(priorityCounts).map(([priority, count]) => ({
      priority: priority.charAt(0).toUpperCase() + priority.slice(1),
      count,
    }));
  }, [filteredCases]);

  // Monthly success rate
  const monthlySuccessRate = useMemo(() => {
    if (!cases) return [];
    
    const last6Months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    });

    return last6Months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      
      const monthCases = cases.filter(c => {
        const caseDate = new Date(c.createdAt);
        return caseDate >= monthStart && caseDate <= monthEnd;
      });

      const completed = monthCases.filter(c => c.status === "settled" || c.status === "settlement_paid_out" || c.status === "closed").length;
      const total = monthCases.length;
      const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

      return {
        month: format(month, "MMM"),
        rate,
        completed,
        total,
      };
    });
  }, [cases]);

  // Calculate key metrics
  const metrics = useMemo(() => {
    const total = filteredCases.length;
    const completed = filteredCases.filter(c => c.status === "settled" || c.status === "settlement_paid_out" || c.status === "closed").length;
    const inProgress = filteredCases.filter(c => c.status === "in_review" || c.status === "more_info_needed").length;
    const successRate = total > 0 ? Math.round((completed / total) * 100) : 0;
    
    // Calculate estimated value
    const estimatedValue = filteredCases.reduce((sum, c) => {
      const value = c.estimatedValue ? parseFloat(c.estimatedValue) : 0;
      return sum + value;
    }, 0);

    return {
      total,
      completed,
      inProgress,
      successRate,
      estimatedValue,
    };
  }, [filteredCases]);

  return (
    <DashboardLayout>
      <div className="space-y-4 sm:space-y-6 md:space-y-8">
        {/* Professional Header */}
        <div className="border-b border-slate-200 pb-4 sm:pb-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h1 className="text-2xl sm:text-3xl md:text-4xl font-serif font-bold text-slate-900 tracking-tight">Performance Analytics</h1>
              <p className="text-slate-600 mt-1 sm:mt-2 text-sm sm:text-lg">Comprehensive case metrics and litigation performance insights</p>
            </div>
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-full sm:w-[200px] border-slate-300">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7">Last 7 days</SelectItem>
                <SelectItem value="30">Last 30 days</SelectItem>
                <SelectItem value="90">Last 90 days</SelectItem>
                <SelectItem value="365">Last 12 months</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Enhanced Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4 md:gap-6">
          <Card className="border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Total Cases
              </CardTitle>
              <div className="w-12 h-12 bg-slate-100 rounded-lg flex items-center justify-center group-hover:bg-amber-50 transition-colors">
                <Target className="w-6 h-6 text-slate-600 group-hover:text-amber-600 transition-colors" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-slate-900">{metrics.total}</div>
              <p className="text-sm text-slate-500 mt-2">
                In selected period
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-emerald-400 hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Success Rate
              </CardTitle>
              <div className="w-12 h-12 bg-emerald-50 rounded-lg flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                <TrendingUp className="w-6 h-6 text-emerald-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-emerald-600">{metrics.successRate}%</div>
              <p className="text-sm text-slate-500 mt-2">
                {metrics.completed} of {metrics.total} completed
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-amber-400 hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                In Progress
              </CardTitle>
              <div className="w-12 h-12 bg-amber-50 rounded-lg flex items-center justify-center group-hover:bg-amber-100 transition-colors">
                <BarChart3 className="w-6 h-6 text-amber-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-amber-600">{metrics.inProgress}</div>
              <p className="text-sm text-slate-500 mt-2">
                Active cases
              </p>
            </CardContent>
          </Card>

          <Card className="border-slate-200 hover:border-violet-400 hover:shadow-lg transition-all duration-300 group">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <CardTitle className="text-sm font-semibold text-slate-600 uppercase tracking-wide">
                Estimated Value
              </CardTitle>
              <div className="w-12 h-12 bg-violet-50 rounded-lg flex items-center justify-center group-hover:bg-violet-100 transition-colors">
                <DollarSign className="w-6 h-6 text-violet-600" />
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-4xl font-serif font-bold text-violet-600">
                ${metrics.estimatedValue.toLocaleString()}
              </div>
              <p className="text-sm text-slate-500 mt-2">
                Total pipeline value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Case Trend Chart */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-2xl font-serif">Case Creation Trend</CardTitle>
            <CardDescription className="text-base">
              Volume of new cases initiated over the selected time period
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={caseTrendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="date" 
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  stroke="#cbd5e1"
                />
                <YAxis 
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  stroke="#cbd5e1"
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Line 
                  type="monotone" 
                  dataKey="cases" 
                  stroke={COLORS.primary} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.primary, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Cases Created"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Status and Priority Distribution */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
          {/* Status Distribution */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl font-serif">Case Status Distribution</CardTitle>
              <CardDescription className="text-base">
                Current status breakdown across all cases
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie
                    data={statusDistribution}
                    cx="50%"
                    cy="50%"
                    labelLine={false}
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                    outerRadius={90}
                    fill="#8884d8"
                    dataKey="value"
                  >
                    {statusDistribution.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Priority Distribution */}
          <Card className="border-slate-200 shadow-sm">
            <CardHeader className="border-b border-slate-100">
              <CardTitle className="text-2xl font-serif">Priority Distribution</CardTitle>
              <CardDescription className="text-base">
                Cases categorized by urgency level
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <ResponsiveContainer width="100%" height={350}>
                <BarChart data={priorityDistribution}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis 
                    dataKey="priority"
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    stroke="#cbd5e1"
                  />
                  <YAxis 
                    tick={{ fill: "#64748b", fontSize: 12 }}
                    stroke="#cbd5e1"
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: "white",
                      border: "1px solid #e2e8f0",
                      borderRadius: "8px",
                      boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                    }}
                  />
                  <Bar dataKey="count" fill={COLORS.primary} radius={[8, 8, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Monthly Success Rate */}
        <Card className="border-slate-200 shadow-sm">
          <CardHeader className="border-b border-slate-100">
            <CardTitle className="text-2xl font-serif">Monthly Success Rate</CardTitle>
            <CardDescription className="text-base">
              Case resolution performance over the last six months
            </CardDescription>
          </CardHeader>
          <CardContent className="pt-6">
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlySuccessRate}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis 
                  dataKey="month"
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  stroke="#cbd5e1"
                />
                <YAxis 
                  tick={{ fill: "#64748b", fontSize: 12 }}
                  stroke="#cbd5e1"
                  domain={[0, 100]}
                  tickFormatter={(value) => `${value}%`}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: "white",
                    border: "1px solid #e2e8f0",
                    borderRadius: "8px",
                    boxShadow: "0 4px 6px -1px rgb(0 0 0 / 0.1)",
                  }}
                  formatter={(value: any, name: string) => {
                    if (name === "rate") return [`${value}%`, "Success Rate"];
                    return [value, name];
                  }}
                />
                <Legend wrapperStyle={{ paddingTop: "20px" }} />
                <Line 
                  type="monotone" 
                  dataKey="rate" 
                  stroke={COLORS.success} 
                  strokeWidth={3}
                  dot={{ fill: COLORS.success, r: 5 }}
                  activeDot={{ r: 7 }}
                  name="Success Rate"
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </DashboardLayout>
  );
}
