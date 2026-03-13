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

const TermsOfService: React.FC = () => {
  return (
    <IonPage>
      <IonHeader>
        <IonToolbar>
          <IonButtons slot="start">
            <IonBackButton defaultHref="/" />
          </IonButtons>
          <IonTitle>Terms of Service</IonTitle>
        </IonToolbar>
      </IonHeader>
      <IonContent className="legal-page">
        <div className="legal-content">
          <h1>Terms of Service</h1>
          <p className="legal-effective">Effective Date: March 12, 2026</p>
          <p className="legal-company">
            These Terms of Service ("Terms") govern your use of the Drink-UX platform ("Service"), operated by SkibbySoft
            ("Company," "we," "us," or "our").
          </p>

          <h2>1. Service Description and Acceptable Use</h2>
          <p>
            Drink-UX is a drink ordering and customization platform that integrates with Square point-of-sale systems to
            provide coffee shops and beverage businesses a premium customer ordering experience.
          </p>
          <p>You may use the Service to:</p>
          <ul>
            <li>Browse and customize drink orders at participating businesses</li>
            <li>Submit orders through the platform for processing via Square POS</li>
            <li>Manage business menus, pricing, and order flows (business subscribers)</li>
          </ul>
          <p>You may not use the Service to:</p>
          <ul>
            <li>Submit fraudulent, false, or unauthorized orders</li>
            <li>Interfere with or disrupt the platform or connected Square integrations</li>
            <li>Attempt to access accounts, data, or systems you are not authorized to access</li>
            <li>Reverse engineer, copy, or redistribute any portion of the Service</li>
            <li>Use automated scripts or bots to interact with the platform</li>
          </ul>

          <h2>2. Subscription Terms</h2>
          <h3>Billing</h3>
          <p>
            Business subscriptions are billed on a monthly or annual basis, as selected at signup. Subscription fees are
            charged in advance at the start of each billing period. All prices are in USD unless otherwise stated.
          </p>
          <h3>Cancellation</h3>
          <p>
            You may cancel your subscription at any time from your account settings. Cancellation takes effect at the end
            of your current billing period. You will retain access to the Service through the end of the paid period.
          </p>
          <h3>Refunds</h3>
          <p>
            Subscription fees are non-refundable except where required by applicable law. If you believe you were charged
            in error, contact us at support@drink-ux.com within 30 days of the charge and we will review your request.
          </p>
          <h3>Free Trials and Founding Pricing</h3>
          <p>
            If you sign up during a promotional period with founding pricing or a free trial, those terms apply for the
            stated duration. At the end of the promotional period, your subscription will automatically renew at the
            standard rate unless you cancel.
          </p>

          <h2>3. Data Usage and Retention Policy</h2>
          <p>
            We collect and process data as described in our{' '}
            <a href="/privacy">Privacy Policy</a>. Key data practices:
          </p>
          <ul>
            <li>
              <strong>Order data</strong> is retained for 2 years to support reporting, disputes, and compliance
              requirements.
            </li>
            <li>
              <strong>Account data</strong> is retained for the duration of your subscription plus 90 days after
              cancellation, after which it is permanently deleted upon request.
            </li>
            <li>
              <strong>Square OAuth tokens</strong> are stored securely and used solely to process orders and sync menu
              data. We do not retain them after you disconnect your Square account.
            </li>
          </ul>

          <h2>4. Limitation of Liability</h2>
          <p>
            THE SERVICE IS PROVIDED "AS IS" WITHOUT WARRANTIES OF ANY KIND, EXPRESS OR IMPLIED. TO THE MAXIMUM EXTENT
            PERMITTED BY APPLICABLE LAW, SKIBBYSOFT SHALL NOT BE LIABLE FOR ANY INDIRECT, INCIDENTAL, SPECIAL,
            CONSEQUENTIAL, OR PUNITIVE DAMAGES, INCLUDING BUT NOT LIMITED TO LOSS OF PROFITS, REVENUE, DATA, GOODWILL,
            OR OTHER INTANGIBLE LOSSES, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGES.
          </p>
          <p>
            OUR TOTAL LIABILITY TO YOU FOR ANY CLAIMS ARISING OUT OF OR RELATING TO THESE TERMS OR YOUR USE OF THE
            SERVICE SHALL NOT EXCEED THE GREATER OF (A) THE AMOUNT YOU PAID US IN THE 12 MONTHS PRECEDING THE CLAIM OR
            (B) $100 USD.
          </p>
          <p>
            Some jurisdictions do not allow the exclusion of certain warranties or limitations of liability. In those
            jurisdictions, our liability is limited to the fullest extent permitted by law.
          </p>

          <h2>5. Square Partnership and Third-Party Services</h2>
          <p>
            Drink-UX integrates with Square, Inc. ("Square") to process payments and sync point-of-sale data. By using
            the Service, you acknowledge that:
          </p>
          <ul>
            <li>
              Payment processing is handled by Square and subject to{' '}
              <a href="https://squareup.com/us/en/legal/general/ua" target="_blank" rel="noopener noreferrer">
                Square's Terms of Service
              </a>
              .
            </li>
            <li>
              SkibbySoft is not responsible for Square service outages, payment processing errors, or changes to
              Square's API or policies.
            </li>
            <li>
              You are responsible for maintaining a valid Square account and ensuring your Square credentials remain
              active.
            </li>
          </ul>
          <p>
            We may also use third-party services for analytics, error monitoring, and infrastructure. These services are
            bound by their own terms and privacy policies.
          </p>

          <h2>6. Intellectual Property</h2>
          <p>
            The Service and its original content, features, and functionality are and will remain the exclusive property
            of SkibbySoft. You retain all rights to your business data, menu content, and customer order data.
          </p>
          <p>
            By using the Service, you grant us a limited, non-exclusive license to use your business name and logo solely
            for the purpose of providing the Service (e.g., displaying your branding in the customer ordering interface).
          </p>

          <h2>7. Account Responsibility</h2>
          <p>
            You are responsible for maintaining the confidentiality of your account credentials and for all activity
            that occurs under your account. Notify us immediately at support@drink-ux.com if you suspect unauthorized
            access.
          </p>

          <h2>8. Modifications to Terms</h2>
          <p>
            We reserve the right to modify these Terms at any time. We will notify you of material changes by email or
            by posting a notice in the Service at least 14 days before the changes take effect. Continued use of the
            Service after changes take effect constitutes acceptance of the new Terms.
          </p>

          <h2>9. Governing Law</h2>
          <p>
            These Terms shall be governed by and construed in accordance with the laws of the State of California,
            without regard to its conflict of law provisions. Any disputes arising under these Terms shall be resolved
            in the state or federal courts located in San Francisco County, California, and you consent to the exclusive
            jurisdiction of those courts.
          </p>

          <h2>10. Contact</h2>
          <p>For questions about these Terms, contact us at:</p>
          <address>
            SkibbySoft<br />
            Email: legal@drink-ux.com<br />
            Support: support@drink-ux.com
          </address>
        </div>
      </IonContent>
    </IonPage>
  );
};

export default TermsOfService;
