import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { Page } from "@/components/ui/Page";
import { SectionLabel } from "@/components/ui/SectionLabel";
import { fieldLabelClass, inputClass, primaryButtonClass } from "@/components/ui/styles";
import { prisma } from "@/lib/prisma";
import { deleteAccount, updateProfile } from "./actions";
import { DELETE_ACCOUNT_CONFIRMATION } from "./constants";

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
        <label className="flex items-start gap-2">
          <input
            name="assumeRecentImports"
            type="checkbox"
            defaultChecked={user.assumeRecentImports}
            className="mt-1 accent-yellow-400"
          />
          <span className="flex flex-col gap-0.5">
            <span className={fieldLabelClass}>Assume imported results are recent</span>
            <span className="text-xs text-stone-500">
              When importing a past result with no year (GeoSports, GeoHistory), guess it&apos;s
              from the last 12 months instead of asking every time. You can always fix the date
              before saving.
            </span>
          </span>
        </label>
        <button type="submit" className={`${primaryButtonClass} self-start`}>
          Save
        </button>
      </form>
      <p className="text-sm text-stone-500">Signed in as {user.email}</p>

      <section className="flex flex-col gap-3 border-t border-stone-900 pt-6">
        <SectionLabel>Delete account</SectionLabel>
        <details className="group">
          <summary className="cursor-pointer text-sm text-stone-500 transition-colors hover:text-stone-300">
            Permanently delete your account and data
          </summary>
          <form action={deleteAccount} className="mt-4 flex flex-col gap-3 rounded-lg bg-surface p-4">
            <p className="text-sm text-stone-300">This can&apos;t be undone. Deleting your account removes:</p>
            <ul className="flex list-disc flex-col gap-1 pl-5 text-xs text-stone-500 marker:text-stone-700">
              <li>your profile, sign-in connections and sessions</li>
              <li>every result you&apos;ve saved, including the text you pasted, and all your stats</li>
              <li>your follows, followers and reactions</li>
              <li>your membership in every group</li>
            </ul>
            <p className="text-xs text-stone-500">
              Groups you own that have other members pass to their longest-standing admin (or member), and
              groups where you&apos;re the only member are deleted. You can sign up again later, but nothing
              will be restored.
            </p>
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>
                Type <span className="font-mono text-stone-300">{DELETE_ACCOUNT_CONFIRMATION}</span> to confirm
              </span>
              <input
                name="confirmation"
                type="text"
                required
                autoComplete="off"
                pattern={DELETE_ACCOUNT_CONFIRMATION}
                title={`Type ${DELETE_ACCOUNT_CONFIRMATION} in capital letters`}
                className={inputClass}
              />
            </label>
            <button
              type="submit"
              className="self-start rounded-md border border-red-900 px-3 py-1.5 font-mono text-xs uppercase tracking-wider text-red-400 transition-colors hover:bg-red-950/40"
            >
              Delete my account
            </button>
          </form>
        </details>
      </section>
    </Page>
  );
}
