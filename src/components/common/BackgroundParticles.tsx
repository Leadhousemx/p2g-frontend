/**
 * BackgroundParticles
 * Fondo premium SaaS con partículas y light streaks
 * Sin librerías externas
 */

export const BackgroundParticles = () => {
  return (
    <div className="fixed inset-0 bg-gradient-to-br from-slate-950 via-blue-950 to-slate-900 overflow-hidden">
      {/* Stars Background */}
      <div className="absolute inset-0 opacity-40">
        <style>{`
          @keyframes twinkle {
            0%, 100% { opacity: 0.3; }
            50% { opacity: 1; }
          }

          .star {
            position: absolute;
            width: 2px;
            height: 2px;
            background: white;
            border-radius: 50%;
            animation: twinkle 3s ease-in-out infinite;
          }
        `}</style>
        {Array.from({ length: 40 }).map((_, i) => (
          <div
            key={i}
            className="star"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
            }}
          />
        ))}
      </div>

      {/* Light Streaks */}
      <div className="absolute inset-0 overflow-hidden">
        <style>{`
          @keyframes drift {
            0% { transform: translateX(-100%) translateY(0); opacity: 0; }
            10% { opacity: 0.3; }
            90% { opacity: 0.3; }
            100% { transform: translateX(150%) translateY(100px); opacity: 0; }
          }

          .light-streak {
            position: absolute;
            height: 1px;
            background: linear-gradient(90deg, rgba(59, 130, 246, 0) 0%, rgba(59, 130, 246, 0.6) 50%, rgba(59, 130, 246, 0) 100%);
            filter: blur(2px);
            animation: drift 20s linear infinite;
          }
        `}</style>
        <div
          className="light-streak"
          style={{
            width: '300px',
            top: '20%',
            left: '-300px',
            animationDelay: '0s',
          }}
        />
        <div
          className="light-streak"
          style={{
            width: '200px',
            top: '60%',
            left: '-200px',
            animationDelay: '8s',
          }}
        />
      </div>

      {/* Glow Orbs (subtle) */}
      <div className="absolute -top-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
      <div className="absolute -bottom-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
    </div>
  );
};
