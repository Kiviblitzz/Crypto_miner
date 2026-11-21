// Hardware-Katalog. Alle Marken & Modellnamen sind fiktiv; Leistungsdaten orientieren sich grob an echten Geräten.
import { toDay } from './history.js';

const M = 1e6, G = 1e9, T = 1e12, K = 1e3;

// ---------- Grafikkarten ----------
// hash: Hashrate je Algorithmus (H/s bzw. Sol/s). vram in GB. look: Darstellung
const gpu = (id, name, release, price, watt, vram, hash, look) => ({ id, type: 'gpu', name, release, price, watt, vram, hash, look });
export const GPUS = [
  gpu('rhd4850', 'Crimson RHD 4850', '2008-06', 110, 110, 0.5, { sha256: 100 * M, scrypt: 120 * K }, { brand: 'crimson', len: 0.23, fans: 1, slot: 1 }),
  gpu('gfx260', 'Verdant GFX 260', '2008-06', 150, 180, 0.9, { sha256: 60 * M, scrypt: 70 * K }, { brand: 'verdant', len: 0.27, fans: 1, slot: 2 }),
  gpu('rhd5770', 'Crimson RHD 5770', '2009-10', 140, 108, 1, { sha256: 200 * M, scrypt: 200 * K }, { brand: 'crimson', len: 0.22, fans: 1, slot: 2 }),
  gpu('rhd5870', 'Crimson RHD 5870', '2009-09', 380, 190, 1, { sha256: 400 * M, scrypt: 400 * K }, { brand: 'crimson', len: 0.28, fans: 1, slot: 2 }),
  gpu('rhd5970', 'Crimson RHD 5970 X2', '2009-11', 650, 300, 2, { sha256: 730 * M, scrypt: 650 * K }, { brand: 'crimson', len: 0.31, fans: 1, slot: 2 }),
  gpu('gfx480', 'Verdant GFX 480', '2010-03', 480, 250, 1.5, { sha256: 120 * M, scrypt: 160 * K }, { brand: 'verdant', len: 0.27, fans: 1, slot: 2 }),
  gpu('gfx580', 'Verdant GFX 580', '2010-11', 500, 245, 1.5, { sha256: 150 * M, scrypt: 180 * K }, { brand: 'verdant', len: 0.27, fans: 1, slot: 2 }),
  gpu('rhd6950', 'Crimson RHD 6950', '2010-12', 300, 200, 2, { sha256: 350 * M, scrypt: 400 * K }, { brand: 'crimson', len: 0.27, fans: 1, slot: 2 }),
  gpu('rhd6990', 'Crimson RHD 6990 X2', '2011-03', 700, 375, 4, { sha256: 800 * M, scrypt: 800 * K }, { brand: 'crimson', len: 0.31, fans: 1, slot: 2 }),
  gpu('rhd7970', 'Crimson RHD 7970', '2012-01', 550, 250, 3, { sha256: 650 * M, scrypt: 700 * K, cn: 600, ethash: 20 * M }, { brand: 'crimson', len: 0.27, fans: 1, slot: 2 }),
  gpu('r9280x', 'Crimson R9 280X', '2013-10', 300, 250, 3, { sha256: 600 * M, scrypt: 700 * K, cn: 500, ethash: 18 * M }, { brand: 'crimson', len: 0.27, fans: 2, slot: 2 }),
  gpu('r9290x', 'Crimson R9 290X', '2013-10', 550, 290, 4, { sha256: 800 * M, scrypt: 880 * K, cn: 800, ethash: 28 * M, equihash: 290 }, { brand: 'crimson', len: 0.28, fans: 2, slot: 2 }),
  gpu('gfx750ti', 'Verdant GFX 750 Ti', '2014-02', 150, 60, 2, { scrypt: 270 * K, cn: 250, ethash: 7 * M }, { brand: 'verdant', len: 0.17, fans: 1, slot: 2 }),
  gpu('gfx970', 'Verdant GFX 970', '2014-09', 330, 145, 3.5, { scrypt: 450 * K, cn: 450, ethash: 20 * M, equihash: 290 }, { brand: 'verdant', len: 0.26, fans: 2, slot: 2 }),
  gpu('r9fury', 'Crimson R9 Fury', '2015-07', 550, 275, 4, { cn: 850, ethash: 29 * M, equihash: 450 }, { brand: 'crimson', len: 0.2, fans: 3, slot: 2 }),
  gpu('rs470', 'Crimson RS 470', '2016-08', 180, 120, 4, { cn: 650, ethash: 26 * M, equihash: 260 }, { brand: 'crimson', len: 0.22, fans: 2, slot: 2 }),
  gpu('rs480', 'Crimson RS 480', '2016-06', 240, 130, 8, { cn: 700, ethash: 29 * M, equihash: 290 }, { brand: 'crimson', len: 0.24, fans: 2, slot: 2 }),
  gpu('gfx1060', 'Verdant GFX 1060 3G', '2016-08', 200, 90, 3, { cn: 400, ethash: 20 * M, equihash: 270, kawpow: 10 * M }, { brand: 'verdant', len: 0.23, fans: 2, slot: 2 }),
  gpu('gfx1070', 'Verdant GFX 1070', '2016-06', 380, 120, 8, { cn: 500, ethash: 28 * M, equihash: 430, kawpow: 14 * M, kheavy: 400 * M }, { brand: 'verdant', len: 0.27, fans: 2, slot: 2 }),
  gpu('rs580', 'Crimson RS 580', '2017-04', 230, 135, 8, { cn: 800, ethash: 31 * M, equihash: 300, kawpow: 12 * M, kheavy: 250 * M }, { brand: 'crimson', len: 0.24, fans: 2, slot: 2 }),
  gpu('gfx1080ti', 'Verdant GFX 1080 Ti', '2017-03', 700, 220, 11, { cn: 850, ethash: 45 * M, equihash: 700, kawpow: 22 * M, kheavy: 700 * M }, { brand: 'verdant', len: 0.29, fans: 3, slot: 2 }),
  gpu('vela64', 'Crimson Vela 64', '2017-08', 500, 210, 8, { cn: 1900, ethash: 42 * M, equihash: 430, kawpow: 20 * M, kheavy: 500 * M }, { brand: 'crimson', len: 0.27, fans: 3, slot: 2 }),
  gpu('vtx2080ti', 'Verdant VTX 2080 Ti', '2018-09', 1200, 230, 11, { cn: 1000, ethash: 52 * M, equihash: 900, kawpow: 30 * M, kheavy: 1000 * M }, { brand: 'verdant', len: 0.3, fans: 3, slot: 2 }),
  gpu('rs5700xt', 'Crimson RS 5700 XT', '2019-07', 400, 130, 8, { cn: 1800, rx: 1400, ethash: 54 * M, kawpow: 23 * M, kheavy: 450 * M }, { brand: 'crimson', len: 0.27, fans: 2, slot: 2 }),
  gpu('vtx3080', 'Verdant VTX 3080', '2020-09', 700, 230, 10, { ethash: 98 * M, equihash: 900, kawpow: 45 * M, kheavy: 1100 * M }, { brand: 'verdant', len: 0.29, fans: 3, slot: 2 }),
  gpu('vtx3090', 'Verdant VTX 3090', '2020-09', 1500, 290, 24, { ethash: 120 * M, equihash: 1000, kawpow: 55 * M, kheavy: 1200 * M }, { brand: 'verdant', len: 0.32, fans: 3, slot: 3 }),
  gpu('vtx3070', 'Verdant VTX 3070', '2020-10', 500, 130, 8, { ethash: 61 * M, kawpow: 28 * M, kheavy: 700 * M }, { brand: 'verdant', len: 0.25, fans: 2, slot: 2 }),
  gpu('rs6800', 'Crimson RS 6800', '2020-11', 580, 140, 16, { ethash: 62 * M, kawpow: 30 * M, kheavy: 600 * M }, { brand: 'crimson', len: 0.27, fans: 3, slot: 2 }),
  gpu('vtx3060ti', 'Verdant VTX 3060 Ti', '2020-12', 400, 130, 8, { ethash: 60 * M, kawpow: 26 * M, kheavy: 650 * M }, { brand: 'verdant', len: 0.24, fans: 2, slot: 2 }),
  gpu('rs6600xt', 'Crimson RS 6600 XT', '2021-08', 380, 75, 8, { ethash: 32 * M, kawpow: 14 * M, kheavy: 400 * M }, { brand: 'crimson', len: 0.21, fans: 2, slot: 2 }),
  gpu('vtx4090', 'Verdant VTX 4090', '2022-10', 1600, 300, 24, { kawpow: 65 * M, kheavy: 2200 * M, equihash: 1200 }, { brand: 'verdant', len: 0.34, fans: 3, slot: 3 }),
  gpu('rs7900xtx', 'Crimson RS 7900 XTX', '2022-12', 1000, 300, 24, { kawpow: 50 * M, kheavy: 1600 * M }, { brand: 'crimson', len: 0.29, fans: 3, slot: 3 }),
  gpu('vtx5090', 'Verdant VTX 5090', '2025-01', 2000, 450, 32, { kawpow: 80 * M, kheavy: 3000 * M, equihash: 1500 }, { brand: 'verdant', len: 0.31, fans: 2, slot: 2 }),
  gpu('rs9070xt', 'Crimson RS 9070 XT', '2025-03', 600, 250, 16, { kawpow: 40 * M, kheavy: 1300 * M }, { brand: 'crimson', len: 0.29, fans: 3, slot: 2 }),
  gpu('gfx1050ti', 'Verdant GFX 1050 Ti', '2016-10', 140, 75, 4, { cn: 300, ethash: 13 * M, equihash: 180 }, { brand: 'verdant', len: 0.18, fans: 1, slot: 2 }),
  gpu('rs570', 'Crimson RS 570', '2017-04', 170, 120, 8, { cn: 750, ethash: 30 * M, equihash: 260, kawpow: 11 * M }, { brand: 'crimson', len: 0.23, fans: 2, slot: 2 }),
  gpu('vtx2060', 'Verdant VTX 2060', '2019-01', 350, 125, 6, { cn: 700, ethash: 30 * M, kawpow: 15 * M, kheavy: 500 * M }, { brand: 'verdant', len: 0.23, fans: 2, slot: 2 }),
  gpu('vtx3060', 'Verdant VTX 3060 (LHR)', '2021-02', 330, 120, 12, { ethash: 36 * M, kawpow: 22 * M, kheavy: 600 * M }, { brand: 'verdant', len: 0.24, fans: 2, slot: 2 }),
  gpu('vtx4070', 'Verdant VTX 4070', '2023-04', 600, 200, 12, { kawpow: 35 * M, kheavy: 1500 * M }, { brand: 'verdant', len: 0.25, fans: 2, slot: 2 }),
  gpu('rs7800xt', 'Crimson RS 7800 XT', '2023-09', 500, 250, 16, { kawpow: 35 * M, kheavy: 1200 * M }, { brand: 'crimson', len: 0.27, fans: 3, slot: 2 }),
  gpu('vtx5070ti', 'Verdant VTX 5070 Ti', '2025-02', 750, 300, 16, { kawpow: 50 * M, kheavy: 2000 * M }, { brand: 'verdant', len: 0.3, fans: 3, slot: 2 }),
];

