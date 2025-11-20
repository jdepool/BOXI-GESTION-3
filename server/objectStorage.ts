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
    
    const { ok, error } = await storageClient.uploadFromBytes(objectPath, fileBuffer);
    
    if (!ok) {
      console.error('Upload error:', error);
      throw new Error('Failed to upload file');
    }
    
    return objectPath;
  }

  async downloadDispatchSheet(objectPath: string, contentType: string, res: Response): Promise<void> {
    // Helper to check if an error indicates "not found" - comprehensive check for all SDK error formats
    const isNotFoundError = (err: any): boolean => {
      if (!err) return false;
      
      // Check status code (direct and nested)
      if (err.statusCode === 404 || err.status === 404) return true;
      if (err.response?.status === 404 || err.response?.statusCode === 404) return true;
      
      // Check error code (case-insensitive, handles both string and uppercase SDK codes)
      if (err.code) {
        const code = String(err.code).toLowerCase();
        if (code === 'enoent' || code === 'notfound' || code === 'nosuchkey' || code === 'nosuchobject') return true;
      }
      
      // Check message (case-insensitive)
      if (err.message) {
        const message = String(err.message).toLowerCase();
        if (message.includes('not found') || message.includes('does not exist') || message.includes('no such')) return true;
      }
      
      return false;
    };

    return new Promise((resolve, reject) => {
      try {
        const stream = storageClient.downloadAsStream(objectPath);
        let headersSet = false;
        let errorOccurred = false;

        stream.on('readable', () => {
          // Only set headers and start piping after stream is confirmed readable
          if (!headersSet && !errorOccurred) {
            res.set({
              'Content-Type': contentType,
              'Cache-Control': 'private, max-age=3600',
            });
            headersSet = true;
          }
        });

        stream.on('error', (err: any) => {
          console.error('Stream error:', err);
          errorOccurred = true;
          
          // Normalize 404 errors before any response is sent
          if (isNotFoundError(err)) {
            // Ensure response isn't already committed
            if (!res.headersSent) {
              return reject(new ObjectNotFoundError());
            }
            // If headers sent, destroy the response
            res.destroy();
            return reject(new ObjectNotFoundError());
          }
          
          // Other stream errors
          if (!res.headersSent) {
            return reject(err);
          }
          // If headers sent, destroy the response
          res.destroy();
          reject(err);
        });

        stream.on('end', () => {
          if (!errorOccurred) {
            resolve();
          }
        });

        stream.pipe(res);
      } catch (error: any) {
        console.error('Error creating stream:', error);
        
        // Normalize synchronous 404 errors
        if (isNotFoundError(error)) {
          return reject(new ObjectNotFoundError());
        }
        
        reject(error);
      }
    });
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
