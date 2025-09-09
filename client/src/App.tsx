import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Sales from "@/pages/sales";
import Despachos from "@/pages/despachos";
import Flete from "@/pages/flete";
import VerificacionPagosCashea from "@/pages/verificacion-pagos-cashea";
import Egresos from "@/pages/egresos";
import Administracion from "@/pages/administracion";
import Login from "@/pages/login";
import NotFound from "@/pages/not-found";

function ProtectedRoute({ component: Component }: { component: () => JSX.Element }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="h-screen flex items-center justify-center">
        <div className="text-center">
          <i className="fas fa-spinner fa-spin text-4xl text-primary mb-4"></i>
          <p className="text-muted-foreground">Cargando...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Login />;
  }

  return <Component />;
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={Login} />
      <Route path="/">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/dashboard">
        <ProtectedRoute component={Dashboard} />
      </Route>
      <Route path="/upload">
        <ProtectedRoute component={Upload} />
      </Route>
      <Route path="/sales">
        <ProtectedRoute component={Sales} />
      </Route>
      <Route path="/despachos">
        <ProtectedRoute component={Despachos} />
      </Route>
      <Route path="/flete">
        <ProtectedRoute component={Flete} />
      </Route>
      <Route path="/verificacion-pagos-cashea">
        <ProtectedRoute component={VerificacionPagosCashea} />
      </Route>
      <Route path="/egresos">
        <ProtectedRoute component={Egresos} />
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
        <TooltipProvider>
          <Toaster />
          <Router />
        </TooltipProvider>
      </QueryClientProvider>
    </ThemeProvider>
  );
}

export default App;
