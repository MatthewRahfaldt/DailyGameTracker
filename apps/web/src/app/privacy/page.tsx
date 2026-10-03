import { Page } from "@/components/ui/Page";
import { LegalList, LegalSection } from "@/components/ui/Legal";

export const metadata = {
  title: "Privacy Policy — Daily Game Tracker",
  description: "What Daily Game Tracker collects, why, and how you can have it deleted.",
};

const CONTACT = "privacy@dailygametracker.com";

export default function PrivacyPage() {
  return (
    <Page title="Privacy Policy">
      <p className="text-sm text-stone-500">Last updated: October 4, 2026</p>

      <LegalSection title="The short version">
        <p>
          Daily Game Tracker (&ldquo;we&rdquo;, &ldquo;us&rdquo;) at www.dailygametracker.com lets you paste the
          results of daily games and see your stats and streaks. We collect only what the app needs to do that. We
          don&apos;t sell your data, we don&apos;t show ads, and we don&apos;t use third-party analytics or
          advertising trackers.
        </p>
      </LegalSection>

      <LegalSection title="What we collect">
        <LegalList>
          <li>
            <span className="text-stone-300">Account details.</span> When you sign in with Google or GitHub we
            receive your email address, display name and profile picture from that provider. If you sign in with an
            email link, we receive the email address you enter. You can change your display name and timezone on your
            profile page.
          </li>
          <li>
            <span className="text-stone-300">Game results you submit.</span> The text you paste (for example a
            Wordle share), the details we read from it (puzzle number, score, grid), and the date it counts toward.
          </li>
          <li>
            <span className="text-stone-300">Your activity in the app.</span> Which games you track, groups you
            create or join (including group names, your role, and a hashed &mdash; never plain-text &mdash; join
            password if the group has one), who you follow, and emoji reactions.
          </li>
          <li>
            <span className="text-stone-300">Session data.</span> A secure cookie that keeps you signed in, and
            a matching session record in our database. We use no cookies for advertising or tracking.
          </li>
        </LegalList>
      </LegalSection>

      <LegalSection title="How we use it">
        <p>
          To sign you in, save and display your results, calculate stats and streaks, and let you share them with
          people you choose (see below). We also use your email to send sign-in links you request, and to reply if
          you contact us. We don&apos;t use your data for advertising or sell it to anyone.
        </p>
      </LegalSection>

      <LegalSection title="Google user data">
        <p>
          If you sign in with Google, we request only your basic profile: name, email address and profile picture.
          We use it solely to create and sign you in to your account. Daily Game Tracker&apos;s use and transfer of
          information received from Google APIs adheres to the{" "}
          <a
            href="https://developers.google.com/terms/api-services-user-data-policy#limited-use"
            target="_blank"
            rel="noreferrer noopener"
            className="text-stone-300 underline underline-offset-4"
          >
            Google API Services User Data Policy
          </a>
          , including its Limited Use requirements. We don&apos;t access your Gmail, Drive, Calendar or any other
          Google data.
        </p>
      </LegalSection>

      <LegalSection title="Who can see your data">
        <LegalList>
          <li>
            People you share with through the app&apos;s own features: members of groups you join can see results for
            the games assigned to that group, and people who follow you can see your results in their feed.
          </li>
          <li>
            The services that run Daily Game Tracker, acting on our behalf: Vercel (hosting), Supabase (database),
            and Resend (delivering sign-in emails). Google and GitHub also see that you signed in through them.
          </li>
          <li>Anyone, if we are legally required to disclose it. We&apos;d tell you first where we&apos;re allowed to.</li>
        </LegalList>
        <p>Our service providers may process data in the United States or other countries.</p>
      </LegalSection>

      <LegalSection title="Keeping and deleting your data">
        <p>
          We keep your account and results until you delete your account. You can do that yourself at any time:
          sign in, open your Profile, and choose &ldquo;Delete account&rdquo;. Deletion is immediate and permanent,
          and removes:
        </p>
        <LegalList>
          <li>your profile, linked sign-in connections and sessions;</li>
          <li>every game result you saved, including the text you pasted, and the stats derived from them;</li>
          <li>your follows, your followers, and your reactions (along with reactions others made to your results);</li>
          <li>your membership in every group.</li>
        </LegalList>
        <p>
          Groups need special handling because other people use them. A group you own that has no other members is
          deleted. A group you own that has other members is handed to its longest-standing admin, or if there is no
          admin, its longest-standing member, so it keeps working for everyone else. Anything you shared with a group
          disappears from it when your account is deleted.
        </p>
        <p>
          Some copies can linger briefly after deletion: encrypted database backups kept by our database provider are
          overwritten on their normal schedule, and our email provider keeps delivery logs of the sign-in emails we
          sent you for a limited time under its own policy. We don&apos;t use backups to restore deleted accounts.
        </p>
        <p>
          You can also stop sharing without deleting anything by leaving a group or untracking a game. To get a copy
          of the data we hold about you, or if you can&apos;t sign in and need your account deleted, email{" "}
          <a href={`mailto:${CONTACT}`} className="text-stone-300 underline underline-offset-4">
            {CONTACT}
          </a>{" "}
          from the address on your account and we&apos;ll handle it promptly.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          Connections to the site use HTTPS, our database has access controls and Row Level Security enabled, and we
          limit access to production data. No online service can promise perfect security, so please don&apos;t paste
          anything into the app that you wouldn&apos;t want a group member to see.
        </p>
      </LegalSection>

      <LegalSection title="Children">
        <p>
          Daily Game Tracker isn&apos;t directed at children under 13, and we don&apos;t knowingly collect their
          information. If you believe a child has given us data, email us and we&apos;ll delete it.
        </p>
      </LegalSection>

      <LegalSection title="Changes to this policy">
        <p>
          If we change this policy we&apos;ll update the date above, and for significant changes we&apos;ll post a
          notice in the app.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions or requests:{" "}
          <a href={`mailto:${CONTACT}`} className="text-stone-300 underline underline-offset-4">
            {CONTACT}
          </a>
        </p>
      </LegalSection>
    </Page>
  );
}
