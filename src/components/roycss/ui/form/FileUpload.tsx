/**
 * ROYCSS File Upload Component
 * @module roycss/ui/form/FileUpload
 * @description Advanced file upload with drag & drop, preview, and progress
 */

'use client';

import React, { useState, useCallback, useRef } from 'react';
import { cn, generateId, formatFileSize } from '@/components/roycss/shared/utils';
import type { UploadedFile, FileUploadStatus } from '@/lib/roycss/types';

// ============================================================================
// Types
// ============================================================================

export interface FileUploadProps {
  /** Accepted file types */
  accept?: string;
  /** Maximum file size in bytes */
  maxSize?: number;
  /** Maximum number of files */
  maxFiles?: number;
  /** Current uploaded files */
  value?: UploadedFile[];
  /** Callback when files change */
  onChange?: (files: UploadedFile[]) => void;
  /** Label for the upload area */
  label?: string;
  /** Helper text */
  helperText?: string;
  /** Error message */
  error?: string;
  /** Upload URL for automatic upload */
  uploadUrl?: string;
  /** Custom upload handler */
  onUpload?: (file: File) => Promise<string>;
  /** Show preview for images */
  showPreview?: boolean;
  /** Disabled state */
  disabled?: boolean;
  /** Required field */
  required?: boolean;
  /** Allow multiple files */
  multiple?: boolean;
  /** Custom dropzone content */
  children?: React.ReactNode;
}

// ============================================================================
// Component
// ============================================================================

