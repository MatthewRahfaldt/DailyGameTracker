import { REACTION_EMOJI } from "@dgt/types";
import { toggleReaction } from "@/app/groups/actions";
import type { ReactionSummary } from "@/lib/group-queries";

function ReactionButton({
  groupId,
  resultId,
  emoji,
  count,
  active,
}: {
  groupId: string;
  resultId: string;
  emoji: string;
  count: number;
  active: boolean;
}) {
  return (
    <form action={toggleReaction}>
      <input type="hidden" name="groupId" value={groupId} />
      <input type="hidden" name="gameResultId" value={resultId} />
      <input type="hidden" name="emoji" value={emoji} />
      <button
        type="submit"
        aria-pressed={active}
        className={`rounded-full px-2 py-0.5 text-xs ring-1 transition-colors ${
          active ? "bg-yellow-400/15 text-yellow-300 ring-yellow-400/60" : "text-stone-400 ring-stone-800 hover:ring-stone-600"
        }`}
      >
        {emoji}
        {count > 0 ? ` ${count}` : ""}
      </button>
    </form>
  );
}

/** Reactions already used on a result, plus a "+" picker for the rest. Toggling uses toggleReaction. */
export function Reactions({
  groupId,
  resultId,
  reactions,
}: {
  groupId: string;
  resultId: string;
  reactions: ReactionSummary[];
}) {
  const used = reactions.filter((reaction) => reaction.count > 0);

  return (
    <div className="flex flex-wrap items-center gap-1">
      {used.map((reaction) => (
        <ReactionButton
          key={reaction.emoji}
          groupId={groupId}
          resultId={resultId}
          emoji={reaction.emoji}
          count={reaction.count}
          active={reaction.reactedByMe}
        />
      ))}
      <details className="relative">
        <summary
          aria-label="Add reaction"
          className="rounded-full px-2 py-0.5 text-xs text-stone-500 ring-1 ring-stone-800 transition-colors hover:text-stone-300"
        >
          +
        </summary>
        <div className="absolute left-0 z-20 mt-1 flex gap-1 rounded-md bg-stone-900 p-1.5 ring-1 ring-stone-800">
          {REACTION_EMOJI.map((emoji) => (
            <ReactionButton
              key={emoji}
              groupId={groupId}
              resultId={resultId}
              emoji={emoji}
              count={0}
              active={reactions.some((reaction) => reaction.emoji === emoji && reaction.reactedByMe)}
            />
          ))}
        </div>
      </details>
    </div>
  );
}
