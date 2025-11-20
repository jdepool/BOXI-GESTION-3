import { useState, useEffect } from "react";
import type { ReactNode } from "react";
import Uppy from "@uppy/core";
import { DashboardModal } from "@uppy/react";
import AwsS3 from "@uppy/aws-s3";
import type { UploadResult } from "@uppy/core";
import { Button } from "@/components/ui/button";

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
  const [showModal, setShowModal] = useState(false);
  const [uppy] = useState(() =>
    new Uppy({
      restrictions: {
        maxNumberOfFiles,
        maxFileSize,
        allowedFileTypes: ['.pdf'],
      },
      autoProceed: false,
    })
      .use(AwsS3, {
        shouldUseMultipart: false,
        getUploadParameters: onGetUploadParameters,
      })
      .on("complete", (result) => {
        onComplete?.(result);
        setShowModal(false);
      })
  );

  // Block drag and drop events on the modal
  useEffect(() => {
    if (!showModal) return;

    const handleDragOver = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    const handleDrop = (e: Event) => {
      e.preventDefault();
      e.stopPropagation();
    };

    // Find the Uppy Dashboard element and block drag/drop using capture phase
    const timer = setTimeout(() => {
      const dashboardEl = document.querySelector('.uppy-Dashboard');
      if (dashboardEl) {
        dashboardEl.addEventListener('dragover', handleDragOver, true);
        dashboardEl.addEventListener('drop', handleDrop, true);
        dashboardEl.addEventListener('dragenter', handleDragOver, true);
      }
    }, 100);

    return () => {
      clearTimeout(timer);
      const dashboardEl = document.querySelector('.uppy-Dashboard');
      if (dashboardEl) {
        dashboardEl.removeEventListener('dragover', handleDragOver, true);
        dashboardEl.removeEventListener('drop', handleDrop, true);
        dashboardEl.removeEventListener('dragenter', handleDragOver, true);
      }
    };
  }, [showModal]);

  // Cleanup Uppy instance on unmount
  useEffect(() => {
    return () => {
      uppy.cancelAll();
    };
  }, [uppy]);

  return (
    <div>
      <Button onClick={() => setShowModal(true)} className={buttonClassName} data-testid="button-upload-dispatch-sheet">
        {children}
      </Button>

      <style>{`
        /* Hide drop zone text but keep browse button */
        .uppy-Dashboard-AddFiles-info {
          display: none !important;
        }
        .uppy-Dashboard-note {
          display: none !important;
        }
        .uppy-DashboardContent-bar {
          margin-top: 0 !important;
        }
        /* Make file previews small with PDF icon */
        .uppy-Dashboard-Item-previewInnerWrap {
          width: 40px !important;
          height: 40px !important;
        }
        .uppy-Dashboard-Item-preview {
          width: 40px !important;
          height: 40px !important;
          display: flex !important;
          align-items: center !important;
          justify-content: center !important;
          background: #f3f4f6 !important;
          border-radius: 4px !important;
        }
        .uppy-Dashboard-Item-preview::before {
          content: "📄" !important;
          font-size: 24px !important;
          line-height: 1 !important;
        }
        .uppy-Dashboard-Item-preview img,
        .uppy-Dashboard-Item-preview svg,
        .uppy-Dashboard-Item-preview canvas {
          display: none !important;
        }
      `}</style>

      <DashboardModal
        uppy={uppy}
        open={showModal}
        onRequestClose={() => setShowModal(false)}
        proudlyDisplayPoweredByUppy={false}
        note=""
        disableInformer={true}
        disableThumbnailGenerator={true}
        showLinkToFileUploadResult={false}
        hideUploadButton={false}
      />
    </div>
  );
}
