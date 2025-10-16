import { Switch, Route, Redirect } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import { useAuth } from "@/hooks/useAuth";
import Sales from "@/pages/sales";
import Despachos from "@/pages/despachos";
import Devoluciones from "@/pages/devoluciones";
import Verificacion from "@/pages/verificacion";
import Egresos from "@/pages/egresos";
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
      <Route path="/despachos">
        <ProtectedRoute component={Despachos} />
      </Route>
      <Route path="/devoluciones">
        <ProtectedRoute component={Devoluciones} />
      </Route>
      <Route path="/verificacion">
        <ProtectedRoute component={Verificacion} />
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
