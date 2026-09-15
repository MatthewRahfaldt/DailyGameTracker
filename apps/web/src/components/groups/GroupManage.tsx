import type { Game } from "@dgt/types";
import {
  assignGameToGroup,
  deleteGroup,
  leaveGroup,
  removeGameFromGroup,
  resetGroupPassword,
  updateMemberRole,
} from "@/app/groups/actions";
import { DeleteGroupButton } from "@/components/DeleteGroupButton";
import { GameLink } from "@/components/GameLink";
import { PasswordField } from "@/components/PasswordField";
import { CopyLink } from "@/components/ui/CopyLink";
import { SectionLabel } from "@/components/ui/SectionLabel";
import {
  dangerButtonClass,
  inputClass,
  primaryButtonClass,
  quietButtonClass,
  secondaryButtonClass,
} from "@/components/ui/styles";
import type { GroupView } from "@/lib/group-view";

/** Invite link, roster/roles, game assignment, password and leave/delete — same rules as before. */
export function GroupManage({ group, assignableGames }: { group: GroupView; assignableGames: Game[] }) {
  const isOwner = group.viewerRole === "owner";
  const canManageGames = isOwner || group.viewerRole === "admin";

  return (
    <div className="flex flex-col gap-8 rounded-lg bg-surface p-4">
      <CopyLink label="Invite link" path={`/groups/join/${group.inviteCode}`} />

      <section className="flex flex-col gap-2">
        <SectionLabel>Members ({group.members.length})</SectionLabel>
        <ul className="flex flex-col divide-y divide-stone-900">
          {group.members.map((member) => (
            <li key={member.id} className="flex items-center justify-between gap-3 py-2 text-sm">
              <span className="text-stone-200">{member.name}</span>
              {isOwner && member.role !== "owner" ? (
                <form action={updateMemberRole}>
                  <input type="hidden" name="groupId" value={group.id} />
                  <input type="hidden" name="userId" value={member.id} />
                  <input type="hidden" name="role" value={member.role === "admin" ? "member" : "admin"} />
                  <button type="submit" className={quietButtonClass}>
                    {member.role === "admin" ? "Make member" : "Make admin"}
                  </button>
                </form>
              ) : (
                <span className="font-mono text-[10px] uppercase tracking-wider text-stone-500">{member.role}</span>
              )}
            </li>
          ))}
        </ul>
      </section>

      <section className="flex flex-col gap-2">
        <SectionLabel>Games ({group.games.length})</SectionLabel>
        {group.games.length === 0 ? (
          <p className="text-sm text-stone-500">No games assigned yet.</p>
        ) : (
          <ul className="flex flex-col divide-y divide-stone-900">
            {group.games.map((game) => (
              <li key={game.id} className="flex items-center justify-between gap-3 py-2 text-sm">
                <GameLink name={game.name} url={game.url} />
                {canManageGames && (
                  <form action={removeGameFromGroup}>
                    <input type="hidden" name="groupId" value={group.id} />
                    <input type="hidden" name="gameId" value={game.id} />
                    <button type="submit" className={quietButtonClass}>
                      Remove
                    </button>
                  </form>
                )}
              </li>
            ))}
          </ul>
        )}
        {canManageGames && assignableGames.length > 0 && (
          <form action={assignGameToGroup} className="flex gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <select name="gameId" required aria-label="Game to assign" className={inputClass}>
              {assignableGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.name}
                </option>
              ))}
            </select>
            <button type="submit" className={`${primaryButtonClass} shrink-0`}>
              Assign
            </button>
          </form>
        )}
      </section>

      {isOwner && (
        <section className="flex flex-col gap-2">
          <SectionLabel>{group.hasPassword ? "Password" : "Join password"}</SectionLabel>
          <form action={resetGroupPassword} className="flex gap-2">
            <input type="hidden" name="groupId" value={group.id} />
            <PasswordField
              name="password"
              placeholder={group.hasPassword ? "New password (blank removes it)" : "Set a password"}
              className="flex-1"
            />
            <button type="submit" className={`${secondaryButtonClass} shrink-0`}>
              Save
            </button>
          </form>
        </section>
      )}

      <section className="flex flex-col items-start gap-2 border-t border-stone-900 pt-4">
        {isOwner ? (
          <form action={deleteGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <DeleteGroupButton groupName={group.name} />
          </form>
        ) : (
          <form action={leaveGroup}>
            <input type="hidden" name="groupId" value={group.id} />
            <button type="submit" className={dangerButtonClass}>
              Leave group
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
