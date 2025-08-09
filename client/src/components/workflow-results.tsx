import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface WorkflowResultsProps {
  result: any;
  isProcessing: boolean;
}

interface ProcessingStep {
  icon: string;
  text: string;
  subtext: string;
  status: "pending" | "processing" | "complete";
}

export default function WorkflowResults({ result, isProcessing }: WorkflowResultsProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [steps, setSteps] = useState<ProcessingStep[]>([]);

  useEffect(() => {
    if (result?.intent) {
      const processingSteps: ProcessingStep[] = [
        {
          icon: "fas fa-brain",
          text: "Analyzing intent and entities...",
          subtext: "Using OpenAI GPT model",
          status: "processing"
        },
        {
          icon: "fas fa-check",
          text: `Intent detected: ${result.intent.intent}`,
          subtext: `Confidence: ${(result.intent.confidence * 100).toFixed(1)}%`,
          status: "complete"
        },
        {
          icon: "fas fa-check",
          text: "Entities extracted successfully",
          subtext: Object.keys(result.intent.entities).length > 0 
            ? `Found: ${Object.keys(result.intent.entities).join(", ")}`
            : "No entities found",
          status: "complete"
        },
        {
          icon: "fas fa-cogs",
          text: "Workflow handler selected",
          subtext: `${result.intent.domain} domain workflow activated`,
          status: "complete"
        },
        {
          icon: isProcessing ? "fas fa-spinner fa-spin" : "fas fa-check",
          text: isProcessing ? "Executing workflow steps..." : "Workflow initiated successfully",
          subtext: isProcessing ? "Creating workflow record" : "Process is now running",
          status: isProcessing ? "processing" : "complete"
        }
      ];
      
      setSteps(processingSteps);
      setCurrentStep(0);
    }
  }, [result, isProcessing]);

  useEffect(() => {
    if (steps.length > 0 && currentStep < steps.length - 1) {
      const timer = setTimeout(() => {
        setCurrentStep(prev => prev + 1);
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, steps.length]);

  if (!result) return null;

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="text-xl font-semibold text-slate-800 mb-4 flex items-center">
          <i className="fas fa-cogs text-primary mr-2"></i>
          Processing Workflow
        </h3>
        
        <div className="space-y-4 mb-6">
          {steps.map((step, index) => (
            <div 
              key={index}
              className={`flex items-center space-x-4 transition-opacity duration-500 ${
                index <= currentStep ? "opacity-100" : "opacity-30"
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                step.status === "complete" ? "bg-success" :
                step.status === "processing" ? "bg-primary" : "bg-slate-200"
              }`}>
                <i className={`${step.icon} text-white text-sm`}></i>
              </div>
              <div>
                <p className="font-medium text-slate-800">{step.text}</p>
                <p className="text-sm text-slate-500">{step.subtext}</p>
              </div>
            </div>
          ))}
        </div>
        
        {result.intent && currentStep >= 2 && (
          <div className="p-4 bg-slate-50 rounded-xl">
            <h4 className="font-semibold text-slate-800 mb-3">Extracted Information:</h4>
            
            <div className="grid md:grid-cols-2 gap-4 text-sm mb-4">
              <div>
                <span className="font-medium text-slate-600">Intent:</span>
                <span className="ml-2 text-secondary font-mono">{result.intent.intent}</span>
              </div>
              <div>
                <span className="font-medium text-slate-600">Confidence:</span>
                <span className="ml-2 text-success font-mono">
                  {(result.intent.confidence * 100).toFixed(1)}%
                </span>
              </div>
            </div>
            
            {Object.keys(result.intent.entities).length > 0 && (
              <div>
                <span className="font-medium text-slate-600">Entities:</span>
                <div className="mt-2 flex flex-wrap gap-2">
                  {Object.entries(result.intent.entities).map(([key, value]) => (
                    <Badge key={key} variant="outline" className="font-mono text-xs">
                      {key}: {String(value)}
                    </Badge>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
