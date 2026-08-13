import React, { useEffect, useRef } from 'react';

const COLORS = ['#ff4d4d', '#4d94ff', '#4dff77', '#ffff4d', '#bf4dff', '#ff944d'];
const EMOJIS = ['⭐', '🎉', '✨', '🎊', '💫', '🌟'];

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: string;
  emoji?: string;
  size: number;
  rot: number;
  rotV: number;
  life: number;
}

export const Confetti: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;

    const particles: Particle[] = Array.from({ length: 60 }, () => ({
      x: Math.random() * canvas.width,
      y: -20,
      vx: (Math.random() - 0.5) * 4,
      vy: Math.random() * 4 + 2,
      color: COLORS[Math.floor(Math.random() * COLORS.length)],
      emoji: Math.random() > 0.6 ? EMOJIS[Math.floor(Math.random() * EMOJIS.length)] : undefined,
      size: Math.random() * 14 + 8,
      rot: Math.random() * Math.PI * 2,
      rotV: (Math.random() - 0.5) * 0.2,
      life: 1,
    }));

    let animId: number;
    let frame = 0;

    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      frame++;

      for (const p of particles) {
        p.x += p.vx;
        p.y += p.vy;
        p.vy += 0.12;
        p.rot += p.rotV;
        p.life = Math.max(0, 1 - p.y / (canvas.height * 1.2));

        ctx.save();
        ctx.globalAlpha = p.life;
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);

        if (p.emoji) {
          ctx.font = `${p.size}px serif`;
          ctx.fillText(p.emoji, -p.size / 2, p.size / 2);
        } else {
          ctx.fillStyle = p.color;
          ctx.fillRect(-p.size / 2, -p.size / 4, p.size, p.size / 2);
        }

        ctx.restore();
      }

      if (frame < 180) {
        animId = requestAnimationFrame(draw);
      }
    };

    animId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(animId);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-40"
    />
  );
};
