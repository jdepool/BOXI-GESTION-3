import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { WebSocketProvider } from "@/contexts/WebSocketContext";
import { TrebleWebhookNotification } from "@/components/notifications/TrebleWebhookNotification";
import { useAuth } from "@/hooks/useAuth";
import Sales from "@/pages/sales";
import VentasMompox from "@/pages/ventas-mompox";
import Despachos from "@/pages/despachos";
import DevolucionesCancelaciones from "@/pages/devoluciones-cancelaciones";
import Verificacion from "@/pages/verificacion";
import Egresos from "@/pages/egresos";
import Reportes from "@/pages/reportes";
import ReporteOrdenes from "@/pages/reportes-ordenes";
import ReportePerdidas from "@/pages/reportes-perdidas";
import ReporteProspectosPerdidos from "@/pages/reportes-prospectos-perdidos";
import Administracion from "@/pages/administracion";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  // Authentication disabled - directly render the component
  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <Redirect to="/sales" />
      </Route>
      <Route path="/sales">
        <ProtectedRoute component={Sales} />
      </Route>
      <Route path="/mompox">
        <ProtectedRoute component={VentasMompox} />
      </Route>
      <Route path="/despachos">
        <ProtectedRoute component={Despachos} />
      </Route>
      <Route path="/devoluciones">
        <ProtectedRoute component={DevolucionesCancelaciones} />
      </Route>
      <Route path="/verificacion">
        <ProtectedRoute component={Verificacion} />
      </Route>
      <Route path="/egresos">
        <ProtectedRoute component={Egresos} />
      </Route>
      <Route path="/reportes/ordenes">
        <ProtectedRoute component={ReporteOrdenes} />
      </Route>
      <Route path="/reportes/perdidas">
        <ProtectedRoute component={ReportePerdidas} />
      </Route>
      <Route path="/reportes/prospectos-perdidos">
        <ProtectedRoute component={ReporteProspectosPerdidos} />
      </Route>
      <Route path="/reportes">
        <ProtectedRoute component={Reportes} />
      </Route>
      <Route path="/administracion">
        <ProtectedRoute component={Administracion} />
      </Route>
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="boxisleep-ui-theme">
      <QueryClientProvider client={queryClient}>
        <WebSocketProvider>
          <TooltipProvider>
            <Toaster />
            <TrebleWebhookNotification />
            <Router />
          </TooltipProvider>
        </WebSocketProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
