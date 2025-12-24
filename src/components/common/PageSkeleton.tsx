// src/components/common/PageSkeleton.tsx
import React from "react";

export default function PageSkeleton() {
  return (
    <div className="flex flex-col items-center justify-center h-40 w-full text-gray-400 animate-pulse">
      <div className="w-12 h-12 border-4 border-blue-300 border-t-transparent rounded-full animate-spin mb-4" />
      <div className="h-3 w-32 bg-gray-200 rounded mb-2" />
      <div className="h-3 w-24 bg-gray-200 rounded" />
    </div>
  );
}
