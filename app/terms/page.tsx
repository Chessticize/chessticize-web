"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function TermsOfService() {
  const effectiveDate = "January 1, 2024"
  const lastUpdated = "8/10/2025"

  const scrollToSection = (sectionId: string) => {
    document.getElementById(sectionId)?.scrollIntoView({ behavior: 'smooth' })
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-5xl mx-auto">
        <div className="mb-8">
          <Link
            href="/auth"
            className="inline-flex items-center text-orange-600 hover:text-orange-700 font-medium transition-colors"
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Sign In
          </Link>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Table of Contents - Desktop Sidebar */}
          <div className="lg:col-span-1">
            <Card className="sticky top-8">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg text-orange-600">Table of Contents</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                <nav className="space-y-1">
                  {[
                    { id: 'acceptance', title: '1. Acceptance of Terms' },
                    { id: 'description', title: '2. Description of Service' },
                    { id: 'accounts', title: '3. User Accounts' },
                    { id: 'acceptable-use', title: '4. Acceptable Use' },
                    { id: 'prohibited', title: '5. Prohibited Activities' },
                    { id: 'intellectual-property', title: '6. Intellectual Property' },
                    { id: 'privacy', title: '7. Privacy and Data' },
                    { id: 'termination', title: '8. Termination' },
                    { id: 'disclaimers', title: '9. Disclaimers' },
                    { id: 'limitation', title: '10. Limitation of Liability' },
                    { id: 'indemnification', title: '11. Indemnification' },
                    { id: 'governing-law', title: '12. Governing Law' },
                    { id: 'changes', title: '13. Changes to Terms' },
                    { id: 'contact', title: '14. Contact Information' }
                  ].map((item) => (
                    <button
                      key={item.id}
                      onClick={() => scrollToSection(item.id)}
                      className="block w-full text-left text-sm text-gray-600 hover:text-orange-600 py-1 px-2 rounded hover:bg-orange-50 transition-colors"
                    >
                      {item.title}
                    </button>
                  ))}
                </nav>
              </CardContent>
            </Card>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <Card>
              <CardHeader className="border-b border-gray-200">
                <CardTitle className="text-4xl font-bold text-orange-600 mb-2">Terms of Service</CardTitle>
                <div className="space-y-1">
                  <p className="text-gray-600">
                    <strong>Effective Date:</strong> {effectiveDate}
                  </p>
                  <p className="text-gray-600">
                    <strong>Last Updated:</strong> {lastUpdated}
                  </p>
                </div>
              </CardHeader>

              <CardContent className="prose prose-gray max-w-none pt-8">
                <div className="space-y-8">

                  <section id="acceptance" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      1. Acceptance of Terms
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        By accessing, browsing, or using the Chessticize platform ("Service"), whether through our website, mobile application, or any other means, you acknowledge that you have read, understood, and agree to be bound by these Terms of Service ("Terms") and our Privacy Policy.
                      </p>
                      <p>
                        If you do not agree to these Terms, you must not access or use our Service. Your continued use of the Service constitutes your ongoing acceptance of these Terms and any modifications we may make to them.
                      </p>
                      <p>
                        These Terms constitute a legally binding agreement between you and Chessticize. By using our Service, you represent that you are at least 18 years old or have reached the age of majority in your jurisdiction.
                      </p>
                    </div>
                  </section>

                  <section id="description" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      2. Description of Service
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        Chessticize is a comprehensive chess improvement platform that provides:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Interactive chess puzzles and tactical training exercises</li>
                        <li>Game analysis and review tools</li>
                        <li>Integration with popular chess platforms (Chess.com, Lichess)</li>
                        <li>Personalized training recommendations based on your playing history</li>
                        <li>Progress tracking and performance analytics</li>
                        <li>Educational content and chess improvement resources</li>
                      </ul>
                      <p>
                        We reserve the right to modify, suspend, or discontinue any aspect of the Service at any time, with or without notice, though we will make reasonable efforts to notify users of significant changes.
                      </p>
                    </div>
                  </section>

                  <section id="accounts" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      3. User Accounts
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        To access certain features of our Service, you must create an account. When creating an account, you agree to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Provide accurate, current, and complete information</li>
                        <li>Maintain and promptly update your account information</li>
                        <li>Maintain the security and confidentiality of your login credentials</li>
                        <li>Accept responsibility for all activities that occur under your account</li>
                        <li>Notify us immediately of any unauthorized use of your account</li>
                      </ul>
                      <p>
                        You may not create an account using false information, impersonate another person, or create multiple accounts. We reserve the right to refuse service, terminate accounts, or cancel orders at our sole discretion.
                      </p>
                    </div>
                  </section>


                  <section id="acceptable-use" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      4. Acceptable Use
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        You agree to use our Service only for lawful purposes and in accordance with these Terms. You are responsible for ensuring that your use complies with applicable laws and regulations.
                      </p>
                      <p>
                        Acceptable uses include:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Using the platform to improve your chess skills</li>
                        <li>Engaging with educational content and training materials</li>
                        <li>Connecting your chess platform accounts for analysis</li>
                        <li>Participating in community features (when available)</li>
                      </ul>
                    </div>
                  </section>

                  <section id="prohibited" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      5. Prohibited Activities
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        You agree not to engage in any of the following prohibited activities:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Use the Service for any unlawful purpose or in violation of any applicable laws</li>
                        <li>Attempt to gain unauthorized access to our systems, servers, or networks</li>
                        <li>Interfere with, disrupt, or create an undue burden on the Service</li>
                        <li>Share, sell, or transfer your account credentials to others</li>
                        <li>Use automated scripts, bots, or other automated means to access the Service</li>
                        <li>Reverse engineer, decompile, or attempt to extract non-public source code, except to the extent expressly permitted by an applicable open source license or law</li>
                        <li>Upload or transmit viruses, malware, or other malicious code</li>
                        <li>Violate the intellectual property rights of others</li>
                        <li>Harass, abuse, or harm other users</li>
                        <li>Collect or harvest personal information from other users</li>
                      </ul>
                    </div>
                  </section>

                  <section id="intellectual-property" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      6. Intellectual Property Rights
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        Except for software source code that Chessticize publishes under an open source license, the Service and its original content, features, functionality, and all intellectual property rights therein are and will remain the exclusive property of Chessticize and its licensors.
                      </p>
                      <p>
                        Chessticize source code that is published with a GPLv3 license notice is licensed under the GNU General Public License version 3, or any later version, as stated in the repository license file. That open source license governs your rights to copy, modify, and distribute the covered source code.
                      </p>
                      <p>
                        These Terms govern your access to and use of the hosted Chessticize Service. The GPLv3 license does not grant rights to Chessticize trademarks, service marks, logos, hosted accounts, user data, private infrastructure, non-public source code, or service content that is not included in the GPL-covered source distribution.
                      </p>
                      <p>
                        Chessticize retains rights in materials not covered by an open source license, including but not limited to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Hosted service configuration, private infrastructure, and non-public source code</li>
                        <li>Chess puzzles, training materials, and educational content</li>
                        <li>User interface design and user experience</li>
                        <li>Trademarks, service marks, and logos</li>
                        <li>Analysis tools and methodologies</li>
                      </ul>
                      <p>
                        You are granted a limited, non-exclusive, non-transferable license to access and use the hosted Service for your personal, non-commercial use. This hosted-service license does not include any right to resell or make commercial use of the Service, its accounts, hosted infrastructure, or non-GPL-covered contents.
                      </p>
                    </div>
                  </section>

                  <section id="privacy" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      7. Privacy and Data Protection
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        Your privacy is important to us. Our collection, use, and protection of your personal information is governed by our Privacy Policy, which is incorporated into these Terms by reference.
                      </p>
                      <p>
                        By using our Service, you consent to the collection and use of your information as described in our Privacy Policy. We are committed to protecting your data and complying with applicable privacy laws.
                      </p>
                    </div>
                  </section>

                  <section id="termination" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      8. Termination
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        You may terminate your account at any time by emailing support@chessticize.com or using the account deletion features in your account settings (if available).
                      </p>
                      <p>
                        We may terminate or suspend your account and access to the Service immediately, without prior notice or liability, for any reason, including but not limited to:
                      </p>
                      <ul className="list-disc pl-6 space-y-2">
                        <li>Breach of these Terms</li>
                        <li>Violation of applicable laws</li>
                        <li>Fraudulent, abusive, or illegal activity</li>
                        <li>Extended periods of inactivity</li>
                      </ul>
                      <p>
                        Upon termination, your right to use the Service will cease immediately, and we may delete your account and associated data in accordance with our data retention policies.
                      </p>
                    </div>
                  </section>

                  <section id="disclaimers" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      9. Disclaimers
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        THE SERVICE IS PROVIDED ON AN "AS IS" AND "AS AVAILABLE" BASIS. CHESSTICIZE EXPRESSLY DISCLAIMS ALL WARRANTIES OF ANY KIND, WHETHER EXPRESS, IMPLIED, OR STATUTORY, INCLUDING BUT NOT LIMITED TO THE IMPLIED WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE, AND NON-INFRINGEMENT.
                      </p>
                      <p>
                        We make no warranty that the Service will meet your requirements, be available on an uninterrupted, timely, secure, or error-free basis, or be accurate, reliable, free of viruses or other harmful code, complete, legal, or safe.
                      </p>
                    </div>
                  </section>

                  <section id="limitation" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      10. Limitation of Liability
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT SHALL CHESSTICIZE, ITS AFFILIATES, AGENTS, DIRECTORS, EMPLOYEES, SUPPLIERS, OR LICENSORS BE LIABLE FOR ANY INDIRECT, PUNITIVE, INCIDENTAL, SPECIAL, CONSEQUENTIAL, OR EXEMPLARY DAMAGES ARISING OUT OF OR IN CONNECTION WITH THE SERVICE.
                      </p>
                      <p>
                        This includes damages for loss of profits, goodwill, use, data, or other intangible losses, even if we have been advised of the possibility of such damages. Our total liability shall not exceed the amount paid by you for the Service in the twelve (12) months preceding the claim.
                      </p>
                    </div>
                  </section>

                  <section id="indemnification" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      11. Indemnification
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        You agree to defend, indemnify, and hold harmless Chessticize and its affiliates, agents, directors, employees, suppliers, and licensors from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses, or fees arising out of or relating to your violation of these Terms or your use of the Service.
                      </p>
                    </div>
                  </section>

                  <section id="governing-law" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      12. Governing Law and Venue
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        These Terms are governed by the laws of the State of Washington, without regard to conflict of law principles. You agree to the exclusive jurisdiction and venue of the state and federal courts located in Bellevue, Washington for any disputes arising out of or relating to these Terms or the Service.
                      </p>
                      <p>
                        Small claims actions may be brought in your local small claims court if the claim qualifies. To keep things simple and low-cost, you and Chessticize agree to resolve disputes on an individual basis (no class actions).
                      </p>
                    </div>
                  </section>

                  <section id="changes" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      13. Changes to Terms
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        We reserve the right to modify or replace these Terms at any time at our sole discretion. If a revision is material, we will make reasonable efforts to provide at least 30 days' notice prior to any new terms taking effect.
                      </p>
                      <p>
                        We will notify you of material changes via email or through a prominent notice on our Service. Your continued use of the Service after such modifications constitutes your acceptance of the updated Terms.
                      </p>
                    </div>
                  </section>

                  <section id="contact" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      14. Contact Information
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        If you have any questions about these Terms of Service, please contact us:
                      </p>
                      <div className="bg-gray-50 p-4 rounded-lg">
                        <p><strong>Email:</strong> support@chessticize.com</p>
                      </div>
                      <p className="text-sm text-gray-600">
                        We will respond to your inquiries within 5 business days.
                      </p>
                    </div>
                  </section>

                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}
