import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const APP_NAME = "Accountant Invoice";
const DEFAULT_DESCRIPTION =
  "Secure single-admin invoice management for invoices, payments, transactions, notifications, and analytics.";

const ROUTE_META: Array<{ match: (path: string) => boolean; title: string; description: string }> = [
  {
    match: (path) => path === "/login",
    title: "Admin Login",
    description: "Sign in securely to manage invoices, payments, transactions, and settings.",
  },
  {
    match: (path) => path === "/dashboard",
    title: "Dashboard",
    description: "View revenue, dues, overdue alerts, recent invoices, and recent transactions.",
  },
  {
    match: (path) => path === "/invoices",
    title: "Invoices",
    description: "Create, manage, email, download, and track client invoices.",
  },
  {
    match: (path) => path === "/invoices/new",
    title: "Create Invoice",
    description: "Create a pending or paid invoice with client, tax, discount, and payment details.",
  },
  {
    match: (path) => path === "/invoices/deleted",
    title: "Recently Deleted Invoices",
    description: "Review deleted invoices and permanently remove invoice records.",
  },
  {
    match: (path) => path.startsWith("/invoices/"),
    title: "Invoice Details",
    description: "Review invoice details, payment status, public download, and PDF export.",
  },
  {
    match: (path) => path === "/transactions",
    title: "Transactions",
    description: "Track manual income, expenses, and invoice-linked payment transactions.",
  },
  {
    match: (path) => path === "/payments",
    title: "Payments",
    description: "Review paid invoices and received payment history.",
  },
  {
    match: (path) => path === "/analytics",
    title: "Analytics",
    description: "Analyze revenue, expenses, invoice status, overdue risk, and business cash flow.",
  },
  {
    match: (path) => path === "/notifications",
    title: "Notifications",
    description: "Review account, invoice, email, and overdue notifications.",
  },
  {
    match: (path) => path.startsWith("/notifications/"),
    title: "Notification Details",
    description: "Read notification details and related invoice or account activity.",
  },
  {
    match: (path) => path === "/profile",
    title: "Settings",
    description: "Manage company profile, PAN, GST, currency, admin email, and security settings.",
  },
  {
    match: (path) => path.startsWith("/invoice-download/"),
    title: "Invoice Download",
    description: "Open a public invoice link and download the invoice PDF locally.",
  },
  {
    match: (path) => path === "/privacy",
    title: "Privacy Policy",
    description: "Read how Accountant Invoice handles data and privacy.",
  },
  {
    match: (path) => path === "/terms",
    title: "Terms of Service",
    description: "Read the terms for using Accountant Invoice.",
  },
];

function setMeta(selector: string, attr: "content" | "href", value: string) {
  const element = document.head.querySelector(selector);
  if (element) element.setAttribute(attr, value);
}

export default function SeoMeta() {
  const location = useLocation();

  useEffect(() => {
    const meta = ROUTE_META.find((item) => item.match(location.pathname));
    const pageTitle = meta?.title || APP_NAME;
    const title = pageTitle === APP_NAME ? APP_NAME : `${pageTitle} | ${APP_NAME}`;
    const description = meta?.description || DEFAULT_DESCRIPTION;
    const baseUrl = import.meta.env.VITE_PUBLIC_APP_URL || window.location.origin;
    const canonicalUrl = `${baseUrl}${location.pathname}`;

    document.title = title;
    setMeta('meta[name="description"]', "content", description);
    setMeta('link[rel="canonical"]', "href", canonicalUrl);
    setMeta('meta[property="og:title"]', "content", title);
    setMeta('meta[property="og:description"]', "content", description);
    setMeta('meta[property="og:url"]', "content", canonicalUrl);
    setMeta('meta[property="og:image"]', "content", `${baseUrl}/logo.png`);
    setMeta('meta[name="twitter:title"]', "content", title);
    setMeta('meta[name="twitter:description"]', "content", description);
    setMeta('meta[name="twitter:image"]', "content", `${baseUrl}/logo.png`);
  }, [location.pathname]);

  return null;
}
