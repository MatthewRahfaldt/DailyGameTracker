"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

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

  if (typeof timezone !== "string" || timezone.trim().length === 0) {
    throw new Error("Please choose a timezone.");
  }

  await prisma.user.update({
    where: { id: session.user.id },
    data: {
      name: typeof name === "string" && name.trim().length > 0 ? name.trim() : null,
      timezone,
    },
  });

  revalidatePath("/profile");
  redirect("/profile");
}
