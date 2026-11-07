import React, {useLayoutEffect, useRef} from 'react';
import {AbsoluteFill, useCurrentFrame, useVideoConfig} from 'remotion';
import {forwardTime, SWITCH} from './timing';
import {drawHead, drawTube, LOOK, motionAround} from './tube';

/** Frame-by-frame recreation of the neon "hello" → Apple logo clip. 30 fps, 295 frames. */
export const HelloRecreation: React.FC = () => {
  const frame = useCurrentFrame();
  const {width, height} = useVideoConfig();
  const ref = useRef<HTMLCanvasElement>(null);
  const glowRef = useRef<HTMLCanvasElement | null>(null);

  useLayoutEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d') as CanvasRenderingContext2D;
    const K = width / 1280;
    ctx.globalCompositeOperation = 'source-over';
    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, width, height);
    const t = forwardTime(frame);
    if (t < 0) return;

    // motion blur: average a few instants across the open shutter when things move fast
    const move = motionAround(t) * LOOK.shutter;
    const n = Math.max(1, Math.min(12, Math.ceil(move / 5)));
    for (let k = 0; k < n; k++) {
      let st = n === 1 ? t : t + ((k + 0.5) / n - 0.5) * LOOK.shutter;
      // never mix the hello and the logo inside one frame's blur
      if (t < SWITCH) st = Math.min(st, SWITCH - 0.001);
      else st = Math.max(st, SWITCH);
      drawTube(ctx, st, K, 1 / n);
      drawHead(ctx, st, K, 1 / n);
    }

    // bloom: two blurred copies of the tube added back on top
    if (!glowRef.current) glowRef.current = document.createElement('canvas');
    const g = glowRef.current;
    const gw = Math.round(width / 4);
    const gh = Math.round(height / 4);
    g.width = gw;
    g.height = gh;
    const gx = g.getContext('2d') as CanvasRenderingContext2D;
    for (const glow of [LOOK.glowNear, LOOK.glowFar]) {
      gx.clearRect(0, 0, gw, gh);
      gx.filter = `blur(${(glow.blur * K) / 4}px)`;
      gx.drawImage(canvas, 0, 0, gw, gh);
      gx.filter = 'none';
      ctx.save();
      ctx.globalCompositeOperation = 'lighter';
      ctx.globalAlpha = glow.alpha;
      ctx.imageSmoothingQuality = 'high';
      ctx.drawImage(g, 0, 0, width, height);
      ctx.restore();
    }
  }, [frame, width, height]);

  return (
    <AbsoluteFill style={{backgroundColor: '#000'}}>
      <canvas ref={ref} width={width} height={height} style={{width: '100%', height: '100%'}} />
    </AbsoluteFill>
  );
};
