// src/PageSkeleton.jsx
export default function PageSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-40 text-gray-400">
      <span className="animate-spin text-2xl mb-2">🔄</span>
      <span>Cargando...</span>
    </div>
  );
}
