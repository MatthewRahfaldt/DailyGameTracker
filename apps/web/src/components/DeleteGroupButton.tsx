"use client";

import { dangerButtonClass } from "@/components/ui/styles";

/**
 * Submit button for the "delete group" form, gated behind a native confirm() — deleting a group
 * is permanent (see `deleteGroup`), so this is the one destructive action in the app that gets a
 * are-you-sure prompt before anything is sent to the server.
 */
export function DeleteGroupButton({ groupName }: { groupName: string }) {
  return (
    <button
      type="submit"
      onClick={(event) => {
        if (
          !confirm(
            `Delete "${groupName}"? This removes it for every member and can't be undone. Nobody's personal game history is affected.`,
          )
        ) {
          event.preventDefault();
        }
      }}
      className={dangerButtonClass}
    >
      Delete group
    </button>
  );
}
