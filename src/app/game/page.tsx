"use client";

import {
  getNationName,
  initBiomePatterns,
  pixelToHex,
  popConverter,
  renderMap,
} from "@/canvas/render";
import { useCallback, useEffect, useRef, useState } from "react";
import { trpc } from "../_trpc/client";
import { Hex } from "../_trpc/client";
import { Nation } from "../_trpc/client";
import { Button } from "@/components/ui/button";
import Image from "next/image";

export default function Home() {
  const [mapHexes, setMapHexes] = useState<Hex[] | null>(null);
  const [nations, setNations] = useState<Nation[] | null>(null);
  const [playerNation, setPlayerNation] = useState<Nation | null>(null);
  const [turn, setTurn] = useState<number>(0);
  const [selectedHex, setSelectedHex] = useState<Hex | null>(null);

  const utils = trpc.useUtils();

  const mapData = trpc.generateHexMap.useMutation({
    onSuccess(data) {
      setMapHexes(data.mapHexes);
      setNations(data.nations);
      setTurn(data.turn);
      setSelectedHex(
        prevId !== null ? (data.mapHexes.find((hex) => hex.id === prevId) ?? null) : null
      );
      setPlayerNation(data.nations.find((nation) => nation.isPlayer));
      utils.readNations.invalidate();
    },
  });
  const nextTurn = trpc.nextTurn.useMutation();
  const { data: nationTable } = trpc.readNations.useQuery();

  // generate map
  useEffect(() => {
    mapData.mutate();
  }, []);

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const hitCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const ctxRef = useRef<CanvasRenderingContext2D | null>(null);
  const clickCtxRef = useRef<CanvasRenderingContext2D | null>(null);

  const mapHexesRef = useRef<Hex[] | null>(null);
  const nationsRef = useRef<Nation[] | null>(null);
  const playerNationRef = useRef<Nation | null>(null);
  const selectedHexIdRef = useRef<number | null>(null);
  const prevId = selectedHexIdRef.current;

  const cameraRef = useRef({
    x: 0,
    y: 0,
    zoom: 1,
  });
  const draggingRef = useRef(false);
  const mouseDownRef = useRef(false);
  const startPosRef = useRef({ x: 0, y: 0 });
  const lastPosRef = useRef({ x: 0, y: 0 });

  const blinkTimeRef = useRef(0);
  const lastTimeRef = useRef(0);
  const animatingRef = useRef(false);
  const rafRef = useRef<number | null>(null);

  const redraw = useCallback(() => {
    const ctx = ctxRef.current;
    const clickCtx = clickCtxRef.current;
    const map = mapHexesRef.current;
    const nationList = nationsRef.current;

    if (!ctx || !clickCtx || !map || !nationList) return;

    const now = performance.now();
    const last = lastTimeRef.current || now;
    const dt = (now - last) / 1000;
    lastTimeRef.current = now;
    blinkTimeRef.current += dt;

    const ctxs = [ctx, clickCtx];
    const canvas = ctx.canvas;
    ctxs.forEach((c) => {
      c.clearRect(0, 0, canvas.width, canvas.height);
      c.save();
      c.translate(canvas.width / 2, canvas.height / 2);
      c.scale(cameraRef.current.zoom, cameraRef.current.zoom);
      c.translate(cameraRef.current.x, cameraRef.current.y);
    });

    renderMap(ctx, clickCtx, 0, 0, selectedHexIdRef.current, blinkTimeRef.current, map, nationList);

    ctxs.forEach((c) => c.restore());
  }, []);

  const startAnimation = useCallback(() => {
    if (animatingRef.current) return;
    animatingRef.current = true;

    const step = () => {
      redraw();
      rafRef.current = requestAnimationFrame(step);
    };

    rafRef.current = requestAnimationFrame(step);
  }, [redraw]);

  const stopAnimation = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    animatingRef.current = false;
  }, []);

  const resize = useCallback(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;

    canvas.width = window.innerWidth;
    canvas.height = window.innerHeight;
    hitCanvas.width = window.innerWidth;
    hitCanvas.height = window.innerHeight;

    redraw();
  }, [redraw]);

  const handleWheel = useCallback(
    (event: WheelEvent) => {
      event.preventDefault();
      const camera = cameraRef.current;
      const zoomSpeed = 0.001;
      camera.zoom *= 1 - event.deltaY * zoomSpeed;
      camera.zoom = Math.min(Math.max(camera.zoom, 0.3), 4);
      redraw();
    },
    [redraw]
  );

  const handleCanvasClick = useCallback(
    (event: MouseEvent) => {
      const hitCanvas = hitCanvasRef.current;
      const map = mapHexesRef.current;
      if (!hitCanvas || !map) return;

      const rect = hitCanvas.getBoundingClientRect();
      const mouseX = event.clientX - rect.left;
      const mouseY = event.clientY - rect.top;

      const camera = cameraRef.current;
      const worldX = (mouseX - hitCanvas.width / 2) / camera.zoom - camera.x;
      const worldY = (mouseY - hitCanvas.height / 2) / camera.zoom - camera.y;

      const { hex } = pixelToHex({ x: worldX, y: worldY, mapHexes: map });
      if (!hex) return;

      selectedHexIdRef.current = hex.id;
      setSelectedHex(hex);

      startAnimation();
      redraw();
    },
    [redraw, startAnimation]
  );

  const handleMouseDown = useCallback((event: MouseEvent) => {
    if (event.button !== 0) return;
    mouseDownRef.current = true;
    draggingRef.current = false;
    startPosRef.current = { x: event.clientX, y: event.clientY };
    lastPosRef.current = { x: event.clientX, y: event.clientY };
  }, []);

  const handleMouseMove = useCallback(
    (event: MouseEvent) => {
      if (!mouseDownRef.current) return;

      const start = startPosRef.current;
      const distance = Math.hypot(event.clientX - start.x, event.clientY - start.y);
      if (!draggingRef.current && distance > 6) {
        draggingRef.current = true;
      }
      if (!draggingRef.current) return;

      const last = lastPosRef.current;
      const camera = cameraRef.current;
      camera.x += (event.clientX - last.x) / camera.zoom;
      camera.y += (event.clientY - last.y) / camera.zoom;
      lastPosRef.current = { x: event.clientX, y: event.clientY };

      redraw();
    },
    [redraw]
  );

  const handleMouseUp = useCallback(
    (event: MouseEvent) => {
      if (!mouseDownRef.current) return;
      mouseDownRef.current = false;

      if (!draggingRef.current) {
        handleCanvasClick(event);
      }

      draggingRef.current = false;
    },
    [handleCanvasClick]
  );

  const handleMouseLeave = useCallback(() => {
    draggingRef.current = false;
    mouseDownRef.current = false;
  }, []);

  useEffect(() => {
    mapHexesRef.current = mapHexes;
    redraw();
  }, [mapHexes, redraw]);

  useEffect(() => {
    nationsRef.current = nations;
    playerNationRef.current = nations?.find((nation) => nation.isPlayer);
    console.log("playerNationRef", playerNationRef.current);
    console.log("playerNation", playerNation);
    redraw();
  }, [nations, redraw, playerNation]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const hitCanvas = hitCanvasRef.current;
    if (!canvas || !hitCanvas) return;

    ctxRef.current = canvas.getContext("2d");
    clickCtxRef.current = hitCanvas.getContext("2d");
    lastTimeRef.current = performance.now();

    initBiomePatterns(ctxRef.current!).then(() => redraw());
    resize();

    window.addEventListener("resize", resize);
    hitCanvas.addEventListener("wheel", handleWheel);
    hitCanvas.addEventListener("mousedown", handleMouseDown);
    hitCanvas.addEventListener("mousemove", handleMouseMove);
    hitCanvas.addEventListener("mouseup", handleMouseUp);
    hitCanvas.addEventListener("mouseleave", handleMouseLeave);

    return () => {
      window.removeEventListener("resize", resize);
      hitCanvas.removeEventListener("wheel", handleWheel);
      hitCanvas.removeEventListener("mousedown", handleMouseDown);
      hitCanvas.removeEventListener("mousemove", handleMouseMove);
      hitCanvas.removeEventListener("mouseup", handleMouseUp);
      hitCanvas.removeEventListener("mouseleave", handleMouseLeave);
      stopAnimation();
    };
  }, [
    handleMouseDown,
    handleMouseMove,
    handleMouseUp,
    handleMouseLeave,
    handleWheel,
    redraw,
    resize,
    stopAnimation,
  ]);

  useEffect(() => () => stopAnimation(), [stopAnimation]);
  return (
    <>
      <div className="relative w-screen h-screen">
        <canvas ref={hitCanvasRef} className="absolute inset-0 z-10" />
        <canvas ref={canvasRef} className="absolute inset-0 z-0" />

        {/* UI Layer */}
        <div className="absolute inset-0 z-20 pointer-events-none">
          <div className="absolute right-2 bottom-2 pointer-events-auto">
            <Button
              onClick={() => {
                nextTurn.mutate();
                mapData.mutate();
                console.log(selectedHex);
                console.log(selectedHexIdRef.current);
              }}
            >
              Next Turn (turn: {turn})
            </Button>
          </div>

          <div className="h-[50%] w-[20%] absolute left-0 bottom-0 p-2">
            <div className="flex flex-col justify-between items-center h-full w-full bg-gray-800 rounded-xl pointer-events-auto p-2 gap-4">
              <div className="flex flex-col w-full justify-between bg-gray-900 rounded-lg shadow-md shadow-black">
                <div className="w-[50%] h-auto bg-amber-200 m-2 rounded-[5px]">
                  <Image
                    src={`/flags/${getNationName({ id: selectedHex?.owner, nationsObject: nationTable as object })}_flag.png`}
                    alt="nation flag"
                    width={1463}
                    height={962}
                    className="w-full h-full p-[1px] rounded-[8px]"
                  ></Image>
                </div>

                <p className="text-2xl text-white flex items-center justify-start p-2 w-full">
                  {getNationName({ id: selectedHex?.owner, nationsObject: nationTable as object })}
                </p>
              </div>
              <div className="w-full h-[40%]">
                <div className="w-full h-full flex flex-col justify-center gap-2">
                  <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl w-full">
                    <div className="w-[50%] h-auto p-2 group relative">
                      <Image
                        src={`/urban/${selectedHex ? selectedHex.urban : "nomadic_camp"}.png`}
                        alt="urban type"
                        width={1482}
                        height={972}
                        className="w-full h-full"
                      ></Image>
                      <div
                        className="
                          absolute left-1/2 bottom-full mt-2 -translate-x-1/2
                          rounded-md bg-zinc-900 border border-zinc-700
                          px-3 py-1 text-xs text-zinc-100
                          opacity-0 group-hover:opacity-100
                          transition
                          shadow-lg
                          pointer-events-none"
                      >
                        Urban Type: {selectedHex?.urban}
                      </div>
                    </div>
                    <div className="w-[50%] h-auto p-2 group relative">
                      <Image
                        src={`/biome_type/${selectedHex ? selectedHex.biome : "plains"}.png`}
                        alt="biome type"
                        width={1482}
                        height={972}
                        className="w-full h-full"
                      ></Image>
                      <div
                        className="
                          absolute left-1/2 bottom-full mt-2 -translate-x-1/2
                          rounded-md bg-zinc-900 border border-zinc-700
                          px-3 py-1 text-xs text-zinc-100
                          opacity-0 group-hover:opacity-100
                          transition
                          shadow-lg
                          pointer-events-none"
                      >
                        Biome: {selectedHex?.biome}
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-900 shadow-md shadow-black rounded-lg text-white h-full flex justify-center items-center text-2xl">
                    {selectedHex?.population}
                    <Image
                      src="/icons/population.png"
                      alt="population icon"
                      width={48}
                      height={32}
                      className="w-9 h-7"
                    ></Image>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div className="absolute left-0 top-0 pointer-events-auto h-[10%] w-full">
            <div className="flex justify-start items-center h-full bg-gray-800">
              <div className="flex justify-between items-center w-full h-full p-1">
                <Image
                  src={`/flags/${getNationName({ id: playerNation?.id, nationsObject: nationTable as object })}_flag.png`}
                  alt="nation flag"
                  width={1463}
                  height={962}
                  className="w-auto h-full p-[1px] rounded-[8px]"
                ></Image>
                <div className="w-full h-full flex justify-between items-center">
                  <div className="m-2 flex justify-start items-center gap-2 h-full w-auto max-w-[50%] p-1.5 pb-2">
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1">
                      <Image
                        src="/icons/gold_coin.png"
                        alt="gold coin icon"
                        width={399}
                        height={408}
                        className="w-auto h-[70%] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">{popConverter(1000)}</p>
                    </div>
                    <div className="flex justify-center items-center h-full bg-gray-900 shadow-md shadow-black rounded-lg gap-1 p-1">
                      <Image
                        src="/icons/wheat_bag.png"
                        alt="wheat bag icon"
                        width={408}
                        height={612}
                        className="w-auto h-[80%] flex items-center justify-center"
                      ></Image>
                      <p className="text-white text-2xl">100</p>
                    </div>
                  </div>
                  <div className="h-full flex items-center justify-center">
                    <div className="flex items-center justify-center">
                      <Button>Open Menu</Button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}
