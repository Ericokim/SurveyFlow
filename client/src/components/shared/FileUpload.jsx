import { useState, useRef, useCallback } from 'react';
import { Button } from '../ui/button';
import { Card } from '../ui/card';
import { Upload, X, Image, FileText, AlertCircle } from 'lucide-react';
import { cn } from '../../lib/utils';

/**
 * Reusable File Upload Component with drag-and-drop support
 * @param {Object} props
 * @param {Function} props.onFileSelect - Callback when file is selected
 * @param {Function} props.onFileRemove - Callback when file is removed
 * @param {Array} props.acceptedTypes - Array of MIME types (e.g., ['image/*'])
 * @param {number} props.maxSize - Maximum file size in bytes (default: 5MB)
 * @param {boolean} props.disabled - Whether upload is disabled
 * @param {string} props.className - Additional CSS classes
 * @param {string} props.description - Help text to display
 * @param {File} props.currentFile - Currently selected file
 * @param {string} props.currentFileUrl - URL of current file for preview
 * @param {boolean} props.showPreview - Whether to show image preview
 */
export function FileUpload({
  onFileSelect,
  onFileRemove,
  acceptedTypes = ['image/*'],
  maxSize = 5 * 1024 * 1024, // 5MB default
  disabled = false,
  className,
  description = 'Drag and drop or click to browse',
  currentFile = null,
  currentFileUrl = null,
  showPreview = true,
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);

  // Format file size for display
  const formatFileSize = useCallback((bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }, []);

  // Validate file
  const validateFile = useCallback((file) => {
    // Check file size
    if (file.size > maxSize) {
      return `File size must be less than ${formatFileSize(maxSize)}`;
    }

    // Check file type
    const isValidType = acceptedTypes.some(type => {
      if (type === 'image/*') {
        return file.type.startsWith('image/');
      }
      return file.type === type || file.name.toLowerCase().endsWith(type.replace('*', ''));
    });

    if (!isValidType) {
      return `File type not supported. Accepted types: ${acceptedTypes.join(', ')}`;
    }

    return null;
  }, [acceptedTypes, maxSize, formatFileSize]);

  // Handle file selection
  const handleFileSelect = useCallback((file) => {
    const validationError = validateFile(file);

    if (validationError) {
      setError(validationError);
      return;
    }

    setError(null);
    onFileSelect?.(file);
  }, [validateFile, onFileSelect]);

  // Handle drag events
  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    if (!disabled) {
      setIsDragOver(true);
    }
  }, [disabled]);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    setIsDragOver(false);

    if (disabled) return;

    const files = Array.from(e.dataTransfer.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [disabled, handleFileSelect]);

  // Handle click to open file dialog
  const handleClick = useCallback(() => {
    if (!disabled && fileInputRef.current) {
      fileInputRef.current.click();
    }
  }, [disabled]);

  // Handle input change
  const handleInputChange = useCallback((e) => {
    const files = Array.from(e.target.files);
    if (files.length > 0) {
      handleFileSelect(files[0]);
    }
  }, [handleFileSelect]);

  // Handle file removal
  const handleRemove = useCallback((e) => {
    e.stopPropagation();
    setError(null);
    onFileRemove?.();
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, [onFileRemove]);

  // Render file preview
  const renderFilePreview = () => {
    if (!currentFile && !currentFileUrl) return null;

    const isImage = currentFile?.type?.startsWith('image/') ||
                   (currentFileUrl && showPreview);

    return (
      <div className="flex items-center gap-3 p-3 bg-gray-50 rounded-lg border">
        <div className="flex-shrink-0">
          {isImage ? (
            showPreview && (currentFileUrl || currentFile) ? (
              <img
                src={currentFileUrl || URL.createObjectURL(currentFile)}
                alt="Preview"
                className="w-12 h-12 object-cover rounded-md"
              />
            ) : (
              <Image className="w-6 h-6 text-gray-400" />
            )
          ) : (
            <FileText className="w-6 h-6 text-gray-400" />
          )}
        </div>

        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-900 truncate">
            {currentFile?.name || 'Current file'}
          </p>
          {currentFile?.size && (
            <p className="text-xs text-gray-500">
              {formatFileSize(currentFile.size)}
            </p>
          )}
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={handleRemove}
          disabled={disabled}
          className="flex-shrink-0 h-8 w-8 p-0 text-gray-400 hover:text-red-500"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>
    );
  };

  // Render upload area
  const renderUploadArea = () => (
    <Card
      className={cn(
        'border-2 border-dashed border-gray-300 bg-gray-50/50 transition-colors',
        'hover:border-gray-400 hover:bg-gray-100/50',
        'cursor-pointer',
        {
          'border-indigo-400 bg-indigo-50': isDragOver && !disabled,
          'border-red-300 bg-red-50': error,
          'opacity-50 cursor-not-allowed': disabled,
        },
        className
      )}
      onClick={handleClick}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <div className="p-6 text-center">
        <Upload
          className={cn(
            'mx-auto h-8 w-8 mb-4 text-gray-400',
            {
              'text-indigo-500': isDragOver && !disabled,
              'text-red-400': error,
            }
          )}
        />

        <div className="space-y-2">
          <p className="text-sm font-medium text-gray-900">
            {isDragOver ? 'Drop file here' : description}
          </p>

          <p className="text-xs text-gray-500">
            Max size: {formatFileSize(maxSize)} •
            Accepted: {acceptedTypes.join(', ')}
          </p>
        </div>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(',')}
        onChange={handleInputChange}
        disabled={disabled}
        className="hidden"
      />
    </Card>
  );

  return (
    <div className="space-y-3">
      {/* Current file preview */}
      {(currentFile || currentFileUrl) && renderFilePreview()}

      {/* Upload area (only show if no current file or in replacement mode) */}
      {(!currentFile && !currentFileUrl) && renderUploadArea()}

      {/* Replace file button when file exists */}
      {(currentFile || currentFileUrl) && (
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={handleClick}
          disabled={disabled}
          className="text-xs"
        >
          <Upload className="w-3 h-3 mr-1" />
          Replace File
        </Button>
      )}

      {/* Error message */}
      {error && (
        <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
          <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
          <p className="text-sm text-red-700">{error}</p>
        </div>
      )}

      {/* Hidden file input for replace functionality */}
      {(currentFile || currentFileUrl) && (
        <input
          ref={fileInputRef}
          type="file"
          accept={acceptedTypes.join(',')}
          onChange={handleInputChange}
          disabled={disabled}
          className="hidden"
        />
      )}
    </div>
  );
}