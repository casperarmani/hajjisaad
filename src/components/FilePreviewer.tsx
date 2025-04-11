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
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
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
            await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
              ignoreHeight: false,
              ignoreWidth: false,
              inWrapper: true,
              defaultFontSize: 16,
            });
          }
        } else if (fileExtension === 'doc') {
          // Old DOC format - limited support
          setError("DOC format has limited preview support. For best results, convert to DOCX format.");
        } else if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
          // Excel file
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const sheets = wb.SheetNames;
          
          if (sheets.length === 0) {
            throw new Error('Excel file contains no sheets');
          }
          
          setExcelSheets(sheets);
          const firstSheet = sheets[0];
          setActiveSheet(firstSheet);
          
          // Render the first sheet initially
          const ws = wb.Sheets[firstSheet];
          const options = { 
            header: 1, 
            defval: '' 
          };
          
          // Get sheet data as HTML
          const html = XLSX.utils.sheet_to_html(ws, { 
            id: 'excel-table',
            editable: false 
          });
          
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
  
  // Function to handle changing excel sheets
  const handleSheetChange = async (sheetName: string) => {
    try {
      setLoading(true);
      
      const response = await fetch(filePath);
      if (!response.ok) {
        throw new Error(`Failed to fetch file: ${response.status} ${response.statusText}`);
      }
      
      const arrayBuffer = await response.arrayBuffer();
      const wb = XLSX.read(arrayBuffer, { type: 'array' });
      const ws = wb.Sheets[sheetName];
      
      const html = XLSX.utils.sheet_to_html(ws, { 
        id: 'excel-table',
        editable: false 
      });
      
      setActiveSheet(sheetName);
      setPreviewContent(html);
    } catch (err) {
      console.error('Error changing Excel sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview sheet');
    } finally {
      setLoading(false);
    }
  };
  
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
    return (
      <div className="border border-slate-300 rounded-md p-4 bg-white shadow-sm">
        <div className="mb-2 text-sm font-medium text-blue-700 border-b border-slate-200 pb-2">Word Document Preview</div>
        <div 
          ref={docxContainerRef} 
          className="docx-container min-h-[400px] overflow-auto my-2"
        />
        <style jsx global>{`
          .docx-container {
            font-size: 16px;
            line-height: 1.5;
            color: #1e293b;
          }
          .docx-container table {
            border-collapse: collapse;
            margin: 15px 0;
            border: 1px solid #94a3b8;
          }
          .docx-container td {
            border: 1px solid #94a3b8;
            padding: 8px;
          }
          .docx-container p {
            margin-bottom: 14px;
          }
          .docx-container h1, .docx-container h2, .docx-container h3, 
          .docx-container h4, .docx-container h5, .docx-container h6 {
            margin-top: 20px;
            margin-bottom: 10px;
            font-weight: 600;
            color: #1e40af;
          }
        `}</style>
      </div>
    );
  }
  
  if (fileExtension === 'doc') {
    return (
      <div className="bg-yellow-50 border-l-4 border-yellow-500 p-4">
        <p className="text-yellow-700">This is an older DOC format file with limited preview support.</p>
        <div className="mt-4 flex space-x-3">
          <a 
            href={filePath} 
            download
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md text-sm font-medium transition"
          >
            Download File
          </a>
        </div>
      </div>
    );
  }
  
  if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
    return (
      <div className="border border-slate-300 rounded-md bg-white shadow-sm">
        <div className="mb-2 text-sm font-medium text-blue-700 border-b border-slate-200 p-3">
          Excel Spreadsheet Preview {activeSheet && `- Sheet: ${activeSheet}`}
        </div>
        
        {/* Sheet tabs */}
        {excelSheets.length > 1 && (
          <div className="flex overflow-x-auto border-b border-slate-200 bg-blue-50 px-2">
            {excelSheets.map((sheetName) => (
              <button
                key={sheetName}
                onClick={() => handleSheetChange(sheetName)}
                className={`py-2 px-4 text-sm font-medium whitespace-nowrap ${
                  activeSheet === sheetName
                    ? 'text-blue-700 border-b-2 border-blue-600 bg-white'
                    : 'text-slate-700 hover:text-blue-800 hover:bg-blue-100'
                }`}
              >
                {sheetName}
              </button>
            ))}
          </div>
        )}
        
        {/* Excel content */}
        <div className="overflow-x-auto p-4">
          <div dangerouslySetInnerHTML={{ __html: previewContent || '' }} />
          <style jsx global>{`
            #excel-table {
              border-collapse: collapse;
              width: 100%;
              font-size: 14px;
              border: 1px solid #cbd5e1;
            }
            #excel-table td, #excel-table th {
              border: 1px solid #94a3b8;
              padding: 8px;
              color: #1e293b;
            }
            #excel-table th {
              padding-top: 10px;
              padding-bottom: 10px;
              text-align: left;
              background-color: #3b82f6;
              color: white;
              font-weight: 600;
            }
            #excel-table tr:nth-child(even) {
              background-color: #eff6ff;
            }
            #excel-table tr:nth-child(odd) {
              background-color: white;
            }
            #excel-table tr:hover {
              background-color: #dbeafe;
            }
          `}</style>
        </div>
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