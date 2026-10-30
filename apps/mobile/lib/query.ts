import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { readLocal, saveLocal } from "./storage";
import { useSession } from "./session";

export function useApiQuery<T>(key: string, path: string) {
  const { token, request } = useSession();
  const client = useQueryClient();
  const [hydrated, setHydrated] = useState(false);
  const [cachedAt, setCachedAt] = useState<string>();
  const [storageWarning, setStorageWarning] = useState<string>();
  useEffect(() => {
    let current = true;
    setHydrated(false);
    void readLocal<T>(`cache:${key}`)
      .then((cached) => {
        if (!current) return;
        if (cached) {
          setCachedAt(cached.updatedAt);
          if (!client.getQueryData([key]))
            client.setQueryData([key], cached.value, { updatedAt: 0 });
        }
      })
      .catch(() => {
        if (current) setStorageWarning("La copia local no está disponible en este teléfono.");
      })
      .finally(() => {
        if (current) setHydrated(true);
      });
    return () => {
      current = false;
    };
  }, [key, client]);
  const query = useQuery({
    queryKey: [key],
    queryFn: async ({ signal }) => {
      const data = await request<T>(path, { signal });
      if (signal.aborted) throw new Error("Consulta cancelada");
      await saveLocal(`cache:${key}`, data)
        .then(() => {
          setCachedAt(new Date().toISOString());
          setStorageWarning(undefined);
        })
        .catch(() =>
          setStorageWarning("Consulta actualizada, pero no se pudo guardar la copia local."),
        );
      return data;
    },
    enabled: !!token && hydrated,
  });
  return { ...query, cachedAt, hydrated, storageWarning };
}
