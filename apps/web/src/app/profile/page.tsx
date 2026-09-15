import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Page } from "@/components/ui/Page";
import { fieldLabelClass, inputClass, primaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { updateProfile } from "./actions";

export default async function ProfilePage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) redirect("/");

  // Node's Intl gives the full IANA timezone list — nothing hardcoded to maintain.
  const timezones = Intl.supportedValuesOf("timeZone");

  return (
    <Page title="Profile">
      <form action={updateProfile} className="flex flex-col gap-5">
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Display name</span>
          <input name="name" type="text" defaultValue={user.name ?? ""} placeholder="Your name" className={inputClass} />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className={fieldLabelClass}>Timezone</span>
          <select name="timezone" defaultValue={user.timezone} className={inputClass}>
            {timezones.map((tz) => (
              <option key={tz} value={tz}>
                {tz}
              </option>
            ))}
          </select>
          <span className="text-xs text-stone-500">Decides which day a pasted result counts toward.</span>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start`}>
          Save
        </button>
      </form>
      <p className="text-sm text-stone-500">Signed in as {user.email}</p>
    </Page>
  );
}
