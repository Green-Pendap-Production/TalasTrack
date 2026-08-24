<script lang="ts">
	import { ringPositions } from '$lib/polls';

	// One dot per member, filled when their vote is in. Deliberately shows *that*
	// someone voted, never which option - the tally covers that.
	// `big` is the presenter screen: fills its box and inherits the surrounding
	// ink, so the same ring reads on a dark projector as on a white card.
	let {
		members = [],
		votedIds = [],
		big = false
	}: {
		members?: { id: string; name?: string; email?: string }[];
		votedIds?: string[];
		big?: boolean;
	} = $props();

	let ring = $derived(
		ringPositions(members.length, 44).map((point, i) => ({
			...point,
			member: members[i],
			voted: votedIds.includes(members[i].id)
		}))
	);
	let dotRadius = $derived(members.length > 28 ? 3 : members.length > 16 ? 4 : 5);
</script>

{#if members.length}
	<div class="flex flex-col items-center">
		<div class={big ? 'relative aspect-square w-full' : 'relative h-40 w-40'}>
			<svg
				viewBox="-60 -60 120 120"
				class="h-full w-full"
				role="img"
				aria-label={`${votedIds.length} of ${members.length} members have voted`}
			>
				{#each ring as dot}
					<circle
						cx={dot.x}
						cy={dot.y}
						r={dotRadius}
						fill={dot.voted ? '#947A2C' : '#ffffff'}
						stroke={dot.voted ? '#947A2C' : '#d9d5ca'}
						stroke-width="1.5"
						class="transition-all duration-500"
					>
						<title
							>{dot.member?.name || dot.member?.email} &mdash; {dot.voted
								? 'voted'
								: 'not yet'}</title
						>
					</circle>
				{/each}
			</svg>
			<div class="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
				<span
					class={`leading-none font-bold tabular-nums ${big ? 'text-[5vh]' : 'text-2xl text-brand-dark'}`}
				>
					{votedIds.length}<span class={big ? 'opacity-50' : 'text-gray-400'}
						>/{members.length}</span
					>
				</span>
				<span class={`mt-1 ${big ? 'text-[1.6vh] opacity-70' : 'text-xs text-gray-500'}`}
					>voted</span
				>
			</div>
		</div>
		<p
			class={`mt-4 flex items-center gap-4 ${big ? 'text-[1.6vh] opacity-70' : 'text-xs text-gray-500'}`}
		>
			<span class="inline-flex items-center gap-1.5">
				<span class="h-2.5 w-2.5 rounded-full bg-brand-gold-700"></span> Voted
			</span>
			<span class="inline-flex items-center gap-1.5">
				<span class="h-2.5 w-2.5 rounded-full border border-gray-300 bg-white"></span> Waiting
			</span>
		</p>
	</div>
{/if}
