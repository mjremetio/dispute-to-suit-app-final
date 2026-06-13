import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch, Redirect } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useAuth } from "@/_core/hooks/useAuth";

import Login from "./pages/Login";
import AdminLogin from "./pages/AdminLogin";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import ChangePassword from "./pages/ChangePassword";
import Dashboard from "./pages/Dashboard";
import Cases from "./pages/Cases";
import CaseDetail from "./pages/CaseDetail";
import Users from "./pages/admin/Users";
import ActivityLogs from "./pages/admin/ActivityLogs";
import Clients from "./pages/Clients";
import Analytics from "./pages/Analytics";

// CRO Portal pages
import CROSignup from "./pages/CROSignup";
import CRODashboard from "./pages/cro-portal/CRODashboard";
import CROClients from "./pages/cro-portal/CROClients";
import CROCases from "./pages/cro-portal/CROCases";
import CROCaseDetail from "./pages/cro-portal/CROCaseDetail";
import CROIntakeForm from "./pages/cro-portal/CROIntakeForm";
import CROInquiries from "./pages/cro-portal/CROInquiries";

// Client Portal pages
import ClientDashboard from "./pages/client-portal/ClientDashboard";
import ClientCases from "./pages/client-portal/ClientCases";
import ClientCaseDetail from "./pages/client-portal/ClientCaseDetail";
import ClientDocuments from "./pages/client-portal/ClientDocuments";
import ClientComments from "./pages/client-portal/ClientComments";
import ClientTimeline from "./pages/client-portal/ClientTimeline";
import ClientAccountSettings from "./pages/client-portal/ClientAccountSettings";

// Admin pages
import CROApplications from "./pages/admin/CROApplications";
import CROManagement from "./pages/admin/CROManagement";
import IntakeInquiries from "./pages/IntakeInquiries";
import ApiKeys from "./pages/admin/ApiKeys";

// Role-based redirect helper
function AuthRedirect() {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (!user) return <Redirect to="/login" />;
  if (user.mustChangePassword) return <Redirect to="/change-password" />;
  if (user.role === "cro") return <Redirect to="/cro-portal" />;
  if (user.role === "client") return <Redirect to="/client-portal" />;
  return <Redirect to="/admin/dashboard" />;
}

function Router() {
  return (
    <Switch>
      {/* Public routes */}
      <Route path="/">{() => <AuthRedirect />}</Route>
      <Route path="/login" component={Login} />
      <Route path="/admin/login" component={AdminLogin} />
      <Route path="/forgot-password" component={ForgotPassword} />
      <Route path="/reset-password" component={ResetPassword} />
      <Route path="/change-password" component={ChangePassword} />
      <Route path="/cro-signup" component={CROSignup} />

      {/* Admin/Paralegal routes - all under /admin */}
      <Route path="/admin/dashboard" component={Dashboard} />
      <Route path="/admin/cases" component={Cases} />
      <Route path="/admin/cases/:id" component={CaseDetail} />
      <Route path="/admin/clients" component={Clients} />
      <Route path="/admin/analytics" component={Analytics} />
      <Route path="/admin/users" component={Users} />
      <Route path="/admin/activity" component={ActivityLogs} />
      <Route path="/admin/cro-applications" component={CROApplications} />
      <Route path="/admin/cro-management" component={CROManagement} />
      <Route path="/admin/intake-inquiries" component={IntakeInquiries} />
      <Route path="/admin/api-keys" component={ApiKeys} />

      {/* Client Portal routes */}
      <Route path="/client-portal" component={ClientDashboard} />
      <Route path="/client-portal/cases" component={ClientCases} />
      <Route path="/client-portal/cases/:id" component={ClientCaseDetail} />
      <Route path="/client-portal/documents" component={ClientDocuments} />
      <Route path="/client-portal/comments" component={ClientComments} />
      <Route path="/client-portal/timeline" component={ClientTimeline} />
      <Route path="/client-portal/settings" component={ClientAccountSettings} />

      {/* CRO Portal routes */}
      <Route path="/cro-portal" component={CRODashboard} />
      <Route path="/cro-portal/clients" component={CROClients} />
      <Route path="/cro-portal/cases" component={CROCases} />
      <Route path="/cro-portal/cases/:id" component={CROCaseDetail} />
      <Route path="/cro-portal/intake" component={CROIntakeForm} />
      <Route path="/cro-portal/inquiries" component={CROInquiries} />

      {/* 404 */}
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider defaultTheme="light">
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
