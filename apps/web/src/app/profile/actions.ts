"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
// Lives in its own file because a "use server" module may only export async functions.
import { DELETE_ACCOUNT_CONFIRMATION } from "./constants";

/**
 * Updates the signed-in user's display name and timezone (docs/BACKLOG.md,
 * "Build basic user profile"). Timezone matters beyond this page — it's what determines which
 * calendar day a pasted result counts toward once the paste-box actually saves to the database.
 */
export async function updateProfile(formData: FormData) {
  const session = await auth();
  if (!session?.user) {
    redirect("/");
  }

  const name = formData.get("name");
  const timezone = formData.get("timezone");
  // Checkboxes only appear in FormData when checked, so absence means "off" — the field can't be
  // left in an ambiguous null/undefined state the way a text input could.
  const assumeRecentImports = formData.get("assumeRecentImports") === "on";

  if (typeof timezone !== "string" || timezone.trim().length === 0) {
    throw new Error("Please choose a timezone.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: typeof name === "string" && name.trim().length > 0 ? name.trim() : null,
      timezone,
      assumeRecentImports,
    },
  });

  revalidatePath("/profile");
  redirect("/profile");
}

/**
 * Permanently delete the signed-in user's account and everything tied to it (docs/BACKLOG.md,
 * "Delete account"). Referenced from the privacy policy, so keep the two in sync.
 *
 * What goes: every table that points at `User` is `onDelete: Cascade` in prisma/schema.prisma, so
 * one `user.delete` removes their sessions, linked sign-in accounts, tracked games, game results
 * (including the raw pasted text), group memberships, follows in both directions, and their
 * reactions — plus other people's reactions to their results, via the `GameResult` cascade. Email
 * sign-in tokens aren't linked to `User` by a foreign key (they're keyed by email address), so
 * those are deleted explicitly.
 *
 * Groups are the one thing that needs handling first, because a group has no foreign key to its
 * owner and "transfer ownership" doesn't exist as a feature yet:
 *   - a group the user owns with nobody else in it is deleted outright;
 *   - a group the user owns with other members passes to its longest-standing admin, or failing
 *     that its longest-standing member, so deleting an account never strands or destroys a group
 *     other people are using.
 * These steps run before the user row is deleted and are safe to retry if one fails partway.
 *
 * Signing out: the user's `Session` rows disappear with the cascade, so Auth.js's own `signOut`
 * (which tries to delete the session row) isn't used — the session cookie is cleared directly.
 */
export async function deleteAccount(formData: FormData): Promise<void> {
  const session = await auth();
  if (!session?.user?.id) redirect("/");
  const userId = session.user.id;

  if (String(formData.get("confirmation") ?? "").trim() !== DELETE_ACCOUNT_CONFIRMATION) {
    throw new Error(`Type ${DELETE_ACCOUNT_CONFIRMATION} to confirm deleting your account.`);
  }

  const user = await prisma.user.findUnique({ where: { id: userId }, select: { email: true } });
  if (!user) redirect("/");

  const ownedGroups = await prisma.groupMember.findMany({
    where: { userId, role: "owner" },
    select: { groupId: true },
  });

  for (const { groupId } of ownedGroups) {
    const others = await prisma.groupMember.findMany({
      where: { groupId, userId: { not: userId } },
      orderBy: { joinedAt: "asc" },
      select: { userId: true, role: true },
    });

    if (others.length === 0) {
      await prisma.group.delete({ where: { id: groupId } });
      continue;
    }

    const successor = others.find((member) => member.role === "admin") ?? others[0];
    await prisma.groupMember.update({
      where: { groupId_userId: { groupId, userId: successor.userId } },
      data: { role: "owner" },
    });
  }

  await prisma.verificationToken.deleteMany({ where: { identifier: user.email } });
  await prisma.user.delete({ where: { id: userId } });

  // Session cookie names differ by protocol (the __Secure- prefix applies on https), so clear both.
  const cookieStore = await cookies();
  cookieStore.delete("authjs.session-token");
  cookieStore.delete("__Secure-authjs.session-token");

  revalidatePath("/", "layout");
  redirect("/");
}
