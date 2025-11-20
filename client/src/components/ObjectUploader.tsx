import { useState, useEffect, useRef } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";
import { FileText, Loader2 } from "lucide-react";

interface ObjectUploaderProps {
  maxNumberOfFiles?: number;
  maxFileSize?: number;
  onGetUploadParameters: () => Promise<{
    method: "PUT";
    url: string;
  }>;
  onComplete?: (
    result: UploadResult<Record<string, unknown>, Record<string, unknown>>
  ) => void;
  buttonClassName?: string;
  children: ReactNode;
}

export function ObjectUploader({
  maxNumberOfFiles = 1,
  maxFileSize = 10485760,
  onGetUploadParameters,
  onComplete,
  buttonClassName,
  children,
}: ObjectUploaderProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [hasFile, setHasFile] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['.pdf'],
      },
      autoProceed: true,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("upload", () => {
        setIsUploading(true);
      })
      .on("complete", (result) => {
        setIsUploading(false);
        
        // Only mark as successful if no files failed
        if (result.failed && result.failed.length > 0) {
          setHasFile(false);
          console.error('Upload failed:', result.failed);
          // Remove failed files from queue (check if they still exist)
          result.failed.forEach((file) => {
            try {
              if (uppy.getFile(file.id)) {
                uppy.removeFile(file.id);
              }
            } catch (e) {
              // File already removed, ignore
            }
          });
        } else if (result.successful && result.successful.length > 0) {
          setHasFile(true);
          onComplete?.(result);
          // Remove successful files from queue (check if they still exist)
          result.successful.forEach((file) => {
            try {
              if (uppy.getFile(file.id)) {
                uppy.removeFile(file.id);
              }
            } catch (e) {
              // File already removed, ignore
            }
          });
        }
      })
      .on("upload-error", (file, error) => {
        console.error('Upload error:', error);
        setIsUploading(false);
        setHasFile(false);
        // Remove the failed file from queue
        if (file) {
          try {
            if (uppy.getFile(file.id)) {
              uppy.removeFile(file.id);
            }
          } catch (e) {
            // File already removed, ignore
          }
        }
      })
      .on("error", () => {
        setIsUploading(false);
        setHasFile(false);
      })
  );

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Clear previous files and reset state
    const currentFiles = uppy.getFiles();
    currentFiles.forEach((f) => uppy.removeFile(f.id));
    setIsUploading(false);
    setHasFile(false);
    
    // Add the new file
    try {
      uppy.addFile({
        name: file.name,
        type: file.type,
        data: file,
      });
    } catch (err) {
      console.error('Error adding file:', err);
    }

    // Reset input so same file can be selected again
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleButtonClick = () => {
    fileInputRef.current?.click();
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      const files = uppy.getFiles();
      files.forEach((file) => uppy.removeFile(file.id));
    };
  }, [uppy]);

  if (hasFile && !isUploading) {
    return (
      <div className="flex items-center justify-center h-7 w-7">
        <FileText className="h-4 w-4 text-blue-600" />
      </div>
    );
  }

  if (isUploading) {
    return (
      <div className="flex items-center justify-center h-7 w-full">
        <Loader2 className="h-4 w-4 animate-spin text-blue-600" />
      </div>
    );
  }

  return (
    <>
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,application/pdf"
        onChange={handleFileSelect}
        style={{ display: 'none' }}
        data-testid="hidden-file-input"
      />
      <Button 
        onClick={handleButtonClick} 
        className={buttonClassName} 
        data-testid="button-upload-dispatch-sheet"
      >
        {children}
      </Button>
    </>
  );
}
