<script lang="ts">
	import { donutSegments, seriesColor } from '$lib/polls';
	import TurnoutRing from '$lib/TurnoutRing.svelte';

	let {
		results,
		total,
		members = [],
		votedIds = [],
		myOption = ''
	}: {
		results: { option: string; count: number; pct: number }[];
		total: number;
		members?: { id: string; name?: string; email?: string }[];
		votedIds?: string[];
		myOption?: string;
	} = $props();

	const R = 45; // donut radius inside a -60..60 viewBox
	let segments = $derived(donutSegments(results, R));
</script>

<div class="grid grid-cols-1 items-center gap-8 lg:grid-cols-2">
	<!-- Share of the vote -->
	<figure class="m-0">
		<div class="relative mx-auto h-52 w-52">
			<svg
				viewBox="-60 -60 120 120"
				class="h-full w-full -rotate-90"
				role="img"
				aria-label="Share of votes by option"
			>
				<circle r={R} fill="none" stroke="#ece9e1" stroke-width="18" />
				{#each segments as seg}
					{#if !seg.empty}
						<circle
							r={R}
							fill="none"
							stroke={seg.color}
							stroke-width="18"
							stroke-dasharray={seg.dashArray}
							stroke-dashoffset={seg.dashOffset}
							class="transition-all duration-500"
						>
							<title>{seg.option}</title>
						</circle>
					{/if}
				{/each}
			</svg>
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<span class="text-4xl leading-none font-bold text-brand-dark">{total}</span>
				<span class="mt-1 text-xs text-gray-500">{total === 1 ? 'vote' : 'votes'}</span>
			</div>
		</div>
	</figure>

	<!-- The precise readout. Every slice is named and numbered here, so the chart
       never has to carry identity on colour alone. -->
	<div class="space-y-4">
		{#each results as r, i}
			<div>
				<div class="mb-1.5 flex items-center justify-between gap-3 text-sm">
					<span class="flex min-w-0 items-center gap-2">
						<span class="h-3 w-3 shrink-0 rounded-sm" style={`background:${seriesColor(i)}`}></span>
						<span class="truncate font-medium text-brand-dark">{r.option}</span>
						{#if myOption === r.option}
							<span class="shrink-0 text-xs text-gray-500">(your vote)</span>
						{/if}
					</span>
					<span class="whitespace-nowrap text-gray-500">{r.count} &middot; {r.pct}%</span>
				</div>
				<div class="h-2.5 w-full overflow-hidden rounded-full bg-gray-100">
					<div
						class="h-full rounded-full transition-all duration-500"
						style={`width:${r.pct}%;background:${seriesColor(i)}`}
					></div>
				</div>
			</div>
		{/each}
	</div>
</div>

{#if members.length}
	<div class="mt-10 border-t border-gray-100 pt-8">
		<TurnoutRing {members} {votedIds} />
	</div>
{/if}
