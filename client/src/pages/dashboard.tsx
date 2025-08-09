import { useState } from "react";
import Header from "@/components/header";
import Sidebar from "@/components/sidebar";
import VoiceCommandCenter from "@/components/voice-command-center";
import WorkflowResults from "@/components/workflow-results";
import ActiveWorkflows from "@/components/active-workflows";
import RightSidebar from "@/components/right-sidebar";

export default function Dashboard() {
  const [currentDomain, setCurrentDomain] = useState<string>("hr");
  const [workflowResult, setWorkflowResult] = useState<any>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  return (
    <div className="min-h-screen bg-slate-50">
      <Header />
      
      <div className="flex max-w-7xl mx-auto min-h-screen">
        <Sidebar 
          currentDomain={currentDomain} 
          onDomainChange={setCurrentDomain} 
        />
        
        <main className="flex-1 p-6">
          <VoiceCommandCenter 
            onResult={setWorkflowResult}
            onProcessing={setIsProcessing}
            currentDomain={currentDomain}
          />
          
          {workflowResult && (
            <WorkflowResults 
              result={workflowResult}
              isProcessing={isProcessing}
            />
          )}
          
          <ActiveWorkflows />
        </main>
        
        <RightSidebar />
      </div>
    </div>
  );
}
