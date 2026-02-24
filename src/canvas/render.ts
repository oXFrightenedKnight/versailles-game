type Biome = "desert" | "plains" | "forest" | "mountains";
type CreatedHexes = {
  desert: number;
  mountains: number;
  plains: number;
  forest: number;
};

export type Hex = {
  id: number;
  biome: Biome | null;
  q: number;
  r: number;
};
const BIOMES: Biome[] = ["desert", "plains", "forest", "mountains"];
const BIOME_COLOR = {
  desert: "#CCAD60",
  plains: "#91BD59",
  forest: "#2E6F40",
  mountains: "#9E825A",
};

export const biomePatterns: Partial<Record<Biome, CanvasPattern>> = {};
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

const BIOME_MOD = {
  desert: 0.6,
  mountains: 0.5,
  forest: 0.7,
  plains: 1,
};

const HEX_DIRECTIONS = [
  { dq: +1, dr: 0 },
  { dq: +1, dr: -1 },
  { dq: 0, dr: -1 },
  { dq: -1, dr: 0 },
  { dq: -1, dr: +1 },
  { dq: 0, dr: +1 },
];

const mapHexes = generateHexMap(9);
const HEX_SIZE = 40;
function drawPolygon({
  ctx,
  centerX,
  centerY,
  sides,
  radius,
  rotation,
  biome,
  isSelected,
}: {
  ctx: CanvasRenderingContext2D;
  centerX: number;
  centerY: number;
  sides: number;
  radius: number;
  rotation: number;
  biome: Biome | null;
  isSelected: boolean;
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
      ctx.fillStyle = biomePatterns[biome]!;
      ctx.strokeStyle = isSelected ? "#FFFFFF" : BIOME_COLOR[key];
    }
  });

  ctx.fill();
  ctx.stroke();
  ctx.restore();
}
function generateHexMap(radius: number) {
  const hexes: Hex[] = [];
  let id = 0;

  for (let q = -radius; q <= radius; q++) {
    for (let r = -radius; r <= radius; r++) {
      const s = -q - r;

      if (Math.abs(s) <= radius) {
        hexes.push({ id: id++, q, r, biome: null });
      }
    }
  }

  // Assign Biomes
  const availableHexes = [...hexes]; // objects in avalableHexes only refer to actual
  // hexes rather than making a new copy.
  const addedHexes: CreatedHexes = {
    desert: 0,
    mountains: 0,
    plains: 0,
    forest: 0,
  };
  for (const biome of BIOMES) {
    while (Math.random() < 1 / (1 + addedHexes[biome])) {
      const randomIndex = Math.floor(Math.random() * availableHexes.length);
      const hex = availableHexes.splice(randomIndex, 1)[0];
      hex.biome = biome;
      addedHexes[biome] += 1;
    }
  }

  // wave 2: generate natural structure for most tiles
  const queue = hexes.filter((h) => h.biome !== null);
  while (queue.length > 0) {
    const current = queue.shift()!;
    const neighbors = findNeighbors(current, hexes);
    for (const n of neighbors) {
      if (n.biome !== null) continue;
      if (Math.random() < 0.6 * BIOME_MOD[current.biome!]) {
        n.biome = current.biome;
        queue.push(n);
      }
    }
  }

  // wave 3: final assign for those that were left out
  for (const hex of hexes) {
    if (hex.biome !== null) continue;

    const neighbors = findNeighbors(hex, hexes).filter((n) => n.biome !== null);

    if (neighbors.length === 0) {
      hex.biome = "plains";
      continue;
    }

    // count how many biomes are around this tile
    const counts: Record<Biome, number> = {
      desert: 0,
      plains: 0,
      forest: 0,
      mountains: 0,
    };

    for (const n of neighbors) {
      counts[n.biome!] += 1;
    }

    // превращаем в "мешок шансов"
    const pool: Biome[] = [];

    for (const biome in counts) {
      for (let i = 0; i < counts[biome as Biome]; i++) {
        pool.push(biome as Biome);
      }
    }

    // guaranteed chosen
    const chosen = pool[Math.floor(Math.random() * pool.length)];

    hex.biome = chosen;
  }
  return hexes;
}
function findNeighbors(hex: Hex, hexes: Hex[]) {
  const neighbors = [];

  for (const dir of HEX_DIRECTIONS) {
    const q = hex.q + dir.dq;
    const r = hex.r + dir.dr;

    const neighbor = hexes.find((n) => n.q === q && n.r === r);
    if (neighbor) neighbors.push(neighbor);
  }

  return neighbors;
}
function hexToPixel(q: number, r: number) {
  const x = HEX_SIZE * Math.sqrt(3) * (q + r / 2);
  const y = ((HEX_SIZE * 3) / 2) * r;

  return { x, y };
}
export function pixelToHex({ x, y }: { x: number; y: number }) {
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
  mapCenterX: number,
  mapCenterY: number,
  selectedHexId: number | null
) {
  console.log(mapHexes);

  mapHexes.map((hex) => {
    const { x, y } = hexToPixel(hex.q, hex.r);
    let isSelected: boolean = false;

    if (selectedHexId !== null) {
      isSelected = hex.id === selectedHexId;
    }

    drawPolygon({
      ctx: ctx,
      centerX: mapCenterX + x,
      centerY: mapCenterY + y,
      sides: 6,
      radius: HEX_SIZE - 1,
      rotation: Math.PI / 6,
      biome: hex.biome,
      isSelected: isSelected,
    });
  });
}
