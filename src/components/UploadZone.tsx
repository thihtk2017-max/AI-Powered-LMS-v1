import { useDropzone } from 'react-dropzone';
import { UploadCloud } from 'lucide-react';
import { useCallback } from 'react';

interface UploadZoneProps {
  onFileAccepted: (file: File) => void;
}

export default function UploadZone({ onFileAccepted }: UploadZoneProps) {
  const onDrop = useCallback((acceptedFiles: File[]) => {
    if (acceptedFiles.length > 0) {
      onFileAccepted(acceptedFiles[0]);
    }
  }, [onFileAccepted]);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'application/pdf': ['.pdf'],
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['.docx'],
      'image/jpeg': [],
      'image/png': [],
    },
    maxFiles: 1,
  });

  return (
    <div
      {...getRootProps()}
      className={`relative block w-full rounded-lg border-2 border-dashed p-12 text-center transition-colors duration-200 ease-in-out cursor-pointer ${isDragActive ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:border-gray-400'}`}>
      <input {...getInputProps()} />
      <UploadCloud className="mx-auto h-12 w-12 text-gray-400" />
      <span className="mt-2 block text-sm font-medium text-gray-900">
        {isDragActive ? 'Drop the file here ...' : 'Drag & drop a file here, or click to select'}
      </span>
      <span className="mt-1 block text-sm text-gray-500">PDF, DOCX, PNG, JPG</span>
    </div>
  );
}
