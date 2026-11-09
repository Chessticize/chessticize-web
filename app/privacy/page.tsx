"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"

export default function PrivacyPolicy() {
  const effectiveDate = "January 1, 2024"

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
                    { id: 'overview', title: '1. Overview' },
                    { id: 'information-collect', title: '2. Information We Collect' },
                    { id: 'how-we-use', title: '3. How We Use Information' },
                    { id: 'legal-basis', title: '4. Legal Basis for Processing' },
                    { id: 'information-sharing', title: '5. Information Sharing' },
                    { id: 'data-security', title: '6. Data Security' },
                    { id: 'data-retention', title: '7. Data Retention' },
                    { id: 'your-rights', title: '8. Your Privacy Rights' },
                    { id: 'cookies', title: '9. Cookies and Tracking' },
                    { id: 'international', title: '10. International Transfers' },
                    { id: 'children', title: '11. Children\'s Privacy' },
                    { id: 'third-party', title: '12. Third-Party Services' },
                    { id: 'changes', title: '13. Policy Changes' },
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
                <CardTitle className="text-4xl font-bold text-orange-600 mb-2">Privacy Policy</CardTitle>
                <div className="space-y-1">
                  <p className="text-gray-600">
                    <strong>Effective Date:</strong> {effectiveDate}
                  </p>
                  <p className="text-gray-600">
                    <strong>Last Updated:</strong> 8/10/2025
                  </p>
                </div>
              </CardHeader>

              <CardContent className="prose prose-gray max-w-none pt-8">
                <div className="space-y-8">

                  <section id="overview" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      1. Overview
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        At Chessticize, we are committed to protecting your privacy and ensuring the security of your personal information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our chess training platform.
                      </p>
                      <p>
                        We believe in transparency and want you to understand exactly what information we collect, why we collect it, and how we use it to provide you with the best possible chess training experience.
                      </p>
                      <p>
                        By using our Service, you agree to the collection and use of information in accordance with this Privacy Policy. If you do not agree with our policies and practices, please do not use our Service.
                      </p>
                    </div>
                  </section>

                  <section id="information-collect" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      2. Information We Collect
                    </h2>
                    <div className="space-y-6 text-gray-700 leading-relaxed">

                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">2.1 Information You Provide Directly</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li><strong>Account Information:</strong> Email address, username, and authentication credentials</li>
                          <li><strong>Profile Information:</strong> Optional profile details such as chess skill level and preferences</li>
                          <li><strong>Chess Platform Connections:</strong> When you choose to connect your Chess.com or Lichess accounts for game analysis</li>
                          <li><strong>Communication Data:</strong> Messages you send to our support team or feedback you provide</li>
                          <li><strong>Payment Information:</strong> Billing details for premium features (processed securely by third-party payment processors)</li>
                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">2.2 Information We Collect Automatically</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li><strong>Usage Data:</strong> How you interact with puzzles, training features, and platform navigation</li>
                          <li><strong>Performance Data:</strong> Puzzle solving statistics, accuracy rates, time spent, and progress metrics</li>
                          <li><strong>Technical Data:</strong> IP address, browser type, device information, operating system, and referral URLs</li>
                          <li><strong>Log Data:</strong> Server logs including access times, pages viewed, and system activity</li>

                        </ul>
                      </div>

                      <div>
                        <h3 className="text-xl font-semibold text-gray-800 mb-3">2.3 Information from Third-Party Sources</h3>
                        <ul className="list-disc pl-6 space-y-2">
                          <li><strong>Chess Platform Data:</strong> Game history and statistics from connected Chess.com or Lichess accounts</li>
                          <li><strong>Authentication Services:</strong> Profile information from Google or other OAuth providers when used for login</li>
                        </ul>
                      </div>
                    </div>
                  </section>

                  <section id="how-we-use" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      3. How We Use Your Information
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>We use the information we collect for the following purposes:</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Service Provision</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Provide and maintain our chess training platform</li>
                            <li>Process and respond to your requests</li>
                            <li>Deliver personalized training recommendations</li>
                            <li>Track your progress and performance</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Account Management</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Create and manage your account</li>
                            <li>Authenticate your identity</li>
                            <li>Process payments for premium features</li>
                            <li>Provide customer support</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Communication</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Send important account notifications</li>
                            <li>Respond to your inquiries</li>
                            <li>Provide updates about our services</li>

                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Improvements</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Improve our services and develop new features</li>
                            <li>Ensure platform security and prevent fraud</li>
                            <li>Diagnose issues and maintain performance</li>
                          </ul>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="legal-basis" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      4. Legal Basis for Processing (GDPR)
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>If you are located in the European Economic Area (EEA), our legal basis for collecting and using your personal information depends on the specific context:</p>

                      <div className="space-y-4">
                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Contract Performance</h4>
                          <p className="text-blue-800 text-sm">We process your data to provide our services as outlined in our Terms of Service.</p>
                        </div>

                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-2">Legitimate Interests</h4>
                          <p className="text-green-800 text-sm">We process data to improve our services and ensure security, balanced against your privacy rights.</p>
                        </div>

                        <div className="bg-purple-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-purple-900 mb-2">Consent</h4>
                          <p className="text-purple-800 text-sm">For marketing communications and optional features, we rely on your explicit consent.</p>
                        </div>

                        <div className="bg-orange-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-orange-900 mb-2">Legal Compliance</h4>
                          <p className="text-orange-800 text-sm">We may process data to comply with legal obligations or respond to lawful requests.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="information-sharing" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      5. Information Sharing and Disclosure
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        We do not sell or share your personal information. We only disclose personal information in the following circumstances:
                      </p>

                      <div className="space-y-4">
                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Service Providers</h4>
                          <p className="text-sm">We may share information with trusted third-party service providers who assist us in operating our platform, including:</p>
                          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                            <li>Cloud hosting and infrastructure providers</li>
                            <li>Payment processing services</li>
                            <li>Email and communication services</li>

                          </ul>
                          <p className="text-sm mt-2 text-gray-600">All service providers are bound by strict confidentiality agreements and data processing agreements.</p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Legal Requirements</h4>
                          <p className="text-sm">We may disclose your information when required by law or to:</p>
                          <ul className="list-disc pl-6 space-y-1 text-sm mt-2">
                            <li>Comply with legal processes or government requests</li>
                            <li>Protect our rights, property, or safety</li>
                            <li>Protect the rights, property, or safety of our users</li>
                            <li>Investigate potential violations of our Terms of Service</li>
                          </ul>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">Business Transfers</h4>
                          <p className="text-sm">In the event of a merger, acquisition, or sale of assets, your information may be transferred as part of the business transaction, subject to the same privacy protections.</p>
                        </div>

                        <div>
                          <h4 className="font-semibold text-gray-800 mb-2">With Your Consent</h4>
                          <p className="text-sm">We may share your information with your explicit consent for specific purposes not covered above.</p>
                        </div>
                      </div>
                    </div>
                  </section>

                  <section id="data-security" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      6. Data Security
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        We implement comprehensive security measures to protect your personal information against unauthorized access, alteration, disclosure, or destruction:
                      </p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Technical Safeguards</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>SSL/TLS encryption for data transmission</li>
                            <li>Encrypted data storage</li>
                            <li>Secure authentication systems</li>
                            <li>Regular security audits and penetration testing</li>
                          </ul>
                        </div>

                        <div className="bg-gray-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-gray-800 mb-2">Administrative Safeguards</h4>
                          <ul className="list-disc pl-4 space-y-1 text-sm">
                            <li>Limited access to personal data</li>
                            <li>Employee training on data protection</li>
                            <li>Incident response procedures</li>
                            <li>Regular security policy reviews</li>
                          </ul>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        While we strive to protect your personal information, no method of transmission over the internet or electronic storage is 100% secure. We cannot guarantee absolute security but are committed to using industry-standard practices.
                      </p>
                    </div>
                  </section>

                  <section id="data-retention" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      7. Data Retention
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>We retain your personal information only as long as necessary to fulfill the purposes outlined in this Privacy Policy:</p>

                      <div className="space-y-3">
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium">Account Information</span>
                          <span className="text-sm text-gray-600">Deleted or anonymized within 30 days after account deletion</span>
                        </div>
                        <div className="flex justify-between items-center p-3 bg-gray-50 rounded">
                          <span className="font-medium">Server Logs</span>
                          <span className="text-sm text-gray-600">Retained up to 30 days</span>
                        </div>
                      </div>

                      <p className="text-sm">
                        When you delete your account, we will delete or anonymize your personal information within 30 days, except where we are required to retain it for legal or regulatory purposes.
                      </p>
                    </div>
                  </section>

                  <section id="your-rights" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      8. Your Privacy Rights
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>You have the following rights regarding your personal information:</p>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-3">
                          <div className="border-l-4 border-orange-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Access</h4>
                            <p className="text-sm">Request a copy of your personal data</p>
                          </div>

                          <div className="border-l-4 border-blue-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Rectification</h4>
                            <p className="text-sm">Correct inaccurate or incomplete data</p>
                          </div>

                          <div className="border-l-4 border-red-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Erasure</h4>
                            <p className="text-sm">Request deletion of your personal data</p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div className="border-l-4 border-green-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Portability</h4>
                            <p className="text-sm">Export your data in a structured format</p>
                          </div>

                          <div className="border-l-4 border-purple-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Restriction</h4>
                            <p className="text-sm">Limit how we process your data</p>
                          </div>

                          <div className="border-l-4 border-yellow-500 pl-4">
                            <h4 className="font-semibold text-gray-800">Objection</h4>
                            <p className="text-sm">Object to certain types of processing</p>
                          </div>
                        </div>
                      </div>

                      <div className="bg-orange-50 p-4 rounded-lg">
                        <p className="text-sm">
                          <strong>How to Exercise Your Rights:</strong> Contact us at support@chessticize.com with your request. We will respond within 30 days and may require identity verification.
                        </p>
                      </div>
                    </div>
                  </section>

                  <section id="cookies" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      9. Cookies and Tracking Technologies
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>We use only essential and functional cookies to run the site. We do not use analytics cookies or third-party tracking.</p>

                      <div className="space-y-4">
                        <div className="bg-green-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-green-900 mb-2">Essential Cookies</h4>
                          <p className="text-green-800 text-sm">Required for authentication, security, and basic functionality. These cannot be disabled.</p>
                        </div>

                        <div className="bg-blue-50 p-4 rounded-lg">
                          <h4 className="font-semibold text-blue-900 mb-2">Functional Cookies</h4>
                          <p className="text-blue-800 text-sm">Remember your preferences and settings to improve your experience.</p>
                        </div>


                      </div>

                      <p className="text-sm">
                        You can control cookies through your browser settings. However, disabling certain cookies may affect the functionality of our Service.
                      </p>
                    </div>
                  </section>

                  <section id="international" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      10. International Data Transfers
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        Your information may be transferred to and processed in countries other than your own. We ensure appropriate safeguards are in place:
                      </p>

                      <ul className="list-disc pl-6 space-y-2">
                        <li>Standard Contractual Clauses approved by the European Commission</li>
                        <li>Adequacy decisions for countries with equivalent data protection laws</li>
                        <li>Certification schemes and codes of conduct</li>
                        <li>Binding corporate rules for intra-group transfers</li>
                      </ul>

                      <p className="text-sm text-gray-600">
                        We will only transfer your data to countries or organizations that provide an adequate level of protection for your personal information.
                      </p>
                    </div>
                  </section>

                  <section id="children" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      11. Children's Privacy
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        Our Service is not intended for children under the age of 13. We do not knowingly collect personal information from children under 13 without parental consent.
                      </p>

                      <div className="bg-yellow-50 p-4 rounded-lg">
                        <p className="text-yellow-800 text-sm">
                          <strong>If you are a parent or guardian</strong> and believe your child has provided us with personal information, please contact us immediately. We will take steps to remove such information from our systems.
                        </p>
                      </div>

                      <p>
                        For users between 13 and 18, we recommend parental guidance when using our Service and encourage parents to monitor their children's online activities.
                      </p>
                    </div>
                  </section>

                  <section id="third-party" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      12. Third-Party Services
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>Our Service may integrate with third-party services:</p>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                          <div className="w-2 h-2 bg-orange-500 rounded-full"></div>
                          <span className="font-medium">Chess.com API</span>
                          <span className="text-sm text-gray-600">- Game data analysis</span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                          <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                          <span className="font-medium">Lichess API</span>
                          <span className="text-sm text-gray-600">- Game data analysis</span>
                        </div>
                        <div className="flex items-center space-x-3 p-3 bg-gray-50 rounded">
                          <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                          <span className="font-medium">Google OAuth</span>
                          <span className="text-sm text-gray-600">- Authentication service</span>
                        </div>
                      </div>

                      <p className="text-sm text-gray-600">
                        These third-party services have their own privacy policies. We encourage you to review their privacy practices before connecting your accounts.
                      </p>
                    </div>
                  </section>

                  <section id="changes" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      13. Changes to This Privacy Policy
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        We may update this Privacy Policy from time to time to reflect changes in our practices, technology, legal requirements, or other factors.
                      </p>

                      <div className="bg-blue-50 p-4 rounded-lg">
                        <h4 className="font-semibold text-blue-900 mb-2">How We Notify You</h4>
                        <ul className="list-disc pl-4 space-y-1 text-blue-800 text-sm">
                          <li>Email notification for material changes</li>
                          <li>Prominent notice on our website</li>
                          <li>In-app notifications when you next log in</li>
                          <li>30-day advance notice for significant changes</li>
                        </ul>
                      </div>

                      <p>
                        Your continued use of our Service after any changes constitutes your acceptance of the updated Privacy Policy.
                      </p>
                    </div>
                  </section>

                  <section id="contact" className="scroll-mt-8">
                    <h2 className="text-2xl font-semibold text-gray-900 mb-4 border-b border-gray-200 pb-2">
                      14. Contact Information
                    </h2>
                    <div className="space-y-4 text-gray-700 leading-relaxed">
                      <p>
                        If you have any questions, concerns, or requests regarding this Privacy Policy or our data practices, please contact us:
                      </p>

                      <div className="bg-gray-50 p-6 rounded-lg">
                        <p className="text-sm"><strong>Email:</strong> support@chessticize.com</p>
                      </div>

                      <p className="text-sm text-gray-600">
                        We are committed to resolving any privacy concerns promptly and transparently. If you are not satisfied with our response, you have the right to lodge a complaint with your local data protection authority.
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
