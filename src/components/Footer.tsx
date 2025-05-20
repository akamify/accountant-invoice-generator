import { Link } from "react-router-dom";
import { Github, Twitter } from "lucide-react";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t bg-background/95 backdrop-blur-sm">
      <div className="container py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="rounded-full p-1 bg-gradient-to-tr from-primary to-accent">
                <div className="rounded-full bg-background p-1">
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="20"
                    height="20"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="text-primary"
                  >
                    <path d="M14.5 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7.5L14.5 2z" />
                    <polyline points="14 2 14 8 20 8" />
                    <path d="M10 13a1 1 0 0 0-1 1v1a1 1 0 0 1-1 1 1 1 0 0 0 0 2 3 3 0 0 0 3-3v-1a1 1 0 0 0-1-1Z" />
                    <path d="M16 12a1 1 0 0 0-1 1v4a1 1 0 0 0 1 1h1a2 2 0 0 0 2-2v-2a2 2 0 0 0-2-2h-1Z" />
                  </svg>
                </div>
              </div>
              <span className="font-bold text-lg">Glow Invoice</span>
            </div>
            <p className="text-sm text-muted-foreground">
              Create professional invoices quickly and easily.
            </p>
          </div>
        </div>

        <div className="mt-12 pt-6 border-t flex flex-col md:flex-row justify-between items-center">
          <p className="text-sm text-muted-foreground">
            © {currentYear} Glow Invoice. All rights reserved.
          </p>
          <div className="flex items-center space-x-6 mt-4 md:mt-0">
            <Link
              to="/privacy"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Terms of Service
            </Link>
            <Link
              to="/developer"
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              Developer
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