// ---------- CPUs ----------
const cpu = (id, name, release, price, watt, hash) => ({ id, type: 'cpu', name, release, price, watt, hash });
export const CPUS = [
  cpu('cel33', 'Silicor Celer E3300', '2009-08', 55, 65, { sha256: 5 * M, cn: 80 }),
  cpu('q66', 'Silicor Core Q66 Quad', '2007-01', 170, 95, { sha256: 12 * M, cn: 250 }),
  cpu('s7920', 'Silicor Core S7-920', '2008-11', 280, 130, { sha256: 18 * M, cn: 320 }),
  cpu('phx6', 'Arix Phaeton X6', '2010-04', 260, 125, { sha256: 22 * M, cn: 350 }),
  cpu('s72600', 'Silicor S7-2600X', '2011-01', 320, 95, { sha256: 26 * M, cn: 380, rx: 2000 }),
  cpu('s74770', 'Silicor S7-4770X', '2013-06', 330, 84, { sha256: 30 * M, cn: 420, rx: 2600 }),
  cpu('celer', 'Silicor Celer G1840', '2014-01', 45, 53, { sha256: 6 * M, cn: 100, rx: 500 }),
  cpu('zen1800', 'Arix Zenon 1800', '2017-03', 500, 95, { cn: 900, rx: 5000 }),
  cpu('zen2700', 'Arix Zenon 2700', '2018-04', 300, 105, { cn: 950, rx: 6000 }),
  cpu('zen3900', 'Arix Zenon 3900', '2019-07', 500, 105, { cn: 1400, rx: 12500 }),
  cpu('zen5950', 'Arix Zenon 5950', '2020-11', 800, 105, { rx: 17500 }),
  cpu('epoch64', 'Arix Epoch 64-Kern', '2021-03', 7000, 280, { rx: 46000 }),
  cpu('zen7950', 'Arix Zenon 7950', '2022-09', 700, 170, { rx: 25000 }),
  cpu('zen9950', 'Arix Zenon 9950', '2024-08', 650, 170, { rx: 28000 }),
  cpu('s78700', 'Silicor S7-8700X', '2017-10', 360, 95, { cn: 600, rx: 4500 }),
  cpu('s99900', 'Silicor S9-9900X', '2018-10', 490, 95, { cn: 700, rx: 5500 }),
  cpu('s914900', 'Silicor S9-14900X', '2023-10', 590, 253, { rx: 15000 }),
];

