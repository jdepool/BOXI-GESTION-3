import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

export interface Estado {
  id: string;
  nombre: string;
  activo: boolean;
}

export interface Ciudad {
  id: string;
  nombre: string;
  estadoId: string;
  activo: boolean;
}

export function useEstadosCiudades(selectedEstadoNombre?: string) {
  // Fetch estados
  const { data: estados = [], isLoading: isLoadingEstados } = useQuery<Estado[]>({
    queryKey: ["/api/admin/estados"],
    staleTime: 30 * 60 * 1000, // 30 minutes - this data rarely changes
  });

  // Fetch all ciudades
  const { data: allCiudades = [], isLoading: isLoadingCiudades } = useQuery<Ciudad[]>({
    queryKey: ["/api/admin/ciudades"],
    staleTime: 30 * 60 * 1000, // 30 minutes
  });

  // Find selected estado by name
  const selectedEstado = useMemo(() => {
    if (!selectedEstadoNombre) return null;
    return estados.find(e => e.nombre === selectedEstadoNombre) || null;
  }, [estados, selectedEstadoNombre]);

  // Filter ciudades by selected estado
  const filteredCiudades = useMemo(() => {
    if (!selectedEstado) return [];
    return allCiudades.filter(c => c.estadoId === selectedEstado.id);
  }, [allCiudades, selectedEstado]);

  // Get estado name by ID (for reverse lookup)
  const getEstadoNameById = (estadoId: string) => {
    const estado = estados.find(e => e.id === estadoId);
    return estado?.nombre || "";
  };

  return {
    estados: estados.filter(e => e.activo),
    ciudades: filteredCiudades.filter(c => c.activo),
    allCiudades,
    isLoading: isLoadingEstados || isLoadingCiudades,
    selectedEstado,
    getEstadoNameById,
  };
}
