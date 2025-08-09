import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useVoiceCommand } from "@/hooks/use-voice-command";
import { useSpeech } from "@/hooks/use-speech";
import { useToast } from "@/hooks/use-toast";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { HybridSpeechService, PollyService } from "@/services/aws-services";

interface VoiceCommandCenterProps {
  onResult: (result: any) => void;
  onProcessing: (processing: boolean) => void;
  currentDomain: string;
}

export default function VoiceCommandCenter({ onResult, onProcessing, currentDomain }: VoiceCommandCenterProps) {
  const [command, setCommand] = useState("");
  const [useAWS, setUseAWS] = useState(false);
  const [selectedVoice, setSelectedVoice] = useState("Joanna");
  const [speechService] = useState(() => new HybridSpeechService(useAWS));
  const { toast } = useToast();
  const { isListening, startListening, stopListening, transcript } = useVoiceCommand();
  const { speak, isSupported: ttsSupported } = useSpeech();

  const processCommandMutation = useMutation({
    mutationFn: async (data: { text: string; isVoice: boolean }) => {
      const response = await apiRequest("POST", "/api/process-command", data);
      return response.json();
    },
    onSuccess: (data) => {
      onResult(data);
      onProcessing(false);
      
      if (data.success) {
        toast({
          title: "Workflow Initiated",
          description: data.message,
        });
        
        // Use hybrid speech service for text-to-speech
        if (useAWS) {
          speechService.textToSpeech(data.message, selectedVoice).catch(console.error);
        } else if (ttsSupported) {
          speak(data.message);
        }
      } else {
        toast({
          title: "Error",
          description: data.error || "Failed to process command",
          variant: "destructive",
        });
      }
    },
    onError: (error) => {
      onProcessing(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Unknown error occurred",
        variant: "destructive",
      });
    },
  });

  const handleVoiceToggle = async () => {
    if (isListening) {
      stopListening();
    } else {
      if (useAWS) {
        try {
          onProcessing(true);
          const transcript = await speechService.speechToText();
          setCommand(transcript);
          onProcessing(false);
          
          if (transcript) {
            handleSubmit(transcript, true);
          }
        } catch (error) {
          console.error('AWS speech recognition error:', error);
          toast({
            title: "Voice Recognition Error",
            description: "Failed to process voice input. Using browser fallback.",
            variant: "destructive",
          });
          onProcessing(false);
          // Fallback to browser API
          startListening();
        }
      } else {
        startListening();
      }
    }
  };

  // Update speech service when AWS toggle changes
  useEffect(() => {
    speechService.setUseAWS(useAWS);
  }, [useAWS, speechService]);

  const handleSubmit = (text: string, isVoice: boolean = false) => {
    if (!text.trim()) return;
    
    onProcessing(true);
    processCommandMutation.mutate({ text: text.trim(), isVoice });
    
    if (!isVoice) {
      setCommand("");
    }
  };

  // Update command input when transcript changes
  useEffect(() => {
    if (transcript) {
      setCommand(transcript);
    }
  }, [transcript]);

  const quickCommands = [
    { text: "Create new IT ticket for network issues", icon: "fas fa-ticket-alt", label: "IT Ticket" },
    { text: "Schedule onboarding for new employee", icon: "fas fa-user-plus", label: "HR Onboarding" },
    { text: "Submit expense report for client meeting", icon: "fas fa-receipt", label: "Expense Report" },
  ];

  return (
    <Card className="mb-6">
      <CardContent className="p-8">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-slate-800 mb-2">AI Workflow Assistant</h2>
          <p className="text-slate-600">Speak naturally or type commands to automate your workflows</p>
          
          {/* AWS Services Toggle */}
          <div className="flex items-center justify-center space-x-6 mt-4 p-4 bg-slate-50 rounded-lg">
            <div className="flex items-center space-x-2">
              <Switch
                checked={useAWS}
                onCheckedChange={setUseAWS}
                id="aws-toggle"
              />
              <label htmlFor="aws-toggle" className="text-sm font-medium">
                {useAWS ? (
                  <span className="flex items-center text-primary">
                    <i className="fab fa-aws mr-2"></i>
                    AWS Services
                  </span>
                ) : (
                  <span className="flex items-center text-slate-600">
                    <i className="fas fa-browser mr-2"></i>
                    Browser APIs
                  </span>
                )}
              </label>
            </div>
            
            {useAWS && (
              <div className="flex items-center space-x-2">
                <label className="text-sm font-medium text-slate-600">Voice:</label>
                <Select value={selectedVoice} onValueChange={setSelectedVoice}>
                  <SelectTrigger className="w-32">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PollyService.getAvailableVoices().map((voice) => (
                      <SelectItem key={voice.id} value={voice.id}>
                        {voice.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-center space-y-6 mb-8">
          <div className="relative">
            <Button
              size="lg"
              className={`w-24 h-24 rounded-full ${
                isListening 
                  ? "bg-error hover:bg-error/90" 
                  : "bg-gradient-to-r from-secondary to-purple-600 hover:from-secondary/90 hover:to-purple-600/90"
              } text-white shadow-lg transition-all duration-300 transform hover:scale-105`}
              onClick={handleVoiceToggle}
              disabled={processCommandMutation.isPending}
            >
              <i className={`fas fa-${isListening ? "stop" : "microphone"} text-2xl`}></i>
            </Button>
            
            {isListening && (
              <>
                <div className="absolute inset-0 rounded-full border-4 border-secondary opacity-75 voice-activity-ring"></div>
                <div className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 flex space-x-1">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className="w-1 bg-secondary rounded-full voice-bars"
                      style={{ 
                        height: '16px',
                        animationDelay: `${i * 0.1}s` 
                      }}
                    ></div>
                  ))}
                </div>
              </>
            )}
          </div>
          
          <div className="text-center">
            <p className={`font-medium ${isListening ? "text-error" : "text-slate-600"}`}>
              {isListening ? "Listening... Speak now" : (useAWS ? "Click to record with AWS Transcribe" : "Click to start voice command")}
            </p>
            <p className="text-sm text-slate-500 mt-1">
              {isListening ? "Click again to stop" : (useAWS ? "Powered by Amazon Bedrock & AWS Services" : "Powered by AI Intent Recognition")}
            </p>
          </div>
        </div>
        
        <div className="relative mb-6">
          <Textarea
            placeholder="Type your command here... (e.g., 'Onboard Sarah Johnson as Senior Developer starting Monday')"
            className="h-24 pr-12 font-mono text-sm resize-none"
            value={command}
            onChange={(e) => setCommand(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(command);
              }
            }}
          />
          <Button
            size="icon"
            className="absolute right-3 bottom-3"
            onClick={() => handleSubmit(command)}
            disabled={!command.trim() || processCommandMutation.isPending}
          >
            <i className="fas fa-paper-plane"></i>
          </Button>
        </div>
        
        <div className="flex flex-wrap gap-3 justify-center">
          {quickCommands.map((cmd, index) => (
            <Button
              key={index}
              variant="outline"
              className="text-sm"
              onClick={() => handleSubmit(cmd.text)}
              disabled={processCommandMutation.isPending}
            >
              <i className={`${cmd.icon} mr-2`}></i>
              {cmd.label}
            </Button>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
