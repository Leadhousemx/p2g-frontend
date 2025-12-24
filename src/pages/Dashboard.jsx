// src/pages/Dashboard.jsx

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";
import { api } from "../lib/api";

export default function Dashboard() {
  const navigate = useNavigate();

  useEffect(() => {
    const fetchUsuario = async () => {
      const token = localStorage.getItem("auth.token");
      if (!token) {
        localStorage.removeItem("auth.token");
        navigate("/login");
        return;
      }
      try {
        await api.get("/protegida");
      } catch {
        localStorage.removeItem("auth.token");
        navigate("/login");
      }
    };
    fetchUsuario();
  }, [navigate]);

  return (
    <div className="bg-gray-100 min-h-screen w-full flex flex-col">
      <main className="flex-1 p-0 md:p-6 overflow-auto">
        <div className="bg-white rounded-2xl shadow-lg h-full w-full p-2 md:p-6">
          <FullCalendar
            plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
            initialView="dayGridMonth"
            headerToolbar={{
              left: "prev,next today",
              center: "title",
              right: "dayGridMonth,timeGridWeek,timeGridDay",
            }}
            height="auto"
            nowIndicator={true}
            dayMaxEvents={2}
            selectable={true}
            dayCellClassNames={(arg) =>
              arg.isToday ? "border-2 border-blue-500 bg-blue-50" : ""
            }
            // events={[]} // Aquí puedes conectar tus eventos
            locale="es"
          />
        </div>
      </main>
    </div>
  );
}

// TODO: variables reservadas para futura implementación
// import { useLocation } from "react-router-dom";
// const _logo = /* ... */;
// const [_menuItems, _setMenuItems] = useState(/* ... */);
// const [_usuario, _setUsuario] = useState(null);
// const [_menuOpen, _setMenuOpen] = useState(false);
// const _azul = "#2563eb";
// const _azulHover = "#1d4ed8";
