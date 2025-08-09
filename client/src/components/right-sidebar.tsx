import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { formatDistanceToNow } from "date-fns";

export default function RightSidebar() {
  const [ttsEnabled, setTtsEnabled] = useState(true);
  const [soundEnabled, setSoundEnabled] = useState(true);

  const { data: recentActivity } = useQuery({
    queryKey: ["/api/activity/recent"],
    refetchInterval: 30000,
  });

  const getActivityIcon = (action: string) => {
    switch (action) {
      case "workflow_completed":
        return { icon: "fas fa-check", color: "bg-success" };
      case "workflow_started":
        return { icon: "fas fa-play", color: "bg-primary" };
      case "workflow_failed":
        return { icon: "fas fa-times", color: "bg-error" };
      default:
        return { icon: "fas fa-clock", color: "bg-warning" };
    }
  };

  return (
    <aside className="w-80 bg-white border-l border-slate-200 p-6">
      {/* Audio Controls */}
      <Card className="mb-6">
        <CardContent className="p-4">
          <h3 className="font-semibold text-slate-800 mb-3 flex items-center">
            <i className="fas fa-volume-up text-secondary mr-2"></i>
            Audio Settings
          </h3>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Voice Responses</label>
              <Switch 
                checked={ttsEnabled} 
                onCheckedChange={setTtsEnabled}
              />
            </div>
            <div className="flex items-center justify-between">
              <label className="text-sm text-slate-600">Sound Notifications</label>
              <Switch 
                checked={soundEnabled} 
                onCheckedChange={setSoundEnabled}
              />
            </div>
          </div>
        </CardContent>
      </Card>
      
      {/* Recent Activity */}
      <div className="mb-6">
        <h3 className="font-semibold text-slate-800 mb-4 flex items-center">
          <i className="fas fa-history text-primary mr-2"></i>
          Recent Activity
        </h3>
        
        {!recentActivity || recentActivity.length === 0 ? (
          <div className="text-center py-4 text-slate-500">
            <i className="fas fa-clock text-2xl mb-2 opacity-50"></i>
            <p className="text-sm">No recent activity</p>
          </div>
        ) : (
          <div className="space-y-4">
            {recentActivity.map((activity: any) => {
              const { icon, color } = getActivityIcon(activity.action);
              return (
                <div key={activity.id} className="flex space-x-3 p-3 hover:bg-slate-50 rounded-lg transition-colors">
                  <div className={`w-8 h-8 ${color} rounded-full flex items-center justify-center flex-shrink-0`}>
                    <i className={`${icon} text-white text-xs`}></i>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-slate-800 truncate">
                      {activity.message}
                    </p>
                    <p className="text-xs text-slate-400 mt-1">
                      {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
        
        <Button variant="ghost" className="w-full mt-4 text-primary hover:text-primary">
          View All Activity
        </Button>
      </div>
      
      {/* System Status */}
      <Card className="bg-green-50 border-green-200">
        <CardContent className="p-4">
          <h3 className="font-semibold text-green-800 mb-2 flex items-center">
            <i className="fas fa-server text-green-600 mr-2"></i>
            System Status
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-green-700">OpenAI API</span>
              <span className="text-green-600 font-medium">Online</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Voice Recognition</span>
              <span className="text-green-600 font-medium">Ready</span>
            </div>
            <div className="flex justify-between">
              <span className="text-green-700">Workflow Engine</span>
              <span className="text-green-600 font-medium">Running</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </aside>
  );
}
