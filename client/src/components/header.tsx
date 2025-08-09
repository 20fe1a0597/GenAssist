import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";

export default function Header() {
  return (
    <header className="bg-white shadow-sm border-b border-slate-200 px-6 py-4">
      <div className="flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-r from-primary to-secondary rounded-xl flex items-center justify-center">
              <i className="fas fa-robot text-white text-xl"></i>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              GenAssist
            </h1>
          </div>
          <Badge variant="secondary" className="text-sm">
            <i className="fas fa-brain text-secondary mr-1"></i>
            AI-Powered Workflows
          </Badge>
        </div>
        
        <div className="flex items-center space-x-4">
          <Button variant="ghost" size="icon" className="relative">
            <i className="fas fa-bell text-lg"></i>
            <span className="absolute -top-1 -right-1 w-3 h-3 bg-error rounded-full"></span>
          </Button>
          
          <div className="flex items-center space-x-3 px-3 py-2 bg-slate-100 rounded-lg">
            <Avatar className="w-8 h-8">
              <AvatarImage src="https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=50&h=50" />
              <AvatarFallback>JS</AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">John Smith</span>
            <i className="fas fa-chevron-down text-xs text-slate-500"></i>
          </div>
        </div>
      </div>
    </header>
  );
}
