'use client';

import React, { useEffect, useRef, useState } from 'react';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

interface FilePreviewerProps {
  filePath: string;
  fileType: string;
}

const FilePreviewer: React.FC<FilePreviewerProps> = ({ filePath, fileType }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const docxContainerRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    const fetchAndProcessFile = async () => {
      if (!filePath) return;
      
      setLoading(true);
      setError(null);
      
      try {
        // Fetch the file as ArrayBuffer
        const response = await fetch(filePath);
        
        if (!response.ok) {
          throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
        }
        
        const arrayBuffer = await response.arrayBuffer();
        
        // Process based on file type
        const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
        
        if (fileType.includes('word') || fileExtension === 'docx') {
          // DOCX file
          if (docxContainerRef.current) {
            await renderAsync(arrayBuffer, docxContainerRef.current);
          }
        } else if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
          // Excel file
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const wsName = wb.SheetNames[0];
          const ws = wb.Sheets[wsName];
          const html = XLSX.utils.sheet_to_html(ws);
          setPreviewContent(html);
        } else if (fileType.includes('pdf') || fileExtension === 'pdf') {
          // PDF file - will be handled directly with iframe
        } else if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
          // Image file - will be handled directly with img tag
        } else {
          setError(`Unsupported file type: ${fileType || fileExtension}`);
        }
      } catch (err) {
        console.error('Error previewing file:', err);
        setError(err instanceof Error ? err.message : 'Failed to preview file');
      } finally {
        setLoading(false);
      }
    };
    
    fetchAndProcessFile();
  }, [filePath, fileType]);
  
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-indigo-500"></div>
        <p className="ml-3 text-indigo-600">Loading preview...</p>
      </div>
    );
  }
  
  if (error) {
    return (
      <div className="bg-red-50 border-l-4 border-red-500 p-4">
        <p className="text-red-700">{error}</p>
        <p className="mt-2">
          <a 
            href={filePath} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-indigo-600 hover:text-indigo-800"
          >
            Download the file to view it instead
          </a>
        </p>
      </div>
    );
  }
  
  // Determine the type of preview to render
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';
  
  if (fileType.includes('word') || fileExtension === 'docx') {
    return <div ref={docxContainerRef} className="docx-container border rounded-md p-4 min-h-[400px] bg-white"></div>;
  }
  
  if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
    return (
      <div className="overflow-x-auto border rounded-md p-4 bg-white">
        <div dangerouslySetInnerHTML={{ __html: previewContent || '' }} />
      </div>
    );
  }
  
  if (fileType.includes('pdf') || fileExtension === 'pdf') {
    return (
      <iframe 
        src={filePath} 
        width="100%" 
        height="600px" 
        className="border rounded-md"
        title="PDF preview"
      />
    );
  }
  
  if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
    return (
      <div className="flex justify-center p-4 bg-white border rounded-md">
        <img src={filePath} alt="Preview" className="max-w-full max-h-[600px]" />
      </div>
    );
  }
  
  // Default fallback for other file types
  return (
    <div className="bg-gray-50 border rounded-md p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <p className="mt-4 text-gray-700">Preview not available for this file type.</p>
      <a 
        href={filePath} 
        target="_blank" 
        rel="noopener noreferrer"
        className="mt-4 inline-block px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition"
      >
        Download File
      </a>
    </div>
  );
};

export default FilePreviewer;