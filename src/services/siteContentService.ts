import { db } from '@/lib/firebase/config';
import { doc, getDoc, setDoc, serverTimestamp, type Timestamp } from 'firebase/firestore';

const PRIVACY_POLICY_DOC_PATH = 'siteContent/privacyPolicy';
const DATA_DELETION_POLICY_DOC_PATH = 'siteContent/dataDeletionPolicy';
const TERMS_AND_CONDITIONS_DOC_PATH = 'siteContent/termsAndConditions';

interface SiteContentData {
  content: string;
  updatedAt?: Timestamp | Date;
}

const DEFAULT_PRIVACY_POLICY = `<h2>Privacy Policy</h2>
<p><strong>Last updated:</strong> February 2026</p>

<p>GuernseySpeaks ("we", "our", or "us") operates the GuernseySpeaks community forum. This Privacy Policy explains how we collect, use, and protect your personal information when you use our platform.</p>

<h3>1. Information We Collect</h3>
<p><strong>Account Information:</strong> When you register, we collect your name, email address, and profile picture (if provided). If you sign in with Google or Facebook, we receive basic profile information from those services.</p>
<p><strong>User Content:</strong> Posts, comments, messages, and any images you upload to the platform.</p>
<p><strong>Usage Data:</strong> We automatically collect information about how you interact with the platform, including pages visited, features used, and timestamps.</p>
<p><strong>Device Information:</strong> Browser type, operating system, and IP address for security and analytics purposes.</p>

<h3>2. How We Use Your Information</h3>
<ul>
  <li>To provide and maintain the GuernseySpeaks platform</li>
  <li>To display your public profile and content to other users</li>
  <li>To send notifications about activity related to your account (replies, messages, etc.)</li>
  <li>To moderate content and enforce our community guidelines</li>
  <li>To improve the platform and fix technical issues</li>
  <li>To display relevant advertisements</li>
</ul>

<h3>3. Information Sharing</h3>
<p>We do not sell your personal information. We may share information in the following circumstances:</p>
<ul>
  <li><strong>Public Content:</strong> Your posts, comments, display name, and profile picture are visible to all users.</li>
  <li><strong>Private Messages:</strong> Only visible to you and the recipient.</li>
  <li><strong>Service Providers:</strong> We use Firebase (Google) for authentication, database, and file storage. Their privacy policies apply to data processed through their services.</li>
  <li><strong>Legal Requirements:</strong> We may disclose information if required by law or to protect the rights and safety of our users and the platform.</li>
</ul>

<h3>4. Data Storage and Security</h3>
<p>Your data is stored securely using Google Firebase infrastructure. We use industry-standard security measures including encrypted connections (HTTPS), secure authentication, and access controls. However, no method of electronic storage is 100% secure.</p>

<h3>5. Cookies and Local Storage</h3>
<p>We use cookies and browser local storage for authentication sessions and user preferences (such as theme settings). These are essential for the platform to function and cannot be opted out of while using the service.</p>

<h3>6. Your Rights</h3>
<p>You have the right to:</p>
<ul>
  <li>Access your personal data through your profile page</li>
  <li>Update or correct your information at any time</li>
  <li>Delete your account and associated data (see our <a href="/data-deletion">Data Deletion Policy</a>)</li>
  <li>Export your data by contacting us</li>
</ul>

<h3>7. Children’s Privacy</h3>
<p>GuernseySpeaks is not intended for users under the age of 13. We do not knowingly collect personal information from children under 13.</p>

<h3>8. Changes to This Policy</h3>
<p>We may update this Privacy Policy from time to time. We will notify users of significant changes through the platform. Continued use of GuernseySpeaks after changes constitutes acceptance of the updated policy.</p>

<h3>9. Guernsey Data Protection</h3>
<p>As a platform serving the Guernsey community, we comply with the Data Protection (Bailiwick of Guernsey) Law, 2017. The Office of the Data Protection Authority (ODPA) oversees data protection in Guernsey.</p>

<h3>10. Contact Us</h3>
<p>If you have questions about this Privacy Policy or your personal data, please contact us at <a href="mailto:hello@guernseyspeaks.com">hello@guernseyspeaks.com</a>.</p>`;

