import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { formatDistanceToNow } from "date-fns";

export default function ActiveWorkflows() {
  const { data: workflows, isLoading } = useQuery({
    queryKey: ["/api/workflows/active"],
    refetchInterval: 5000,
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "completed":
        return "bg-success text-white";
      case "in_progress":
        return "bg-warning text-white";
      case "pending":
        return "bg-slate-500 text-white";
      case "failed":
        return "bg-error text-white";
      default:
        return "bg-slate-500 text-white";
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "completed":
        return "fas fa-check";
      case "in_progress":
        return "fas fa-clock";
      case "pending":
        return "fas fa-pause";
      case "failed":
        return "fas fa-times";
      default:
        return "fas fa-question";
    }
  };

  const getDomainIcon = (domain: string) => {
    switch (domain) {
      case "HR":
        return "fas fa-users";
      case "IT":
        return "fas fa-laptop-code";
      case "Finance":
        return "fas fa-chart-line";
      default:
        return "fas fa-cog";
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-2">
            <div className="w-4 h-4 border-2 border-primary border-t-transparent rounded-full animate-spin"></div>
            <span>Loading workflows...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-slate-800 flex items-center">
            <i className="fas fa-tasks text-primary mr-2"></i>
            Active Workflows
          </h3>
          <Button variant="outline" size="sm">
            <i className="fas fa-filter mr-2"></i>
            Filter
          </Button>
        </div>
        
        {!workflows || workflows.length === 0 ? (
          <div className="text-center py-8 text-slate-500">
            <i className="fas fa-inbox text-4xl mb-4 opacity-50"></i>
            <p>No active workflows</p>
            <p className="text-sm">Start a workflow using the voice command center above</p>
          </div>
        ) : (
          <div className="grid gap-4">
            {workflows.map((workflow: any) => (
              <div 
                key={workflow.id}
                className="border border-slate-200 rounded-xl p-4 hover:shadow-md transition-shadow"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <div className={`w-3 h-3 rounded-full ${
                        workflow.status === "in_progress" ? "bg-warning animate-pulse" :
                        workflow.status === "completed" ? "bg-success" :
                        "bg-slate-500"
                      }`}></div>
                      <h4 className="font-semibold text-slate-800">{workflow.title}</h4>
                      <Badge className={getStatusColor(workflow.status)}>
                        <i className={`${getStatusIcon(workflow.status)} mr-1`}></i>
                        {workflow.status.replace("_", " ")}
                      </Badge>
                    </div>
                    
                    <p className="text-sm text-slate-600 mb-3">{workflow.description}</p>
                    
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-4 text-sm text-slate-500">
                        <span>
                          <i className={`${getDomainIcon(workflow.domain)} mr-1`}></i>
                          {workflow.domain} Department
                        </span>
                        <span>
                          <i className="fas fa-clock mr-1"></i>
                          Started {formatDistanceToNow(new Date(workflow.createdAt), { addSuffix: true })}
                        </span>
                        <span>
                          <i className="fas fa-robot mr-1"></i>
                          AI Automated
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button variant="ghost" size="icon" title="View Details">
                          <i className="fas fa-eye"></i>
                        </Button>
                        <Button variant="ghost" size="icon" title="Cancel" className="text-error hover:text-error">
                          <i className="fas fa-times"></i>
                        </Button>
                      </div>
                    </div>
                    
                    <div>
                      <div className="flex justify-between text-xs text-slate-500 mb-1">
                        <span>Progress</span>
                        <span>{workflow.progress || 0}%</span>
                      </div>
                      <Progress value={workflow.progress || 0} className="h-2" />
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
