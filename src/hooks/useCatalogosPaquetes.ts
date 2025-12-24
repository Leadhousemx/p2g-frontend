import { useEffect, useState } from "react";

export type CatalogoItem = {
  id: string;
  nombre: string;
  precio?: number;
};

export function useCatalogosPaquetes() {
  const [platillos, setPlatillos] = useState<CatalogoItem[]>([]);
  const [bebidas, setBebidas] = useState<CatalogoItem[]>([]);
  const [mobiliario, setMobiliario] = useState<CatalogoItem[]>([]);
  const [personal, setPersonal] = useState<CatalogoItem[]>([]);
  const [adicionales, setAdicionales] = useState<CatalogoItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    setTimeout(() => {
      setPlatillos([
        { id: "1", nombre: "Pollo en mole", precio: 120 },
        { id: "2", nombre: "Filete de res", precio: 180 },
      ]);
      setBebidas([
        { id: "1", nombre: "Refresco", precio: 20 },
        { id: "2", nombre: "Vino tinto", precio: 90 },
      ]);
      setMobiliario([
        { id: "1", nombre: "Mesa redonda", precio: 50 },
        { id: "2", nombre: "Silla Tiffany", precio: 15 },
      ]);
      setPersonal([
        { id: "1", nombre: "Mesero", precio: 200 },
        { id: "2", nombre: "Chef", precio: 500 },
      ]);
      setAdicionales([
        { id: "1", nombre: "Mantelería fina", precio: 30 },
        { id: "2", nombre: "Centro de mesa", precio: 40 },
      ]);
      setLoading(false);
    }, 400);
  }, []);

  return { platillos, bebidas, mobiliario, personal, adicionales, loading };
}
