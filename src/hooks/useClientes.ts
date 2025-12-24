import { useState, useEffect } from "react";
import type { Cliente } from "../components/clientes/ClientesTable";

const MOCK: Cliente[] = [
  { id: "1", nombre: "Juan", apellidos: "Pérez", telefono: "5551234567", email: "juan@mail.com", calificacion: "good" },
  { id: "2", nombre: "Ana", apellidos: "López", telefono: "5559876543", email: "ana@mail.com", calificacion: "neutral" },
  { id: "3", nombre: "Carlos", apellidos: "Ramírez", telefono: "5551112233", email: "carlos@mail.com", calificacion: "bad" },
  { id: "4", nombre: "María", apellidos: "Gómez", telefono: "5552223344", email: "maria@mail.com", calificacion: "good" },
  { id: "5", nombre: "Luis", apellidos: "Martínez", telefono: "5553334455", email: "luis@mail.com", calificacion: "neutral" },
  { id: "6", nombre: "Sofía", apellidos: "Hernández", telefono: "5554445566", email: "sofia@mail.com", calificacion: "good" },
  { id: "7", nombre: "Pedro", apellidos: "Sánchez", telefono: "5555556677", email: "pedro@mail.com", calificacion: "bad" },
  { id: "8", nombre: "Laura", apellidos: "Torres", telefono: "5556667788", email: "laura@mail.com", calificacion: "good" },
  { id: "9", nombre: "Diego", apellidos: "Vargas", telefono: "5557778899", email: "diego@mail.com", calificacion: "neutral" },
  { id: "10", nombre: "Elena", apellidos: "Castro", telefono: "5558889900", email: "elena@mail.com", calificacion: "good" },
  { id: "11", nombre: "Miguel", apellidos: "Navarro", telefono: "5559990011", email: "miguel@mail.com", calificacion: "bad" },
  { id: "12", nombre: "Valeria", apellidos: "Mendoza", telefono: "5550001122", email: "valeria@mail.com", calificacion: "good" },
  { id: "13", nombre: "Jorge", apellidos: "Silva", telefono: "5551112233", email: "jorge@mail.com", calificacion: "neutral" },
  { id: "14", nombre: "Paula", apellidos: "Ríos", telefono: "5552223344", email: "paula@mail.com", calificacion: "good" },
  { id: "15", nombre: "Andrés", apellidos: "Cruz", telefono: "5553334455", email: "andres@mail.com", calificacion: "bad" },
  { id: "16", nombre: "Fernanda", apellidos: "Ortega", telefono: "5554445566", email: "fernanda@mail.com", calificacion: "good" },
  { id: "17", nombre: "Ricardo", apellidos: "Morales", telefono: "5555556677", email: "ricardo@mail.com", calificacion: "neutral" },
  { id: "18", nombre: "Gabriela", apellidos: "Peña", telefono: "5556667788", email: "gabriela@mail.com", calificacion: "good" },
  { id: "19", nombre: "Emilio", apellidos: "Flores", telefono: "5557778899", email: "emilio@mail.com", calificacion: "bad" },
  { id: "20", nombre: "Camila", apellidos: "Ramos", telefono: "5558889900", email: "camila@mail.com", calificacion: "good" },
];

export function useClientes({ searchNombre, searchEmail, searchTelefono, page, pageSize }: { searchNombre: string; searchEmail: string; searchTelefono: string; page: number; pageSize: number }) {
  const [clientes, setClientes] = useState<Cliente[]>([]);
  const [loading, setLoading] = useState(true);
  const [total, setTotal] = useState(0);

  useEffect(() => {
    setLoading(true);
    // Simula fetch
    setTimeout(() => {
      let filtered = MOCK.filter(c =>
        (!searchNombre || c.nombre.toLowerCase().includes(searchNombre.toLowerCase())) &&
        (!searchEmail || c.email.toLowerCase().includes(searchEmail.toLowerCase())) &&
        (!searchTelefono || c.telefono.includes(searchTelefono))
      );
      setTotal(filtered.length);
      setClientes(filtered.slice((page - 1) * pageSize, page * pageSize));
      setLoading(false);
    }, 400);
    // Aquí iría fetch real:
    // fetch(`/api/clientes?...`).then(...)
  }, [searchNombre, searchEmail, searchTelefono, page, pageSize]);

  return { clientes, loading, total };
}
