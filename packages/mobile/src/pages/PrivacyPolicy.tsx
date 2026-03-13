import {
  IonContent,
  IonPage,
  IonHeader,
  IonToolbar,
  IonTitle,
  IonButtons,
  IonBackButton,
} from '@ionic/react';
import './LegalPage.css';

const PrivacyPolicy: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Privacy Policy</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="legal-page">
        <div className="legal-content">
          <h1>Privacy Policy</h1>
          <p className="legal-effective">Effective Date: March 12, 2026</p>
          <p className="legal-company">
            SkibbySoft ("Company," "we," "us," or "our") operates the Drink-UX platform. This Privacy Policy explains
            how we collect, use, disclose, and protect your information when you use our Service.
          </p>

          <h2>1. Information We Collect</h2>
          <h3>Information You Provide</h3>
          <ul>
            <li>
              <strong>Account information:</strong> Name, email address, business name, and billing information when you
              create a business account.
            </li>
            <li>
              <strong>Business profile:</strong> Menu items, pricing, drink categories, and business branding you
              configure in the platform.
            </li>
            <li>
              <strong>Square credentials:</strong> OAuth access tokens obtained when you connect your Square account.
              These are stored encrypted and used only to integrate with Square's API.
            </li>
          </ul>
          <h3>Information Collected Automatically</h3>
          <ul>
            <li>
              <strong>Order data:</strong> Drink customizations, order totals, timestamps, and fulfillment status for
              orders placed through the platform.
            </li>
            <li>
              <strong>Usage data:</strong> Pages visited, features used, session duration, and interaction events within
              the app (collected via analytics tools).
            </li>
            <li>
              <strong>Device and technical data:</strong> Browser type, operating system, IP address, and device
              identifiers used to ensure compatibility and security.
            </li>
            <li>
              <strong>Error and performance data:</strong> Crash reports and performance metrics to monitor and improve
              service reliability.
            </li>
          </ul>
          <h3>Information from Third Parties</h3>
          <ul>
            <li>
              <strong>Square API:</strong> We receive business profile data, location information, and item catalog data
              from Square when you connect your account.
            </li>
          </ul>

          <h2>2. How We Use Your Information</h2>
          <p>We use collected information to:</p>
          <ul>
            <li>Provide, operate, and maintain the Drink-UX platform</li>
            <li>Process and fulfill drink orders through Square integration</li>
            <li>Manage your subscription and send billing communications</li>
            <li>Send service-related notifications and support communications</li>
            <li>Monitor and improve platform performance, reliability, and security</li>
            <li>Comply with legal obligations and enforce our Terms of Service</li>
            <li>Respond to your inquiries and provide customer support</li>
          </ul>
          <p>
            We do not use your data to train machine learning models or for purposes unrelated to providing the Service.
          </p>

          <h2>3. Third-Party Sharing</h2>
          <p>We share your information only in these circumstances:</p>
          <ul>
            <li>
              <strong>Square, Inc.:</strong> Order data and OAuth credentials are shared with Square to process payments
              and sync POS data. Square's use of this data is governed by their{' '}
              <a href="https://squareup.com/us/en/legal/general/privacy" target="_blank" rel="noopener noreferrer">
                Privacy Policy
              </a>
              .
            </li>
            <li>
              <strong>Infrastructure providers:</strong> Cloud hosting, database, and CDN services that store and deliver
              the platform. These providers process data only on our behalf and are bound by data processing agreements.
            </li>
            <li>
              <strong>Analytics services:</strong> Aggregated, anonymized usage data may be shared with analytics
              providers to help us understand how the Service is used.
            </li>
            <li>
              <strong>Legal requirements:</strong> We may disclose information if required by law, court order, or
              governmental authority, or to protect the rights, property, or safety of SkibbySoft, our users, or others.
            </li>
          </ul>
          <p>
            We do not sell, rent, or trade your personal information to third parties for their marketing purposes.
          </p>

          <h2>4. Data Retention and Deletion</h2>
          <ul>
            <li>
              <strong>Order data:</strong> Retained for 2 years from the date of the order to support reporting,
              disputes, and compliance.
            </li>
            <li>
              <strong>Account data:</strong> Retained for the duration of your active subscription and 90 days after
              cancellation. We will permanently delete your account data upon written request after the retention period.
            </li>
            <li>
              <strong>Square OAuth tokens:</strong> Deleted immediately when you disconnect your Square account or close
              your Drink-UX account.
            </li>
            <li>
              <strong>Usage and analytics data:</strong> Retained for up to 24 months in aggregated or anonymized form.
            </li>
          </ul>
          <p>
            To request deletion of your data, contact us at privacy@drink-ux.com. We will process deletion requests
            within 30 days, subject to legal retention requirements.
          </p>

          <h2>5. Security</h2>
          <p>
            We implement industry-standard security measures including encryption in transit (TLS), encrypted storage for
            sensitive credentials, access controls, and regular security reviews. However, no method of transmission or
            storage is 100% secure. We encourage you to use strong passwords and contact us immediately if you suspect a
            security incident.
          </p>

          <h2>6. GDPR Compliance (European Users)</h2>
          <p>
            If you are located in the European Economic Area (EEA), you have the following rights under the General Data
            Protection Regulation (GDPR):
          </p>
          <ul>
            <li>
              <strong>Access:</strong> Request a copy of the personal data we hold about you.
            </li>
            <li>
              <strong>Rectification:</strong> Request correction of inaccurate personal data.
            </li>
            <li>
              <strong>Erasure:</strong> Request deletion of your personal data ("right to be forgotten").
            </li>
            <li>
              <strong>Restriction:</strong> Request that we restrict processing of your personal data.
            </li>
            <li>
              <strong>Portability:</strong> Request your data in a structured, machine-readable format.
            </li>
            <li>
              <strong>Objection:</strong> Object to processing based on our legitimate interests.
            </li>
          </ul>
          <p>
            Our legal basis for processing is contract performance (to provide the Service you subscribed to) and
            legitimate interests (security, fraud prevention, service improvement). To exercise your rights, contact
            privacy@drink-ux.com.
          </p>

          <h2>7. CCPA Compliance (California Residents)</h2>
          <p>
            If you are a California resident, you have rights under the California Consumer Privacy Act (CCPA):
          </p>
          <ul>
            <li>
              <strong>Right to Know:</strong> Request disclosure of the categories and specific pieces of personal
              information we have collected about you.
            </li>
            <li>
              <strong>Right to Delete:</strong> Request deletion of your personal information, subject to certain
              exceptions.
            </li>
            <li>
              <strong>Right to Opt-Out:</strong> We do not sell personal information, so this right is not applicable.
            </li>
            <li>
              <strong>Non-Discrimination:</strong> We will not discriminate against you for exercising your CCPA rights.
            </li>
          </ul>
          <p>
            To submit a CCPA request, contact us at privacy@drink-ux.com. We will respond within 45 days.
          </p>

          <h2>8. Cookies and Tracking</h2>
          <p>
            We use essential cookies and local storage to maintain your session and app preferences. We may use analytics
            cookies to understand usage patterns. You can control cookies through your browser settings, but disabling
            essential cookies may affect Service functionality.
          </p>

          <h2>9. Children's Privacy</h2>
          <p>
            The Service is not directed to children under 13. We do not knowingly collect personal information from
            children under 13. If we become aware that we have collected such information, we will delete it promptly.
          </p>

          <h2>10. Changes to This Privacy Policy</h2>
          <p>
            We may update this Privacy Policy from time to time. We will notify you of material changes by email or by
            posting a notice in the Service at least 14 days before the changes take effect. Your continued use of the
            Service after changes take effect constitutes acceptance of the updated policy.
          </p>

          <h2>11. Contact for Privacy Requests</h2>
          <p>For privacy inquiries, data requests, or to exercise your rights, contact us at:</p>
          <address>
            SkibbySoft — Privacy Team<br />
            Email: privacy@drink-ux.com<br />
            Support: support@drink-ux.com
          </address>
          <p>
            We aim to respond to all privacy inquiries within 30 days. For urgent matters, please include "URGENT" in
            your subject line.
          </p>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default PrivacyPolicy;
