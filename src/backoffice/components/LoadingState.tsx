interface LoadingStateProps {
  text?: string;
}

export default function LoadingState({ text = 'Cargando...' }: LoadingStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-4">
      <div className="h-8 w-8 rounded-full border-2 border-gray-200 border-t-sky-500 animate-spin" />
      <p className="text-sm text-gray-400">{text}</p>
    </div>
  );
}
