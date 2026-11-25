import * as THREE from 'three';
import { Section, StadiumStandInfo, StadiumBlockInfo, SelectedSeat } from '../../types';

export interface StadiumSeatInstance {
  instanceId: number;
  tierType: 'lower' | 'upper';
  bayIdx: number;
  standId: string;
  standName: string;
  blockId: string;
  blockLabel: string;
  sectionId: string;
  sectionName: string;
  row: string;
  number: number;
  priceNPR: number;
  tier: string;
  position: [number, number, number];
  baseColor: THREE.Color;
}

export const STADIUM_AISLE_ANGLES = [0, 1, 2, 3, 4, 5, 6, 7].map(
  (k) => (k * Math.PI / 4) + (Math.PI / 8)
);

export const BAYS_CONFIG = [
  { prefix: 'E', nameEn: 'East Stand', nameNe: 'पूर्व प्यारापेट', baseColor: '#facc15', sectionId: 'tu_north_east', hasOrangeCenter: true },
  { prefix: 'SE', nameEn: 'South-East Stand', nameNe: 'दक्षिण-पूर्व स्ट्यान्ड', baseColor: '#dc2626', sectionId: 'tu_pavilion_end', hasOrangeCenter: false },
  { prefix: 'P', nameEn: 'Grand Pavilion', nameNe: 'मुख्य प्याभिलियन', baseColor: '#dc143c', sectionId: 'tu_pavilion_end', hasOrangeCenter: false },
  { prefix: 'SW', nameEn: 'South-West Hill', nameNe: 'दक्षिण-पश्चिम चउर', baseColor: '#dc2626', sectionId: 'tu_south_west', hasOrangeCenter: false },
  { prefix: 'W', nameEn: 'West Stand', nameNe: 'पश्चिम प्यारापेट', baseColor: '#facc15', sectionId: 'tu_west_stand', hasOrangeCenter: false },
  { prefix: 'NW', nameEn: 'North-West Stand', nameNe: 'उत्तर-पश्चिम प्यारापेट', baseColor: '#ea580c', sectionId: 'tu_north_west', hasOrangeCenter: false },
  { prefix: 'V', nameEn: 'North VIP Canopy', nameNe: 'उत्तर भीआईपी क्यानोपी', baseColor: '#facc15', sectionId: 'tu_north_canopy', hasOrangeCenter: false },
  { prefix: 'NE', nameEn: 'North-East Stand', nameNe: 'उत्तर-पूर्व प्यारापेट', baseColor: '#dc2626', sectionId: 'tu_north_east', hasOrangeCenter: false },
];

export function getStadiumStandTier(prefix: string, tierType: 'lower' | 'upper'): string {
  if (prefix === 'P' || prefix === 'V') return 'VIP';
  if (prefix === 'SE') return tierType === 'upper' ? 'VIP' : 'Premium';
  if (tierType === 'upper') return 'Premium';
  return 'Standard';
}

