import { useEffect, useState, useRef } from 'react';
import * as pdfjsLib from 'pdfjs-dist/build/pdf';
import { renderAsync } from 'docx-preview';

// Set up PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

interface DocumentViewerProps {
  file: File;
}

export default function DocumentViewer({ file }: DocumentViewerProps) {
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!file) return;

    const renderDocument = async () => {
      setIsLoading(true);
      setError(null);

      if (containerRef.current) {
        containerRef.current.innerHTML = '';
      }

      try {
        if (file.type === 'application/pdf') {
          await renderPDF(file);
        } else if (
          file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
          file.name.endsWith('.docx')
        ) {
          await renderDOCX(file);
        } else if (file.type.startsWith('image/')) {
          await renderImage(file);
        } else {
          setError('Định dạng tệp không được hỗ trợ để xem trước.');
        }
      } catch (err) {
        console.error('Error rendering document:', err);
        setError('Không thể hiển thị tài liệu. Vui lòng thử lại.');
      } finally {
        setIsLoading(false);
      }
    };

    renderDocument();
  }, [file]);

  const renderPDF = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;

    if (!containerRef.current) return;

    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const viewport = page.getViewport({ scale: 1.5 });
      
      const canvas = document.createElement('canvas');
      canvas.className = 'mb-4 shadow-sm mx-auto block max-w-full';
      const context = canvas.getContext('2d');
      canvas.height = viewport.height;
      canvas.width = viewport.width;

      if (context) {
        await page.render({ canvasContext: context, viewport }).promise;
        containerRef.current.appendChild(canvas);
      }
    }
  };

  const renderDOCX = async (file: File) => {
    const arrayBuffer = await file.arrayBuffer();
    if (containerRef.current) {
      await renderAsync(arrayBuffer, containerRef.current, undefined, {
        className: 'docx-content',
        inWrapper: true,
        ignoreWidth: false,
        ignoreHeight: false,
      });
    }
  };

  const renderImage = async (file: File) => {
    return new Promise<void>((resolve) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        if (containerRef.current && e.target?.result) {
          const img = document.createElement('img');
          img.src = e.target.result as string;
          img.className = 'max-w-full h-auto mx-auto';
          containerRef.current.appendChild(img);
        }
        resolve();
      };
      reader.readAsDataURL(file);
    });
  };

  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md p-4 h-full flex flex-col overflow-hidden">
      <h3 className="font-bold text-lg mb-2 text-gray-800 dark:text-white">Document Preview</h3>
      <div className="w-full flex-grow border rounded-md bg-gray-50 dark:bg-gray-900 overflow-auto p-4 custom-scrollbar">
        {isLoading && (
          <div className="flex flex-col items-center justify-center h-full space-y-2">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
            <p className="text-gray-500 text-sm">Đang xử lý tài liệu...</p>
          </div>
        )}
        
        {error && (
          <div className="flex items-center justify-center h-full text-red-500 p-4 text-center">
            <p>{error}</p>
          </div>
        )}

        <div 
          ref={containerRef} 
          className={`w-full ${isLoading ? 'hidden' : 'block'}`}
        />
      </div>
      <style>{`
        .docx-content {
          background: white !important;
          padding: 20px !important;
          color: black !important;
        }
        .custom-scrollbar::-webkit-scrollbar {
          width: 8px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: #cbd5e1;
          border-radius: 4px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: #94a3b8;
        }
      `}</style>
    </div>
  );
}