const DEFAULT_DATA_DELETION_POLICY = `<h2>Data Deletion Policy</h2>
<p><strong>Last updated:</strong> February 2026</p>

<p>At GuernseySpeaks, we respect your right to control your personal data. This page explains how you can request the deletion of your account and associated data.</p>

<h3>What Data We Store</h3>
<p>When you use GuernseySpeaks, we store the following data associated with your account:</p>
<ul>
  <li><strong>Account details:</strong> Name, email address, profile picture, bio</li>
  <li><strong>Content:</strong> Posts, comments, and uploaded images</li>
  <li><strong>Activity:</strong> Votes, saved posts, and bookmarks</li>
  <li><strong>Messages:</strong> Private conversations with other users</li>
  <li><strong>Preferences:</strong> Notification settings and theme preferences</li>
</ul>

<h3>How to Request Data Deletion</h3>
<p>To request complete deletion of your account and all associated data, please email us at:</p>
<p style="text-align: center; margin: 1.5em 0;">
  <a href="mailto:hello@guernseyspeaks.com?subject=Data%20Deletion%20Request" style="font-weight: bold;">
    hello@guernseyspeaks.com
  </a>
</p>

<p>In your email, please include:</p>
<ol>
  <li>Your <strong>display name</strong> on GuernseySpeaks</li>
  <li>The <strong>email address</strong> associated with your account</li>
  <li>A clear statement that you wish to have your data deleted</li>
</ol>

<h3>What Happens After Your Request</h3>
<ul>
  <li><strong>Within 48 hours:</strong> We will acknowledge your request via email</li>
  <li><strong>Within 30 days:</strong> All your personal data will be permanently removed from our systems</li>
  <li><strong>Confirmation:</strong> You will receive an email once the deletion is complete</li>
</ul>

<h3>What Gets Deleted</h3>
<p>Upon processing your request, we will permanently delete:</p>
<ul>
  <li>Your user account and profile information</li>
  <li>All posts and comments you have authored</li>
  <li>All images you have uploaded</li>
  <li>Your private messages</li>
  <li>Your saved posts and voting history</li>
  <li>Your notification history</li>
</ul>

<h3>What We May Retain</h3>
<p>In certain cases, we may retain minimal anonymised data:</p>
<ul>
  <li><strong>Aggregated statistics:</strong> Anonymous, non-identifiable usage statistics</li>
  <li><strong>Legal obligations:</strong> Data required to comply with legal obligations or resolve disputes</li>
  <li><strong>Moderation records:</strong> Records of content moderation actions may be retained in anonymised form for platform safety</li>
</ul>

<h3>Facebook and Google Login Users</h3>
<p>If you signed up using Facebook or Google, deleting your GuernseySpeaks account does not affect your Facebook or Google account. To revoke GuernseySpeaks’ access to your social account:</p>
<ul>
  <li><strong>Facebook:</strong> Go to Settings &gt; Apps and Websites &gt; Remove GuernseySpeaks</li>
  <li><strong>Google:</strong> Go to myaccount.google.com &gt; Security &gt; Third-party apps &gt; Remove GuernseySpeaks</li>
</ul>

<h3>Your Rights Under Guernsey Law</h3>
<p>Under the Data Protection (Bailiwick of Guernsey) Law, 2017, you have the right to request access to, correction of, or deletion of your personal data. If you believe your data protection rights have not been respected, you may contact the <strong>Office of the Data Protection Authority (ODPA)</strong> at <a href="https://www.odpa.gg">www.odpa.gg</a>.</p>

<h3>Contact</h3>
<p>For any questions about data deletion or your privacy, please contact us at <a href="mailto:hello@guernseyspeaks.com">hello@guernseyspeaks.com</a>.</p>`;

const DEFAULT_TERMS_AND_CONDITIONS = `<h2>Terms and Conditions</h2>
<p><strong>Last updated:</strong> February 2026</p>

<p>Welcome to GuernseySpeaks. By accessing or using our platform, you agree to be bound by these Terms and Conditions.</p>

<h3>1. Acceptance of Terms</h3>
<p>By creating an account or using GuernseySpeaks, you agree to these terms. If you do not agree, please do not use the platform.</p>

<h3>2. Eligibility</h3>
<p>You must be at least 13 years old to use GuernseySpeaks. By using the platform, you represent that you meet this requirement.</p>

<h3>3. Your Account</h3>
<p>You are responsible for maintaining the security of your account and all activity that occurs under it. You agree to:</p>
<ul>
  <li>Provide accurate information when registering</li>
  <li>Keep your login credentials secure</li>
  <li>Notify us immediately of any unauthorised access</li>
  <li>Not create multiple accounts for deceptive purposes</li>
</ul>

<h3>4. Community Guidelines</h3>
<p>When using GuernseySpeaks, you agree to:</p>
<ul>
  <li>Treat other users with respect and courtesy</li>
  <li>Not post content that is defamatory, harassing, threatening, or discriminatory</li>
  <li>Not share personal information of others without their consent</li>
  <li>Not post spam, advertisements, or promotional content without permission</li>
  <li>Not impersonate other users or public figures</li>
  <li>Not upload malicious content, viruses, or harmful code</li>
  <li>Comply with all applicable laws, including Guernsey defamation law</li>
</ul>

<h3>5. Content You Post</h3>
<p>You retain ownership of the content you post on GuernseySpeaks. By posting, you grant us a non-exclusive, royalty-free licence to display, distribute, and store your content as part of operating the platform.</p>
<p>You are solely responsible for the content you post. We do not endorse or verify user-generated content.</p>

<h3>6. Content Moderation</h3>
<p>We reserve the right to:</p>
<ul>
  <li>Remove or hide content that violates these terms or our community guidelines</li>
  <li>Suspend or ban accounts that repeatedly violate our policies</li>
  <li>Moderate content at our discretion to maintain a safe community environment</li>
</ul>
<p>Moderators and administrators act in good faith to enforce these guidelines.</p>

<h3>7. Intellectual Property</h3>
<p>The GuernseySpeaks platform, including its design, logo, and features, is our intellectual property. You may not copy, modify, or distribute any part of the platform without permission.</p>

<h3>8. Privacy</h3>
<p>Your use of GuernseySpeaks is also governed by our <a href="/privacy-policy">Privacy Policy</a>. Please review it to understand how we collect and use your data.</p>

<h3>9. Advertisements</h3>
<p>GuernseySpeaks may display advertisements to support the platform. We are not responsible for the content of third-party advertisements or the products and services they promote.</p>

<h3>10. Disclaimers</h3>
<p>GuernseySpeaks is provided "as is" without warranties of any kind. We do not guarantee that:</p>
<ul>
  <li>The platform will be available at all times without interruption</li>
  <li>Content posted by users is accurate, reliable, or appropriate</li>
  <li>The platform is free from errors or security vulnerabilities</li>
</ul>

<h3>11. Limitation of Liability</h3>
<p>To the fullest extent permitted by law, GuernseySpeaks and its operators shall not be liable for any indirect, incidental, or consequential damages arising from your use of the platform.</p>

<h3>12. Termination</h3>
<p>We may suspend or terminate your access to GuernseySpeaks at any time, with or without notice, for conduct that we believe violates these terms or is harmful to the community.</p>

<h3>13. Governing Law</h3>
<p>These terms are governed by the laws of the Bailiwick of Guernsey. Any disputes shall be subject to the jurisdiction of the courts of Guernsey.</p>

<h3>14. Changes to These Terms</h3>
<p>We may update these Terms and Conditions from time to time. Continued use of the platform after changes are posted constitutes acceptance of the updated terms.</p>

<h3>15. Contact Us</h3>
<p>If you have questions about these Terms and Conditions, please contact us at <a href="mailto:hello@guernseyspeaks.com">hello@guernseyspeaks.com</a>.</p>`;

