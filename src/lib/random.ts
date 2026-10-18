// 固定种子的随机数, 群像 尘埃 眨眼都用它, 每次渲染结果一样
export const mulberry32 = (seed: number) => {
	let a = seed >>> 0;
	return () => {
		a = (a + 0x6d2b79f5) >>> 0;
		let t = a;
		t = Math.imul(t ^ (t >>> 15), t | 1);
		t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
		return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
	};
};

export const range = (rng: () => number, lo: number, hi: number) => lo + (hi - lo) * rng();

export const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
