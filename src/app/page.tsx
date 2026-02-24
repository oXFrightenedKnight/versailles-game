"use client";

import { initBiomePatterns, pixelToHex, renderMap } from "@/canvas/render";
import { useEffect, useRef, useState } from "react";

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const selectedHexIdRef = useRef<number | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current!;
    const ctx = canvas.getContext("2d")!;
    const camera = {
      x: 0,
      y: 0,
      zoom: 1,
    };
    let isDragging = false;
    let lastMouseX = 0;
    let lastMouseY = 0;
    let isMouseDown = false;
    let startMouseX = 0;
    let startMouseY = 0;
    const DRAG_THRESHOLD = 6;

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;

      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      renderMap(ctx, centerX, centerY, selectedHexIdRef.current);
    }

    function redraw() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);

      ctx.save();
      ctx.translate(canvas.width / 2, canvas.height / 2);
      ctx.scale(camera.zoom, camera.zoom);
      ctx.translate(camera.x, camera.y);

      renderMap(ctx, 0, 0, selectedHexIdRef.current);

      ctx.restore();
    }
    function handleClick(e: MouseEvent) {
      const rect = canvas.getBoundingClientRect();
      // clientX and clientY are the coordinates of the browser window

      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;
      // get coordinates inside canvas

      const worldX = (mouseX - canvas.width / 2) / camera.zoom - camera.x;

      const worldY = (mouseY - canvas.height / 2) / camera.zoom - camera.y;
      // coordinates inside map world (what we need to identify chosen tile)
      // (0, 0) is the center of the map

      const { hex } = pixelToHex({ x: worldX, y: worldY });

      if (hex) {
        console.log("selected hex q,r", hex.q, hex.r);
        console.log("biome", hex.biome);
        selectedHexIdRef.current = hex.id;
        console.log("selectedHexId", selectedHexIdRef.current);
        redraw();
      }
    }

    // Add event listeners
    window.addEventListener("resize", resize);
    canvas.addEventListener("wheel", (e) => {
      e.preventDefault();

      const zoomSpeed = 0.001;
      camera.zoom *= 1 - e.deltaY * zoomSpeed;

      // ограничения, чтобы не улететь в космос
      camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4);

      redraw();
    });
    canvas.addEventListener("mousedown", (e) => {
      if (e.button !== 0) return;

      isMouseDown = true;
      isDragging = false;

      startMouseX = e.clientX;
      startMouseY = e.clientY;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;
    });
    canvas.addEventListener("mousemove", (e) => {
      if (!isMouseDown) return;

      const dxTotal = e.clientX - startMouseX; // how much mouse moved on x-axis
      const dyTotal = e.clientY - startMouseY; // how much mouse moved on y-axis
      const distance = Math.sqrt(dxTotal * dxTotal + dyTotal * dyTotal);

      if (!isDragging && distance > DRAG_THRESHOLD) {
        isDragging = true;
        console.log("it is a drag!");
      }

      if (!isDragging) return;

      const dx = e.clientX - lastMouseX;
      const dy = e.clientY - lastMouseY;

      // ВАЖНО: делим на zoom
      camera.x += dx / camera.zoom;
      camera.y += dy / camera.zoom;

      lastMouseX = e.clientX;
      lastMouseY = e.clientY;

      redraw();
    });

    canvas.addEventListener("mouseup", (e) => {
      if (!isMouseDown) return;

      isMouseDown = false;

      if (!isDragging) {
        console.log("click!");
        handleClick(e);
      }

      isDragging = false;
    });
    canvas.addEventListener("mouseleave", () => {
      isDragging = false;
    });

    initBiomePatterns(ctx).then(() => {
      redraw();
    });
    resize();

    return () => window.removeEventListener("resize", resize);
  }, []);
  return (
    <>
      <div className="relative">
        <canvas ref={canvasRef}></canvas>
        <canvas
          // ref={hitCanvas}
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            pointerEvents: "auto",
          }}
        />
      </div>
    </>
  );
}
