import React, { useState } from 'react';
import { Shield, Trash2, CheckCircle2, ArrowLeft, Lock, Mail, AlertCircle } from 'lucide-react';

interface LegalContentProps {
  initialTab?: 'privacy' | 'deletion';
  onBack?: () => void;
}

export const LegalContent: React.FC<LegalContentProps> = ({ initialTab = 'privacy', onBack }) => {
  const [activeTab, setActiveTab] = useState<'privacy' | 'deletion'>(initialTab);
  const [deletionEmail, setDeletionEmail] = useState('');
  const [deletionSubmitted, setDeletionSubmitted] = useState(false);

  const handleDeletionRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!deletionEmail.trim()) return;
    setDeletionSubmitted(true);
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-xl bg-slate-900 border border-slate-800 hover:bg-slate-800 text-slate-300 hover:text-white transition-colors"
                title="Go Back"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>
            )}
            <div>
              <h1 className="text-xl sm:text-2xl font-extrabold text-white tracking-tight">
                SwiftSweeps Compliance &amp; Legal Center
              </h1>
              <p className="text-xs text-slate-400">
                Official Privacy Policy and User Data Deletion Guidelines for Meta &amp; Platform Services
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 bg-slate-900 p-1 rounded-xl border border-slate-800 text-xs">
            <button
              onClick={() => setActiveTab('privacy')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === 'privacy'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Privacy Policy
            </button>
            <button
              onClick={() => setActiveTab('deletion')}
              className={`px-3 py-1.5 rounded-lg font-semibold transition-colors ${
                activeTab === 'deletion'
                  ? 'bg-indigo-600 text-white shadow'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              Data Deletion
            </button>
          </div>
        </div>

        {/* PRIVACY POLICY TAB */}
        {activeTab === 'privacy' && (
          <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 text-indigo-400">
              <Shield className="w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold text-white">Privacy Policy</h2>
                <p className="text-xs text-slate-400">Last updated: October 11, 2026</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">1. Introduction</h3>
                <p>
                  Welcome to SwiftSweeps ("we," "our," or "us"). We respect your privacy and are committed to protecting your personal data. This privacy policy informs you how we look after your personal data when you visit our gaming top-up, wallet, and support platform and tells you about your privacy rights and how the law protects you.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">2. Information We Collect</h3>
                <p>We may collect, use, store and transfer different kinds of personal data about you which we have grouped together as follows:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li><strong>Identity Data:</strong> Includes first name, last name, username or gamer tag identifier.</li>
                  <li><strong>Contact Data:</strong> Includes email address, telephone numbers, and communication logs with customer support.</li>
                  <li><strong>Financial Data:</strong> Includes wallet balances, transaction history, top-up receipts, and withdrawal addresses.</li>
                  <li><strong>Technical Data:</strong> Includes internet protocol (IP) address, browser type and version, time zone setting, operating system and platform on devices used to access our platform.</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">3. How We Use Your Information</h3>
                <p>We will only use your personal data when the law allows us to. Most commonly, we will use your personal data in the following circumstances:</p>
                <ul className="list-disc pl-5 space-y-1 text-slate-300">
                  <li>To register you as a new user and manage your gaming wallet.</li>
                  <li>To process and deliver your game top-ups and withdrawal requests.</li>
                  <li>To manage our relationship with you, including customer support and dispute resolution.</li>
                  <li>To administer and protect our platform (including troubleshooting, data analysis, and system testing).</li>
                </ul>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">4. Account Security &amp; Credentials</h3>
                <p>
                  Your account credentials (email and password) are protected by secure authentication protocols. We do not sell your personal data or share private information with external marketing services.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">5. Data Security</h3>
                <p>
                  We have put in place appropriate security measures to prevent your personal data from being accidentally lost, used, or accessed in an unauthorized way. All sensitive data is transmitted securely via SSL encryption and stored in secure Firebase Firestore databases with strict access controls.
                </p>
              </section>

              <section className="space-y-2">
                <h3 className="font-bold text-white text-base">6. Contact Us</h3>
                <p>
                  If you have any questions about this privacy policy or our privacy practices, please contact our Data Protection Officer at privacy@swiftsweeps.com or via our 24/7 customer support chat.
                </p>
              </section>
            </div>
          </div>
        )}

        {/* DATA DELETION TAB */}
        {activeTab === 'deletion' && (
          <div className="space-y-6 bg-slate-900/60 border border-slate-800/80 rounded-3xl p-6 sm:p-8 shadow-xl">
            <div className="flex items-center gap-3 text-rose-400">
              <Trash2 className="w-7 h-7" />
              <div>
                <h2 className="text-lg font-bold text-white">User Data Deletion Instructions</h2>
                <p className="text-xs text-slate-400">Compliance with Meta Platform Terms &amp; GDPR Right to Erasure</p>
              </div>
            </div>

            <div className="space-y-4 text-xs sm:text-sm text-slate-300 leading-relaxed">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2">
                <h3 className="font-bold text-white">How to Request Deletion of Your Account and Data</h3>
                <p>
                  In accordance with Facebook Platform policies and data privacy regulations, you have the right to request the complete deletion of your account and associated personal data from SwiftSweeps.
                </p>
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-white">Method 1: Direct In-App Deletion Request</h4>
                <p className="text-xs text-slate-400">
                  Enter your registered account email or phone number below to instantly trigger a data erasure ticket with our compliance team. All profile data, wallet ledger records, and connected game accounts will be permanently purged within 48 hours.
                </p>

                {deletionSubmitted ? (
                  <div className="p-5 rounded-2xl bg-emerald-950/40 border border-emerald-800/60 flex items-center gap-3 text-emerald-300">
                    <CheckCircle2 className="w-6 h-6 shrink-0" />
                    <div>
                      <div className="font-bold">Data Deletion Request Received</div>
                      <div className="text-xs text-emerald-400/90 mt-0.5">
                        Confirmation ticket generated for <strong>{deletionEmail}</strong>. Your data will be fully deleted within 48 hours.
                      </div>
                    </div>
                  </div>
                ) : (
                  <form onSubmit={handleDeletionRequest} className="flex flex-col sm:flex-row gap-3">
                    <input
                      type="email"
                      required
                      placeholder="Enter your registered account email..."
                      value={deletionEmail}
                      onChange={(e) => setDeletionEmail(e.target.value)}
                      className="flex-1 px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500 text-xs"
                    />
                    <button
                      type="submit"
                      className="px-5 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs whitespace-nowrap transition-colors flex items-center justify-center gap-2"
                    >
                      <Trash2 className="w-4 h-4" />
                      Request Data Deletion
                    </button>
                  </form>
                )}
              </div>

              <div className="space-y-3 pt-4 border-t border-slate-800">
                <h4 className="font-semibold text-white">Method 2: Remove App via Facebook Settings</h4>
                <p className="text-xs text-slate-400">
                  You can also remove SwiftSweeps from your Facebook account and request data deletion directly through Facebook:
                </p>
                <ol className="list-decimal pl-5 space-y-1 text-slate-300 text-xs">
                  <div>1. Go to your Facebook Account's <strong>Settings &amp; Privacy</strong> &gt; <strong>Settings</strong>.</div>
                  <div>2. Scroll down and click on <strong>Apps and Websites</strong>.</div>
                  <div>3. Locate <strong>SwiftSweeps</strong> in the list of active or expired apps.</div>
                  <div>4. Click <strong>Remove</strong> to revoke access and trigger automated data removal.</div>
                </ol>
              </div>

              <div className="p-4 rounded-2xl bg-indigo-950/30 border border-indigo-900/50 flex items-start gap-3 text-xs text-slate-300">
                <AlertCircle className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
                <div>
                  <div className="font-semibold text-white">Automated Facebook Callback URL</div>
                  <div className="text-slate-400 mt-0.5">
                    For Meta developers reviewing this app, our endpoint for data deletion callback is: <code className="text-indigo-300">https://ais-dev-z7ycubaw6ioqcdgqzu2qkl-342377552686.asia-southeast1.run.app/#data-deletion</code>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
