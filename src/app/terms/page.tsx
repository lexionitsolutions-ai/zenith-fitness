import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Terms And Support",
  description: "Terms of use and support information for Zenith Fitness.",
};

const supportEmail = "support@zenithfitness.in";

export default function TermsPage() {
  return (
    <LegalPage title="Terms And Support" updated="7 August 2026">
      <LegalSection title="Use Of The App">
        <p>
          Zenith Fitness provides this app for members, staff, and administrators to access gym-related services such as memberships, points, workouts, schedules, announcements, and operational tools.
        </p>
        <p>
          Users must access the app only with their own authorized account and must not share passwords, misuse QR codes, interfere with the app, or attempt to access another member's information.
        </p>
      </LegalSection>

      <LegalSection title="Membership And Payments">
        <p>
          Membership plans, payment status, pending amounts, renewals, and expiry dates shown in the app are provided for member convenience. If there is any mismatch, members should contact the Zenith Fitness front desk for review and correction.
        </p>
      </LegalSection>

      <LegalSection title="Points And Rewards">
        <p>
          Points, targets, rewards, and corrections are managed by Zenith Fitness staff and administrators. Point corrections may create permanent audit records. Zenith Fitness may review, adjust, or reverse points if needed to correct errors or misuse.
        </p>
      </LegalSection>

      <LegalSection title="Workout Information">
        <p>
          Workout cards, exercises, videos, and schedules are general fitness guidance for Zenith Fitness members. Members should train within their ability and ask gym staff for form support when needed. Members with medical concerns should consult a qualified professional before beginning or changing workouts.
        </p>
      </LegalSection>

      <LegalSection title="Notifications And Camera">
        <p>
          The app may request notification permission to send gym updates and camera permission to scan QR codes. Users can manage these permissions in their device settings.
        </p>
      </LegalSection>

      <LegalSection title="Availability">
        <p>
          Zenith Fitness aims to keep the app available and accurate, but access may be interrupted for maintenance, hosting issues, network problems, updates, or events outside our control.
        </p>
      </LegalSection>

      <LegalSection title="Support">
        <p>
          For account help, membership corrections, payment questions, technical issues, or app support, contact Zenith Fitness at{" "}
          <a className="text-zenith-400 underline underline-offset-4" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
        <p>Members can also contact the front desk directly for urgent membership or gym access issues.</p>
      </LegalSection>

      <LegalSection title="Changes">
        <p>
          Zenith Fitness may update these terms as the app and gym services evolve. Continued use of the app after updates means users accept the revised terms.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
