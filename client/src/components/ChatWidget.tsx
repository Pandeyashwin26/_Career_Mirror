import { useState, useEffect, useRef } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

interface ChatMessage {
  id: string;
  message: string;
  response?: string;
  isBot: boolean;
  createdAt: string;
}

export default function ChatWidget() {
  const { toast } = useToast();
  const [isOpen, setIsOpen] = useState(false);
  const [newMessage, setNewMessage] = useState("");
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  const { data: chatHistory, refetch: refetchHistory } = useQuery({
    queryKey: ["/api/chat/history", { limit: 20 }],
    enabled: isOpen,
    retry: false,
  });

  const sendMessageMutation = useMutation({
    mutationFn: async (message: string) => {
      const response = await apiRequest("POST", "/api/chat", { message });
      return response.json();
    },
    onSuccess: () => {
      setNewMessage("");
      refetchHistory();
      // Scroll to bottom after message is sent
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Scroll to bottom when chat history updates
  useEffect(() => {
    if (chatHistory && scrollAreaRef.current) {
      setTimeout(() => {
        if (scrollAreaRef.current) {
          scrollAreaRef.current.scrollTop = scrollAreaRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [chatHistory]);

  const handleSendMessage = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim() || sendMessageMutation.isPending) return;
    
    sendMessageMutation.mutate(newMessage.trim());
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
  };

  // Group messages by conversation pairs
  const groupedMessages: Array<{ userMessage: ChatMessage; botResponse?: ChatMessage }> = [];
  if (chatHistory && Array.isArray(chatHistory)) {
    const messages = [...(chatHistory || [])].reverse(); // Most recent first, then reverse for display
    
    for (let i = 0; i < messages.length; i++) {
      const message = messages[i];
      if (!message.isBot) {
        // Find the corresponding bot response
        const botResponse = messages.find((m, idx) => 
          idx > i && m.isBot && new Date(m.createdAt).getTime() > new Date(message.createdAt).getTime()
        );
        
        groupedMessages.push({
          userMessage: message,
          botResponse,
        });
      }
    }
  }

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {/* Chat Interface */}
      {isOpen && (
        <Card className="absolute bottom-16 right-0 w-80 h-96 shadow-xl border border-border">
          <CardHeader className="bg-primary text-primary-foreground p-4 rounded-t-xl">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-white/20 rounded-full flex items-center justify-center mr-2">
                  <i className="fas fa-robot text-sm"></i>
                </div>
                <div>
                  <h4 className="font-medium">Career Mirror Assistant</h4>
                  <p className="text-xs opacity-90">Online now</p>
                </div>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={toggleChat}
                className="text-white/80 hover:text-white hover:bg-white/10 p-1 h-auto"
                data-testid="button-close-chat"
              >
                <i className="fas fa-times"></i>
              </Button>
            </div>
          </CardHeader>
          
          <ScrollArea className="flex-1 h-64 p-4" ref={scrollAreaRef}>
            <div className="space-y-4">
              {/* Initial bot message */}
              <div className="flex items-start">
                <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                  <i className="fas fa-robot text-white text-xs"></i>
                </div>
                <div className="bg-secondary p-3 rounded-lg max-w-xs">
                  <p className="text-sm">
                    Hi! I'm here to help you find the perfect classes and career guidance. What are you looking for today?
                  </p>
                </div>
              </div>

              {/* Chat history */}
              {groupedMessages.map((conversation, index) => (
                <div key={conversation.userMessage.id} className="space-y-2">
                  {/* User message */}
                  <div className="flex justify-end">
                    <div className="bg-primary text-primary-foreground p-3 rounded-lg max-w-xs">
                      <p className="text-sm" data-testid={`user-message-${index}`}>
                        {conversation.userMessage.message}
                      </p>
                    </div>
                  </div>
                  
                  {/* Bot response */}
                  {conversation.botResponse && (
                    <div className="flex items-start">
                      <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                        <i className="fas fa-robot text-white text-xs"></i>
                      </div>
                      <div className="bg-secondary p-3 rounded-lg max-w-xs">
                        <p className="text-sm" data-testid={`bot-response-${index}`}>
                          {conversation.botResponse.message}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              ))}

              {/* Loading indicator */}
              {sendMessageMutation.isPending && (
                <div className="flex items-start">
                  <div className="w-6 h-6 bg-primary rounded-full flex items-center justify-center mr-2 flex-shrink-0">
                    <i className="fas fa-robot text-white text-xs"></i>
                  </div>
                  <div className="bg-secondary p-3 rounded-lg">
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce"></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.1s" }}></div>
                      <div className="w-2 h-2 bg-muted-foreground rounded-full animate-bounce" style={{ animationDelay: "0.2s" }}></div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>
          
          <CardContent className="p-4 border-t border-border">
            <form onSubmit={handleSendMessage} className="flex gap-2">
              <Input
                value={newMessage}
                onChange={(e) => setNewMessage(e.target.value)}
                placeholder="Type your message..."
                className="flex-1"
                disabled={sendMessageMutation.isPending}
                data-testid="input-chat-message"
              />
              <Button
                type="submit"
                disabled={sendMessageMutation.isPending || !newMessage.trim()}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
                data-testid="button-send-message"
              >
                <i className="fas fa-paper-plane text-sm"></i>
              </Button>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Chat Toggle Button */}
      <Button
        onClick={toggleChat}
        className="w-14 h-14 bg-primary text-primary-foreground rounded-full shadow-lg hover:bg-primary/90 transition-all hover:scale-105 flex items-center justify-center"
        data-testid="button-toggle-chat"
      >
        <i className={`fas ${isOpen ? "fa-times" : "fa-comments"} text-lg`}></i>
      </Button>
    </div>
  );
}
