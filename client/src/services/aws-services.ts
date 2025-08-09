import { apiRequest } from "@/lib/queryClient";

export interface TranscribeRequest {
  audioData: string;
  format: string;
}

export interface TranscribeResponse {
  success: boolean;
  transcript?: string;
  jobName?: string;
  error?: string;
}

export interface PollyRequest {
  text: string;
  voiceId?: string;
  outputFormat?: string;
}

export interface PollyResponse {
  success: boolean;
  audioUrl?: string;
  audioData?: string;
  format?: string;
  voiceId?: string;
  text?: string;
  error?: string;
}

/**
 * AWS Transcribe service for speech-to-text conversion
 */
export class TranscribeService {
  static async transcribeAudio(audioData: string, format: string = 'wav'): Promise<TranscribeResponse> {
    try {
      const response = await apiRequest('POST', '/api/transcribe', {
        audioData,
        format
      });
      
      return await response.json();
    } catch (error) {
      console.error('Transcribe error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Convert audio blob to base64 for API transmission
   */
  static async blobToBase64(blob: Blob): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result as string;
        // Remove data URL prefix
        const base64 = result.split(',')[1];
        resolve(base64);
      };
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  }

  /**
   * Record audio using MediaRecorder API
   */
  static async recordAudio(durationMs: number = 5000): Promise<Blob> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];

      return new Promise((resolve, reject) => {
        mediaRecorder.ondataavailable = (event) => {
          if (event.data.size > 0) {
            chunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: 'audio/wav' });
          // Stop all tracks
          stream.getTracks().forEach(track => track.stop());
          resolve(blob);
        };

        mediaRecorder.onerror = reject;

        mediaRecorder.start();
        
        // Stop recording after specified duration
        setTimeout(() => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
        }, durationMs);
      });
    } catch (error) {
      console.error('Error accessing microphone:', error);
      throw error;
    }
  }
}

/**
 * AWS Polly service for text-to-speech conversion
 */
export class PollyService {
  static async synthesizeSpeech(
    text: string,
    voiceId: string = 'Joanna',
    outputFormat: string = 'mp3'
  ): Promise<PollyResponse> {
    try {
      const response = await apiRequest('POST', '/api/polly', {
        text,
        voiceId,
        outputFormat
      });
      
      return await response.json();
    } catch (error) {
      console.error('Polly error:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      };
    }
  }

  /**
   * Play audio from base64 data
   */
  static playAudioFromBase64(audioData: string, format: string = 'mp3'): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        const audio = new Audio(`data:audio/${format};base64,${audioData}`);
        
        audio.onended = () => resolve();
        audio.onerror = () => reject(new Error('Failed to play audio'));
        
        audio.play().catch(reject);
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get available Polly voices
   */
  static getAvailableVoices() {
    return [
      { id: 'Joanna', name: 'Joanna', gender: 'Female', language: 'English (US)' },
      { id: 'Matthew', name: 'Matthew', gender: 'Male', language: 'English (US)' },
      { id: 'Ivy', name: 'Ivy', gender: 'Female', language: 'English (US)' },
      { id: 'Justin', name: 'Justin', gender: 'Male', language: 'English (US)' },
      { id: 'Kendra', name: 'Kendra', gender: 'Female', language: 'English (US)' },
      { id: 'Kimberly', name: 'Kimberly', gender: 'Female', language: 'English (US)' },
      { id: 'Salli', name: 'Salli', gender: 'Female', language: 'English (US)' },
      { id: 'Joey', name: 'Joey', gender: 'Male', language: 'English (US)' }
    ];
  }
}

/**
 * Hybrid speech service that can use either browser APIs or AWS services
 */
export class HybridSpeechService {
  private useAWS: boolean;

  constructor(useAWS: boolean = false) {
    this.useAWS = useAWS;
  }

  /**
   * Convert speech to text using either browser API or AWS Transcribe
   */
  async speechToText(): Promise<string> {
    if (this.useAWS) {
      try {
        // Record audio
        const audioBlob = await TranscribeService.recordAudio(5000);
        const audioBase64 = await TranscribeService.blobToBase64(audioBlob);
        
        // Transcribe with AWS
        const result = await TranscribeService.transcribeAudio(audioBase64, 'wav');
        
        if (result.success && result.transcript) {
          return result.transcript;
        } else {
          throw new Error(result.error || 'Transcription failed');
        }
      } catch (error) {
        console.warn('AWS Transcribe failed, falling back to browser API:', error);
        return this.browserSpeechToText();
      }
    } else {
      return this.browserSpeechToText();
    }
  }

  /**
   * Convert text to speech using either browser API or AWS Polly
   */
  async textToSpeech(text: string, voiceId?: string): Promise<void> {
    if (this.useAWS) {
      try {
        const result = await PollyService.synthesizeSpeech(text, voiceId);
        
        if (result.success && result.audioData) {
          await PollyService.playAudioFromBase64(result.audioData, result.format);
        } else {
          throw new Error(result.error || 'Speech synthesis failed');
        }
      } catch (error) {
        console.warn('AWS Polly failed, falling back to browser API:', error);
        this.browserTextToSpeech(text);
      }
    } else {
      this.browserTextToSpeech(text);
    }
  }

  /**
   * Browser-based speech to text using Web Speech API
   */
  private browserSpeechToText(): Promise<string> {
    return new Promise((resolve, reject) => {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        reject(new Error('Speech recognition not supported'));
        return;
      }

      const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognition = new SpeechRecognition();

      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = 'en-US';

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        resolve(transcript);
      };

      recognition.onerror = (event: any) => {
        reject(new Error(`Speech recognition error: ${event.error}`));
      };

      recognition.start();
    });
  }

  /**
   * Browser-based text to speech using Web Speech API
   */
  private browserTextToSpeech(text: string): void {
    if ('speechSynthesis' in window) {
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      utterance.pitch = 1;
      utterance.volume = 0.8;
      speechSynthesis.speak(utterance);
    } else {
      console.warn('Speech synthesis not supported');
    }
  }

  /**
   * Toggle between AWS and browser APIs
   */
  setUseAWS(useAWS: boolean): void {
    this.useAWS = useAWS;
  }

  /**
   * Check if AWS services are available
   */
  async isAWSAvailable(): Promise<boolean> {
    try {
      // Test AWS services availability by making a simple API call
      const response = await apiRequest('GET', '/api/stats');
      return response.ok;
    } catch {
      return false;
    }
  }
}