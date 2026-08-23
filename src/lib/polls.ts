// Vote tallying. Shared by the poll list and the poll detail page.
// ponytail: counts in memory over the full vote list — fine into the thousands.
// If a poll ever gets huge, precompute counts in a PocketBase view collection.
export type VoteRecord = { option: string; user?: string };

export function tally(votes: VoteRecord[], options: string[]) {
	const counts = new Map<string, number>(options.map((o) => [o, 0]));
	for (const v of votes) counts.set(v.option, (counts.get(v.option) ?? 0) + 1);
	const total = votes.length;
	const results = [...counts].map(([option, count]) => ({
		option,
		count,
		pct: total ? Math.round((count / total) * 100) : 0
	}));
	const top = Math.max(0, ...results.map((r) => r.count));
	return { total, results, winners: results.filter((r) => r.count === top && top > 0) };
}

// Categorical slots in fixed order - option 1 keeps its colour whoever is winning.
// Validated on a white surface: CVD dE 9.1, normal-vision dE 19.6. Do not reorder or cycle.
export const SERIES = [
	'#2a78d6',
	'#eb6834',
	'#1baf7a',
	'#eda100',
	'#e87ba4',
	'#008300',
	'#4a3aa7',
	'#e34948'
];

export function seriesColor(index: number) {
	return SERIES[index] ?? '#8a8a80'; // past 8 options identity comes from the labels
}

// Donut slices as stroke-dasharray on one circle each - no arc-path maths, and a
// single 100% slice draws correctly, which a d="A..." arc does not.
export function donutSegments(
	results: { option: string; count: number }[],
	radius: number,
	gap = 2
) {
	const circumference = 2 * Math.PI * radius;
	const total = results.reduce((sum, r) => sum + r.count, 0);
	let start = 0;
	return results.map((r, i) => {
		const span = total ? (r.count / total) * circumference : 0;
		// 2px of surface between neighbouring fills, but never swallow a thin slice whole
		const drawn = span > gap ? span - gap : span;
		const segment = {
			option: r.option,
			color: seriesColor(i),
			dashArray: `${drawn} ${circumference - drawn}`,
			dashOffset: start ? -start : 0, // keep the first slice at 0, not -0
			empty: span === 0
		};
		start += span;
		return segment;
	});
}

// Evenly spaced points on a circle, first one at 12 o'clock.
// ponytail: one ring - past ~40 members the dots crowd, wrap to a second ring then.
export function ringPositions(count: number, radius: number) {
	return Array.from({ length: count }, (_, i) => {
		const angle = (i / count) * 2 * Math.PI - Math.PI / 2;
		return { x: Math.cos(angle) * radius, y: Math.sin(angle) * radius };
	});
}