export function FileUpload({
  accept,
  maxSize = 10 * 1024 * 1024, // 10MB default
  maxFiles = 5,
  value = [],
  onChange,
  label,
  helperText,
  error,
  onUpload,
  showPreview = true,
  disabled = false,
  required = false,
  multiple = false,
  children,
}: FileUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [files, setFiles] = useState<UploadedFile[]>(value);
  const inputRef = useRef<HTMLInputElement>(null);
  const id = useMemo(() => generateId('file-upload'), []);

  // Sync external value
  React.useEffect(() => {
    if (value !== undefined) {
      setFiles(value);
    }
  }, [value]);

  // Validate and add files
  const addFiles = useCallback(
    async (newFiles: FileList | File[]) => {
      const fileArray = Array.from(newFiles);
      const newUploadedFiles: UploadedFile[] = [];
      const errors: string[] = [];

      // Check max files
      if (multiple && files.length + fileArray.length > maxFiles) {
        errors.push(`Maximum ${maxFiles} files allowed`);
      }

      for (const file of fileArray) {
        // Check file size
        if (file.size > maxSize) {
          errors.push(`${file.name} exceeds maximum size (${formatFileSize(maxSize)})`);
          continue;
        }

        // Create preview URL for images
        let previewUrl: string | undefined;
        if (showPreview && file.type.startsWith('image/')) {
          previewUrl = URL.createObjectURL(file);
        }

        const uploadedFile: UploadedFile = {
          id: generateId('file'),
          file,
          name: file.name,
          size: file.size,
          type: file.type,
          status: 'pending',
          progress: 0,
          previewUrl,
        };

        newUploadedFiles.push(uploadedFile);
      }

      // Update state
      const updatedFiles = multiple ? [...files, ...newUploadedFiles] : newUploadedFiles;
      setFiles(updatedFiles);
      onChange?.(updatedFiles);

      // Auto-upload if handler provided
      if (onUpload) {
        for (const uploadedFile of newUploadedFiles) {
          await simulateUpload(uploadedFile.id, updatedFiles);
        }
      }

      return errors;
    },
    [files, maxSize, maxFiles, multiple, showPreview, onUpload, onChange]
  );

  // Simulate upload with progress
  const simulateUpload = useCallback(
    async (fileId: string, currentFiles: UploadedFile[]) => {
      // Update to uploading
      setFiles(prev =>
        prev.map(f =>
          f.id === fileId ? { ...f, status: 'uploading' as FileUploadStatus } : f
        )
      );

      // Simulate progress
      for (let progress = 0; progress <= 100; progress += 10) {
        await new Promise(resolve => setTimeout(resolve, 100));
        setFiles(prev =>
          prev.map(f =>
            f.id === fileId ? { ...f, progress } : f
          )
        );
      }

      try {
        const file = currentFiles.find(f => f.id === fileId)?.file;
        if (!file) throw new Error('File not found');
        
        const url = await onUpload!(file);
        
        setFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? { ...f, status: 'success' as FileUploadStatus, progress: 100 }
              : f
          )
        );
      } catch (err) {
        setFiles(prev =>
          prev.map(f =>
            f.id === fileId
              ? {
                  ...f,
                  status: 'error' as FileUploadStatus,
                  error: err instanceof Error ? err.message : 'Upload failed',
                }
              : f
          )
        );
      }
    },
    [onUpload]
  );

  // Handle drag events
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    async (e: React.DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);

      if (disabled) return;

      if (e.dataTransfer.files.length > 0) {
        await addFiles(e.dataTransfer.files);
      }
    },
    [disabled, addFiles]
  );

  // Handle click to browse
  const handleClick = useCallback(() => {
    if (!disabled) {
      inputRef.current?.click();
    }
  }, [disabled]);

  // Handle input change
  const handleInputChange = useCallback(
    async (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.files && e.target.files.length > 0) {
        await addFiles(e.target.files);
        e.target.value = '';
      }
    },
    [addFiles]
  );

  // Remove file
  const removeFile = useCallback(
    (fileId: string) => {
      const fileToRemove = files.find(f => f.id === fileId);
      
      // Revoke object URL if exists
      if (fileToRemove?.previewUrl) {
        URL.revokeObjectURL(fileToRemove.previewUrl);
      }

      const updatedFiles = files.filter(f => f.id !== fileId);
      setFiles(updatedFiles);
      onChange?.(updatedFiles);
    },
    [files, onChange]
  );

  // Get status icon
  const getStatusIcon = (status: FileUploadStatus): React.ReactNode => {
    switch (status) {
      case 'uploading':
        return (
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-primary" />
        );
      case 'success':
        return (
          <svg className="w-4 h-4 text-success" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
          </svg>
        );
      case 'error':
        return (
          <svg className="w-4 h-4 text-destructive" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full">
      {/* Label */}
      {label && (
        <label htmlFor={id} className="block text-sm font-medium text-foreground mb-1.5">
          {label}
          {required && <span className="text-destructive ml-0.5">*</span>}
        </label>
      )}

      {/* Dropzone */}
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={handleClick}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleClick();
          }
        }}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={cn(
          'relative flex flex-col items-center justify-center rounded-lg border-2 border-dashed p-6 transition-colors cursor-pointer',
          isDragging
            ? 'border-primary bg-primary/5'
            : error
              ? 'border-destructive hover:border-destructive/50'
              : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-accent/50',
          disabled && 'opacity-50 cursor-not-allowed'
        )}
        aria-label={label ?? 'Upload files'}
      >
        {/* Hidden Input */}
        <input
          ref={inputRef}
          id={id}
          type="file"
          accept={accept}
          multiple={multiple}
          onChange={handleInputChange}
          className="sr-only"
          disabled={disabled}
        />

        {/* Content */}
        {children ?? (
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="p-3 rounded-full bg-muted">
              <svg className="w-6 h-6 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-foreground">
                Drop files here or <span className="text-primary">browse</span>
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                {accept ?? 'All files'} up to {formatFileSize(maxSize)}
                {multiple && ` · Max ${maxFiles} files`}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* File List */}
      {files.length > 0 && (
        <div className="mt-3 space-y-2">
          {files.map(file => (
            <div
              key={file.id}
              className={cn(
                'flex items-center gap-3 p-3 rounded-md border bg-background',
                file.status === 'error' && 'border-destructive/50'
              )}
            >
              {/* Preview / Icon */}
              <div className="w-10 h-10 rounded overflow-hidden bg-muted flex-shrink-0 flex items-center justify-center">
                {file.previewUrl ? (
                  <img
                    src={file.previewUrl}
                    alt={file.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <svg className="w-5 h-5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                )}
              </div>

              {/* Info */}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{file.name}</p>
                <p className="text-xs text-muted-foreground">{formatFileSize(file.size)}</p>
                
                {/* Progress Bar */}
                {file.status === 'uploading' && (
                  <div className="mt-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-300"
                      style={{ width: `${file.progress}%` }}
                    />
                  </div>
                )}

                {/* Error Message */}
                {file.status === 'error' && file.error && (
                  <p className="text-xs text-destructive mt-0.5">{file.error}</p>
                )}
              </div>

              {/* Status Icon */}
              <div className="flex-shrink-0">{getStatusIcon(file.status)}</div>

              {/* Remove Button */}
              <button
                type="button"
                onClick={() => removeFile(file.id)}
                className="p-1 rounded-sm hover:bg-muted text-muted-foreground hover:text-foreground"
                aria-label={`Remove ${file.name}`}
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Error */}
      {error && <p className="mt-1.5 text-xs text-destructive">{error}</p>}
      
      {/* Helper Text */}
      {helperText && !error && (
        <p className="mt-1.5 text-xs text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}

export default FileUpload;
