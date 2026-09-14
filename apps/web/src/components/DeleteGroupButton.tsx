"use client";

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
      className="self-start rounded-md border border-red-600/40 px-3 py-2 text-sm font-medium text-red-700 transition-opacity hover:opacity-80 dark:border-red-400/40 dark:text-red-400"
    >
      Delete group
    </button>
  );
}
