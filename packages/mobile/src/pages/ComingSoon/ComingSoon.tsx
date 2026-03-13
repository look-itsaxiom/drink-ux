/**
 * ComingSoon Page
 *
 * Displays a coming soon message for non-subscribed or suspended businesses.
 * Shows business branding, contact information, and social media links.
 */

import React from 'react';
import { IonPage, IonContent, IonIcon } from '@ionic/react';
import {
  timeOutline,
  mailOutline,
  callOutline,
  logoFacebook,
  logoInstagram,
  logoTwitter,
  alertCircleOutline,
} from 'ionicons/icons';
import './ComingSoon.css';

/**
 * Social media links configuration
 */
export interface SocialLinks {
  facebook?: string;
  instagram?: string;
  twitter?: string;
}

/**
 * Props for ComingSoon page
 */
export interface ComingSoonProps {
  /** Business name to display */
  businessName?: string;
  /** Business logo URL */
  logoUrl?: string;
  /** Custom description message */
  description?: string;
  /** Contact email */
  contactEmail?: string;
  /** Contact phone number */
  contactPhone?: string;
  /** Social media links */
  socialLinks?: SocialLinks;
  /** Primary brand color */
  primaryColor?: string;
  /** Whether the business is suspended (vs coming soon) */
  isSuspended?: boolean;
  /** Additional content to render */
  children?: React.ReactNode;
}

/**
 * ComingSoon page component
 */
export function ComingSoon({
  businessName,
  logoUrl,
  description,
  contactEmail,
  contactPhone,
  socialLinks,
  primaryColor,
  isSuspended = false,
  children,
}: ComingSoonProps): React.ReactElement {
  const hasContactInfo = contactEmail || contactPhone;
  const hasSocialLinks =
    socialLinks?.facebook || socialLinks?.instagram || socialLinks?.twitter;

  // Determine title and message based on state
  const title = isSuspended ? 'Temporarily Unavailable' : 'Coming Soon';
  const defaultDescription = isSuspended
    ? "We're temporarily unavailable. Please contact us to reactivate your experience."
    : "We're working on something amazing. Stay tuned!";

  // Build inline styles for custom theming
  const containerStyle: React.CSSProperties = primaryColor
    ? { '--coming-soon-primary': primaryColor } as React.CSSProperties
    : {};

  return (
    <IonPage>
      <IonContent fullscreen>
        <div
          className="coming-soon"
          role="main"
          style={containerStyle}
        >
          {/* Logo */}
          {logoUrl && (
            <div className="coming-soon-logo">
              <img
                src={logoUrl}
                alt={`${businessName || 'Business'} logo`}
                className="coming-soon-logo-image"
              />
            </div>
          )}

          {/* Business Name */}
          {businessName && (
            <h2 className="coming-soon-business-name">{businessName}</h2>
          )}

          {/* Icon */}
          <div className="coming-soon-icon">
            <IonIcon icon={isSuspended ? alertCircleOutline : timeOutline} />
          </div>

          {/* Title */}
          <h1 className="coming-soon-title">{title}</h1>

          {/* Description */}
          <p className="coming-soon-description">
            {description || defaultDescription}
          </p>

          {/* Suspended-specific message */}
          {isSuspended && (
            <p className="coming-soon-suspended-message">
              Please contact the business owner to reactivate this storefront.
            </p>
          )}

          {/* Contact Information */}
          {hasContactInfo && (
            <div className="coming-soon-contact">
              <h3 className="coming-soon-section-title">Contact Us</h3>
              {contactEmail && (
                <a
                  href={`mailto:${contactEmail}`}
                  className="coming-soon-contact-item"
                >
                  <IonIcon icon={mailOutline} />
                  <span>{contactEmail}</span>
                </a>
              )}
              {contactPhone && (
                <a
                  href={`tel:${contactPhone}`}
                  className="coming-soon-contact-item"
                >
                  <IonIcon icon={callOutline} />
                  <span>{contactPhone}</span>
                </a>
              )}
            </div>
          )}

          {/* Social Media Links */}
          {hasSocialLinks && (
            <div className="coming-soon-social">
              <h3 className="coming-soon-section-title">Follow Us</h3>
              <div className="coming-soon-social-links">
                {socialLinks?.facebook && (
                  <a
                    href={socialLinks.facebook}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Facebook"
                    className="coming-soon-social-link"
                  >
                    <IonIcon icon={logoFacebook} />
                  </a>
                )}
                {socialLinks?.instagram && (
                  <a
                    href={socialLinks.instagram}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Instagram"
                    className="coming-soon-social-link"
                  >
                    <IonIcon icon={logoInstagram} />
                  </a>
                )}
                {socialLinks?.twitter && (
                  <a
                    href={socialLinks.twitter}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Twitter"
                    className="coming-soon-social-link"
                  >
                    <IonIcon icon={logoTwitter} />
                  </a>
                )}
              </div>
            </div>
          )}

          {/* Custom children content */}
          {children && <div className="coming-soon-children">{children}</div>}
        </div>
      </IonContent>
    </IonPage>
  );
}

export default ComingSoon;
