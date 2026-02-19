import { useNavigate, useParams } from 'react-router-dom';
import { HiArrowLeft, HiPlus, HiX, HiOutlinePencil } from 'react-icons/hi';
import Sidebar from '../components/Sidebar';
import Dropdown from '../components/Dropdown';
import { useState, useEffect, useCallback } from 'react';
import { showToast } from '../components/ToastNotification';
import { documentAPI, getErrorMessage } from '../services/api';

function AddKnowledgeData() {
  const navigate = useNavigate();
  const { id } = useParams();
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [dataContent, setDataContent] = useState('');
  const [dataType, setDataType] = useState('text');
  const [textFileName, setTextFileName] = useState('');
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isDeleteConfirmOpen, setIsDeleteConfirmOpen] = useState(false);
  const [fileToDelete, setFileToDelete] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editingFile, setEditingFile] = useState(null);
  const [editContent, setEditContent] = useState('');
  const [fileError, setFileError] = useState('');
  const [isDragging, setIsDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [document, setDocument] = useState(null);

  const loadDocument = useCallback(async () => {
    if (!id) return;
    
    try {
      const doc = await documentAPI.getDocument(id);
      setDocument(doc);
      // Load existing files - preserve original sourceFiles structure
      if (doc.sourceFiles && Array.isArray(doc.sourceFiles) && doc.sourceFiles.length > 0) {
        const files = doc.sourceFiles.map((file, index) => {
          // Preserve original file structure but add UI metadata
          return {
            id: `existing-${index}`,
            name: file.name || file.fileName || `File ${index + 1}`,
            fileName: file.fileName || file.name || `File ${index + 1}`,
            type: 'file',
            content: file.text || '',
            text: file.text || '',
            blocks: file.blocks || (file.text ? [{ text: file.text, label: 'Content' }] : []),
            existing: true,
            // Preserve original sourceFile structure for submission
            originalSourceFile: file
          };
        });
        setUploadedFiles(files);
      } else {
        // Clear uploadedFiles if document has no files
        setUploadedFiles([]);
      }
    } catch (err) {
      console.error('Error loading document:', err);
      showToast(getErrorMessage(err), 'error');
      setError(getErrorMessage(err));
      // Clear uploadedFiles on error
      setUploadedFiles([]);
    }
  }, [id]);

  // Load document on mount and when id changes
  useEffect(() => {
    if (id) {
      // Clear all state when switching to different knowledge
      setUploadedFiles([]);
      setDataContent('');
      setTextFileName('');
      setError(null);
      setDocument(null);
      loadDocument();
    }
  }, [id, loadDocument]);

  // Process pending OCR files when id becomes available
  useEffect(() => {
    if (id && uploadedFiles.length > 0) {
      // Find files that need OCR but haven't been processed yet
      const pendingFiles = uploadedFiles.filter(file => 
        file.needsOCR && 
        !file.processingOCR && 
        !file.text && 
        !file.blocks && 
        file.file instanceof File
      );
      
      if (pendingFiles.length > 0) {
        pendingFiles.forEach(file => {
          const fileId = file.id;
          setUploadedFiles(prevFiles => 
            prevFiles.map(f => 
              f.id === fileId ? { ...f, processingOCR: true } : f
            )
          );
          showToast(`กำลังประมวลผลไฟล์ ${file.name} ด้วย OCR...`, 'info');
          processFileWithOCR(id, file.file, fileId);
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]); // Only run when id changes, not when uploadedFiles changes to avoid infinite loop

  // Get file type icon and label
  const getFileTypeInfo = (fileName) => {
    const extension = fileName.toLowerCase().split('.').pop();
    const typeMap = {
      'pdf': { icon: '📄', label: 'PDF', color: 'text-red-600' },
      'png': { icon: '🖼️', label: 'Image', color: 'text-blue-600' },
      'jpg': { icon: '🖼️', label: 'Image', color: 'text-blue-600' },
      'jpeg': { icon: '🖼️', label: 'Image', color: 'text-blue-600' },
      'gif': { icon: '🖼️', label: 'Image', color: 'text-blue-600' },
      'txt': { icon: '📝', label: 'Text', color: 'text-gray-600' },
      'doc': { icon: '📘', label: 'Word', color: 'text-blue-700' },
      'docx': { icon: '📘', label: 'Word', color: 'text-blue-700' },
    };
    return typeMap[extension] || { icon: '📎', label: extension.toUpperCase(), color: 'text-gray-600' };
  };

  // Get PDF page count from OCR result (if available)
  const getPDFPageCount = (file) => {
    // Check if OCR result contains page information
    if (file.pages && Array.isArray(file.pages) && file.pages.length > 0) {
      return file.pages.length;
    }
    // Check if blocks contain page info
    if (file.blocks && Array.isArray(file.blocks)) {
      const pageBlocks = file.blocks.filter(b => b.page);
      if (pageBlocks.length > 0) {
        const maxPage = Math.max(...pageBlocks.map(b => b.page || 0));
        return maxPage;
      }
    }
    return null;
  };

  // Format processing time
  const formatProcessingTime = (seconds) => {
    if (!seconds) return null;
    if (seconds < 60) {
      return `${Math.round(seconds)} วินาที`;
    }
    const minutes = Math.floor(seconds / 60);
    const secs = Math.round(seconds % 60);
    return `${minutes} นาที ${secs} วินาที`;
  };

  // Process file with OCR
  const processFileWithOCR = async (documentId, file, fileId) => {
    const startTime = Date.now();
    
    try {
      const result = await documentAPI.processFileWithOCR(documentId, file);
      const processingTime = (Date.now() - startTime) / 1000; // in seconds
      
      if (result.ok && result.text) {
        // Extract page count from result if available
        const pageCount = result.pages && Array.isArray(result.pages) ? result.pages.length : null;
        
        // Update file with OCR result
        setUploadedFiles(prevFiles => 
          prevFiles.map(f => 
            f.id === fileId 
              ? {
                  ...f,
                  content: result.text,
                  text: result.text,
                  blocks: result.blocks && result.blocks.length > 0 
                    ? result.blocks 
                    : [{ text: result.text, label: 'Content' }],
                  pages: result.pages || f.pages, // Store pages info
                  needsOCR: false,
                  processingOCR: false,
                  processingTime: processingTime,
                  pageCount: pageCount || f.pageCount || (result.pages ? result.pages.length : null)
                }
              : f
          )
        );
        showToast('ประมวลผล OCR สำเร็จ', 'success');
      } else {
        throw new Error(result.error || 'OCR processing failed');
      }
    } catch (err) {
      console.error('OCR processing error:', err);
      const errorMsg = getErrorMessage(err);
      const processingTime = (Date.now() - startTime) / 1000;
      
      // Update file to show error state
      setUploadedFiles(prevFiles => 
        prevFiles.map(f => 
          f.id === fileId 
            ? {
                ...f,
                needsOCR: true,
                processingOCR: false,
                ocrError: errorMsg,
                processingTime: processingTime
              }
            : f
        )
      );
      showToast(`OCR processing failed: ${errorMsg}`, 'error');
    }
  };

  const dataTypeOptions = [
    { value: 'text', label: 'Text' },
    { value: 'file', label: 'File' },
  ];

  // ตรวจสอบไฟล์ก่อนเพิ่ม
  const validateFile = (file) => {
    const maxSize = 5 * 1024 * 1024; // 5 MB in bytes
    
    if (!file) {
      return { valid: false, message: 'กรุณาเลือกไฟล์' };
    }

    // ตรวจสอบว่าเป็น PDF เท่านั้น
    const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    if (!isPDF) {
      return { 
        valid: false, 
        message: 'รองรับเฉพาะไฟล์ PDF เท่านั้น กรุณาอัพโหลดไฟล์ PDF' 
      };
    }

    if (file.size > maxSize) {
      return { 
        valid: false, 
        message: `ขนาดไฟล์เกิน 5 MB (ขนาดไฟล์: ${(file.size / 1024 / 1024).toFixed(2)} MB)` 
      };
    }

    return { valid: true, message: '' };
  };

  const handleFileAdd = async (file) => {
    // ตรวจสอบว่าเป็น File object หรือไม่
    if (file instanceof File) {
      const validation = validateFile(file);
      if (!validation.valid) {
        setFileError(validation.message);
        return;
      }
    }

    setFileError(''); // Clear error if valid
    const fileSize = file instanceof File ? file.size : null;
    const fileSizeMB = fileSize ? (fileSize / 1024 / 1024).toFixed(2) : null;
    
    // For text files, create file object directly
    if (dataType === 'text' && dataContent) {
      const newFile = { 
        id: Date.now(), 
        name: file.name || textFileName || 'text-file.txt', 
        type: 'text',
        content: dataContent,
        text: dataContent,
        blocks: [
          {
            text: dataContent,
            label: 'Content'
          }
        ]
      };
      setUploadedFiles([...uploadedFiles, newFile]);
      setDataContent('');
      setTextFileName('');
      return;
    }
    
    // For actual file uploads - only PDF files are supported
    if (file instanceof File) {
      // Only PDF files are supported
      const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
      if (!isPDF) {
        setFileError('รองรับเฉพาะไฟล์ PDF เท่านั้น กรุณาอัพโหลดไฟล์ PDF');
        return;
      }
      
      // For PDF files, process with OCR immediately
      const fileId = Date.now();
      const fileTypeInfo = getFileTypeInfo(file.name);
      
      const newFile = {
        id: fileId,
        name: file.name,
        type: 'file',
        file: file, // Store File object for OCR processing
        size: fileSize,
        sizeMB: fileSizeMB,
        fileType: fileTypeInfo.label,
        fileIcon: fileTypeInfo.icon,
        isPDF: true,
        needsOCR: true, // Flag that this needs OCR processing
        processingOCR: true, // Track OCR processing state
        processingStartTime: Date.now()
      };
      setUploadedFiles([...uploadedFiles, newFile]);
      showToast('กำลังประมวลผลไฟล์ PDF ด้วย OCR...', 'info');
      
      // Process file with OCR
      if (id) {
        processFileWithOCR(id, file, fileId);
      } else {
        showToast('กรุณาบันทึก Knowledge Base ก่อนอัพโหลดไฟล์', 'warning');
      }
    } else {
      // Fallback for non-File objects
    const newFile = { 
      id: Date.now(), 
      name: file.name || file, 
      type: dataType,
        content: dataContent || '',
        size: fileSize,
        sizeMB: fileSizeMB
    };
    setUploadedFiles([...uploadedFiles, newFile]);
    setDataContent('');
    }
  };

  const handleDeleteClick = (fileId) => {
    setFileToDelete(fileId);
    setIsDeleteConfirmOpen(true);
  };

  const handleConfirmDelete = () => {
    if (fileToDelete) {
      setUploadedFiles(uploadedFiles.filter(f => f.id !== fileToDelete));
    }
    setIsDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  const handleCancelDelete = () => {
    setIsDeleteConfirmOpen(false);
    setFileToDelete(null);
  };

  const handleEditFile = (file) => {
    setEditingFile(file);
    setEditContent(file.content || '');
    setIsEditModalOpen(true);
  };

  const handleSaveEdit = () => {
    setUploadedFiles(uploadedFiles.map(f => {
      if (f.id === editingFile.id) {
        const updated = { ...f, content: editContent, text: editContent };
        // Update blocks if content changed
        if (editContent.trim()) {
          updated.blocks = [{ text: editContent, label: 'Content' }];
        } else {
          updated.blocks = [];
        }
        return updated;
      }
      return f;
    }));
    setIsEditModalOpen(false);
    setEditingFile(null);
    setEditContent('');
  };

  const handleCancelEdit = () => {
    setIsEditModalOpen(false);
    setEditingFile(null);
    setEditContent('');
  };

  // Mock files feature removed - use real file upload only

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    if (!id) {
      setError('Document ID is required');
      setLoading(false);
      return;
    }

    if (uploadedFiles.length === 0) {
      setError('กรุณาอัพโหลดไฟล์อย่างน้อย 1 ไฟล์');
      setLoading(false);
      return;
    }

    // Validate that all files have content
    const filesWithContent = uploadedFiles.filter(file => {
      const hasText = (file.text || file.content) && (file.text || file.content).trim();
      const hasBlocks = file.blocks && Array.isArray(file.blocks) && file.blocks.length > 0;
      return hasText || hasBlocks;
    });

    if (filesWithContent.length === 0) {
      setError('กรุณาอัพโหลดไฟล์ที่มีเนื้อหาอย่างน้อย 1 ไฟล์');
      setLoading(false);
      return;
    }

    try {
      // Convert uploaded files to sourceFiles format
      const sourceFiles = uploadedFiles.map(file => {
        // If file is existing, use original sourceFile structure if available
        // Otherwise reconstruct from current file data
        if (file.existing && file.originalSourceFile) {
          // Use original structure but update text/blocks if edited
          const original = { ...file.originalSourceFile };
          if (file.text || file.content) {
            original.text = file.text || file.content || original.text || '';
            if (file.blocks && file.blocks.length > 0) {
              original.blocks = file.blocks;
            } else if (original.text) {
              original.blocks = [{ text: original.text, label: 'Content' }];
            }
          }
          // Remove UI-only properties
          const { id, existing, originalSourceFile, type, content, size, sizeMB, needsOCR, file: fileObj, ...cleanFile } = original;
          return cleanFile;
        }
        
        // For new files, create proper sourceFiles structure
        const sourceFile = {
          name: file.name || file.fileName || 'file.txt',
          fileName: file.fileName || file.name || 'file.txt',
        };
        
        // Add text if available
        if (file.text || file.content) {
          sourceFile.text = (file.text || file.content || '').trim();
        }
        
        // Add blocks if available
        if (file.blocks && file.blocks.length > 0) {
          // Ensure blocks have text content
          sourceFile.blocks = file.blocks
            .map(block => {
              if (typeof block === 'string') {
                return { text: block.trim(), label: 'Content' };
              }
              if (typeof block === 'object' && block.text) {
                return { text: block.text.trim(), label: block.label || 'Content' };
              }
              return null;
            })
            .filter(block => block && block.text && block.text.length > 0);
        }
        
        // If no blocks but has text, create blocks from text
        if ((!sourceFile.blocks || sourceFile.blocks.length === 0) && sourceFile.text) {
          sourceFile.blocks = [{ text: sourceFile.text, label: 'Content' }];
        }
        
        // Ensure we have either text or blocks
        if (!sourceFile.text && (!sourceFile.blocks || sourceFile.blocks.length === 0)) {
          // Skip files without content (needsOCR files without processed content)
          console.warn(`Skipping file ${sourceFile.name} - no text or blocks content`);
          return null;
        }
        
        return sourceFile;
      }).filter(file => {
        // Filter out null files and files without text or blocks
        if (!file) return false;
        const hasText = file.text && file.text.trim().length > 0;
        const hasBlocks = file.blocks && Array.isArray(file.blocks) && file.blocks.length > 0;
        return hasText || hasBlocks;
      });

      if (sourceFiles.length === 0) {
        setError('กรุณาอัพโหลดไฟล์ที่มีเนื้อหาอย่างน้อย 1 ไฟล์ (ไฟล์ที่ต้องการ OCR ต้องรอให้ประมวลผลเสร็จก่อน)');
        setLoading(false);
        return;
      }

      // Validate sourceFiles structure before sending
      const invalidFiles = sourceFiles.filter(file => {
        const hasText = file.text && file.text.trim().length > 0;
        const hasBlocks = file.blocks && Array.isArray(file.blocks) && file.blocks.length > 0;
        return !hasText && !hasBlocks;
      });
      
      if (invalidFiles.length > 0) {
        console.error('Invalid sourceFiles structure:', invalidFiles);
        setError(`มีไฟล์ ${invalidFiles.length} ไฟล์ที่ไม่มีเนื้อหา กรุณาตรวจสอบไฟล์อีกครั้ง`);
        setLoading(false);
        return;
      }

      console.log('Updating document with files:', sourceFiles);
      console.log('SourceFiles validation:', sourceFiles.map(f => ({
        name: f.name,
        hasText: !!(f.text && f.text.trim()),
        hasBlocks: !!(f.blocks && f.blocks.length > 0),
        blocksCount: f.blocks ? f.blocks.length : 0
      })));

      // Update document with new sourceFiles
      await documentAPI.updateDocument(id, {
        sourceFiles: sourceFiles
      });

      showToast('บันทึกไฟล์สำเร็จ กำลังประมวลผลและแปลงเป็น vector...', 'success');
      
      // Clear state after successful save to prevent files from persisting
      setUploadedFiles([]);
      setDataContent('');
      setTextFileName('');
      setError(null);
      
      // Navigate back to knowledge page
      setTimeout(() => {
    navigate('/knowledge');
      }, 1000);
    } catch (err) {
      const errorMsg = getErrorMessage(err);
      setError(errorMsg);
      console.error('Error saving files:', err);
      showToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className='flex h-screen bg-white relative'>
      {/* Sidebar Component */}
      <Sidebar onCollapseChange={setIsSidebarCollapsed} />

      {/* Main Content */}
      <main className={`flex-1 bg-white px-8 py-6 overflow-auto flex flex-col transition-all duration-300 ${isSidebarCollapsed ? 'pl-16' : ''}`}>
        {/* Back Button */}
        <button
          onClick={() => navigate('/knowledge')}
          className='flex items-center gap-2 text-gray-600 hover:text-gray-800 transition-colors mb-6 self-start'
        >
          <HiArrowLeft className='text-lg' />
          <span>Back to Knowledge</span>
        </button>

        <form onSubmit={handleSubmit} className='flex-1 max-w-6xl'>
          {/* Error Message */}
          {error && (
            <div className='mb-6 p-4 bg-red-50 border-2 border-red-300 rounded-lg shadow-sm'>
              <div className='flex items-start gap-2'>
                <span className='text-red-600 font-bold text-lg'>⚠️</span>
                <div className='flex-1'>
                  <p className='text-red-800 text-sm font-semibold mb-1'>เกิดข้อผิดพลาด:</p>
                  <p className='text-red-700 text-sm whitespace-pre-wrap break-words'>{error}</p>
                </div>
                <button
                  type='button'
                  onClick={() => setError(null)}
                  className='text-red-400 hover:text-red-600 transition-colors flex-shrink-0'
                >
                  <HiX className='text-lg' />
                </button>
              </div>
            </div>
          )}

          {/* Header */}
          <div className='mb-8'>
            <h1 className='text-3xl font-bold text-gray-800 mb-2'>Add Data to Knowledge</h1>
            <p className='text-gray-600'>
              {document ? `Knowledge: ${document.displayName}` : `Knowledge ID: ${id}`}
            </p>
            <p className='text-sm text-gray-500 mt-1'>
              ไฟล์ที่อัพโหลดจะถูกแปลงเป็น vector และเก็บใน Qdrant สำหรับการค้นหา
            </p>
          </div>

          {/* Data Type and Content Section */}
          <div className='mb-8'>
            <div className='flex gap-6'>
              <div className='flex-1'>
                <label className='block text-sm font-medium text-gray-700 mb-3'>
                  ประเภทข้อมูล (Data Type)
                </label>
                <Dropdown
                  options={dataTypeOptions}
                  selectedValue={dataType}
                  onSelect={(value) => {
                    setDataType(value);
                    setFileError(''); // Clear error when changing data type
                  }}
                  placeholder="Select Data Type"
                />
                
                {/* Text File Name Input - shown only when text type is selected */}
                {dataType === 'text' && (
                  <div className='mt-4'>
                    <label htmlFor='text-file-name' className='block text-sm font-medium text-gray-700 mb-2'>
                      ชื่อไฟล์ (File Name)
                    </label>
                    <input
                      type='text'
                      id='text-file-name'
                      value={textFileName}
                      onChange={(e) => setTextFileName(e.target.value)}
                      placeholder='ตั้งชื่อไฟล์สำหรับข้อความที่นี่...'
                      className='w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent text-gray-700 placeholder-gray-400'
                    />
                  </div>
                )}

                {/* Data Content */}
                <div className='mt-4'>
                  <label htmlFor='data-content' className='block text-sm font-medium text-gray-700 mb-3'>
                    เนื้อหาข้อมูล (Data Content)
                  </label>
                  {dataType === 'text' ? (
                    <>
                      <textarea
                        id='data-content'
                        value={dataContent}
                        onChange={(e) => setDataContent(e.target.value)}
                        placeholder='เพิ่มเนื้อหาข้อมูลที่นี่...'
                        rows={10}
                        required
                        className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-gray-700 placeholder-gray-400'
                      />
                      {/* Upload Button for Text Type */}
                      <div className='flex justify-end mt-2'>
                        <button
                          type='button'
                          onClick={() => {
                            if (!textFileName.trim()) {
                              setFileError('กรุณากรอกชื่อไฟล์');
                              return;
                            }
                            if (!dataContent.trim()) {
                              setFileError('กรุณากรอกเนื้อหาข้อมูล');
                              return;
                            }
                            setFileError('');
                            handleFileAdd({ name: textFileName + '.txt' });
                          }}
                          className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-medium rounded-lg shadow-sm hover:shadow-md transition-all duration-200 hover:scale-105 active:scale-95'
                        >
                          Upload
                        </button>
                      </div>
                    </>
                  ) : dataType === 'file' ? (
                    <div>
                      <div 
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                          isDragging 
                            ? 'border-yellow-400 bg-yellow-50' 
                            : 'border-gray-300 hover:border-yellow-400'
                        }`}
                        onDragEnter={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(true);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(false);
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        onDrop={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setIsDragging(false);
                          
                          const files = e.dataTransfer.files;
                          if (files.length > 1) {
                            setFileError('กรุณาอัปโหลดไฟล์ครั้งละ 1 ไฟล์เท่านั้น');
                            return;
                          }
                          
                          if (files.length === 1) {
                            const file = files[0];
                            // ตรวจสอบว่าเป็น PDF เท่านั้น
                            const isPDF = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
                            if (!isPDF) {
                              setFileError('รองรับเฉพาะไฟล์ PDF เท่านั้น กรุณาอัพโหลดไฟล์ PDF');
                              return;
                            }
                            handleFileAdd(file);
                          }
                        }}
                        accept='.pdf,application/pdf'
                      >
                      <input
                        type='file'
                        onChange={(e) => {
                            const files = e.target.files;
                            if (files.length > 1) {
                              setFileError('กรุณาอัปโหลดไฟล์ครั้งละ 1 ไฟล์เท่านั้น');
                              e.target.value = '';
                              return;
                            }
                            
                            if (files.length === 1) {
                              handleFileAdd(files[0]);
                            // Reset the input
                            e.target.value = '';
                          }
                        }}
                        className='hidden'
                        id='file-upload'
                        accept='.pdf,application/pdf'
                      />
                      <label
                        htmlFor='file-upload'
                        className='cursor-pointer flex flex-col items-center gap-2'
                      >
                        <HiPlus className='text-3xl text-gray-400' />
                        <span className='text-gray-600'>Click to upload PDF file</span>
                        <span className='text-sm text-gray-400'>or drag and drop</span>
                        <span className='text-xs text-red-500 font-semibold mt-2'>**รองรับเฉพาะไฟล์ PDF เท่านั้น ครั้งละ 1 ไฟล์ และขนาดไม่เกิน 5 MB**</span>
                      </label>
                      </div>
                      {fileError && (
                        <div className='mt-2 p-2 bg-red-50 border border-red-200 rounded-lg'>
                          <p className='text-xs text-red-600'>{fileError}</p>
                        </div>
                      )}
                    </div>
                  ) : null}
                </div>
              </div>
              
              {/* Right Column - Uploaded Files */}
              <div className='w-80 self-start' style={{ marginTop: '71px' }}>
                <div className='flex items-center justify-between gap-2 mb-3'>
                  <label className='block text-sm font-medium text-gray-700'>
                    ไฟล์ที่อัปโหลด ({uploadedFiles.length})
                  </label>
                </div>
                <div className='space-y-2 h-[352px] overflow-y-auto bg-gray-50 rounded-lg p-4 border border-gray-200'>
                  {uploadedFiles.length > 0 ? (
                    uploadedFiles.map((file) => {
                      const isTxtFile = file.name.toLowerCase().endsWith('.txt');
                      const fileTypeInfo = getFileTypeInfo(file.name);
                      const pageCount = getPDFPageCount(file) || file.pageCount;
                      const processingTime = file.processingTime 
                        ? formatProcessingTime(file.processingTime)
                        : file.processingOCR && file.processingStartTime
                        ? formatProcessingTime((Date.now() - file.processingStartTime) / 1000)
                        : null;
                      
                      return (
                        <div
                          key={file.id}
                          className='flex flex-col gap-2 p-3 bg-white rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors'
                        >
                          {/* File Header */}
                          <div className='flex items-start justify-between gap-2'>
                          <div className='flex-1 min-w-0'>
                              <div className='flex items-center gap-2 mb-1'>
                                <span className='text-lg'>{file.fileIcon || fileTypeInfo.icon}</span>
                            <p className='text-sm font-medium text-gray-800 truncate' title={file.name}>
                              {file.name}
                            </p>
                              </div>
                              
                              {/* File Info */}
                              <div className='flex items-center gap-2 flex-wrap text-xs'>
                                <span className={`font-medium ${file.fileType ? fileTypeInfo.color : 'text-gray-600'}`}>
                                  {file.fileType || fileTypeInfo.label}
                                </span>
                                {file.sizeMB && (
                                  <span className='text-gray-500'>
                                    • {file.sizeMB} MB
                                  </span>
                                )}
                                {pageCount && (
                                  <span className='text-gray-500'>
                                    • {pageCount} หน้า
                                  </span>
                                )}
                                {processingTime && (
                                  <span className='text-gray-500'>
                                    • {processingTime}
                                </span>
                              )}
                            </div>
                          </div>
                            
                            {/* Action Buttons */}
                            <div className='flex items-center gap-1 flex-shrink-0'>
                            {isTxtFile && (
                              <button
                                type='button'
                                onClick={() => handleEditFile(file)}
                                  className='p-1 text-gray-500 hover:text-gray-700 transition-colors'
                                title='Edit'
                              >
                                <HiOutlinePencil className='text-lg' />
                              </button>
                            )}
                            <button
                              type='button'
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteClick(file.id);
                              }}
                                className='p-1 text-red-600 hover:text-red-700 transition-colors'
                              title='Delete'
                            >
                              <HiX className='text-lg' />
                            </button>
                            </div>
                          </div>
                          
                          {/* Status Badge */}
                          <div className='flex items-center gap-2'>
                            {file.processingOCR ? (
                              <span className='text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded flex items-center gap-1'>
                                <span className='animate-spin'>⏳</span> 
                                <span>กำลังประมวลผล OCR...</span>
                                {processingTime && (
                                  <span className='text-blue-600'>({processingTime})</span>
                                )}
                              </span>
                            ) : file.text || file.blocks ? (
                              <span className='text-xs bg-green-100 text-green-700 px-2 py-1 rounded flex items-center gap-1'>
                                <span>✓</span>
                                <span>พร้อมแปลงเป็น Vector</span>
                                {processingTime && (
                                  <span className='text-green-600 ml-1'>(ใช้เวลา {processingTime})</span>
                                )}
                              </span>
                            ) : file.needsOCR ? (
                              <span className='text-xs bg-yellow-100 text-yellow-700 px-2 py-1 rounded flex items-center gap-1'>
                                <span>⚠</span>
                                <span>ต้องการ OCR</span>
                                {file.ocrError && (
                                  <span className='text-yellow-800' title={file.ocrError}>
                                    ({file.ocrError.substring(0, 30)}...)
                                  </span>
                                )}
                              </span>
                            ) : null}
                          </div>
                        </div>
                      );
                    })
                  ) : (
                    <div className='text-center py-8 text-gray-400'>
                      <p className='text-sm'>ยังไม่มีไฟล์ที่อัปโหลด</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Buttons */}
          <div className='flex gap-4 pt-4 border-t border-gray-200'>
            <button
              type='button'
              onClick={() => navigate('/knowledge')}
              className='px-6 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
            >
              Cancel
            </button>
            <button
              type='submit'
              disabled={loading || uploadedFiles.length === 0}
              className='px-6 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200 hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed'
            >
              {loading ? 'กำลังบันทึกและแปลงเป็น vector...' : 'บันทึกและแปลงเป็น Vector'}
            </button>
          </div>
        </form>

        {/* Delete Confirmation Modal */}
        {isDeleteConfirmOpen && (
          <>
            {/* Backdrop */}
            <div className='fixed inset-0 bg-black bg-opacity-50 z-40' onClick={handleCancelDelete} />
            
            {/* Confirmation Dialog */}
            <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
              <div className='bg-white rounded-lg shadow-2xl w-full max-w-sm p-6'>
                <h3 className='text-lg font-semibold text-gray-800 mb-4'>
                  ลบไฟล์นี้หรือไม่?
                </h3>
                <p className='text-sm text-gray-600 mb-6'>
                  คุณแน่ใจหรือไม่ว่าต้องการลบไฟล์นี้ การดำเนินการนี้ไม่สามารถเรียกคืนได้
                </p>
                <div className='flex gap-3 justify-end'>
                  <button
                    type='button'
                    onClick={handleCancelDelete}
                    className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={handleConfirmDelete}
                    className='px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          </>
        )}

        {/* Edit File Modal */}
        {isEditModalOpen && editingFile && (
          <>
            {/* Backdrop */}
            <div className='fixed inset-0 bg-black bg-opacity-50 z-40' onClick={handleCancelEdit} />
            
            {/* Edit Dialog */}
            <div className='fixed inset-0 z-50 flex items-center justify-center p-4'>
              <div className='bg-white rounded-lg shadow-2xl w-full max-w-2xl' onClick={(e) => e.stopPropagation()}>
                <div className='px-6 py-4 border-b border-gray-200'>
                  <h3 className='text-lg font-semibold text-gray-800'>
                    แก้ไขไฟล์: {editingFile.name}
                  </h3>
                </div>
                <div className='p-6'>
                  <textarea
                    value={editContent}
                    onChange={(e) => setEditContent(e.target.value)}
                    placeholder='แก้ไขเนื้อหาไฟล์ที่นี่...'
                    rows={15}
                    className='w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-400 focus:border-transparent transition-all resize-none text-gray-700 placeholder-gray-400'
                  />
                </div>
                <div className='px-6 py-4 border-t border-gray-200 flex gap-3 justify-end'>
                  <button
                    type='button'
                    onClick={handleCancelEdit}
                    className='px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors'
                  >
                    Cancel
                  </button>
                  <button
                    type='button'
                    onClick={handleSaveEdit}
                    className='px-4 py-2 bg-yellow-400 hover:bg-yellow-500 text-gray-800 font-semibold rounded-lg shadow-md hover:shadow-lg transition-all duration-200'
                  >
                    Save
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

export default AddKnowledgeData;
