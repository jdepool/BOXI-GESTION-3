import { Client } from "@replit/object-storage";
import { Response } from "express";
import { randomUUID } from "crypto";

const storageClient = new Client();

export class ObjectNotFoundError extends Error {
  constructor() {
    super("Object not found");
    this.name = "ObjectNotFoundError";
    Object.setPrototypeOf(this, ObjectNotFoundError.prototype);
  }
}

export class ObjectStorageService {
  constructor() {}

  async uploadDispatchSheet(fileBuffer: Buffer, contentType: string): Promise<string> {
    const objectId = randomUUID();
    const objectPath = `dispatch-sheets/${objectId}`;
    
    const { ok, error } = await storageClient.uploadFromBytes(objectPath, fileBuffer, {
      contentType: contentType || 'application/pdf',
    });
    
    if (!ok) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
    
    return objectPath;
  }

  async downloadDispatchSheet(objectPath: string, res: Response): Promise<void> {
    try {
      const stream = storageClient.downloadAsStream(objectPath);
      
      res.set({
        'Content-Type': 'application/pdf',
        'Cache-Control': 'private, max-age=3600',
      });

      stream.on('error', (err) => {
        console.error('Stream error:', err);
        if (!res.headersSent) {
          res.status(500).json({ error: 'Error streaming file' });
        }
      });

      stream.pipe(res);
    } catch (error) {
      console.error('Error downloading file:', error);
      if (!res.headersSent) {
        res.status(500).json({ error: 'Error downloading file' });
      }
    }
  }

  async deleteDispatchSheet(objectPath: string): Promise<void> {
    const { ok, error } = await storageClient.delete(objectPath);
    
    if (!ok) {
      console.error('Delete error:', error);
      throw new Error('Failed to delete file');
    }
  }

  async dispatchSheetExists(objectPath: string): Promise<boolean> {
    const { ok, value, error } = await storageClient.exists(objectPath);
    
    if (!ok) {
      console.error('Exists check error:', error);
      return false;
    }
    
    return value;
  }
}
