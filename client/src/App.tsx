import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { ThemeProvider } from "@/components/theme-provider";
import Dashboard from "@/pages/dashboard";
import Upload from "@/pages/upload";
import Sales from "@/pages/sales";
import Despachos from "@/pages/despachos";
import Flete from "@/pages/flete";
import VerificacionPagosCashea from "@/pages/verificacion-pagos-cashea";
import Egresos from "@/pages/egresos";
import Administracion from "@/pages/administracion";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/dashboard" component={Dashboard} />
      <Route path="/upload" component={Upload} />
      <Route path="/sales" component={Sales} />
      <Route path="/despachos" component={Despachos} />
      <Route path="/flete" component={Flete} />
      <Route path="/verificacion-pagos-cashea" component={VerificacionPagosCashea} />
      <Route path="/egresos" component={Egresos} />
      <Route path="/administracion" component={Administracion} />
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
