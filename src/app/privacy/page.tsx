import type { Metadata } from "next";
import { LegalPage, LegalSection } from "@/components/legal/legal-page";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "Privacy Policy for Zenith Fitness members and staff.",
};

const supportEmail = "support@zenithfitness.in";

export default function PrivacyPage() {
  return (
    <LegalPage title="Privacy Policy" updated="7 August 2026">
      <LegalSection title="Overview">
        <p>
          Zenith Fitness provides a member companion app for memberships, points, workouts, schedules, announcements, and gym staff operations. This policy explains what information we collect, how we use it, and how members can contact us.
        </p>
      </LegalSection>

      <LegalSection title="Information We Collect">
        <p>We may collect and process information needed to operate the gym and app, including:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Member profile details such as name, admission ID, mobile number, gender, birth date, address, and medical notes shared with the gym.</li>
          <li>Membership details such as plan, start date, end date, payment status, amount paid, pending amount, and renewal status.</li>
          <li>Points, QR scan records, targets, workout assignments, and exercise progress.</li>
          <li>Login, account, device, and security information needed to keep accounts protected.</li>
          <li>Notification device tokens if a member enables app notifications.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Camera And QR Scanner">
        <p>
          The app may request camera access for QR scanning. Camera access is used only to scan Zenith Fitness QR codes for member identification or points workflows. The app does not use camera access for unrelated tracking.
        </p>
      </LegalSection>

      <LegalSection title="Notifications">
        <p>
          If members allow notifications, Zenith Fitness may send app notifications about announcements, memberships, workouts, points, renewals, and gym updates. Members can disable notifications in their device settings.
        </p>
      </LegalSection>

      <LegalSection title="How We Use Information">
        <p>We use information to:</p>
        <ul className="list-disc space-y-2 pl-5">
          <li>Provide member dashboard, membership, points, workout, and schedule features.</li>
          <li>Help staff and administrators manage gym operations.</li>
          <li>Send important gym announcements and reminders.</li>
          <li>Maintain audit records for points and administrative actions.</li>
          <li>Improve security, prevent misuse, and support members.</li>
        </ul>
      </LegalSection>

      <LegalSection title="Data Sharing">
        <p>
          We do not sell member personal information. Information may be processed by trusted service providers that host or operate the app, database, notifications, analytics, or support systems. These providers are used only to deliver the app and gym services.
        </p>
      </LegalSection>

      <LegalSection title="Data Retention">
        <p>
          We keep records for as long as needed for membership management, accounting, security, audit history, legal obligations, and gym operations. Members may contact Zenith Fitness to request correction or review of their information.
        </p>
      </LegalSection>

      <LegalSection title="Security">
        <p>
          We use reasonable technical and organizational safeguards to protect member information. No online system is completely risk-free, so members should keep their login credentials private and report suspicious activity.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          For privacy questions, corrections, or support requests, contact Zenith Fitness at{" "}
          <a className="text-zenith-400 underline underline-offset-4" href={`mailto:${supportEmail}`}>
            {supportEmail}
          </a>
          .
        </p>
      </LegalSection>
    </LegalPage>
  );
}
