
'use client';

import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Wrench, Bell, Vote, Video, FileText, Mail } from "lucide-react";
import Link from "next/link";

interface ToolCardProps {
  title: string;
  description: string;
  icon: React.ElementType;
  href: string;
  disabled?: boolean;
}

const ToolCard = ({ title, description, icon: Icon, href, disabled }: ToolCardProps) => (
    <Card className="flex flex-col text-center items-center p-6 transition-all duration-300 hover:shadow-xl hover:-translate-y-1">
        <div className="p-4 bg-primary/10 rounded-full">
            <Icon className="h-10 w-10 text-primary" />
        </div>
        <div className="flex-grow mt-6">
            <h3 className="text-xl font-bold">{title}</h3>
            <p className="mt-2 text-muted-foreground">{description}</p>
        </div>
        <div className="w-full mt-6">
            <Button asChild disabled={disabled} className="w-full">
                <Link href={href}>Manage</Link>
            </Button>
        </div>
    </Card>
);

export default function AdminToolsPage() {
  const tools = [
    {
      title: "Site Maintenance",
      description: "Enable or disable site maintenance mode.",
      icon: Wrench,
      href: "/admin/tools/maintenance",
      disabled: false,
    },
    {
      title: "Display Notifications",
      description: "Create and manage site-wide announcements.",
      icon: Bell,
      href: "/admin/tools/notifications",
      disabled: false,
    },
    {
      title: "Add Polls",
      description: "Create and manage public polls.",
      icon: Vote,
      href: "/admin/tools/polls",
      disabled: false,
    },
    {
      title: "Add Videos",
      description: "Upload and manage promotional videos.",
      icon: Video,
      href: "#",
      disabled: true,
    },
    {
      title: "Manage Contents",
      description: "Edit static content on the website.",
      icon: FileText,
      href: "#",
      disabled: true,
    },
    {
      title: "Site Contacts",
      description: "View and manage contact form submissions.",
      icon: Mail,
      href: "/admin/tools/site-contacts",
      disabled: false,
    },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold font-headline">Admin Tools</h1>
      <p className="text-muted-foreground">
        Access various administrative tools to manage the site. These features are currently under development.
      </p>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tools.map((tool) => (
          <ToolCard key={tool.title} {...tool} />
        ))}
      </div>
    </div>
  );
}
