import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";

export default function TermsOfService() {
  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-4">Terms of Service</CardTitle>
          <div className="text-center text-muted-foreground">
            Last updated: {new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <section>
            <h2 className="text-xl font-semibold mb-3">1. Introduction</h2>
            <p className="text-muted-foreground mb-4">
              Welcome to Glow Invoice Creator. These Terms of Service ("Terms") govern your access to and use of our website and services. 
              By accessing or using our services, you agree to be bound by these Terms and our Privacy Policy.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">2. Account Registration</h2>
            <p className="text-muted-foreground mb-4">
              To access certain features of our service, you may be required to create an account. You agree to provide accurate, 
              current, and complete information during the registration process and to update such information to keep it accurate and complete.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">3. User Responsibilities</h2>
            <p className="text-muted-foreground mb-4">
              You are responsible for maintaining the confidentiality of your account credentials and for all activities that occur 
              under your account. You agree to notify us immediately of any unauthorized use of your account or any other breach of security.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">4. Service Usage</h2>
            <p className="text-muted-foreground mb-4">
              You agree to use our services only for lawful purposes and in accordance with these Terms. You agree not to use our services:
            </p>
            <ul className="list-disc pl-6 text-muted-foreground space-y-2 mb-4">
              <li>In any way that violates any applicable law or regulation</li>
              <li>To transmit any malicious code, viruses, or other harmful components</li>
              <li>To impersonate or attempt to impersonate the Company or any other person or entity</li>
              <li>To engage in any other conduct that restricts or inhibits anyone's use of the services</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">5. Intellectual Property</h2>
            <p className="text-muted-foreground mb-4">
              The service and its original content, features, and functionality are and will remain the exclusive property of Glow Invoice Creator 
              and its licensors. Our trademarks and trade dress may not be used in connection with any product or service without the prior written 
              consent of Glow Invoice Creator.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">6. Limitation of Liability</h2>
            <p className="text-muted-foreground mb-4">
              In no event shall Glow Invoice Creator, nor its directors, employees, partners, agents, suppliers, or affiliates, be liable for any 
              indirect, incidental, special, consequential, or punitive damages, including without limitation, loss of profits, data, use, goodwill, 
              or other intangible losses, resulting from your access to or use of or inability to access or use the services.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold mb-3">7. Changes to Terms</h2>
            <p className="text-muted-foreground mb-6">
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time. We will provide notice of any changes 
              by posting the new Terms on this page and updating the "Last updated" date. Your continued use of the Service after any such changes 
              constitutes your acceptance of the new Terms.
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