// ---------- Netzteile ----------
const psu = (id, name, release, price, cap) => ({ id, type: 'psu', name, release, price, cap, watt: 0 });
export const PSUS = [
  psu('psu400', 'Netzteil 400 W', '2006-01', 45, 400),
  psu('psu650', 'Netzteil 650 W Bronze', '2009-01', 80, 650),
  psu('psu850', 'Netzteil 850 W Gold', '2011-01', 140, 850),
  psu('psu1200', 'Netzteil 1200 W Platinum', '2013-01', 260, 1200),
  psu('psu1600', 'Server-Netzteil 1600 W', '2016-01', 180, 1600),
  psu('psu2400', 'Server-Netzteil 2400 W', '2018-01', 260, 2400),
  psu('psu3300', 'Doppel-Netzteil 3300 W', '2020-06', 420, 3300),
  psu('psu1000', 'Netzteil 1000 W Titanium', '2015-06', 210, 1000),
];

// ---------- Mainboards ----------
const mobo = (id, name, release, price, slots) => ({ id, type: 'mobo', name, release, price, slots, watt: 35 });
export const MOBOS = [
  mobo('h55', 'Basis H55 (2× PCIe)', '2010-01', 90, 2),
  mobo('p67', 'TriFire P67 (3× PCIe)', '2011-01', 190, 3),
  mobo('x79', 'QuadForce X79 (4× PCIe)', '2011-11', 290, 4),
  mobo('h81', 'MineBoard H81-6', '2015-03', 95, 6),
  mobo('b250_8', 'MineBoard B250-8', '2017-01', 130, 8),
  mobo('b250_12', 'MineBoard B250-12', '2017-06', 200, 12),
  mobo('x570', 'MineBoard X570-8', '2019-07', 240, 8),
  mobo('b760', 'MineBoard B760-12', '2023-01', 260, 12),
];

