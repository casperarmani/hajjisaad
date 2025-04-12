'use client';

import React, { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { renderAsync } from 'docx-preview';
import * as XLSX from 'xlsx';

interface FilePreviewerProps {
  filePath: string;
  fileType: string;
}

// Enhanced FilePreviewer component with better document handling
const FilePreviewer: React.FC<FilePreviewerProps> = ({ filePath, fileType }) => {
  // State declarations
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [previewContent, setPreviewContent] = useState<string | null>(null);
  const [excelSheets, setExcelSheets] = useState<string[]>([]);
  const [activeSheet, setActiveSheet] = useState<string>('');
  // Use excelData state for grid rendering
  const [_excelData, setExcelData] = useState<any[][]>([]);
  // Track document conversion state
  const [_docConversionInProgress, setDocConversionInProgress] = useState(false);
  
  // Refs
  const docxContainerRef = useRef<HTMLDivElement>(null);
  const excelContainerRef = useRef<HTMLDivElement>(null);
  
  // Get file extension
  const fileExtension = filePath.split('.').pop()?.toLowerCase() || '';

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
        if (fileType.includes('word') || fileExtension === 'docx') {
          // DOCX file - use docx-preview with enhanced options
          if (docxContainerRef.current) {
            await renderAsync(arrayBuffer, docxContainerRef.current, undefined, {
              ignoreHeight: false,
              ignoreWidth: false,
              inWrapper: true,
              useBase64URL: true,
              className: "docx-renderer"
            });
          }
        } else if (fileExtension === 'doc') {
          // Old DOC format handling using specialized message until we implement a converter
          setDocConversionInProgress(true);
          
          // For DOC files, we can implement a more sophisticated solution in the future
          setError("DOC format preview is limited. Please download the file for better viewing.");
          setDocConversionInProgress(false);
        } else if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
          // Enhanced Excel file handling
          const wb = XLSX.read(arrayBuffer, { type: 'array' });
          const sheets = wb.SheetNames;
          
          if (sheets.length === 0) {
            throw new Error('Excel file contains no sheets');
          }
          
          setExcelSheets(sheets);
          const firstSheet = sheets[0];
          setActiveSheet(firstSheet);
          
          // Get the worksheet
          const ws = wb.Sheets[firstSheet];
          
          // Convert to HTML with enhanced styling and formatting
          const html = XLSX.utils.sheet_to_html(ws, { 
            id: 'excel-table',
            editable: false
          });
          setPreviewContent(html);
          
          // Also store as aoa (array of arrays) for potential future grid rendering
          const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
          setExcelData(aoa);
          
          // Apply Excel-like styling after render
          setTimeout(() => {
            applyExcelStyling();
          }, 100);
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
  }, [filePath, fileType, fileExtension]);
  
  // Function to handle changing excel sheets with improved rendering
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
      
      // Convert to HTML with enhanced formatting
      const html = XLSX.utils.sheet_to_html(ws, { 
        id: 'excel-table',
        editable: false
      });
      
      // Also store data as array for potential grid rendering
      const aoa = XLSX.utils.sheet_to_json(ws, { header: 1 }) as any[][];
      
      setActiveSheet(sheetName);
      setPreviewContent(html);
      setExcelData(aoa);
      
      // Apply Excel-like styling after render
      setTimeout(() => {
        applyExcelStyling();
      }, 100);
    } catch (err) {
      console.error('Error changing Excel sheet:', err);
      setError(err instanceof Error ? err.message : 'Failed to preview sheet');
    } finally {
      setLoading(false);
    }
  };
  
  // Function to apply Excel-like styling to the rendered table
  const applyExcelStyling = () => {
    try {
      const table = document.getElementById('excel-table');
      if (!table) return;
      
      // Add column headers and zebra striping
      const rows = table.querySelectorAll('tr');
      
      // Process header row
      if (rows.length > 0) {
        const headerRow = rows[0];
        headerRow.classList.add('excel-header-row');
        
        // Add column letters
        const cols = headerRow.querySelectorAll('td');
        cols.forEach((col, idx) => {
          const colLetter = String.fromCharCode(65 + idx); // A, B, C, etc.
          if (!col.getAttribute('data-column-index')) {
            col.setAttribute('data-column-index', colLetter);
          }
        });
      }
      
      // Process data rows
      rows.forEach((row, idx) => {
        // Add row numbers
        if (idx > 0) { // Skip header
          row.setAttribute('data-row-index', idx.toString());
          row.classList.add(idx % 2 === 0 ? 'excel-even-row' : 'excel-odd-row');
        }
        
        // Process cells for formatting
        const cells = row.querySelectorAll('td');
        cells.forEach(cell => {
          // Detect number cells and align right
          const cellValue = cell.textContent || '';
          if (!isNaN(Number(cellValue)) && cellValue.trim() !== '') {
            cell.classList.add('excel-number-cell');
          }
          
          // Add cell hover effect
          cell.classList.add('excel-cell');
        });
      });
    } catch (err) {
      console.warn('Error applying Excel styling:', err);
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
  
  // DOCX file preview with enhanced styling
  if (fileType.includes('word') || fileExtension === 'docx') {
    return (
      <div className="border border-slate-300 rounded-md bg-white shadow-sm">
        <div className="p-3 flex items-center border-b border-slate-200 bg-gradient-to-r from-indigo-50 to-white">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-indigo-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
              <path fill="#2196F3" d="M41,10H25v28h16c0.6,0,1-0.4,1-1V11C42,10.4,41.6,10,41,10z"/>
              <path fill="#BBDEFB" d="M25 10H7C6.4 10 6 10.4 6 11v26c0 0.6.4 1 1 1h18V10z"/>
              <path fill="#1565C0" d="M29 23L35 33 41 23z"/>
              <path fill="#E3F2FD" d="M31.5,18.9c-0.5,0-0.9,0.4-0.9,0.9s0.4,0.9,0.9,0.9s0.9-0.4,0.9-0.9S32,18.9,31.5,18.9z M35.5,18.9 c-0.5,0-0.9,0.4-0.9,0.9s0.4,0.9,0.9,0.9s0.9-0.4,0.9-0.9S36,18.9,35.5,18.9z"/>
              <path fill="#1565C0" d="M12 20H20V22H12zM12 25H23V27H12zM12 30H19V32H12z"/>
            </svg>
            <span className="text-sm font-medium text-indigo-700">Word Document Preview</span>
          </div>
        </div>
        
        <div 
          ref={docxContainerRef} 
          className="docx-container min-h-[300px] sm:min-h-[500px] max-h-[600px] sm:max-h-[800px] overflow-auto p-3 sm:p-6"
        />
        
        {/* Enhanced styling for DOCX documents */}
        <style jsx global>{`
          .docx-renderer {
            font-family: "Calibri", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
          }
          .docx-container {
            font-size: 12pt;
            line-height: 1.5;
            color: #000000;
            background: white;
          }
          .docx-container table {
            border-collapse: collapse;
            margin: 15px 0;
            border: 1px solid #94a3b8;
          }
          .docx-container td {
            border: 1px solid #94a3b8;
            padding: 8px;
            color: #000000;
          }
          .docx-container p {
            margin-bottom: 1em;
            color: #000000;
          }
          .docx-container h1, .docx-container h2, .docx-container h3, 
          .docx-container h4, .docx-container h5, .docx-container h6 {
            margin-top: 1.5em;
            margin-bottom: 0.75em;
            font-weight: 600;
            color: #000000;
            line-height: 1.2;
          }
          .docx-container h1 { font-size: 2em; }
          .docx-container h2 { font-size: 1.5em; }
          .docx-container h3 { font-size: 1.3em; }
          .docx-container h4 { font-size: 1em; font-weight: bold; }
          .docx-container ul, .docx-container ol {
            margin-left: 2em;
            margin-bottom: 1em;
          }
          .docx-container img {
            max-width: 100%;
            height: auto;
          }
          .docx-container .paging {
            border-bottom: 1px dashed #cbd5e1;
            margin: 30px 0;
            position: relative;
          }
          .docx-container .paging::after {
            content: "Page Break";
            position: absolute;
            bottom: -10px;
            left: 50%;
            transform: translateX(-50%);
            font-size: 0.75em;
            background: white;
            padding: 0 10px;
            color: #94a3b8;
          }
        `}</style>
      </div>
    );
  }
  
  // DOC file fallback with better guidance
  if (fileExtension === 'doc') {
    return (
      <div className="border border-slate-300 rounded-md p-4 bg-white shadow-sm">
        <div className="text-center py-6">
          <svg className="w-16 h-16 mx-auto text-blue-600 mb-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
            <path fill="#2196F3" d="M41,10H25v28h16c0.6,0,1-0.4,1-1V11C42,10.4,41.6,10,41,10z"/>
            <path fill="#BBDEFB" d="M25 10H7C6.4 10 6 10.4 6 11v26c0 0.6.4 1 1 1h18V10z"/>
            <path fill="#1565C0" d="M29 23L35 33 41 23z"/>
            <path fill="#E3F2FD" d="M31.5,18.9c-0.5,0-0.9,0.4-0.9,0.9s0.4,0.9,0.9,0.9s0.9-0.4,0.9-0.9S32,18.9,31.5,18.9z M35.5,18.9 c-0.5,0-0.9,0.4-0.9,0.9s0.4,0.9,0.9,0.9s0.9-0.4,0.9-0.9S36,18.9,35.5,18.9z"/>
            <path fill="#1565C0" d="M12 20H20V22H12zM12 25H23V27H12zM12 30H19V32H12z"/>
          </svg>
          <h3 className="text-lg font-medium text-gray-900 mb-2">Word Document (.doc)</h3>
          <p className="text-gray-700 mb-4">
            This is a legacy Microsoft Word format. For better compatibility and preview features,
            consider converting to the newer .docx format.
          </p>
          <div className="mt-4 mb-2">
            <a 
              href={filePath} 
              download
              className="inline-flex items-center px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-md shadow-sm text-sm font-medium transition"
            >
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download Document
            </a>
          </div>
        </div>
      </div>
    );
  }
  
  // Enhanced Excel file preview with better styling and sheet navigation
  if (fileType.includes('sheet') || ['xlsx', 'xls'].includes(fileExtension)) {
    return (
      <div className="border border-slate-300 rounded-md bg-white shadow-sm">
        <div className="p-3 flex items-center border-b border-slate-200 bg-gradient-to-r from-green-50 to-white">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-green-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
              <path fill="#4CAF50" d="M41,10H25v28h16c0.6,0,1-0.4,1-1V11C42,10.4,41.6,10,41,10z"/>
              <path fill="#E8F5E9" d="M25 10H7C6.4 10 6 10.4 6 11v26c0 0.6.4 1 1 1h18V10z"/>
              <path fill="#2E7D32" d="M23 21H15V23H23zM33 21H25V23H33zM23 25H15V27H23zM33 25H25V27H33zM23 29H15V31H23zM33 29H25V31H33zM23 17H15V19H23zM33 17H25V19H33z"/>
            </svg>
            <span className="text-sm font-medium text-green-700">Excel Spreadsheet</span>
            {activeSheet && <span className="ml-2 text-xs text-green-600">Sheet: {activeSheet}</span>}
          </div>
        </div>
        
        {/* Enhanced Excel sheet tabs */}
        {excelSheets.length > 1 && (
          <div className="flex overflow-x-auto border-b border-slate-200 bg-green-50 px-1">
            {excelSheets.map((sheetName) => (
              <button
                key={sheetName}
                onClick={() => handleSheetChange(sheetName)}
                className={`py-2 px-4 text-sm font-medium whitespace-nowrap rounded-t-md mx-0.5 mt-1 ${
                  activeSheet === sheetName
                    ? 'text-green-800 bg-white border border-b-0 border-slate-300'
                    : 'text-slate-700 hover:bg-green-100 hover:text-green-800'
                }`}
              >
                {sheetName}
              </button>
            ))}
          </div>
        )}
        
        {/* Excel content with grid header */}
        <div className="excel-container" ref={excelContainerRef}>
          <div className="overflow-x-auto p-2">
            <div className="min-w-full" dangerouslySetInnerHTML={{ __html: previewContent || '' }} />
          </div>
        </div>
        
        {/* Enhanced Excel styling */}
        <style jsx global>{`
          .excel-container {
            font-family: "Calibri", -apple-system, BlinkMacSystemFont, Helvetica, Arial, sans-serif;
            font-size: 12px;
            overflow: auto;
            max-height: 350px;
            position: relative;
          }
          
          @media (min-width: 640px) {
            .excel-container {
              max-height: 500px;
            }
          }
          
          #excel-table {
            border-collapse: collapse;
            width: 100%;
            border: 1px solid #d1d5db;
            empty-cells: show;
            background: white;
          }
          
          #excel-table tr {
            height: 20px;
          }
          
          #excel-table td, #excel-table th {
            border: 1px solid #d1d5db;
            padding: 3px 4px;
            min-width: 40px;
            height: 16px;
            position: relative;
            max-width: 250px;
            overflow: hidden;
            text-overflow: ellipsis;
            white-space: nowrap;
            color: #000000;
            font-size: 11px;
          }
          
          @media (min-width: 640px) {
            #excel-table td, #excel-table th {
              padding: 4px 6px;
              min-width: 60px;
              height: 18px;
              max-width: 400px;
              font-size: 12px;
            }
          }
          
          /* Row/column headers */
          #excel-table tr:first-child {
            background-color: #f1f5f9;
            font-weight: bold;
            color: #000000;
            position: sticky;
            top: 0;
            z-index: 10;
          }
          
          /* Column header hover */
          #excel-table tr:first-child td:hover {
            background-color: #e2e8f0;
          }
          
          /* Add Excel-like row hover */
          #excel-table tr:hover {
            background-color: #f8fafc;
          }
          
          /* Add Excel-like column hover */
          #excel-table td:hover {
            background-color: #f1f5f9;
          }
          
          /* Zebra striping */
          #excel-table tr.excel-even-row {
            background-color: #ffffff;
          }
          
          #excel-table tr.excel-odd-row {
            background-color: #f8fafc;
          }
          
          /* Style number cells */
          #excel-table td.excel-number-cell {
            text-align: right;
          }
          
          /* Grid lines and cell styles */
          #excel-table td.excel-cell {
            transition: background-color 0.1s;
          }
          
          /* Add row/column indicators */
          #excel-table tr[data-row-index]::before {
            content: attr(data-row-index);
            position: absolute;
            left: 0;
            width: 30px;
            text-align: center;
            background: #f1f5f9;
            border-right: 1px solid #d1d5db;
            color: #000000;
            font-weight: bold;
          }
          
          #excel-table td[data-column-index]::before {
            content: attr(data-column-index);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
            text-align: center;
            background: #f1f5f9;
            border-bottom: 1px solid #d1d5db;
            color: #000000;
            font-weight: bold;
          }
        `}</style>
      </div>
    );
  }
  
  // PDF preview
  if (fileType.includes('pdf') || fileExtension === 'pdf') {
    return (
      <div className="border border-slate-300 rounded-md bg-white shadow-sm">
        <div className="p-3 flex items-center border-b border-slate-200 bg-gradient-to-r from-red-50 to-white">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-red-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48">
              <path fill="#FF5722" d="M40 45L8 45 8 3 30 3 40 13z"/>
              <path fill="#FBE9E7" d="M38.5 14L29 14 29 4.5z"/>
              <path fill="#FFEBEE" d="M16 21H33V23H16zM16 25H29V27H16zM16 29H33V31H16zM16 33H29V35H16z"/>
            </svg>
            <span className="text-sm font-medium text-red-700">PDF Document</span>
          </div>
        </div>
        
        <iframe 
          src={filePath} 
          width="100%" 
          height="350px" 
          className="border-0 sm:h-[600px]"
          title="PDF preview"
        />
      </div>
    );
  }
  
  // Image preview
  if (fileType.includes('image') || ['jpg', 'jpeg', 'png', 'gif'].includes(fileExtension)) {
    return (
      <div className="border border-slate-300 rounded-md bg-white shadow-sm">
        <div className="p-3 flex items-center border-b border-slate-200 bg-gradient-to-r from-purple-50 to-white">
          <div className="flex items-center">
            <svg className="w-5 h-5 mr-2 text-purple-700" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="1.5"/>
              <polyline points="21 15 16 10 5 21"/>
            </svg>
            <span className="text-sm font-medium text-purple-700">Image Preview</span>
          </div>
        </div>
        
        <div className="flex justify-center p-2 sm:p-4">
          <Image src={filePath} alt="Preview" className="max-w-full max-h-[300px] sm:max-h-[600px] object-contain" width={800} height={600} />
        </div>
      </div>
    );
  }
  
  // Default fallback for other file types
  return (
    <div className="border border-slate-300 rounded-md bg-white shadow-sm p-8 text-center">
      <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto text-gray-400 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
      <h3 className="text-lg font-medium text-gray-900 mb-2">Preview Not Available</h3>
      <p className="text-gray-700 mb-4">This file type doesn't support preview in the browser.</p>
      <a 
        href={filePath} 
        target="_blank" 
        rel="noopener noreferrer"
        className="inline-flex items-center px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-md shadow-sm text-sm font-medium transition"
      >
        <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
        </svg>
        Download File
      </a>
    </div>
  );
};

export default FilePreviewer;