/**
 * Fetches the privacy policy content from Firestore.
 * @returns The privacy policy content as a string, or a default message if not found.
 */
export async function getPrivacyPolicy(): Promise<string> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SiteContentData;
      const content = data.content || '';
      if (!content || content === 'Privacy Policy content has not been set yet.' || content === 'Privacy Policy') {
        return DEFAULT_PRIVACY_POLICY;
      }
      return content;
    } else {
      return DEFAULT_PRIVACY_POLICY;
    }
  } catch (error) {
    console.error('Error fetching privacy policy:', error);
    // Firestore rules may block reads — return default content instead of an error
    return DEFAULT_PRIVACY_POLICY;
  }
}

/**
 * Updates the privacy policy content in Firestore.
 * @param newContent The new privacy policy content.
 */
export async function updatePrivacyPolicy(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, PRIVACY_POLICY_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating privacy policy:', error);
    throw new Error('Failed to update privacy policy.');
  }
}

/**
 * Fetches the data deletion policy content from Firestore.
 * @returns The data deletion policy content as a string, or a default message if not found.
 */
export async function getDataDeletionPolicy(): Promise<string> {
  try {
    const docRef = doc(db, DATA_DELETION_POLICY_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SiteContentData;
      const content = data.content || '';
      if (!content || content.includes('privacy@example.com') || content === '<p>Failed to load content.</p>') {
        return DEFAULT_DATA_DELETION_POLICY;
      }
      return content;
    } else {
      return DEFAULT_DATA_DELETION_POLICY;
    }
  } catch (error) {
    console.error('Error fetching data deletion policy:', error);
    return DEFAULT_DATA_DELETION_POLICY;
  }
}

/**
 * Updates the data deletion policy content in Firestore.
 * @param newContent The new data deletion policy content.
 */
export async function updateDataDeletionPolicy(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, DATA_DELETION_POLICY_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating data deletion policy:', error);
    throw new Error('Failed to update data deletion policy.');
  }
}

/**
 * Fetches the terms and conditions content from Firestore.
 * @returns The terms and conditions content as a string, or a default message if not found.
 */
export async function getTermsAndConditions(): Promise<string> {
  try {
    const docRef = doc(db, TERMS_AND_CONDITIONS_DOC_PATH);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      const data = docSnap.data() as SiteContentData;
      const content = data.content || '';
      if (!content || content === 'Terms and Conditions content has not been set yet.' || content === 'Terms and Conditions') {
        return DEFAULT_TERMS_AND_CONDITIONS;
      }
      return content;
    } else {
      return DEFAULT_TERMS_AND_CONDITIONS;
    }
  } catch (error) {
    console.error('Error fetching terms and conditions:', error);
    return DEFAULT_TERMS_AND_CONDITIONS;
  }
}

/**
 * Updates the terms and conditions content in Firestore.
 * @param newContent The new terms and conditions content.
 */
export async function updateTermsAndConditions(newContent: string): Promise<void> {
  try {
    const docRef = doc(db, TERMS_AND_CONDITIONS_DOC_PATH);
    await setDoc(docRef, {
      content: newContent,
      updatedAt: serverTimestamp(),
    }, { merge: true });
  } catch (error) {
    console.error('Error updating terms and conditions:', error);
    throw new Error('Failed to update terms and conditions.');
  }
}
