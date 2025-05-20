import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function PrivacyPolicy() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-4">Privacy Policy</CardTitle>
          <div className="text-center text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              At Glow Invoice Creator, we take your privacy seriously. This Privacy Policy explains how we collect, use, 
              disclose, and safeguard your information when you use our services. Please read this Privacy Policy carefully. 
              By accessing or using our services, you agree to the collection and use of information in accordance with this policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Information We Collect</h2>
            <p className="text-muted-foreground mb-2">We collect several different types of information for various purposes to provide and improve our service to you:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li><strong>Personal Data:</strong> Email address, first name and last name, phone number, address, and payment information.</li>
              <li><strong>Usage Data:</strong> Information about how you use our services, including pages visited, time spent on pages, and other diagnostic data.</li>
              <li><strong>Cookies and Tracking Data:</strong> We use cookies and similar tracking technologies to track activity on our service.</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. How We Use Your Information</h2>
            <p className="text-muted-foreground mb-2">We use the collected data for various purposes:</p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>To provide and maintain our service</li>
              <li>To notify you about changes to our service</li>
              <li>To allow you to participate in interactive features of our service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our service</li>
              <li>To monitor the usage of our service</li>
              <li>To detect, prevent and address technical issues</li>
              <li>To provide you with news, special offers, and general information about other goods, services, and events</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Data Security</h2>
            <p className="text-muted-foreground mb-4">
              The security of your data is important to us. We implement appropriate technical and organizational measures to protect 
              your personal information against unauthorized or unlawful processing, accidental loss, destruction, or damage. However, 
              no method of transmission over the Internet or method of electronic storage is 100% secure, and we cannot guarantee 
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Data Retention</h2>
            <p className="text-muted-foreground mb-4">
              We will retain your personal data only for as long as is necessary for the purposes set out in this Privacy Policy. 
              We will retain and use your personal data to the extent necessary to comply with our legal obligations, resolve disputes, 
              and enforce our policies.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Your Data Protection Rights</h2>
            <p className="text-muted-foreground mb-2">
              Depending on your location, you may have certain rights regarding your personal information, including:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>The right to access, update, or delete your information</li>
              <li>The right to rectification if your personal data is inaccurate or incomplete</li>
              <li>The right to object to our processing of your personal data</li>
              <li>The right to request restriction of processing your personal information</li>
              <li>The right to data portability</li>
              <li>The right to withdraw consent</li>
            </ul>
            <p className="text-muted-foreground mb-4">
              To exercise any of these rights, please contact us using the information provided in the "Contact Us" section below.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Third-Party Services</h2>
            <p className="text-muted-foreground mb-4">
              We may employ third-party companies and individuals to facilitate our service, provide the service on our behalf, 
              perform service-related services, or assist us in analyzing how our service is used. These third parties have access 
              to your personal data only to perform these tasks on our behalf and are obligated not to disclose or use it for any other purpose.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">8. Children's Privacy</h2>
            <p className="text-muted-foreground mb-4">
              Our service is not intended for individuals under the age of 18. We do not knowingly collect personally identifiable 
              information from anyone under the age of 18. If you are a parent or guardian and you are aware that your child has provided 
              us with personal data, please contact us. If we become aware that we have collected personal data from children without 
              verification of parental consent, we take steps to remove that information from our servers.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">9. Changes to This Privacy Policy</h2>
            <p className="text-muted-foreground mb-4">
              We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy 
              on this page and updating the "Last updated" date. You are advised to review this Privacy Policy periodically for any changes. 
              Changes to this Privacy Policy are effective when they are posted on this page.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">10. Contact Us</h2>
            <p className="text-muted-foreground mb-6">
              If you have any questions about this Privacy Policy, please contact us at:
              <br />
              <strong>Email:</strong> privacy@glowinvoice.com
              <br />
              <strong>Address:</strong> 123 Invoice Street, San Francisco, CA 94103, USA
            </p>
          </section>

          <div className="flex justify-center mt-8">
            <Button asChild variant="outline">
              <Link to="/">Back to Home</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
