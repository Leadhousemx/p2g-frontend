import { createContext, useContext } from "react";

export function useToast() {
  // Simulación simple para demo
  return {
    toast: ({ title, variant }: { title: string; variant?: "success" | "destructive" }) => {
      alert(`${title}`);
    },
  };
}
