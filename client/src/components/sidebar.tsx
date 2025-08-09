import { useQuery } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";

interface SidebarProps {
  currentDomain: string;
  onDomainChange: (domain: string) => void;
}

export default function Sidebar({ currentDomain, onDomainChange }: SidebarProps) {
  const { data: stats } = useQuery({
    queryKey: ["/api/stats"],
    refetchInterval: 30000,
  });

  const domains = [
    { id: "hr", name: "Human Resources", icon: "fas fa-users", count: 12 },
    { id: "it", name: "IT Support", icon: "fas fa-laptop-code", count: 8 },
    { id: "finance", name: "Finance", icon: "fas fa-chart-line", count: 5 },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 p-6">
      <nav className="space-y-2">
        <h2 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-4">
          Workflow Domains
        </h2>
        
        {domains.map((domain) => (
          <Button
            key={domain.id}
            variant={currentDomain === domain.id ? "default" : "ghost"}
            className="w-full justify-start space-x-3 h-auto py-3"
            onClick={() => onDomainChange(domain.id)}
          >
            <i className={`${domain.icon} text-lg`}></i>
            <span className="font-medium flex-1 text-left">{domain.name}</span>
            <Badge variant="secondary" className="ml-auto">
              {domain.count}
            </Badge>
          </Button>
        ))}
      </nav>
      
      <Card className="mt-8">
        <CardContent className="p-4">
          <h3 className="text-sm font-semibold text-slate-700 mb-3">Today's Activity</h3>
          <div className="space-y-3">
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Workflows Completed</span>
              <span className="font-semibold text-success">{stats?.completed || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">In Progress</span>
              <span className="font-semibold text-warning">{stats?.inProgress || 0}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-slate-600">Voice Commands</span>
              <span className="font-semibold text-secondary">{stats?.voiceCommands || 0}</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
