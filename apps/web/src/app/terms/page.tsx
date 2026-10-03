import Link from "next/link";
import { Page } from "@/components/ui/Page";
import { LegalList, LegalSection } from "@/components/ui/Legal";

export const metadata = {
  title: "Terms of Service — Daily Game Tracker",
  description: "The rules for using Daily Game Tracker.",
};

const CONTACT = "support@dailygametracker.com";

export default function TermsPage() {
  return (
    <Page title="Terms of Service">
      <p className="text-sm text-stone-500">Last updated: October 4, 2026</p>

      <LegalSection title="Agreement">
        <p>
          By using Daily Game Tracker at www.dailygametracker.com (the &ldquo;Service&rdquo;) you agree to these
          terms. If you don&apos;t agree, please don&apos;t use it. Please also read our{" "}
          <Link href="/privacy" className="text-stone-300 underline underline-offset-4">
            Privacy Policy
          </Link>
          , which explains how we handle your data.
        </p>
      </LegalSection>

      <LegalSection title="What the Service is">
        <p>
          Daily Game Tracker lets you paste results from daily games and view your stats, streaks and shared
          activity. It is an independent project. It isn&apos;t affiliated with, endorsed by, or sponsored by the
          makers of any game it supports (such as Wordle, Connections, Catfishing, Landmarkr, GeoSports, GeoHistory
          or Krillion), and all game names and marks belong to their owners.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <LegalList>
          <li>You&apos;re responsible for activity on your account, so keep your sign-in methods secure.</li>
          <li>Give us accurate information and don&apos;t impersonate anyone.</li>
          <li>You must be at least 13 years old to use the Service.</li>
        </LegalList>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You keep ownership of what you submit (game results, group names, display name, reactions). You give us
          permission to store it and display it to others as the Service is designed to, for example to members of
          your groups and to people who follow you. Only submit content you have the right to share.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>Please don&apos;t:</p>
        <LegalList>
          <li>submit false, abusive, harassing, hateful or unlawful content;</li>
          <li>try to access other people&apos;s accounts or data, or probe or disrupt the Service;</li>
          <li>use bots or scripts to submit results or overload the Service;</li>
          <li>use the Service to send spam or unwanted invitations.</li>
        </LegalList>
        <p>We may remove content or suspend accounts that break these rules.</p>
      </LegalSection>

      <LegalSection title="Availability and changes">
        <p>
          The Service is provided as a hobby project and may change, be interrupted, or be discontinued at any time.
          Stats are calculated from what you paste and may contain mistakes, so don&apos;t rely on them for anything
          important.
        </p>
      </LegalSection>

      <LegalSection title="No warranty">
        <p>
          The Service is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;, without warranties of any
          kind, to the fullest extent permitted by law.
        </p>
      </LegalSection>

      <LegalSection title="Limitation of liability">
        <p>
          To the fullest extent permitted by law, we aren&apos;t liable for indirect, incidental or consequential
          damages, or for lost data or lost streaks, arising from your use of the Service. Nothing in these terms
          limits liability that can&apos;t be limited by law.
        </p>
      </LegalSection>

      <LegalSection title="Ending your use">
        <p>
          You can stop using the Service at any time, and you can permanently delete your account yourself from your
          Profile page (see the Privacy Policy for exactly what that removes). We can suspend or end access if you
          break these terms or if we shut the Service down.
        </p>
      </LegalSection>

      <LegalSection title="Changes to these terms">
        <p>
          We may update these terms. We&apos;ll change the date above, and continuing to use the Service after a
          change means you accept the updated terms.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions:{" "}
          <a href={`mailto:${CONTACT}`} className="text-stone-300 underline underline-offset-4">
            {CONTACT}
          </a>
        </p>
      </LegalSection>
    </Page>
  );
}
