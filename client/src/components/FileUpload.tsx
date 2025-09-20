import { useState, useRef } from "react";
import { useMutation } from "@tanstack/react-query";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { queryClient } from "@/lib/queryClient";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function FileUpload() {
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const formData = new FormData();
      formData.append("resume", file);

      // Simulate upload progress
      setUploadProgress(10);
      
      const response = await fetch("/api/profile/upload-resume", {
        method: "POST",
        body: formData,
        credentials: "include",
      });

      setUploadProgress(50);

      if (!response.ok) {
        const text = await response.text();
        throw new Error(`${response.status}: ${text}`);
      }

      setUploadProgress(90);
      const result = await response.json();
      setUploadProgress(100);
      
      return result;
    },
    onSuccess: (data) => {
      toast({
        title: "Success",
        description: "Resume uploaded and parsed successfully",
      });
      setUploadProgress(0);
      
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: ["/api/profile"] });
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
    },
    onError: (error: Error) => {
      setUploadProgress(0);
      
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
        title: "Upload Failed",
        description: error.message || "Failed to upload resume",
        variant: "destructive",
      });
    },
  });

  const handleFileSelect = (file: File) => {
    // Validate file type
    const allowedTypes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain'
    ];

    if (!allowedTypes.includes(file.type)) {
      toast({
        title: "Invalid File Type",
        description: "Please upload a PDF, DOC, DOCX, or TXT file",
        variant: "destructive",
      });
      return;
    }

    // Validate file size (5MB limit)
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "File Too Large",
        description: "Please upload a file smaller than 5MB",
        variant: "destructive",
      });
      return;
    }

    uploadMutation.mutate(file);
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const file = e.dataTransfer.files?.[0];
    if (file) {
      handleFileSelect(file);
    }
  };

  const openFileDialog = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="space-y-4">
      <Card
        className={`border-2 border-dashed transition-colors cursor-pointer ${
          dragActive
            ? "border-primary bg-primary/5"
            : "border-border hover:border-primary/50"
        }`}
        onDragEnter={handleDrag}
        onDragLeave={handleDrag}
        onDragOver={handleDrag}
        onDrop={handleDrop}
        onClick={openFileDialog}
        data-testid="file-upload-area"
      >
        <CardContent className="p-8 text-center">
          <div className="space-y-4">
            <div className={`w-16 h-16 mx-auto rounded-full flex items-center justify-center ${
              dragActive ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"
            }`}>
              <i className="fas fa-cloud-upload-alt text-2xl"></i>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-foreground mb-2">
                {dragActive ? "Drop your file here" : "Upload your CV/Resume"}
              </h3>
              <p className="text-muted-foreground text-sm mb-4">
                Drag and drop your file here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground">
                Supports PDF, DOC, DOCX, and TXT files up to 5MB
              </p>
            </div>

            <Button
              variant="outline"
              disabled={uploadMutation.isPending}
              className="mt-4"
              data-testid="button-browse-files"
            >
              <i className="fas fa-folder-open mr-2"></i>
              Browse Files
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Upload Progress */}
      {uploadMutation.isPending && (
        <Card className="border-border">
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-foreground">Uploading and parsing resume...</span>
                <span className="text-muted-foreground">{uploadProgress}%</span>
              </div>
              <Progress value={uploadProgress} className="w-full" />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.txt"
        onChange={handleFileInputChange}
        className="hidden"
        data-testid="file-input"
      />

      {/* Upload Instructions */}
      <div className="bg-muted/50 rounded-lg p-4">
        <h4 className="font-medium text-foreground mb-2">What happens after upload?</h4>
        <ul className="text-sm text-muted-foreground space-y-1">
          <li className="flex items-center">
            <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
            AI will extract your skills, experience, and career history
          </li>
          <li className="flex items-center">
            <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
            Your profile will be automatically updated
          </li>
          <li className="flex items-center">
            <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
            You'll get personalized career recommendations
          </li>
          <li className="flex items-center">
            <i className="fas fa-check text-green-500 mr-2 text-xs"></i>
            Career doppelgänger matching will be enabled
          </li>
        </ul>
      </div>
    </div>
  );
}
