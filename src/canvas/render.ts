import { Biome, BIOME_COLOR, HEX_SIZE } from "./map_data";
import { Hex } from "@/app/_trpc/client";
import { Nation } from "@/app/_trpc/client";

const biomePatterns: Partial<Record<Biome, CanvasPattern>> = {};

export function initBiomePatterns(ctx: CanvasRenderingContext2D): Promise<void> {
  return new Promise((resolve) => {
    const images: Record<Biome, HTMLImageElement> = {
      forest: new window.Image(),
      desert: new window.Image(),
      plains: new window.Image(),
      mountains: new window.Image(),
    };

    let loaded = 0;
    const total = Object.keys(images).length;

    for (const biome in images) {
      const img = images[biome as Biome];
      img.src = `/biomes/${biome}.png`;

      const SCALE = 0.1;

      img.onload = () => {
        const pattern = ctx.createPattern(img, "repeat")!;
        pattern.setTransform(new DOMMatrix().translate(32, 32).scale(SCALE));
        biomePatterns[biome as Biome] = pattern;

        loaded++;

        if (loaded === total) {
          resolve();
        }
      };
    }
  });
}

function drawPolygon({
  ctx,
  centerX,
  centerY,
  radius,
  rotation,
  biome,
  id,
  nations,
}: {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  radius: number;
  rotation: number;
  biome: Biome | null;
  id: number;
  nations: Nation[];
}) {
  ctx.save();

  // 1️⃣ переносим (0,0) в центр хекса
  ctx.translate(centerX, centerY);

  // 2️⃣ рисуем хекс ВОКРУГ (0,0)
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = ((Math.PI * 2) / 6) * i + rotation;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();

  ctx.lineWidth = 1;

  Object.keys(BIOME_COLOR).forEach((key) => {
    if (key === biome) {
      ctx.fillStyle = biomePatterns[biome as Biome]!;
      ctx.strokeStyle = BIOME_COLOR[key];
    }
  });

  ctx.fill();
  ctx.stroke();

  nations.map((nation) => {
    nation.tiles.map((tile: number) => {
      if (tile === id) {
        ctx.globalAlpha = 0.6;
        ctx.fillStyle = nation.color;
        ctx.fill();

        // set provinces that are controlled by no one to be specific color (like black)
      }
    });
  });
  ctx.globalAlpha = 1;

  ctx.restore();
}

// draw invisible polygons for clicking
function drawClickPolygon({
  ctx,
  centerX,
  centerY,
  radius,
  rotation,
  isSelected,
  blinkTime,
}: {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  radius: number;
  rotation: number;
  isSelected: boolean;
  blinkTime: number;
}) {
  ctx.save();

  // 1️⃣ переносим (0,0) в центр хекса
  ctx.translate(centerX, centerY);

  // 2️⃣ рисуем хекс ВОКРУГ (0,0)
  ctx.beginPath();

  for (let i = 0; i < 6; i++) {
    const angle = ((Math.PI * 2) / 6) * i + rotation;
    const x = radius * Math.cos(angle);
    const y = radius * Math.sin(angle);
    if (i === 0) {
      ctx.moveTo(x, y);
    } else {
      ctx.lineTo(x, y);
    }
  }

  ctx.closePath();

  ctx.lineWidth = 3;

  if (!isSelected) {
    ctx.restore();
    return;
  }

  const pulse = Math.sin(blinkTime * 3);

  const alpha = 0.15 + 0.15 * (0.5 + 0.5 * pulse);
  const scale = 1 + 0.05 * Math.sin(blinkTime * 3);

  ctx.globalAlpha = alpha;
  ctx.scale(scale, scale);

  ctx.fillStyle = "rgba(240,240,240,1)";
  ctx.strokeStyle = "#FFFFFF";

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const y = ((HEX_SIZE * 3) / 2) * r;

  return { x, y };
}
export function pixelToHex({ x, y, mapHexes }: { x: number; y: number; mapHexes: Hex[] }) {
  const r = y / ((HEX_SIZE * 3) / 2);
  const q = x / (HEX_SIZE * Math.sqrt(3)) - r / 2;

  const qf = q;
  const rf = r;
  const sf = -qf - rf;

  let rq = Math.round(qf);
  let rr = Math.round(rf);
  let rs = Math.round(sf);

  const dq = Math.abs(rq - qf);
  const dr = Math.abs(rr - rf);
  const ds = Math.abs(rs - sf);

  if (dq > dr && dq > ds) {
    rq = -rr - rs;
  } else if (dr > ds) {
    rr = -rq - rs;
  } else {
    rs = -rq - rr;
  }

  const hex = mapHexes.find((h) => h.q === rq && h.r === rr);
  return { hex, axial: { q: rq, r: rr } };
}

export function renderMap(
  ctx: CanvasRenderingContext2D,
  clickCtx: CanvasRenderingContext2D,
  mapCenterX: number,
  mapCenterY: number,
  selectedHexId: number | null,
  blinkTime: number,
  mapHexes: Hex[],
  nations: Nation[]
) {
  mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);

    drawPolygon({
      ctx: ctx,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      biome: hex.biome,
      id: hex.id,
      nations: nations,
    });
  });

  // draw invisible click map
  mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    let isSelected: boolean = false;

    if (selectedHexId !== null) {
      isSelected = hex.id === selectedHexId;
    }

    drawClickPolygon({
      ctx: clickCtx,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      isSelected: isSelected,
      blinkTime: blinkTime,
    });
  });
}

export function getNationName({ id, nationsObject }: { id: string; nationsObject: object }) {
  if (nationsObject) {
    const entry = Object.entries(nationsObject).find(([_, value]) => value === id);

    const key = entry?.[0] ? entry?.[0] : "tribes";
    return key;
  }
}

export function popConverter(population: number) {
  if (population >= 1000000) {
    return `${(population / 1000000).toFixed(1)}M`;
  } else if (population >= 1000) {
    return `${(population / 1000).toFixed(1)}k`;
  }
}