export function buildStadiumDrillDownData(sections: Section[], soldKeys: string[]) {
  const Rx = 65.0;
  const Rz = 75.0;

  const lowerSeatsData: StadiumSeatInstance[] = [];
  const upperSeatsData: StadiumSeatInstance[] = [];
  const standsMap = new Map<string, StadiumStandInfo>();
  const blocksMap = new Map<string, StadiumBlockInfo>();

  let currentLowerId = 0;
  let currentUpperId = 0;

  const colorOrange = new THREE.Color('#ea580c');
  const colorWhite = new THREE.Color('#f8fafc');

  // Initialize the 16 stands (8 bays x 2 tiers)
  BAYS_CONFIG.forEach((bay, bayIdx) => {
    const parentSection = sections.find((s) => s.id === bay.sectionId) || sections[0] || {
      id: bay.sectionId,
      name: { en: bay.nameEn, ne: bay.nameNe },
      priceNPR: 600,
      tier: 'Standard',
    };

    const thetaMid = (bayIdx * Math.PI) / 4;
    const cosMid = Math.cos(thetaMid);
    const sinMid = Math.sin(thetaMid);

    // 1. Lower Tier Stand
    const lowerStandId = `${bay.prefix.toLowerCase()}_lower`;
    const lowerPrice = bay.prefix === 'P' ? 1200 : bay.prefix === 'V' ? 1000 : parentSection.priceNPR;
    const lowerCamPos: [number, number, number] = [
      (Rx - 16.0) * cosMid,
      22.0,
      (Rz - 16.0) * sinMid,
    ];
    const lowerTarget: [number, number, number] = [
      (Rx + 4.0) * cosMid,
      3.0,
      (Rz + 4.0) * sinMid,
    ];

    standsMap.set(lowerStandId, {
      id: lowerStandId,
      bayIdx,
      tierType: 'lower',
      nameEn: `${bay.nameEn} — Lower`,
      nameNe: `${bay.nameNe} — तल्लो तह`,
      priceNPR: lowerPrice,
      color: bay.baseColor,
      totalSeats: 0,
      availableSeats: 0,
      cameraPos: lowerCamPos,
      cameraTarget: lowerTarget,
      blocks: [],
    });

    // 2. Upper Tier Stand
    const upperStandId = `${bay.prefix.toLowerCase()}_upper`;
    const upperPrice = bay.prefix === 'P' ? 1500 : bay.prefix === 'V' ? 1500 : parentSection.priceNPR + 100;
    const upperCamPos: [number, number, number] = [
      (Rx - 12.0) * cosMid,
      28.0,
      (Rz - 12.0) * sinMid,
    ];
    const upperTarget: [number, number, number] = [
      (Rx + 12.0) * cosMid,
      8.0,
      (Rz + 12.0) * sinMid,
    ];

    standsMap.set(upperStandId, {
      id: upperStandId,
      bayIdx,
      tierType: 'upper',
      nameEn: `${bay.nameEn} — Upper`,
      nameNe: `${bay.nameNe} — माथिल्लो तह`,
      priceNPR: upperPrice,
      color: bay.baseColor,
      totalSeats: 0,
      availableSeats: 0,
      cameraPos: upperCamPos,
      cameraTarget: upperTarget,
      blocks: [],
    });
  });

  // Stand aliases (e.g. east_lower -> e_lower)
  const standAliases: [string, string][] = [
    ['east_lower', 'e_lower'],
    ['east_upper', 'e_upper'],
    ['southeast_lower', 'se_lower'],
    ['southeast_upper', 'se_upper'],
    ['pavilion_lower', 'p_lower'],
    ['pavilion_upper', 'p_upper'],
    ['southwest_lower', 'sw_lower'],
    ['southwest_upper', 'sw_upper'],
    ['west_lower', 'w_lower'],
    ['west_upper', 'w_upper'],
    ['northwest_lower', 'nw_lower'],
    ['northwest_upper', 'nw_upper'],
    ['north_lower', 'v_lower'],
    ['north_upper', 'v_upper'],
    ['northeast_lower', 'ne_lower'],
    ['northeast_upper', 'ne_upper'],
  ];
  standAliases.forEach(([alias, target]) => {
    const st = standsMap.get(target);
    if (st) standsMap.set(alias, st);
  });

  // Populate Lower and Upper seats with block assignments
  BAYS_CONFIG.forEach((bay, bayIdx) => {
    const lowerStand = standsMap.get(`${bay.prefix.toLowerCase()}_lower`)!;
    const upperStand = standsMap.get(`${bay.prefix.toLowerCase()}_upper`)!;

    const thetaMid = (bayIdx * Math.PI) / 4;
    const thetaStart = thetaMid - Math.PI / 8 + 0.024;
    const thetaEnd = thetaMid + Math.PI / 8 - 0.024;

    // --- LOWER TIER (Rows A to G, 7 rows) ---
    // 2 Bands: Band 0 (Rows A-C, 3 rows), Band 1 (Rows D-G, 4 rows)
    // 4 Angular Chunks per band -> 8 Blocks per Stand (e.g. E1 to E8)
    for (let band = 0; band < 2; band++) {
      const rStart = band === 0 ? 0 : 3;
      const rEnd = band === 0 ? 3 : 7;
      const rowStartLetter = String.fromCharCode(65 + rStart);
      const rowEndLetter = String.fromCharCode(65 + rEnd - 1);

      for (let chunk = 0; chunk < 4; chunk++) {
        const blockIndex = band * 4 + chunk + 1;
        const blockLabel = `${bay.prefix}${blockIndex}`;
        const blockId = `${lowerStand.id}_b${blockIndex}`;

        const fracStart = chunk / 4;
        const fracEnd = (chunk + 1) / 4;

        const blockSeats: StadiumSeatInstance[] = [];

        for (let r = rStart; r < rEnd; r++) {
          const rowLetter = String.fromCharCode(65 + r);
          const rOffset = 0.4 + r * 0.8 + 0.40;
          const yElevation = 0.70 + r * 0.50;

          const rMid = (Rx + rOffset + Rz + rOffset) / 2;
          const arcLen = rMid * (thetaEnd - thetaStart);
          const seatsInRow = Math.max(10, Math.floor(arcLen / 0.48));

          for (let s = 0; s < seatsInRow; s++) {
            const frac = s / (seatsInRow - 1);
            if (frac >= fracStart && (chunk === 3 ? frac <= fracEnd : frac < fracEnd)) {
              const theta = thetaStart + frac * (thetaEnd - thetaStart);
              const px = (Rx + rOffset) * Math.cos(theta);
              const pz = (Rz + rOffset) * Math.sin(theta);

              let seatCol = new THREE.Color(bay.baseColor);
              if (s === 0 || s === seatsInRow - 1) {
                seatCol = colorWhite;
              } else if (bay.hasOrangeCenter && frac >= 0.35 && frac <= 0.65) {
                seatCol = colorOrange;
              }

              const seat: StadiumSeatInstance = {
                instanceId: currentLowerId++,
                tierType: 'lower',
                bayIdx,
                standId: lowerStand.id,
                standName: lowerStand.nameEn,
                blockId,
                blockLabel,
                sectionId: bay.sectionId,
                sectionName: lowerStand.nameEn,
                row: rowLetter,
                number: s + 1,
                priceNPR: lowerStand.priceNPR,
                tier: getStadiumStandTier(bay.prefix, 'lower'),
                position: [px, yElevation + 0.02, pz],
                baseColor: seatCol,
              };

              lowerSeatsData.push(seat);
              blockSeats.push(seat);
            }
          }
        }

        // Calculate block center and camera facing seats from pitch side
        let cx = 0, cy = 0, cz = 0;
        let soldInBlock = 0;
        blockSeats.forEach((st) => {
          cx += st.position[0];
          cy += st.position[1];
          cz += st.position[2];
          if (soldKeys.includes(`${st.row}-${st.number}`)) soldInBlock++;
        });
        const n = blockSeats.length || 1;
        cx /= n; cy /= n; cz /= n;

        const phi = Math.atan2(cz, cx);
        const blockCamPos: [number, number, number] = [
          cx - 7.2 * Math.cos(phi),
          cy + 1.6,
          cz - 7.2 * Math.sin(phi),
        ];
        const blockCamTarget: [number, number, number] = [
          cx,
          cy + 0.3,
          cz,
        ];

        const blockInfo: StadiumBlockInfo = {
          id: blockId,
          label: blockLabel,
          standId: lowerStand.id,
          standName: lowerStand.nameEn,
          tierType: 'lower',
          rowStart: rowStartLetter,
          rowEnd: rowEndLetter,
          priceNPR: lowerStand.priceNPR,
          totalSeats: blockSeats.length,
          availableSeats: blockSeats.length - soldInBlock,
          centerPos: [cx, cy, cz],
          blockCameraPos: blockCamPos,
          blockCameraTarget: blockCamTarget,
        };

        blocksMap.set(blockId, blockInfo);
        lowerStand.blocks.push(blockInfo);
        lowerStand.totalSeats += blockSeats.length;
        lowerStand.availableSeats += (blockSeats.length - soldInBlock);
      }
    }

    // --- UPPER TIER (Rows H to P, 8 rows) ---
    // 2 Bands: Band 0 (Rows H-K, 4 rows), Band 1 (Rows L-P, 4 rows)
    // 4 Angular Chunks per band -> 8 Blocks per Stand (e.g. E9 to E16)
    for (let band = 0; band < 2; band++) {
      const rStart = band === 0 ? 0 : 4;
      const rEnd = band === 0 ? 4 : 8;
      const rowStartLetter = String.fromCharCode(72 + rStart);
      const rowEndLetter = String.fromCharCode(72 + rEnd - 1);

      for (let chunk = 0; chunk < 4; chunk++) {
        const blockIndex = 8 + band * 4 + chunk + 1;
        const blockLabel = `${bay.prefix}${blockIndex}`;
        const blockId = `${upperStand.id}_b${blockIndex}`;

        const fracStart = chunk / 4;
        const fracEnd = (chunk + 1) / 4;

        const blockSeats: StadiumSeatInstance[] = [];

        for (let j = rStart; j < rEnd; j++) {
          const rowLetter = String.fromCharCode(72 + j);
          const rOffset = 8.0 + j * 0.8 + 0.40;
          const yElevation = 4.45 + j * 0.75;

          const rMid = (Rx + rOffset + Rz + rOffset) / 2;
          const arcLen = rMid * (thetaEnd - thetaStart);
          const seatsInRow = Math.max(12, Math.floor(arcLen / 0.48));

          for (let s = 0; s < seatsInRow; s++) {
            const frac = s / (seatsInRow - 1);
            if (frac >= fracStart && (chunk === 3 ? frac <= fracEnd : frac < fracEnd)) {
              const theta = thetaStart + frac * (thetaEnd - thetaStart);
              const px = (Rx + rOffset) * Math.cos(theta);
              const pz = (Rz + rOffset) * Math.sin(theta);

              let seatCol = new THREE.Color(bay.baseColor);
              if (s === 0 || s === seatsInRow - 1) {
                seatCol = colorWhite;
              } else if (bay.hasOrangeCenter && frac >= 0.35 && frac <= 0.65) {
                seatCol = colorOrange;
              }

              const seat: StadiumSeatInstance = {
                instanceId: currentUpperId++,
                tierType: 'upper',
                bayIdx,
                standId: upperStand.id,
                standName: upperStand.nameEn,
                blockId,
                blockLabel,
                sectionId: bay.sectionId,
                sectionName: upperStand.nameEn,
                row: rowLetter,
                number: s + 1,
                priceNPR: upperStand.priceNPR,
                tier: getStadiumStandTier(bay.prefix, 'upper'),
                position: [px, yElevation + 0.02, pz],
                baseColor: seatCol,
              };

              upperSeatsData.push(seat);
              blockSeats.push(seat);
            }
          }
        }

        let cx = 0, cy = 0, cz = 0;
        let soldInBlock = 0;
        blockSeats.forEach((st) => {
          cx += st.position[0];
          cy += st.position[1];
          cz += st.position[2];
          if (soldKeys.includes(`${st.row}-${st.number}`)) soldInBlock++;
        });
        const n = blockSeats.length || 1;
        cx /= n; cy /= n; cz /= n;

        const phi = Math.atan2(cz, cx);
        const blockCamPos: [number, number, number] = [
          cx - 7.5 * Math.cos(phi),
          cy + 1.8,
          cz - 7.5 * Math.sin(phi),
        ];
        const blockCamTarget: [number, number, number] = [
          cx,
          cy + 0.3,
          cz,
        ];

        const blockInfo: StadiumBlockInfo = {
          id: blockId,
          label: blockLabel,
          standId: upperStand.id,
          standName: upperStand.nameEn,
          tierType: 'upper',
          rowStart: rowStartLetter,
          rowEnd: rowEndLetter,
          priceNPR: upperStand.priceNPR,
          totalSeats: blockSeats.length,
          availableSeats: blockSeats.length - soldInBlock,
          centerPos: [cx, cy, cz],
          blockCameraPos: blockCamPos,
          blockCameraTarget: blockCamTarget,
        };

        blocksMap.set(blockId, blockInfo);
        upperStand.blocks.push(blockInfo);
        upperStand.totalSeats += blockSeats.length;
        upperStand.availableSeats += (blockSeats.length - soldInBlock);
      }
    }
  });

  // Block aliases (e.g. east_lower-b3, east_lower_b3, e_lower-b3 -> e_lower_b3)
  for (const [blkId, blkInfo] of Array.from(blocksMap.entries())) {
    const parts = blkId.split('_'); // e.g. ["e", "lower", "b3"]
    if (parts.length >= 3) {
      const pfx = parts[0];
      const tier = parts[1];
      const bnum = parts[2];
      const aliasPrefixes: Record<string, string> = {
        e: 'east',
        w: 'west',
        p: 'pavilion',
        se: 'southeast',
        sw: 'southwest',
        nw: 'northwest',
        v: 'north',
        ne: 'northeast',
      };
      const longPfx = aliasPrefixes[pfx];
      if (longPfx) {
        blocksMap.set(`${longPfx}_${tier}_${bnum}`, blkInfo);
        blocksMap.set(`${longPfx}_${tier}-${bnum}`, blkInfo);
        blocksMap.set(`${pfx}_${tier}-${bnum}`, blkInfo);
      }
    }
  }

  // Deduplicate for array outputs (16 stands, 128 blocks)
  const seenStandIds = new Set<string>();
  const stands: StadiumStandInfo[] = [];
  standsMap.forEach((st) => {
    if (!seenStandIds.has(st.id)) {
      seenStandIds.add(st.id);
      stands.push(st);
    }
  });

  const seenBlockIds = new Set<string>();
  const blocks: StadiumBlockInfo[] = [];
  blocksMap.forEach((blk) => {
    if (!seenBlockIds.has(blk.id)) {
      seenBlockIds.add(blk.id);
      blocks.push(blk);
    }
  });

  return {
    stands,
    blocks,
    standsMap,
    blocksMap,
    lowerSeatsData,
    upperSeatsData,
  };
}

