import { useEffect, useRef, memo } from 'react';

interface DynamicBackgroundProps {
  riskState: 'Stable' | 'Elevated' | 'Critical';
  isBenchmarking: boolean;
}

export const DynamicBackground = memo(({ riskState, isBenchmarking }: DynamicBackgroundProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    let animationFrameId: number;
    let width = window.innerWidth;
    let height = window.innerHeight;

    // Support reduced motion
    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    // Adjust sizes for high DPI
    const resize = () => {
      width = window.innerWidth;
      height = window.innerHeight;
      canvas.width = width;
      canvas.height = height;
    };
    window.addEventListener('resize', resize);
    resize();

    // Particle Setup
    const particleCount = prefersReducedMotion ? 20 : 70;
    const particles: any[] = [];
    
    for (let i = 0; i < particleCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        vx: (Math.random() - 0.5) * (prefersReducedMotion ? 0.05 : 0.3),
        vy: (Math.random() - 0.5) * (prefersReducedMotion ? 0.05 : 0.3),
        size: Math.random() * 2 + 1,
        alpha: Math.random() * 0.4 + 0.1
      });
    }

    // Colors transition state
    let currentColor = { r: 56, g: 189, b: 248, sr: 14, sg: 165, sb: 233 };
    let targetColor = { r: 56, g: 189, b: 248, sr: 14, sg: 165, sb: 233 };

    const updateTargetColor = () => {
      if (isBenchmarking) {
        targetColor = { r: 139, g: 92, b: 246, sr: 56, sg: 189, sb: 248 }; // Violet / Cyan
      } else if (riskState === 'Critical') {
        targetColor = { r: 248, g: 113, b: 113, sr: 220, sg: 38, sb: 38 }; // Red
      } else if (riskState === 'Elevated') {
        targetColor = { r: 251, g: 191, b: 36, sr: 217, sg: 119, sb: 6 }; // Amber
      } else {
        targetColor = { r: 56, g: 189, b: 248, sr: 14, sg: 165, sb: 233 }; // Stable Blue
      }
    };

    // Parallax tracking
    let mouseX = width / 2;
    let mouseY = height / 2;
    let targetMouseX = width / 2;
    let targetMouseY = height / 2;

    const onMouseMove = (e: MouseEvent) => {
      targetMouseX = e.clientX;
      targetMouseY = e.clientY;
    };

    if (!prefersReducedMotion) {
      window.addEventListener('mousemove', onMouseMove);
    }

    const draw = () => {
      if (!ctx) return;
      updateTargetColor();
      
      // Smooth color transition
      currentColor.r += (targetColor.r - currentColor.r) * 0.05;
      currentColor.g += (targetColor.g - currentColor.g) * 0.05;
      currentColor.b += (targetColor.b - currentColor.b) * 0.05;
      currentColor.sr += (targetColor.sr - currentColor.sr) * 0.05;
      currentColor.sg += (targetColor.sg - currentColor.sg) * 0.05;
      currentColor.sb += (targetColor.sb - currentColor.sb) * 0.05;

      const pColor = `${Math.round(currentColor.r)},${Math.round(currentColor.g)},${Math.round(currentColor.b)}`;
      const sColor = `${Math.round(currentColor.sr)},${Math.round(currentColor.sg)},${Math.round(currentColor.sb)}`;
      
      // Clear with very dark background
      ctx.fillStyle = '#050A14';
      ctx.fillRect(0, 0, width, height);

      // Smooth mouse follow
      mouseX += (targetMouseX - mouseX) * 0.03;
      mouseY += (targetMouseY - mouseY) * 0.03;

      // Draw Gradient Mesh Glows (Parallax layer 1)
      const gradient1 = ctx.createRadialGradient(
        width * 0.3 + (mouseX - width/2) * 0.02, 
        height * 0.3 + (mouseY - height/2) * 0.02, 
        0, 
        width * 0.3, 
        height * 0.3, 
        Math.max(width, height) * 0.7
      );
      gradient1.addColorStop(0, `rgba(${pColor}, 0.12)`);
      gradient1.addColorStop(1, 'rgba(5, 10, 20, 0)');
      
      const gradient2 = ctx.createRadialGradient(
        width * 0.7 - (mouseX - width/2) * 0.03, 
        height * 0.7 - (mouseY - height/2) * 0.03, 
        0, 
        width * 0.7, 
        height * 0.7, 
        Math.max(width, height) * 0.6
      );
      gradient2.addColorStop(0, `rgba(${sColor}, 0.08)`);
      gradient2.addColorStop(1, 'rgba(5, 10, 20, 0)');

      ctx.fillStyle = gradient1;
      ctx.fillRect(0, 0, width, height);
      ctx.fillStyle = gradient2;
      ctx.fillRect(0, 0, width, height);

      // Speed modifier based on state
      let speedMult = 1;
      if (riskState === 'Critical') speedMult = 2.5;
      else if (riskState === 'Elevated') speedMult = 1.5;
      if (isBenchmarking) speedMult = 2.0;

      // Update and draw particles (Parallax layer 2)
      particles.forEach((p, i) => {
        if (!prefersReducedMotion) {
          p.x += p.vx * speedMult;
          p.y += p.vy * speedMult;
          
          // Turbulence in critical state
          if (riskState === 'Critical') {
            p.x += (Math.random() - 0.5) * 1.5;
            p.y += (Math.random() - 0.5) * 1.5;
          }
        }

        // Apply mouse parallax to particle rendering position
        const renderX = p.x + (mouseX - width/2) * (p.size * 0.01);
        const renderY = p.y + (mouseY - height/2) * (p.size * 0.01);

        // Wrap around logically
        if (p.x < -100) p.x = width + 100;
        if (p.x > width + 100) p.x = -100;
        if (p.y < -100) p.y = height + 100;
        if (p.y > height + 100) p.y = -100;

        // Draw point
        ctx.beginPath();
        ctx.arc(renderX, renderY, p.size, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(${pColor}, ${p.alpha})`;
        ctx.fill();

        // Neural lines
        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          // Use base coordinates for distance calculation to keep structure stable
          const dx = p.x - p2.x;
          const dy = p.y - p2.y;
          const dist = Math.sqrt(dx*dx + dy*dy);
          
          const connectionDistance = 140;
          if (dist < connectionDistance) {
            const renderX2 = p2.x + (mouseX - width/2) * (p2.size * 0.01);
            const renderY2 = p2.y + (mouseY - height/2) * (p2.size * 0.01);
            
            ctx.beginPath();
            ctx.moveTo(renderX, renderY);
            ctx.lineTo(renderX2, renderY2);
            const lineAlpha = (1 - dist/connectionDistance) * 0.12;
            ctx.strokeStyle = `rgba(${sColor}, ${lineAlpha})`;
            ctx.lineWidth = 0.6;
            ctx.stroke();
          }
        }
      });

      animationFrameId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', onMouseMove);
      cancelAnimationFrame(animationFrameId);
    };
  }, [riskState, isBenchmarking]);

  return (
    <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none bg-[#050A14]">
      <canvas 
        ref={canvasRef} 
        className="w-full h-full block" 
        style={{ opacity: 0.9 }} 
      />
    </div>
  );
});
