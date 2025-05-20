import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { Code, Github, Linkedin, Mail } from "lucide-react";

export default function DeveloperInfo() {
  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      <Card className="border-0 shadow-lg">
        <CardHeader>
          <CardTitle className="text-3xl font-bold text-center mb-2">Developer Information</CardTitle>
          <p className="text-center text-muted-foreground">
            Built with passion and modern web technologies
          </p>
        </CardHeader>
        <CardContent className="space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">About the Developer</h2>
            <div className="flex flex-col md:flex-row gap-8 items-center">
              <div className="w-32 h-32 rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center">
                <Code className="h-16 w-16 text-primary" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-semibold">Yasir Arafaat</h3>
                <p className="text-muted-foreground mt-2">
                  Full Stack Developer passionate about building beautiful, responsive, and user-friendly web applications.
                </p>
                <div className="flex items-center gap-4 mt-4">
                  <a 
                    href="https://github.com/yasirarafat1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="GitHub"
                  >
                    <Github className="h-5 w-5" />
                  </a>
                  <a 
                    href="https://linkedin.com/in/yasirarafat1" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="LinkedIn"
                  >
                    <Linkedin className="h-5 w-5" />
                  </a>
                  <a 
                    href="mailto:mailforarafaat@gmail.com" 
                    className="text-muted-foreground hover:text-foreground transition-colors"
                    aria-label="Email"
                  >
                    <Mail className="h-5 w-5" />
                  </a>
                </div>
              </div>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Technologies Used</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              {[
                { name: 'React', description: 'Frontend library' },
                { name: 'TypeScript', description: 'Type-safe JavaScript' },
                { name: 'Tailwind CSS', description: 'Utility-first CSS framework' },
                { name: 'Shadcn UI', description: 'Beautifully designed components' },
                { name: 'Vite', description: 'Frontend build tool' },
                { name: 'Firebase', description: 'Backend services' },
              ].map((tech, index) => (
                <div key={index} className="p-4 border rounded-lg hover:bg-muted/50 transition-colors">
                  <h4 className="font-medium">{tech.name}</h4>
                  <p className="text-sm text-muted-foreground">{tech.description}</p>
                </div>
              ))}
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">Get in Touch</h2>
            <p className="text-muted-foreground mb-4">
              Have questions or want to discuss a project? Feel free to reach out!
            </p>
            <div className="flex flex-wrap gap-4">
              <Button asChild variant="outline">
                <a href="mailto:yasirarafat@example.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email Me
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://github.com/yasirarafat1" target="_blank" rel="noopener noreferrer">
                  <Github className="mr-2 h-4 w-4" />
                  GitHub
                </a>
              </Button>
              <Button asChild variant="outline">
                <a href="https://linkedin.com/in/mailforarafaat" target="_blank" rel="noopener noreferrer">
                  <Linkedin className="mr-2 h-4 w-4" />
                  LinkedIn
                </a>
              </Button>
            </div>
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