export const PARTS = [...GPUS, ...CPUS, ...PSUS, ...MOBOS];

// ---------- Platzierbare Objekte ----------
// size: [breite, tiefe] in Metern (Raster 0,5 m), minTier: ab welchem Standort-Level
// kind: rig | device | holder | cooling | decor
// stock: { n, until, mult } – Kontingent: höchstens n Stück pro Kalendermonat bis zum Datum (Lieferengpässe der ersten ASICs),
//   mult = Graumarkt-Aufschlag auf den Preis, solange das Kontingent gilt
export const PLACEABLES = [
  // Rig-Rahmen
  { id: 'tower', kind: 'rig', cat: 'rigs', name: 'Tower-PC-Gehäuse', release: '2005-01', price: 60, size: [0.5, 0.5], maxGpu: 3, minTier: 0, maxTier: 2, desc: 'Klassisches Gehäuse mit Glasseite. Max. 3 GPUs.' },
  { id: 'crate', kind: 'rig', cat: 'rigs', skill: 'riser', name: 'Milchkisten-Rig', release: '2011-01', price: 15, size: [0.5, 0.5], maxGpu: 4, minTier: 0, maxTier: 3, desc: 'Der Klassiker 2011: Mainboard in der Milchkiste, GPUs an Risern obendrauf. Max. 4.' },
  { id: 'frame6', kind: 'rig', cat: 'rigs', skill: 'riser', name: 'Alu-Open-Frame 6×', release: '2013-06', price: 70, size: [1.0, 0.5], maxGpu: 6, minTier: 0, desc: 'Offener Alu-Rahmen für 6 Karten.' },
  { id: 'frame8', kind: 'rig', cat: 'rigs', skill: 'riser', name: 'Alu-Open-Frame 8×', release: '2016-01', price: 90, size: [1.0, 0.5], maxGpu: 8, minTier: 1, desc: 'Breiter Rahmen für 8 Karten.' },
  { id: 'frame12', kind: 'rig', cat: 'rigs', skill: 'riser', name: 'Stahl-Rahmen 12×', release: '2017-06', price: 150, size: [1.5, 0.5], maxGpu: 12, minTier: 2, desc: 'Profi-Rahmen für 12 GPUs.' },

  // Einzelgeräte (FPGA / USB / ASIC) – algo + hash
  { id: 'fpga1', kind: 'device', cat: 'asic', skill: 'fpga', name: 'Fieldforge FX-1 (FPGA)', release: '2011-07', price: 580, watt: 20, algo: 'sha256', hash: 210 * M, size: [0.5, 0.5], minTier: 0, look: 'fpga', life: 6 },
  { id: 'fpga4', kind: 'device', cat: 'asic', skill: 'fpga', name: 'Fieldforge Quad (FPGA)', release: '2012-04', price: 1100, watt: 50, algo: 'sha256', hash: 830 * M, size: [0.5, 0.5], minTier: 0, look: 'fpga', life: 6 },
  { id: 'usbhub', kind: 'device', cat: 'asic', name: 'HashStick U1 ×10 (USB-Hub)', release: '2013-06', price: 380, watt: 30, algo: 'sha256', hash: 3.3 * G, size: [0.5, 0.5], minTier: 0, look: 'usb', life: 4 },
  { id: 'gla1', kind: 'device', cat: 'asic', name: 'Glacier A1', release: '2013-02', price: 1300, watt: 620, algo: 'sha256', hash: 66 * G, size: [0.5, 0.5], minTier: 0, look: 'asic_old', life: 4, stock: { n: 2, until: '2014-01-01', mult: 2 } },
  { id: 'gridstone', kind: 'device', cat: 'asic', name: 'Gridstone G1 (Scrypt)', release: '2014-03', price: 90, watt: 7, algo: 'scrypt', hash: 350 * K, size: [0.5, 0.5], minTier: 0, look: 'usb', life: 4 },
  { id: 's1', kind: 'device', cat: 'asic', name: 'Swarm S1', release: '2013-12', price: 1200, watt: 360, algo: 'sha256', hash: 180 * G, size: [0.5, 0.5], minTier: 0, look: 'asic_old', life: 4, stock: { n: 3, until: '2014-04-01', mult: 1.5 } },
  { id: 's3', kind: 'device', cat: 'asic', name: 'Swarm S3', release: '2014-07', price: 650, watt: 340, algo: 'sha256', hash: 440 * G, size: [0.5, 0.5], minTier: 0, look: 'asic_old', life: 4 },
  { id: 's5', kind: 'device', cat: 'asic', name: 'Swarm S5', release: '2014-12', price: 370, watt: 590, algo: 'sha256', hash: 1.15 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 5 },
  { id: 's7', kind: 'device', cat: 'asic', name: 'Swarm S7', release: '2015-09', price: 1800, watt: 1300, algo: 'sha256', hash: 4.73 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 5 },
  { id: 's9', kind: 'device', cat: 'asic', name: 'Swarm S9', release: '2016-06', price: 2100, watt: 1323, algo: 'sha256', hash: 13.5 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 'l3', kind: 'device', cat: 'asic', name: 'Swarm L3+ (Scrypt)', release: '2017-01', price: 1500, watt: 800, algo: 'scrypt', hash: 504 * M, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 'z9', kind: 'device', cat: 'asic', name: 'Swarm Z9 mini (Equihash)', release: '2018-06', price: 700, watt: 300, algo: 'equihash', hash: 10 * K, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 5 },
  { id: 'e3', kind: 'device', cat: 'asic', name: 'Swarm E3 (Ethash)', release: '2018-07', price: 800, watt: 800, algo: 'ethash', hash: 190 * M, vram: 3.0, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 4 },
  { id: 's15', kind: 'device', cat: 'asic', name: 'Swarm S15', release: '2018-11', price: 1800, watt: 1600, algo: 'sha256', hash: 28 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 's17', kind: 'device', cat: 'asic', name: 'Swarm S17 Pro', release: '2019-04', price: 2400, watt: 2100, algo: 'sha256', hash: 53 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 'm20', kind: 'device', cat: 'asic', name: 'Whirl M20S', release: '2019-06', price: 2200, watt: 3360, algo: 'sha256', hash: 68 * T, size: [0.5, 0.5], minTier: 0, look: 'whirl', life: 7 },
  { id: 's19', kind: 'device', cat: 'asic', name: 'Swarm S19 Pro', release: '2020-05', price: 2900, watt: 3250, algo: 'sha256', hash: 110 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 'm30', kind: 'device', cat: 'asic', name: 'Whirl M30S++', release: '2020-10', price: 3600, watt: 3470, algo: 'sha256', hash: 112 * T, size: [0.5, 0.5], minTier: 0, look: 'whirl', life: 7 },
  { id: 'l7', kind: 'device', cat: 'asic', name: 'Swarm L7 (Scrypt)', release: '2021-11', price: 14000, watt: 3425, algo: 'scrypt', hash: 9.5 * G, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 'z15', kind: 'device', cat: 'asic', name: 'Swarm Z15 (Equihash)', release: '2022-01', price: 9000, watt: 1510, algo: 'equihash', hash: 420 * K, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 'e9', kind: 'device', cat: 'asic', name: 'Swarm E9 Pro (Ethash)', release: '2022-07', price: 11000, watt: 2200, algo: 'ethash', hash: 3.68 * G, vram: 16, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 's19xp', kind: 'device', cat: 'asic', name: 'Swarm S19 XP', release: '2022-07', price: 6500, watt: 3010, algo: 'sha256', hash: 140 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 8 },
  { id: 'ks3', kind: 'device', cat: 'asic', name: 'Swarm KS3 (kHeavyHash)', release: '2023-08', price: 30000, watt: 3500, algo: 'kheavy', hash: 9.4 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 's21', kind: 'device', cat: 'asic', name: 'Swarm S21', release: '2023-12', price: 3800, watt: 3500, algo: 'sha256', hash: 200 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 8 },
  { id: 'l9', kind: 'device', cat: 'asic', name: 'Swarm L9 (Scrypt)', release: '2024-02', price: 16000, watt: 3260, algo: 'scrypt', hash: 16 * G, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 8 },
  { id: 'ks5', kind: 'device', cat: 'asic', name: 'Swarm KS5 Pro (kHeavyHash)', release: '2024-06', price: 16000, watt: 3150, algo: 'kheavy', hash: 21 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 's21xp', kind: 'device', cat: 'asic', name: 'Swarm S21 XP', release: '2024-08', price: 6200, watt: 3645, algo: 'sha256', hash: 270 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 8 },
  { id: 's21hyd', kind: 'device', cat: 'asic', name: 'Swarm S21 XP Hydro', release: '2024-06', price: 9000, watt: 5676, algo: 'sha256', hash: 473 * T, size: [0.5, 0.5], minTier: 3, look: 'hydro', hydro: true, life: 9 },
  { id: 's23hyd', kind: 'device', cat: 'asic', name: 'Swarm S23 Hydro', release: '2025-11', price: 12000, watt: 5510, algo: 'sha256', hash: 580 * T, size: [0.5, 0.5], minTier: 3, look: 'hydro', hydro: true, life: 9 },
  { id: 's23', kind: 'device', cat: 'asic', name: 'Swarm S23', release: '2026-02', price: 7500, watt: 3510, algo: 'sha256', hash: 318 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 9 },
  { id: 'a6', kind: 'device', cat: 'asic', name: 'Glacier A6', release: '2015-11', price: 500, watt: 1050, algo: 'sha256', hash: 3.5 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 5 },
  { id: 's9j', kind: 'device', cat: 'asic', name: 'Swarm S9j', release: '2018-08', price: 700, watt: 1350, algo: 'sha256', hash: 14.5 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 6 },
  { id: 'm31', kind: 'device', cat: 'asic', name: 'Whirl M31S+', release: '2021-03', price: 3500, watt: 3360, algo: 'sha256', hash: 80 * T, size: [0.5, 0.5], minTier: 0, look: 'whirl', life: 7 },
  { id: 's19j', kind: 'device', cat: 'asic', name: 'Swarm S19j Pro', release: '2021-06', price: 5500, watt: 3068, algo: 'sha256', hash: 100 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 'm50', kind: 'device', cat: 'asic', name: 'Whirl M50S', release: '2022-09', price: 4500, watt: 3276, algo: 'sha256', hash: 126 * T, size: [0.5, 0.5], minTier: 0, look: 'whirl', life: 8 },
  { id: 'a1346', kind: 'device', cat: 'asic', name: 'Glacier A1346', release: '2023-03', price: 3200, watt: 3300, algo: 'sha256', hash: 110 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 7 },
  { id: 'm60', kind: 'device', cat: 'asic', name: 'Whirl M60S', release: '2023-10', price: 5200, watt: 3344, algo: 'sha256', hash: 186 * T, size: [0.5, 0.5], minTier: 0, look: 'whirl', life: 8 },
  { id: 's21pro', kind: 'device', cat: 'asic', name: 'Swarm S21 Pro', release: '2024-10', price: 5800, watt: 3510, algo: 'sha256', hash: 234 * T, size: [0.5, 0.5], minTier: 0, look: 'asic', life: 8 },

  // Halter
  { id: 'shelf', kind: 'holder', cat: 'holder', name: 'Schwerlastregal (8 Plätze)', release: '2000-01', price: 150, size: [1.0, 0.5], slots: 8, minTier: 1, desc: 'Stahlregal für 8 Geräte (ASICs/FPGAs).' },
  { id: 'rack', kind: 'holder', cat: 'holder', name: '42U-Rack (12 Plätze)', release: '2000-01', price: 1400, size: [1.0, 1.5], slots: 12, minTier: 3, desc: 'Serverschrank mit 12 Einschüben.' },
  { id: 'container', kind: 'holder', cat: 'holder', name: '40-ft-Mining-Container (200)', release: '2017-01', price: 90000, size: [12.5, 3.0], slots: 200, minTier: 5, selfCooled: true, desc: 'Schlüsselfertiger Container mit eigener Kühlung (Lüfterwand bzw. Wasserkreislauf) für 200 ASICs.' },

  // Kühlung: cool = abgeführte Wärme in W, watt = eigener Verbrauch
  { id: 'fan', kind: 'cooling', cat: 'cool', name: 'Standventilator', release: '2000-01', price: 30, watt: 45, cool: 450, size: [0.5, 0.5], minTier: 0, maxTier: 2 },
  { id: 'mobileac', kind: 'cooling', cat: 'cool', name: 'Mobile Klimaanlage', release: '2000-01', price: 400, watt: 900, cool: 2600, size: [0.5, 0.5], minTier: 0, maxTier: 2 },
  { id: 'splitac', kind: 'cooling', cat: 'cool', name: 'Split-Klimagerät', release: '2000-01', price: 1500, watt: 1400, cool: 5200, size: [1.0, 0.5], minTier: 1, maxTier: 3 },
  { id: 'indfan', kind: 'cooling', cat: 'cool', name: 'Industrie-Abluftventilator', release: '2000-01', price: 650, watt: 600, cool: 12000, size: [1.0, 0.5], minTier: 2, maxTier: 4 },
  { id: 'evap', kind: 'cooling', cat: 'cool', name: 'Verdunstungskühler', release: '2000-01', price: 8000, watt: 3000, cool: 85000, size: [1.5, 1.0], minTier: 3 },
  { id: 'crac', kind: 'cooling', cat: 'cool', name: 'Präzisionsklima (CRAC)', release: '2000-01', price: 45000, watt: 45000, cool: 260000, size: [2.0, 1.0], minTier: 4 },

  // Roboter (Fähigkeiten Nr. 46–48): Ladestation mit Robi – braucht Platz und Strom, kein Gehalt. Module im Inspektor (Game.roboMod)
  { id: 'robi', kind: 'robot', cat: 'robo', skill: 'robo_usb', name: 'Robi mit Ladestation', release: '2014-01', price: 6000, watt: 120, size: [1.0, 0.5], minTier: 3, desc: 'Fährt zu neuen Rigs und steckt den USB-Stick mit dem Mining-Image ein. Nachrüstbar: Greifarm, Lötkopf.' },

  // Deko
  { id: 'plant', kind: 'decor', cat: 'decor', name: 'Zimmerpflanze', release: '2000-01', price: 25, size: [0.5, 0.5], minTier: 0 },
  { id: 'lamp', kind: 'decor', cat: 'decor', name: 'Stehlampe', release: '2000-01', price: 40, watt: 0, size: [0.5, 0.5], minTier: 0 },
  { id: 'sofa', kind: 'decor', cat: 'decor', name: 'Gaming-Sofa', release: '2000-01', price: 350, size: [1.5, 1.0], minTier: 1 },
  { id: 'neon', kind: 'decor', cat: 'decor', name: 'Neon-Schild „HODL“', release: '2013-12-18', price: 180, size: [1.0, 0.5], minTier: 0 },
  { id: 'aquarium', kind: 'decor', cat: 'decor', name: 'Aquarium', release: '2000-01', price: 260, size: [1.0, 0.5], minTier: 0 },
  { id: 'fridge', kind: 'decor', cat: 'decor', name: 'Getränkekühlschrank', release: '2000-01', price: 220, watt: 0, size: [0.5, 0.5], minTier: 0 },
  { id: 'arcade', kind: 'decor', cat: 'decor', name: 'Arcade-Automat', release: '2000-01', price: 900, size: [0.5, 0.5], minTier: 1 },
];

export const PLACEABLE = Object.fromEntries(PLACEABLES.map((p) => [p.id, p]));
export const PART = Object.fromEntries(PARTS.map((p) => [p.id, p]));
for (const it of [...PLACEABLES, ...PARTS]) it.releaseDay = toDay(it.release);

export const CATEGORIES = [
  { id: 'rigs', name: 'Rigs', icon: '🖥️' },
  { id: 'parts', name: 'Teile', icon: '🔧' }, // GPUs, CPUs, Mainboards, Netzteile fürs Lager (Selbstbau)
  { id: 'asic', name: 'Miner', icon: '⛏️' },
  { id: 'holder', name: 'Regale', icon: '🗄️' },
  { id: 'cool', name: 'Kühlung', icon: '❄️' },
  { id: 'robo', name: 'Roboter', icon: '🤖' },
  { id: 'decor', name: 'Deko', icon: '🪴' },
];