/**
 * Finds best available adjacent seats matching quantity and price limit
 */
export function findBestAdjacentSeats(
  allSeats: StadiumSeatInstance[],
  soldKeys: string[],
  selectedSeats: SelectedSeat[],
  count: number = 2,
  maxPrice?: number
): StadiumSeatInstance[] | null {
  // Sort priority: Lower tier Pavilion -> East Lower -> West Lower -> Upper Pavilion -> Others
  const standPriorityOrder = [
    'p_lower',
    'e_lower',
    'w_lower',
    'v_lower',
    'p_upper',
    'e_upper',
    'w_upper',
    'sw_lower',
    'se_lower',
    'ne_lower',
    'nw_lower',
  ];

  for (const standId of standPriorityOrder) {
    const standSeats = allSeats.filter((s) => s.standId === standId && (!maxPrice || s.priceNPR <= maxPrice));
    if (standSeats.length < count) continue;

    // Group seats by row
    const byRow = new Map<string, StadiumSeatInstance[]>();
    standSeats.forEach((s) => {
      if (!byRow.has(s.row)) byRow.set(s.row, []);
      byRow.get(s.row)!.push(s);
    });

    for (const [_, rowSeats] of byRow) {
      rowSeats.sort((a, b) => a.number - b.number);

      // Search for contiguous available seats
      for (let i = 0; i <= rowSeats.length - count; i++) {
        let isConsecutiveAvailable = true;
        const candidate: StadiumSeatInstance[] = [];

        for (let k = 0; k < count; k++) {
          const seat = rowSeats[i + k];
          const seatKey = `${seat.row}-${seat.number}`;
          const isSold = soldKeys.includes(seatKey);
          const isSelected = selectedSeats.some(
            (sel) => sel.sectionId === seat.sectionId && `${sel.row}-${sel.number}` === seatKey
          );

          if (isSold || isSelected) {
            isConsecutiveAvailable = false;
            break;
          }
          if (k > 0 && seat.number !== rowSeats[i + k - 1].number + 1) {
            isConsecutiveAvailable = false;
            break;
          }
          candidate.push(seat);
        }

        if (isConsecutiveAvailable && candidate.length === count) {
          return candidate;
        }
      }
    }
  }

  // Fallback: any available seats
  const available = allSeats.filter((s) => {
    const seatKey = `${s.row}-${s.number}`;
    return !soldKeys.includes(seatKey) && (!maxPrice || s.priceNPR <= maxPrice);
  });
  if (available.length >= count) {
    return available.slice(0, count);
  }

  return null;
}
