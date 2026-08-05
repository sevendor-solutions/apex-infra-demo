import React, { useState, useRef, useCallback, useMemo } from 'react';
import type { Document, Project } from '../types';
import {
  Folder, FolderOpen, FolderPlus, FileText, Image as ImageIcon,
  FileMinus, Trash2, Edit2, Download, Eye, X, ChevronRight,
  Upload, Home, Search, Grid, List, Check, ArrowLeft, Video, Network, MoreVertical,
  Share2, CheckSquare, Square, Copy, MessageCircle, Mail
} from 'lucide-react';
import { addDocument, updateDocument, deleteDocument, reorderDocuments, uploadImage } from '../utils/db';

/* ─────────────────────────────────────────────────────────
   Types
───────────────────────────────────────────────────────── */
interface FolderNode {
  id: string;
  name: string;
  parentId: string;   // empty string = root level
  sortOrder?: number;
}

interface DocEntry extends Document {
  folderId: string;   // empty string = root level
}

interface AdminDocumentsProps {
  documents: Document[];
  projects: Project[];
  marketing: Project[];
  onRefresh: () => void;
  onAddToast: (msg: string, type: 'success' | 'error' | 'info') => void;
  onConfirm: (msg: string) => Promise<boolean>;
}

interface TreeNodeProps {
  folder: FolderNode;
  depth: number;
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  expandedIds: Set<string>;
  setExpandedIds: React.Dispatch<React.SetStateAction<Set<string>>>;
  childFolders: (parentId: string) => FolderNode[];
  totalDescendantFiles: (folderId: string) => number;
  triggerRename: (id: string, type: 'folder' | 'file', name: string) => void;
  deleteFolder: (id: string) => void;
  setCtx: (ctx: { id: string; type: 'folder' | 'file'; x: number; y: number } | null) => void;
  setShowCF: (show: boolean) => void;
  setNewFolderName: (val: string) => void;
  
  // Drag and drop parameters
  dragOverFolderId: string | null;
  setDragOverFolderId: (id: string | null) => void;
  handleDragStartItem: (e: React.DragEvent, id: string, type: 'folder' | 'file') => void;
  handleDropOnFolder: (e: React.DragEvent, targetFolderId: string) => void;
}

const ROOT = '';   // empty string = root folder

const fileIcon = (type: string) => {
  if (type === 'pdf')  return <FileText  size={20} style={{ color: '#e53e3e' }} />;
  if (type === 'word') return <FileMinus size={20} style={{ color: '#3182ce' }} />;
  if (type === 'jpeg' || type === 'png') return <ImageIcon size={20} style={{ color: '#38a169' }} />;
  if (['mp4', 'webm', 'ogg', 'mov', 'video'].includes(type)) return <Video size={20} style={{ color: '#805ad5' }} />;
  return <FileText size={20} style={{ color: '#718096' }} />;
};

const fileColor: Record<string, string> = {
  pdf: '#fff5f5', word: '#ebf8ff', jpeg: '#f0fff4', png: '#f0fff4',
  mp4: '#faf5ff', webm: '#faf5ff', ogg: '#faf5ff', mov: '#faf5ff', video: '#faf5ff'
};

/* ─────────────────────────────────────────────────────────
   TreeNode Component (Reconciliation-safe)
───────────────────────────────────────────────────────── */
const TreeNode: React.FC<TreeNodeProps> = (props) => {
  if (props.depth > 12) return null;
  return <TreeNodeInner {...props} />;
};

const TreeNodeInner: React.FC<TreeNodeProps> = ({
  folder,
  depth,
  activeFolderId,
  setActiveFolderId,
  expandedIds,
  setExpandedIds,
  childFolders,
  totalDescendantFiles,
  triggerRename,
  deleteFolder,
  setCtx,
  setShowCF,
  setNewFolderName,
  dragOverFolderId,
  setDragOverFolderId,
  handleDragStartItem,
  handleDropOnFolder
}) => {
  const isOpen   = expandedIds.has(folder.id);
  const isActive = activeFolderId === folder.id;
  const isDragOver = dragOverFolderId === folder.id;
  const kids     = childFolders(folder.id);

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedIds(prev => {
      const n = new Set(prev);
      isOpen ? n.delete(folder.id) : n.add(folder.id);
      return n;
    });
  };

  return (
    <div>
      <div
        className={`sap-tree-row${isActive ? ' active' : ''}${isDragOver ? ' drag-over' : ''}`}
        style={{ paddingLeft: 12 + depth * 16 }}
        onClick={(e) => {
          e.stopPropagation();
          setActiveFolderId(folder.id);
          setExpandedIds(prev => {
            const n = new Set(prev);
            if (n.has(folder.id)) {
              n.delete(folder.id);
            } else {
              n.add(folder.id);
            }
            return n;
          });
        }}
        onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ id: folder.id, type: 'folder', x: e.clientX, y: e.clientY }); }}
        
        // Drag & drop handlers
        draggable={true}
        onDragStart={(e) => handleDragStartItem(e, folder.id, 'folder')}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(folder.id);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverFolderId(null);
        }}
        onDrop={(e) => handleDropOnFolder(e, folder.id)}
      >
        <span className="sap-tree-arrow" onClick={toggle}>
          {kids.length > 0 ? (isOpen ? '▾' : '▸') : <span style={{ opacity: 0 }}>▸</span>}
        </span>
        {isActive ? (
          <FolderOpen
            size={15}
            style={{ color: '#0070f2', flexShrink: 0, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveFolderId(folder.id);
            }}
          />
        ) : (
          <Folder
            size={15}
            style={{ color: '#0070f2', flexShrink: 0, cursor: 'pointer' }}
            onClick={(e) => {
              e.stopPropagation();
              setActiveFolderId(folder.id);
            }}
          />
        )}
        <span
          className="sap-tree-label"
          title={folder.name}
          style={{ cursor: 'pointer' }}
          onClick={(e) => {
            e.stopPropagation();
            setActiveFolderId(folder.id);
            setExpandedIds(prev => {
              const n = new Set(prev);
              if (n.has(folder.id)) {
                n.delete(folder.id);
              } else {
                n.add(folder.id);
              }
              return n;
            });
          }}
        >
          {folder.name}
        </span>
        <span className="sap-tree-badge">{totalDescendantFiles(folder.id)}</span>
        <button
          className="sap-tree-add-btn"
          title={`Create subfolder inside "${folder.name}"`}
          onClick={e => {
            e.stopPropagation();
            setActiveFolderId(folder.id);
            setExpandedIds(prev => {
              const n = new Set(prev);
              n.add(folder.id);
              return n;
            });
            setShowCF(true);
            setNewFolderName('');
          }}
        >+</button>
      </div>
      {isOpen && kids.map(k => (
        <TreeNode
          key={k.id}
          folder={k}
          depth={depth + 1}
          activeFolderId={activeFolderId}
          setActiveFolderId={setActiveFolderId}
          expandedIds={expandedIds}
          setExpandedIds={setExpandedIds}
          childFolders={childFolders}
          totalDescendantFiles={totalDescendantFiles}
          triggerRename={triggerRename}
          deleteFolder={deleteFolder}
          setCtx={setCtx}
          setShowCF={setShowCF}
          setNewFolderName={setNewFolderName}
          dragOverFolderId={dragOverFolderId}
          setDragOverFolderId={setDragOverFolderId}
          handleDragStartItem={handleDragStartItem}
          handleDropOnFolder={handleDropOnFolder}
        />
      ))}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   FlowFolderNode Component (Tree Diagram Banner Layout)
───────────────────────────────────────────────────────── */
interface FlowFolderNodeProps {
  folder: FolderNode;
  depth: number;
  activeFolderId: string;
  setActiveFolderId: (id: string) => void;
  childFolders: (parentId: string) => FolderNode[];
  filesIn: (folderId: string) => DocEntry[];
  totalDescendantFiles: (folderId: string) => number;
  setPreviewDoc: (file: DocEntry) => void;
  triggerRename: (id: string, type: 'folder' | 'file', name: string) => void;
  deleteFile: (file: DocEntry) => void;
  deleteFolder: (folderId: string) => void;
  setShowCF: (show: boolean) => void;
  setNewFolderName: (val: string) => void;
  setCtx: (ctx: { id: string; type: 'folder' | 'file'; x: number; y: number } | null) => void;
  dragOverItemId: string | null;
  setDragOverItemId: (id: string | null) => void;
  handleDragStartItem: (e: React.DragEvent, id: string, type: 'folder' | 'file') => void;
  handleDropToReorder: (e: React.DragEvent, targetId: string, targetParentId: string) => void;
  selectedDocIds: Set<string>;
  toggleDocSelection: (id: string) => void;
  onShareDoc: (doc: DocEntry) => void;
}

const FlowFolderNode: React.FC<FlowFolderNodeProps> = (props) => {
  if (props.depth > 12) return null;
  return <FlowFolderNodeInner {...props} />;
};

const FlowFolderNodeInner: React.FC<FlowFolderNodeProps> = ({
  folder,
  depth,
  activeFolderId,
  setActiveFolderId,
  childFolders,
  filesIn,
  totalDescendantFiles,
  setPreviewDoc,
  triggerRename,
  deleteFile,
  deleteFolder,
  setShowCF,
  setNewFolderName,
  setCtx,
  dragOverItemId,
  setDragOverItemId,
  handleDragStartItem,
  handleDropToReorder,
  selectedDocIds,
  toggleDocSelection,
  onShareDoc,
}) => {
  const [isCollapsed, setIsCollapsed] = useState(true);
  const kids  = childFolders(folder.id);
  const files = filesIn(folder.id);
  const totalCount = totalDescendantFiles(folder.id);
  const isDragOver = dragOverItemId === folder.id;

  return (
    <div
      className={`sap-flow-folder-group ${!isCollapsed ? 'expanded' : 'collapsed'}`}
      style={{
        marginLeft: (depth > 0 && !isCollapsed) ? (depth * 10) : 0,
        width: '100%',
      }}
    >
      {/* 🔷 Subfolder Banner: Clean Banner with Drag & Drop Reordering, Context Menu & 3-Dots Menu */}
      <div
        className="sap-subfolder-banner"
        onClick={() => setIsCollapsed(!isCollapsed)}
        onDoubleClick={() => setActiveFolderId(folder.id)}
        onContextMenu={e => {
          e.preventDefault();
          e.stopPropagation();
          setCtx({ id: folder.id, type: 'folder', x: e.clientX, y: e.clientY });
        }}
        draggable={true}
        onDragStart={(e) => handleDragStartItem(e, folder.id, 'folder')}
        onDragOver={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverItemId(folder.id);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setDragOverItemId(null);
        }}
        onDrop={(e) => handleDropToReorder(e, folder.id, folder.parentId)}
        style={{
          border: isDragOver ? '2px dashed #0070f2' : undefined,
          backgroundColor: isDragOver ? '#ebf5ff' : undefined
        }}
      >
        <div className="sap-subfolder-left">
          <span className="sap-subfolder-arrow">
            {isCollapsed ? '▸' : '▾'}
          </span>
          <FolderOpen size={16} className="sap-subfolder-icon" />
          <span className="sap-subfolder-title" title={folder.name}>
            {folder.name}
          </span>
          <span className="sap-subfolder-badge">
            {totalCount} {totalCount === 1 ? 'item' : 'items'}
          </span>
        </div>

        {/* Folder Context Menu Trigger (3 Dots) */}
        <div className="sap-subfolder-actions" onClick={e => e.stopPropagation()}>
          <button
            title="Folder Options"
            onClick={e => {
              e.stopPropagation();
              const rect = e.currentTarget.getBoundingClientRect();
              setCtx({ id: folder.id, type: 'folder', x: rect.left, y: rect.bottom + 4 });
            }}
          >
            <MoreVertical size={14} />
          </button>
        </div>
      </div>

      {/* Expanded Content */}
      {!isCollapsed && (
        <div className="sap-subfolder-content">
          {/* 📄 File Link Cards Grid */}
          {files.length > 0 && (
            <div className="sap-file-cards-grid">
              {files.map(file => {
                const isFileDragOver = dragOverItemId === file.id;
                const isSelected = selectedDocIds.has(file.id);
                return (
                  <div
                    key={file.id}
                    className={`sap-file-link-card${isSelected ? ' selected' : ''}`}
                    onClick={() => setPreviewDoc(file)}
                    onContextMenu={e => {
                      e.preventDefault();
                      e.stopPropagation();
                      setCtx({ id: file.id, type: 'file', x: e.clientX, y: e.clientY });
                    }}
                    title={`Preview ${file.title}`}
                    draggable={true}
                    onDragStart={(e) => handleDragStartItem(e, file.id, 'file')}
                    onDragOver={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverItemId(file.id);
                    }}
                    onDragLeave={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      setDragOverItemId(null);
                    }}
                    onDrop={(e) => handleDropToReorder(e, file.id, file.folderId)}
                    style={{
                      border: isFileDragOver ? '2px dashed #0070f2' : isSelected ? '1.5px solid #0070f2' : undefined,
                      backgroundColor: isFileDragOver ? '#ebf5ff' : isSelected ? '#e8f0fe' : undefined
                    }}
                  >
                    <div className="sap-file-card-main">
                      <div
                        className="sap-file-checkbox"
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleDocSelection(file.id);
                        }}
                        title={isSelected ? "Deselect document" : "Select document"}
                        style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: 4 }}
                      >
                        {isSelected ? (
                          <CheckSquare size={17} style={{ color: '#0070f2' }} />
                        ) : (
                          <Square size={17} style={{ color: '#a0aec0' }} />
                        )}
                      </div>
                      <div className="sap-file-card-icon">{fileIcon(file.fileType)}</div>
                      <div className="sap-file-card-text">
                        <span className="sap-file-card-title">{file.title}</span>
                        <span className="sap-file-card-meta">{file.fileType.toUpperCase()} · {file.date}</span>
                      </div>
                    </div>
                    <div className="sap-file-card-actions" onClick={e => e.stopPropagation()}>
                      <button title="Share Document" onClick={() => onShareDoc(file)}><Share2 size={13} /></button>
                      <button title="Preview" onClick={() => setPreviewDoc(file)}><Eye size={13} /></button>
                      <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download title="Download"><Download size={13} /></a>
                      <button title="Rename" onClick={() => triggerRename(file.id, 'file', file.title)}><Edit2 size={13} /></button>
                      <button className="danger" title="Delete" onClick={() => deleteFile(file)}><Trash2 size={13} /></button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* Nested Subfolders Grid (Side-by-Side) */}
          {kids.length > 0 && (
            <div className="sap-subfolders-grid">
              {kids.map(child => (
                <FlowFolderNode
                  key={child.id}
                  folder={child}
                  depth={depth + 1}
                  activeFolderId={activeFolderId}
                  setActiveFolderId={setActiveFolderId}
                  childFolders={childFolders}
                  filesIn={filesIn}
                  totalDescendantFiles={totalDescendantFiles}
                  setPreviewDoc={setPreviewDoc}
                  triggerRename={triggerRename}
                  deleteFile={deleteFile}
                  deleteFolder={deleteFolder}
                  setShowCF={setShowCF}
                  setNewFolderName={setNewFolderName}
                  setCtx={setCtx}
                  dragOverItemId={dragOverItemId}
                  setDragOverItemId={setDragOverItemId}
                  handleDragStartItem={handleDragStartItem}
                  handleDropToReorder={handleDropToReorder}
                  selectedDocIds={selectedDocIds}
                  toggleDocSelection={toggleDocSelection}
                  onShareDoc={onShareDoc}
                />
              ))}
            </div>
          )}

          {/* Empty Folder Notice */}
          {files.length === 0 && kids.length === 0 && (
            <div className="sap-empty-folder-notice">
              <span>Folder is empty</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

/* ─────────────────────────────────────────────────────────
   Main Component
───────────────────────────────────────────────────────── */
export const AdminDocuments: React.FC<AdminDocumentsProps> = ({
  documents,
  onRefresh,
  onAddToast,
  onConfirm,
}) => {

  /* ── State ── */
  const [activeFolderId, setActiveFolderId] = useState<string>(ROOT);
  const [expandedIds, setExpandedIds]       = useState<Set<string>>(new Set());
  const [viewMode, setViewMode]             = useState<'grid' | 'list' | 'tree'>('tree');
  const [search, setSearch]                 = useState('');

  /* Multi-Select & Batch Sharing State */
  const [selectedDocIds, setSelectedDocIds] = useState<Set<string>>(new Set());
  const [shareModalDocs, setShareModalDocs] = useState<DocEntry[] | null>(null);
  const [shareNote, setShareNote]           = useState('');

  /* Rename modal states */
  const [showRename, setShowRename] = useState(false);
  const [renameTarget, setRenameTarget] = useState<{ id: string; type: 'folder' | 'file'; currentName: string } | null>(null);
  const [renameValue, setRenameValue] = useState('');

  /* Create folder modal state */
  const [showCF, setShowCF]         = useState(false);
  const [newFolderName, setNewFolderName] = useState('');

  /* Uploading state */
  const [uploading, setUploading]   = useState(false);
  const fileInputRef                = useRef<HTMLInputElement>(null);

  /* Preview state */
  const [previewDoc, setPreviewDoc] = useState<DocEntry | null>(null);

  /* Context menu state */
  const [ctx, setCtx] = useState<{ id: string; type: 'folder' | 'file'; x: number; y: number } | null>(null);

  /* Drag & drop states */
  const [dragOverFolderId, setDragOverFolderId] = useState<string | null>(null);
  const [dragOverItemId, setDragOverItemId] = useState<string | null>(null);
  const [isDraggingLocal, setIsDraggingLocal] = useState(false);

  /* Sort order lookup with localStorage fallback */
  const getSortOrder = useCallback((docId: string, defaultOrder: number): number => {
    try {
      const localMap = JSON.parse(localStorage.getItem('jk_infra_doc_order_map') || '{}');
      if (localMap[docId] !== undefined) return Number(localMap[docId]);
    } catch {}
    const doc = (documents || []).find(d => d && d.id === docId);
    if (doc && typeof doc.sortOrder === 'number') return doc.sortOrder;
    return defaultOrder;
  }, [documents]);

  /* ── Derived Data from Database Documents ── */
  const folders = useMemo<FolderNode[]>(() => {
    const raw = (documents || [])
      .filter(d => d && d.fileType === 'folder')
      .map((d, idx) => ({
        id: d.id,
        name: d.title || 'Untitled Folder',
        parentId: (!d.category || d.category === 'root') ? ROOT : d.category,
        sortOrder: getSortOrder(d.id, d.sortOrder ?? idx)
      }));
    return raw.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [documents, getSortOrder]);

  const files = useMemo<DocEntry[]>(() => {
    const raw = (documents || [])
      .filter(d => d && d.fileType !== 'folder')
      .map((d, idx) => ({
        ...d,
        folderId: (!d.category || d.category === 'root') ? ROOT : d.category,
        sortOrder: getSortOrder(d.id, d.sortOrder ?? idx)
      }));
    return raw.sort((a, b) => (a.sortOrder ?? 0) - (b.sortOrder ?? 0));
  }, [documents, getSortOrder]);

  const childFolders = useCallback(
    (parentId: string) => folders.filter(f => f && f.parentId === parentId && f.id !== parentId),
    [folders]
  );

  const filesIn = useCallback(
    (folderId: string) => {
      const inFolder = files.filter(f => f && f.folderId === folderId);
      if (!search.trim()) return inFolder;
      const q = search.toLowerCase();
      return inFolder.filter(f => f && f.title && f.title.toLowerCase().includes(q));
    },
    [files, search]
  );

  const totalDescendantFiles = useCallback(
    (folderId: string, visited = new Set<string>()): number => {
      if (visited.has(folderId)) return 0;
      const nextVisited = new Set(visited);
      nextVisited.add(folderId);
      const directFiles = files.filter(f => f && f.folderId === folderId).length;
      const childCount  = childFolders(folderId).reduce((sum, c) => sum + totalDescendantFiles(c.id, nextVisited), 0);
      return directFiles + childCount;
    },
    [files, childFolders]
  );

  /* Multi-Select & Sharing Handlers */
  const toggleDocSelection = useCallback((id: string) => {
    setSelectedDocIds(prev => {
      const n = new Set(prev);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }, []);

  const selectAllCurrentFolder = useCallback(() => {
    const idsInFolder = files.filter(f => f && f.folderId === activeFolderId).map(f => f.id);
    setSelectedDocIds(prev => {
      const n = new Set(prev);
      const allSelected = idsInFolder.length > 0 && idsInFolder.every(id => n.has(id));
      if (allSelected) {
        idsInFolder.forEach(id => n.delete(id));
      } else {
        idsInFolder.forEach(id => n.add(id));
      }
      return n;
    });
  }, [files, activeFolderId]);

  const clearDocSelection = useCallback(() => {
    setSelectedDocIds(new Set());
  }, []);

  const openShareModal = useCallback((docsToShare: DocEntry[]) => {
    if (docsToShare.length === 0) return;
    setShareModalDocs(docsToShare);
    setShareNote('');
  }, []);

  const handleShareSelected = useCallback(() => {
    const selectedList = files.filter(f => f && selectedDocIds.has(f.id));
    if (selectedList.length === 0) {
      onAddToast('Please select at least one document to share.', 'info');
      return;
    }
    openShareModal(selectedList);
  }, [files, selectedDocIds, onAddToast, openShareModal]);



  const handleDownloadSelected = useCallback(() => {
    const selectedList = files.filter(f => f && selectedDocIds.has(f.id));
    if (selectedList.length === 0) return;
    selectedList.forEach((file, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = file.fileUrl;
        a.download = file.title;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
    onAddToast(`Downloading ${selectedList.length} document(s)...`, 'info');
  }, [files, selectedDocIds, onAddToast]);

  const handleDeleteSelected = useCallback(async () => {
    const selectedList = files.filter(f => f && selectedDocIds.has(f.id));
    if (selectedList.length === 0) return;
    if (!await onConfirm(`Are you sure you want to delete ${selectedList.length} selected document(s)?`)) return;
    try {
      for (const doc of selectedList) {
        await deleteDocument(doc.id);
      }
      setSelectedDocIds(new Set());
      onAddToast(`${selectedList.length} document(s) deleted successfully.`, 'success');
      onRefresh();
    } catch {
      onAddToast('Failed to delete selected documents.', 'error');
    }
  }, [files, selectedDocIds, onConfirm, deleteDocument, onAddToast, onRefresh]);

  const getFormattedShareMessage = useCallback(() => {
    if (!shareModalDocs || shareModalDocs.length === 0) return '';
    let msg = `*JK Future Infra - Shared Documents*\n`;
    if (shareNote.trim()) {
      msg += `\n📝 *Note:* ${shareNote.trim()}\n`;
    }
    msg += `\n📁 *Files (${shareModalDocs.length}):*\n`;
    shareModalDocs.forEach((doc, idx) => {
      msg += `${idx + 1}. *${doc.title}* (${(doc.fileType || 'file').toUpperCase()})\n`;
    });
    return msg;
  }, [shareModalDocs, shareNote]);

  const handleWhatsAppShare = useCallback(() => {
    const text = encodeURIComponent(getFormattedShareMessage());
    const url = `https://api.whatsapp.com/send?text=${text}`;
    window.open(url, '_blank');
  }, [getFormattedShareMessage]);

  const handleEmailShare = useCallback(() => {
    const subject = encodeURIComponent(`Shared Documents (${shareModalDocs?.length || 0}) - JK Future Infra`);
    const body = encodeURIComponent(getFormattedShareMessage());
    window.location.href = `mailto:?subject=${subject}&body=${body}`;
  }, [shareModalDocs, getFormattedShareMessage]);

  const handleCopyShareMessage = useCallback(() => {
    const text = getFormattedShareMessage();
    navigator.clipboard.writeText(text);
    onAddToast('Share text copied to clipboard!', 'success');
  }, [getFormattedShareMessage, onAddToast]);

  const handleDownloadShareModalDocs = useCallback(() => {
    if (!shareModalDocs || shareModalDocs.length === 0) return;
    shareModalDocs.forEach((doc, index) => {
      setTimeout(() => {
        const a = document.createElement('a');
        a.href = doc.fileUrl;
        a.download = doc.title;
        a.target = '_blank';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
      }, index * 300);
    });
    onAddToast(`Downloading ${shareModalDocs.length} document(s)...`, 'info');
  }, [shareModalDocs, onAddToast]);

  const handleNativeShare = useCallback(async () => {
    if (!shareModalDocs || shareModalDocs.length === 0) return;

    if (navigator.share) {
      try {
        onAddToast('Preparing files for direct attachment...', 'info');
        const fileObjects: File[] = [];
        for (const doc of shareModalDocs) {
          if (doc.fileUrl && doc.fileUrl !== '#') {
            try {
              const res = await fetch(doc.fileUrl);
              const blob = await res.blob();
              const ext = doc.fileUrl.split('.').pop()?.split('?')[0] || doc.fileType || 'bin';
              const fileName = `${doc.title}.${ext}`;
              const fileObj = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
              fileObjects.push(fileObj);
            } catch (err) {
              console.warn('Could not fetch file blob for share:', doc.fileUrl, err);
            }
          }
        }

        if (fileObjects.length > 0 && navigator.canShare && navigator.canShare({ files: fileObjects })) {
          await navigator.share({
            title: 'Shared Documents - JK Future Infra',
            text: shareNote.trim() || 'Attached documents from JK Future Infra:',
            files: fileObjects,
          });
          onAddToast('Documents attached and shared successfully!', 'success');
          return;
        }

        await navigator.share({
          title: 'Shared Documents - JK Future Infra',
          text: getFormattedShareMessage(),
        });
        onAddToast('Shared successfully!', 'success');
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          handleCopyShareMessage();
        }
      }
    } else {
      handleCopyShareMessage();
    }
  }, [shareModalDocs, shareNote, getFormattedShareMessage, onAddToast, handleCopyShareMessage]);





  /* Breadcrumb path calculation */
  const breadcrumb = (): Array<{ id: string; name: string }> => {
    const path: Array<{ id: string; name: string }> = [{ id: ROOT, name: 'Root' }];
    if (activeFolderId === ROOT) return path;

    const visited = new Set<string>();
    const build = (id: string) => {
      if (visited.has(id)) return;
      visited.add(id);
      const f = folders.find(x => x.id === id);
      if (!f) return;
      if (f.parentId !== ROOT && f.parentId !== f.id) build(f.parentId);
      path.push({ id: f.id, name: f.name });
    };
    build(activeFolderId);
    return path;
  };

  /* ── Folder Actions ── */
  const createFolder = async () => {
    const name = newFolderName.trim();
    if (!name) return;

    const siblings = childFolders(activeFolderId);
    const hasDuplicate = siblings.some(f => f.name.toLowerCase() === name.toLowerCase());
    if (hasDuplicate) {
      onAddToast(`A folder named "${name}" already exists in this location.`, 'error');
      return;
    }

    const folderDoc: Document = {
      id: 'folder_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
      title: name,
      category: activeFolderId === ROOT ? 'root' : activeFolderId,
      fileUrl: '#',
      fileType: 'folder',
      date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
    };

    try {
      await addDocument(folderDoc);
      setShowCF(false);
      setNewFolderName('');
      onAddToast(`Folder "${name}" created successfully.`, 'success');
      onRefresh();
    } catch {
      onAddToast('Failed to create folder.', 'error');
    }
  };

  const deleteFolder = async (folderId: string) => {
    const folder = folders.find(f => f.id === folderId);
    if (!folder) return;
    if (!await onConfirm(`Delete folder "${folder.name}" and all its contents?`)) return;

    const getDescendants = (id: string): string[] => {
      const children = documents.filter(d => d.category === id);
      let ids = children.map(c => c.id);
      children.forEach(c => {
        if (c.fileType === 'folder') {
          ids = [...ids, ...getDescendants(c.id)];
        }
      });
      return ids;
    };

    const toDeleteIds = [folderId, ...getDescendants(folderId)];

    try {
      for (const id of toDeleteIds) {
        await deleteDocument(id);
      }
      if (activeFolderId === folderId) {
        setActiveFolderId(ROOT);
      }
      onAddToast(`Folder "${folder.name}" deleted successfully.`, 'success');
      onRefresh();
    } catch {
      onAddToast('Failed to delete folder.', 'error');
    }
  };

  /* ── Rename Actions ── */
  const triggerRename = (id: string, type: 'folder' | 'file', name: string) => {
    setRenameTarget({ id, type, currentName: name });
    setRenameValue(name);
    setShowRename(true);
  };

  const handleSaveRename = async () => {
    const name = renameValue.trim();
    if (!name || !renameTarget) return;

    const doc = documents.find(d => d.id === renameTarget.id);
    if (!doc) return;

    // Duplicate sibling validation
    const parentId = doc.category === 'root' ? ROOT : doc.category;
    if (renameTarget.type === 'folder') {
      const siblings = childFolders(parentId).filter(f => f.id !== renameTarget.id);
      const hasDuplicate = siblings.some(f => f.name.toLowerCase() === name.toLowerCase());
      if (hasDuplicate) {
        onAddToast(`A folder named "${name}" already exists in this location.`, 'error');
        return;
      }
    } else {
      const siblings = files.filter(f => f.folderId === parentId && f.id !== renameTarget.id);
      const hasDuplicate = siblings.some(f => f.title.toLowerCase() === name.toLowerCase());
      if (hasDuplicate) {
        onAddToast(`A file named "${name}" already exists in this location.`, 'error');
        return;
      }
    }

    const updatedDoc: Document = {
      ...doc,
      title: name
    };

    try {
      await updateDocument(updatedDoc);
      onAddToast(`${renameTarget.type === 'folder' ? 'Folder' : 'File'} renamed to "${name}".`, 'success');
      setShowRename(false);
      onRefresh();
    } catch {
      onAddToast('Failed to rename.', 'error');
    }
  };

  /* ── File Actions ── */
  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files?.length) return;
    setUploading(true);
    let count = 0;
    try {
      for (const file of Array.from(e.target.files)) {
        const url  = await uploadImage(file, 'DOCS');
        const ext  = (file.name.split('.').pop() ?? '').toLowerCase();
        let type = 'pdf';
        if (ext === 'pdf') type = 'pdf';
        else if (ext === 'png') type = 'png';
        else if (ext === 'jpg' || ext === 'jpeg') type = 'jpeg';
        else if (ext === 'doc' || ext === 'docx') type = 'word';
        else if (['mp4', 'webm', 'ogg', 'mov'].includes(ext)) type = ext;
        else type = 'pdf';
        const doc: Document = {
          id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
          title: file.name.replace(/\.[^.]+$/, ''),
          category: activeFolderId === ROOT ? 'root' : activeFolderId,
          fileUrl: url,
          fileType: type,
          uploadedBy: 'Staff',
          date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
        };
        await addDocument(doc);
        count++;
      }
      onAddToast(`${count} file(s) uploaded successfully.`, 'success');
      onRefresh();
    } catch (err: any) {
      onAddToast(err.message || 'Upload failed', 'error');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const deleteFile = async (file: DocEntry) => {
    if (!await onConfirm(`Delete file "${file.title}"?`)) return;
    try {
      await deleteDocument(file.id);
      onAddToast(`"${file.title}" deleted.`, 'success');
      onRefresh();
    } catch {
      onAddToast('Failed to delete file.', 'error');
    }
  };

  /* ── Drag & Drop Handlers inside the UI ── */
  const handleDragStartItem = (e: React.DragEvent, id: string, type: 'folder' | 'file') => {
    e.dataTransfer.setData('text/plain', JSON.stringify({ id, type }));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDropToReorder = async (
    e: React.DragEvent,
    targetId: string,
    targetParentId: string
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverFolderId(null);
    setDragOverItemId(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { id: draggedId, type: draggedType } = JSON.parse(dataStr);

      if (draggedId === targetId) return;

      // Drop ON a folder with shift key moves INSIDE that folder
      const targetIsFolder = folders.some(f => f.id === targetId);
      if (targetIsFolder && e.shiftKey) {
        if (draggedType === 'folder') {
          const isDescendant = (parent: string, child: string): boolean => {
            if (parent === child) return true;
            const parentFolder = folders.find(f => f.id === child);
            if (!parentFolder || parentFolder.parentId === ROOT) return false;
            return isDescendant(parent, parentFolder.parentId);
          };
          if (isDescendant(draggedId, targetId)) {
            onAddToast('Cannot move a folder inside its own subfolder.', 'error');
            return;
          }
        }
        const doc = documents.find(d => d.id === draggedId);
        if (doc) {
          await updateDocument({
            ...doc,
            category: targetId === ROOT ? 'root' : targetId
          });
          onAddToast(`Moved inside folder successfully.`, 'success');
          onRefresh();
        }
        return;
      }

      // Reorder items within container targetParentId
      const siblingFolders = childFolders(targetParentId);
      const siblingFiles = filesIn(targetParentId);

      let allSiblingIds = [
        ...siblingFolders.map(f => f.id),
        ...siblingFiles.map(f => f.id)
      ];

      allSiblingIds = allSiblingIds.filter(id => id !== draggedId);
      const targetIdx = allSiblingIds.indexOf(targetId);
      if (targetIdx !== -1) {
        allSiblingIds.splice(targetIdx, 0, draggedId);
      } else {
        allSiblingIds.push(draggedId);
      }

      const payload = allSiblingIds.map((id, index) => ({
        id,
        sortOrder: index,
        category: targetParentId === ROOT ? 'root' : targetParentId
      }));

      // Update localStorage map for instant client-side persistence across logins & logouts
      try {
        const localMap = JSON.parse(localStorage.getItem('jk_infra_doc_order_map') || '{}');
        payload.forEach(item => {
          localMap[item.id] = item.sortOrder;
        });
        localStorage.setItem('jk_infra_doc_order_map', JSON.stringify(localMap));
      } catch (err) {
        console.warn('localStorage error:', err);
      }

      // Save to backend database
      await reorderDocuments(payload);
      onAddToast('File order saved successfully.', 'success');
      onRefresh();
    } catch (err) {
      console.error('Reorder error:', err);
    }
  };

  const handleDropOnFolder = async (e: React.DragEvent, targetFolderId: string) => {
    e.preventDefault();
    setDragOverFolderId(null);

    try {
      const dataStr = e.dataTransfer.getData('text/plain');
      if (!dataStr) return;
      const { id, type } = JSON.parse(dataStr);

      if (id === targetFolderId) return; // Cannot drop onto itself

      if (type === 'folder') {
        // Prevent moving a folder into its own descendants
        const isDescendant = (parent: string, child: string): boolean => {
          if (parent === child) return true;
          const parentFolder = folders.find(f => f.id === child);
          if (!parentFolder || parentFolder.parentId === ROOT) return false;
          return isDescendant(parent, parentFolder.parentId);
        };

        if (isDescendant(id, targetFolderId)) {
          onAddToast('Cannot move a folder inside its own subfolder.', 'error');
          return;
        }

        const folderDoc = documents.find(d => d.id === id);
        if (folderDoc) {
          await updateDocument({
            ...folderDoc,
            category: targetFolderId === ROOT ? 'root' : targetFolderId
          });
          onAddToast(`Folder moved successfully.`, 'success');
          onRefresh();
        }
      } else {
        const fileDoc = documents.find(d => d.id === id);
        if (fileDoc) {
          await updateDocument({
            ...fileDoc,
            category: targetFolderId === ROOT ? 'root' : targetFolderId
          });
          onAddToast(`File moved successfully.`, 'success');
          onRefresh();
        }
      }
    } catch (err) {
      console.error('Drag drop move error:', err);
    }
  };

  /* ── Local Files Drag & Drop Handlers (From Desktop) ── */
  const handleDragOverLocal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(true);
  };

  const handleDragLeaveLocal = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);
  };

  const handleDropLocal = async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDraggingLocal(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      setUploading(true);
      let count = 0;
      try {
        for (const file of Array.from(e.dataTransfer.files)) {
          const url  = await uploadImage(file, 'DOCS');
          const ext  = (file.name.split('.').pop() ?? '').toLowerCase();
          const type = ext === 'pdf' ? 'pdf' : ext === 'png' ? 'png' : (ext === 'jpg' || ext === 'jpeg') ? 'jpeg' : 'pdf';
          const doc: Document = {
            id: 'doc_' + Date.now() + '_' + Math.random().toString(36).substring(2, 7),
            title: file.name.replace(/\.[^.]+$/, ''),
            category: activeFolderId === ROOT ? 'root' : activeFolderId,
            fileUrl: url,
            fileType: type,
            uploadedBy: 'Staff',
            date: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' }),
          };
          await addDocument(doc);
          count++;
        }
        onAddToast(`${count} file(s) uploaded successfully via drag & drop.`, 'success');
        onRefresh();
      } catch (err: any) {
        onAddToast(err.message || 'Upload failed', 'error');
      } finally {
        setUploading(false);
      }
    }
  };

  const bc          = breadcrumb();
  const subFolders  = useMemo(() => {
    const kids = childFolders(activeFolderId);
    if (!search.trim()) return kids;
    const q = search.toLowerCase();
    return kids.filter(f => f.name.toLowerCase().includes(q));
  }, [childFolders, activeFolderId, search]);
  const activeFiles = filesIn(activeFolderId);
  const activeFolder = folders.find(f => f.id === activeFolderId);

  return (
    <div className="sap-root" onClick={() => setCtx(null)}>

      {/* ──────────── Sticky Batch Selection Action Bar ──────────── */}
      {selectedDocIds.size > 0 && (
        <div className="sap-batch-bar">
          <div className="sap-batch-info">
            <CheckSquare size={18} style={{ color: '#ffffff' }} />
            <span><strong>{selectedDocIds.size}</strong> Document{selectedDocIds.size > 1 ? 's' : ''} Selected</span>
          </div>
          <div className="sap-batch-actions">
            <button className="sap-btn sap-btn-primary-bright" onClick={handleShareSelected}>
              <Share2 size={14} /> Share Selected ({selectedDocIds.size})
            </button>
            <button className="sap-btn sap-btn-white-ghost" onClick={handleDownloadSelected}>
              <Download size={14} /> Download ({selectedDocIds.size})
            </button>
            <button className="sap-btn sap-btn-danger-bright" onClick={handleDeleteSelected}>
              <Trash2 size={14} /> Delete
            </button>
            <button className="sap-btn sap-btn-icon-bright" onClick={clearDocSelection} title="Clear selection">
              <X size={16} />
            </button>
          </div>
        </div>
      )}

      {/* ──────────── Toolbar ──────────── */}
      <div className="sap-toolbar">
        <div className="sap-toolbar-left">
          <span className="sap-app-title">
            <Folder size={18} style={{ color: '#0070f2' }} /> Document Storage
          </span>
          <span className="sap-app-sub">
            {files.length} files · {folders.length} folders
          </span>
        </div>
        <div className="sap-toolbar-right">
          <div className="sap-search-wrap">
            <Search size={14} className="sap-search-icon" />
            <input
              className="sap-search-input"
              placeholder="Search folders & files…"
              value={search}
              onChange={e => setSearch(e.target.value)}
            />
          </div>
          {activeFiles.length > 0 && (
            <button
              className="sap-btn sap-btn-ghost"
              onClick={selectAllCurrentFolder}
              title="Select or deselect all documents in current folder"
            >
              <CheckSquare size={14} />
              {activeFiles.every(f => selectedDocIds.has(f.id)) ? 'Deselect Folder' : 'Select All Files'}
            </button>
          )}
          <div className="sap-view-toggle">
            <button className={viewMode === 'grid' ? 'active' : ''} onClick={() => setViewMode('grid')} title="Grid View"><Grid size={15} /></button>
            <button className={viewMode === 'list' ? 'active' : ''} onClick={() => setViewMode('list')} title="Table / List View"><List size={15} /></button>
            <button className={viewMode === 'tree' ? 'active' : ''} onClick={() => setViewMode('tree')} title="Tree Hierarchy Diagram View"><Network size={15} /></button>
          </div>
          <button className="sap-btn sap-btn-ghost" onClick={() => { setShowCF(true); setNewFolderName(''); }}>
            <FolderPlus size={15} /> New Folder
          </button>
          <label className={`sap-btn sap-btn-primary ${uploading ? 'disabled' : ''}`} style={{ cursor: 'pointer' }}>
            <Upload size={15} /> {uploading ? 'Uploading…' : 'Upload Files'}
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.mp4,.webm,.ogg,.mov"
              onChange={handleUpload}
              style={{ display: 'none' }}
              disabled={uploading}
            />
          </label>
        </div>
      </div>

      {/* ──────────── Body ──────────── */}
      <div className="sap-body">

        {/* ── Sidebar Nav ── */}
        <nav className="sap-nav">
          <div className="sap-nav-title">Navigation</div>
          <div
            className={`sap-tree-row${activeFolderId === ROOT ? ' active' : ''}${dragOverFolderId === ROOT ? ' drag-over' : ''}`}
            style={{ paddingLeft: 12 }}
            onClick={() => setActiveFolderId(ROOT)}
            
            // Drag and drop onto Root
            onDragOver={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverFolderId(ROOT);
            }}
            onDragLeave={(e) => {
              e.preventDefault();
              e.stopPropagation();
              setDragOverFolderId(null);
            }}
            onDrop={(e) => handleDropOnFolder(e, ROOT)}
          >
            <Home size={14} style={{ color: '#0070f2', flexShrink: 0 }} />
            <span className="sap-tree-label">Root</span>
            <span className="sap-tree-badge">{files.filter(f => f.folderId === ROOT).length}</span>
          </div>
          {childFolders(ROOT).map(f => (
            <TreeNode
              key={f.id}
              folder={f}
              depth={0}
              activeFolderId={activeFolderId}
              setActiveFolderId={setActiveFolderId}
              expandedIds={expandedIds}
              setExpandedIds={setExpandedIds}
              childFolders={childFolders}
              totalDescendantFiles={totalDescendantFiles}
              triggerRename={triggerRename}
              deleteFolder={deleteFolder}
              setCtx={setCtx}
              setShowCF={setShowCF}
              setNewFolderName={setNewFolderName}
              dragOverFolderId={dragOverFolderId}
              setDragOverFolderId={setDragOverFolderId}
              handleDragStartItem={handleDragStartItem}
              handleDropOnFolder={handleDropOnFolder}
            />
          ))}
        </nav>

        {/* ── Main panel ── */}
        <main 
          className={`sap-main ${isDraggingLocal ? 'dragging-local' : ''}`}
          onDragOver={handleDragOverLocal}
          onDragLeave={handleDragLeaveLocal}
          onDrop={handleDropLocal}
        >
          {/* Visual local files drop overlay */}
          {isDraggingLocal && (
            <div className="sap-dropzone-overlay">
              <Upload size={48} style={{ color: '#0070f2', marginBottom: '1rem' }} />
              <p>Drop files here to upload to <strong>{activeFolderId === ROOT ? 'Root' : (activeFolder?.name ?? '')}</strong></p>
            </div>
          )}

          {/* Path bar & back navigation */}
          <div className="sap-path-bar">
            <div className="sap-breadcrumb">
              {bc.map((seg, i) => (
                <React.Fragment key={seg.id}>
                  {i > 0 && <ChevronRight size={13} style={{ color: '#a0aec0', flexShrink: 0 }} />}
                  <button
                    className={`sap-bc-btn${i === bc.length - 1 ? ' current' : ''}`}
                    onClick={() => setActiveFolderId(seg.id)}
                    onContextMenu={e => {
                      if (seg.id !== ROOT) {
                        e.preventDefault();
                        e.stopPropagation();
                        setCtx({ id: seg.id, type: 'folder', x: e.clientX, y: e.clientY });
                      }
                    }}
                    title={seg.id !== ROOT ? `Right-click for options on "${seg.name}"` : undefined}
                  >
                    {i === 0 && <Home size={12} />} {seg.name}
                  </button>
                </React.Fragment>
              ))}
            </div>
            {activeFolderId !== ROOT && (
              <button className="sap-btn-back" onClick={() => {
                const cur = folders.find(f => f.id === activeFolderId);
                setActiveFolderId(cur?.parentId ?? ROOT);
              }}>
                <ArrowLeft size={13} /> Back
              </button>
            )}
          </div>

          {/* Empty state */}
          {subFolders.length === 0 && activeFiles.length === 0 && (
            <div className="sap-empty">
              <FolderPlus size={44} style={{ color: '#c3d9f7' }} />
              <p className="sap-empty-title">This folder is empty</p>
              <p className="sap-empty-sub">Upload files or create subfolders using the buttons in the top toolbar above</p>
            </div>
          )}

          {/* Universal Modern Enterprise Tree Diagram View */}
          {viewMode === 'tree' ? (
            <div className="sap-tree-diagram-container">
              {/* 🔵 Top/Root Parent Header Banner */}
              <div className="sap-root-header-banner">
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <FolderOpen size={20} style={{ color: '#ffffff' }} />
                  <span className="sap-root-header-title">
                    1.{activeFolderId === ROOT ? 'Document Storage' : (activeFolder?.name ?? 'Folder')}
                  </span>
                </div>
                <span className="sap-root-header-badge">{files.length} Files · {folders.length} Folders</span>
              </div>

              {/* Subfolders Grid (Side-by-Side) */}
              {subFolders.length > 0 && (
                <div className="sap-subfolders-grid">
                  {subFolders.map(sf => (
                    <FlowFolderNode
                      key={sf.id}
                      folder={sf}
                      depth={0}
                      activeFolderId={activeFolderId}
                      setActiveFolderId={setActiveFolderId}
                      childFolders={childFolders}
                      filesIn={filesIn}
                      totalDescendantFiles={totalDescendantFiles}
                      setPreviewDoc={setPreviewDoc}
                      triggerRename={triggerRename}
                      deleteFile={deleteFile}
                      deleteFolder={deleteFolder}
                      setShowCF={setShowCF}
                      setNewFolderName={setNewFolderName}
                      setCtx={setCtx}
                      dragOverItemId={dragOverItemId}
                      setDragOverItemId={setDragOverItemId}
                      handleDragStartItem={handleDragStartItem}
                      handleDropToReorder={handleDropToReorder}
                      selectedDocIds={selectedDocIds}
                      toggleDocSelection={toggleDocSelection}
                      onShareDoc={(doc) => openShareModal([doc])}
                    />
                  ))}
                </div>
              )}

              {/* Direct Files under current folder */}
              {activeFiles.length > 0 && (
                <div className="sap-file-cards-grid" style={{ marginTop: '0.25rem' }}>
                  {activeFiles.map(file => {
                    const isFileDragOver = dragOverItemId === file.id;
                    const isSelected = selectedDocIds.has(file.id);
                    return (
                      <div
                        key={file.id}
                        className={`sap-file-link-card${isSelected ? ' selected' : ''}`}
                        onClick={() => setPreviewDoc(file)}
                        onContextMenu={e => {
                          e.preventDefault();
                          e.stopPropagation();
                          setCtx({ id: file.id, type: 'file', x: e.clientX, y: e.clientY });
                        }}
                        title={`Preview ${file.title}`}
                        draggable={true}
                        onDragStart={(e) => handleDragStartItem(e, file.id, 'file')}
                        onDragOver={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverItemId(file.id);
                        }}
                        onDragLeave={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          setDragOverItemId(null);
                        }}
                        onDrop={(e) => handleDropToReorder(e, file.id, file.folderId)}
                        style={{
                          border: isFileDragOver ? '2px dashed #0070f2' : isSelected ? '1.5px solid #0070f2' : undefined,
                          backgroundColor: isFileDragOver ? '#ebf5ff' : isSelected ? '#e8f0fe' : undefined
                        }}
                      >
                        <div className="sap-file-card-main">
                          <div
                            className="sap-file-checkbox"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleDocSelection(file.id);
                            }}
                            title={isSelected ? "Deselect document" : "Select document"}
                            style={{ cursor: 'pointer', display: 'flex', alignItems: 'center', marginRight: 4 }}
                          >
                            {isSelected ? (
                              <CheckSquare size={17} style={{ color: '#0070f2' }} />
                            ) : (
                              <Square size={17} style={{ color: '#a0aec0' }} />
                            )}
                          </div>
                          <div className="sap-file-card-icon">{fileIcon(file.fileType)}</div>
                          <div className="sap-file-card-text">
                            <span className="sap-file-card-title">{file.title}</span>
                            <span className="sap-file-card-meta">{file.fileType.toUpperCase()} · {file.date}</span>
                          </div>
                        </div>
                        <div className="sap-file-card-actions" onClick={e => e.stopPropagation()}>
                          <button title="Share Document" onClick={() => openShareModal([file])}><Share2 size={13} /></button>
                          <button title="Preview" onClick={() => setPreviewDoc(file)}><Eye size={13} /></button>
                          <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download title="Download"><Download size={13} /></a>
                          <button title="Rename" onClick={() => triggerRename(file.id, 'file', file.title)}><Edit2 size={13} /></button>
                          <button className="danger" title="Delete" onClick={() => deleteFile(file)}><Trash2 size={13} /></button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          ) : (
            <>
              {/* Subfolders section */}
              {subFolders.length > 0 && (
                <section className="sap-section">
                  <div className="sap-section-header">
                    <span className="sap-section-title">Folders</span>
                    <span className="sap-section-count">{subFolders.length}</span>
                    <button
                      className="sap-inline-add-btn"
                      title="Create folder here"
                      onClick={() => { setShowCF(true); setNewFolderName(''); }}
                    >
                      <FolderPlus size={13} /> + Folder
                    </button>
                  </div>
                  <div className={viewMode === 'grid' ? 'sap-folders-grid' : 'sap-folders-list'}>
                    {subFolders.map(sf => {
                      const count = totalDescendantFiles(sf.id);
                      const isDragOver = dragOverFolderId === sf.id || dragOverItemId === sf.id;
                      return (
                        <div
                          key={sf.id}
                          className={`sap-folder-tile${isDragOver ? ' drag-over' : ''}`}
                          onClick={() => {
                            setActiveFolderId(sf.id);
                            setExpandedIds(prev => {
                              const n = new Set(prev);
                              n.add(sf.id);
                              return n;
                            });
                          }}
                          onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ id: sf.id, type: 'folder', x: e.clientX, y: e.clientY }); }}
                          
                          // Drag & Drop to move or reorder
                          draggable={true}
                          onDragStart={(e) => handleDragStartItem(e, sf.id, 'folder')}
                          onDragOver={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverItemId(sf.id);
                          }}
                          onDragLeave={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setDragOverItemId(null);
                          }}
                          onDrop={(e) => handleDropToReorder(e, sf.id, sf.parentId)}
                          style={{
                            border: isDragOver ? '2px dashed #0070f2' : undefined,
                            backgroundColor: isDragOver ? '#ebf5ff' : undefined
                          }}
                        >
                          <div className="sap-folder-tile-icon">
                            <FolderOpen size={viewMode === 'grid' ? 40 : 22} style={{ color: '#0070f2' }} />
                          </div>
                          <div className="sap-folder-tile-info">
                            <span className="sap-folder-tile-name">{sf.name}</span>
                            <span className="sap-folder-tile-sub">{count} item{count !== 1 ? 's' : ''}</span>
                          </div>
                          <div className="sap-folder-tile-actions">
                            <button title="Rename" onClick={e => { e.stopPropagation(); triggerRename(sf.id, 'folder', sf.name); }}><Edit2 size={13} /></button>
                            <button title="Delete" className="danger" onClick={e => { e.stopPropagation(); deleteFolder(sf.id); }}><Trash2 size={13} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </section>
              )}

              {/* Files section */}
              {activeFiles.length > 0 && (
                <section className="sap-section">
                  <div className="sap-section-header">
                    <span className="sap-section-title">Files</span>
                    <span className="sap-section-count">{activeFiles.length}</span>
                  </div>

                  {viewMode === 'grid' ? (
                    <div className="sap-files-grid">
                      {activeFiles.map(file => {
                        const isFileDragOver = dragOverItemId === file.id;
                        const isSelected = selectedDocIds.has(file.id);
                        return (
                          <div
                            key={file.id}
                            className={`sap-file-card${isSelected ? ' selected' : ''}`}
                            style={{ 
                              background: isSelected ? '#e8f0fe' : (fileColor[file.fileType] ?? '#f7fafc'),
                              border: isFileDragOver ? '2px dashed #0070f2' : isSelected ? '2px solid #0070f2' : undefined
                            }}
                            onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ id: file.id, type: 'file', x: e.clientX, y: e.clientY }); }}
                            
                            // Drag & Drop reorder
                            draggable={true}
                            onDragStart={(e) => handleDragStartItem(e, file.id, 'file')}
                            onDragOver={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverItemId(file.id);
                            }}
                            onDragLeave={(e) => {
                              e.preventDefault();
                              e.stopPropagation();
                              setDragOverItemId(null);
                            }}
                            onDrop={(e) => handleDropToReorder(e, file.id, file.folderId)}
                          >
                            <div
                              className="sap-file-card-checkbox"
                              onClick={(e) => { e.stopPropagation(); toggleDocSelection(file.id); }}
                              title={isSelected ? "Deselect document" : "Select document"}
                              style={{ position: 'absolute', top: 8, left: 8, cursor: 'pointer', zIndex: 5 }}
                            >
                              {isSelected ? <CheckSquare size={18} style={{ color: '#0070f2' }} /> : <Square size={18} style={{ color: '#a0aec0' }} />}
                            </div>
                            <div className="sap-file-card-icon">{fileIcon(file.fileType)}</div>
                            <span className="sap-file-card-name" title={file.title}>{file.title}</span>
                            <span className="sap-file-card-type">{file.fileType.toUpperCase()} · {file.date}</span>
                            <div className="sap-file-card-actions">
                              <button onClick={() => openShareModal([file])} title="Share"><Share2 size={13} /></button>
                              <button onClick={() => setPreviewDoc(file)} title="Preview"><Eye size={13} /></button>
                              <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download title="Download"><Download size={13} /></a>
                              <button onClick={() => triggerRename(file.id, 'file', file.title)} title="Rename"><Edit2 size={13} /></button>
                              <button className="danger" onClick={() => deleteFile(file)} title="Delete"><Trash2 size={13} /></button>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="sap-files-table-wrap">
                      <table className="sap-files-table">
                        <thead>
                          <tr>
                            <th style={{ width: 38, textAlign: 'center' }}>
                              <input
                                type="checkbox"
                                checked={activeFiles.length > 0 && activeFiles.every(f => selectedDocIds.has(f.id))}
                                onChange={selectAllCurrentFolder}
                                title="Select / Deselect all in this folder"
                                style={{ cursor: 'pointer' }}
                              />
                            </th>
                            <th style={{ width: 44 }}>Type</th>
                            <th>File Name</th>
                            <th>Date</th>
                            <th>Actions</th>
                          </tr>
                        </thead>
                        <tbody>
                          {activeFiles.map(file => {
                            const isSelected = selectedDocIds.has(file.id);
                            return (
                              <tr 
                                key={file.id} 
                                className={isSelected ? 'selected-row' : ''}
                                onContextMenu={e => { e.preventDefault(); e.stopPropagation(); setCtx({ id: file.id, type: 'file', x: e.clientX, y: e.clientY }); }}
                                
                                // Drag table row
                                draggable={true}
                                onDragStart={(e) => handleDragStartItem(e, file.id, 'file')}
                              >
                                <td style={{ width: 38, textAlign: 'center' }} onClick={e => e.stopPropagation()}>
                                  <input
                                    type="checkbox"
                                    checked={isSelected}
                                    onChange={() => toggleDocSelection(file.id)}
                                    style={{ cursor: 'pointer' }}
                                  />
                                </td>
                                <td style={{ width: 44 }}>{fileIcon(file.fileType)}</td>
                                <td>
                                  <span className="sap-table-filename">{file.title}</span>
                                  <span className="sap-table-filemeta">{file.fileType.toUpperCase()}</span>
                                </td>
                                <td className="sap-table-date">{file.date}</td>
                                <td>
                                  <div className="sap-table-actions">
                                    <button title="Share" onClick={() => openShareModal([file])}><Share2 size={13} /></button>
                                    <button title="Preview" onClick={() => setPreviewDoc(file)}><Eye size={13} /></button>
                                    <a href={file.fileUrl} target="_blank" rel="noopener noreferrer" download title="Download"><Download size={13} /></a>
                                    <button title="Rename" onClick={() => triggerRename(file.id, 'file', file.title)}><Edit2 size={13} /></button>
                                    <button title="Delete" className="danger" onClick={() => deleteFile(file)}><Trash2 size={13} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </section>
              )}
            </>
          )}
        </main>
      </div>

      {/* ──────────── Create Folder Modal ──────────── */}
      {showCF && (
        <div className="modal-overlay" onClick={() => setShowCF(false)}>
          <div className="sap-modal" onClick={e => e.stopPropagation()}>
            <div className="sap-modal-header">
              <span><FolderPlus size={17} /> Create New Folder</span>
              <button onClick={() => setShowCF(false)}><X size={17} /></button>
            </div>
            <div className="sap-modal-body">
              <p className="sap-modal-sub">Inside: <strong>{activeFolderId === ROOT ? 'Root' : (activeFolder?.name ?? '')}</strong></p>
              <div className="form-group">
                <label className="form-label">Folder Name *</label>
                <input
                  autoFocus
                  type="text"
                  className="form-control"
                  placeholder="e.g. MIG 575, Legal Docs, 2024…"
                  value={newFolderName}
                  onChange={e => setNewFolderName(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && createFolder()}
                />
              </div>
              <div className="sap-modal-footer">
                <button className="sap-btn sap-btn-ghost" onClick={() => setShowCF(false)}>Cancel</button>
                <button className="sap-btn sap-btn-primary" onClick={createFolder}><Check size={14} /> Create</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Rename Modal (Replaces Inline inputs) ──────────── */}
      {showRename && renameTarget && (
        <div className="modal-overlay" onClick={() => setShowRename(false)}>
          <div className="sap-modal" onClick={e => e.stopPropagation()}>
            <div className="sap-modal-header">
              <span><Edit2 size={16} /> Rename {renameTarget.type === 'folder' ? 'Folder' : 'File'}</span>
              <button onClick={() => setShowRename(false)}><X size={17} /></button>
            </div>
            <div className="sap-modal-body">
              <div className="form-group">
                <label className="form-label">New Name *</label>
                <input
                  autoFocus
                  type="text"
                  className="form-control"
                  value={renameValue}
                  onChange={e => setRenameValue(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleSaveRename()}
                />
              </div>
              <div className="sap-modal-footer">
                <button className="sap-btn sap-btn-ghost" onClick={() => setShowRename(false)}>Cancel</button>
                <button className="sap-btn sap-btn-primary" onClick={handleSaveRename}><Check size={14} /> Save</button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Context Menu ──────────── */}
      {ctx && (
        <div className="sap-ctx" style={{ top: ctx.y, left: ctx.x }} onClick={e => e.stopPropagation()}>
          {ctx.type === 'folder' ? (
            <>
              <button onClick={() => { setActiveFolderId(ctx.id); setExpandedIds(p => { const n = new Set(p); n.add(ctx.id); return n; }); setCtx(null); }}><FolderOpen size={13} /> Open</button>
              <button onClick={() => {
                const filesInFolder = files.filter(f => f.folderId === ctx.id);
                if (filesInFolder.length > 0) openShareModal(filesInFolder);
                else onAddToast('Folder contains no direct files to share.', 'info');
                setCtx(null);
              }}><Share2 size={13} /> Share Folder Files</button>
              <button onClick={() => { setActiveFolderId(ctx.id); setCtx(null); setTimeout(() => fileInputRef.current?.click(), 50); }}><Upload size={13} /> Upload File</button>
              <button onClick={() => { const f = folders.find(x => x.id === ctx.id); if (f) triggerRename(ctx.id, 'folder', f.name); setCtx(null); }}><Edit2 size={13} /> Rename</button>
              <button onClick={() => { setActiveFolderId(ctx.id); setShowCF(true); setCtx(null); }}><FolderPlus size={13} /> New Subfolder</button>
              <hr className="sap-ctx-sep" />
              <button className="danger" onClick={() => { deleteFolder(ctx.id); setCtx(null); }}><Trash2 size={13} /> Delete</button>
            </>
          ) : (
            <>
              <button onClick={() => { const f = files.find(x => x.id === ctx.id); if (f) openShareModal([f]); setCtx(null); }}><Share2 size={13} /> Share</button>
              <button onClick={() => { const f = files.find(x => x.id === ctx.id); if (f) setPreviewDoc(f); setCtx(null); }}><Eye size={13} /> Preview</button>
              <button onClick={() => { const f = files.find(x => x.id === ctx.id); if (f) triggerRename(f.id, 'file', f.title); setCtx(null); }}><Edit2 size={13} /> Rename</button>
              <hr className="sap-ctx-sep" />
              <button className="danger" onClick={() => { const f = files.find(x => x.id === ctx.id); if (f) deleteFile(f); setCtx(null); }}><Trash2 size={13} /> Delete</button>
            </>
          )}
        </div>
      )}

      {/* ──────────── Preview Modal ──────────── */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" style={{ maxWidth: 860, width: '92%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1a202c' }}>{previewDoc.title}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <button onClick={() => { setPreviewDoc(null); openShareModal([previewDoc]); }} className="sap-btn sap-btn-primary" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Share2 size={14} /> Share</button>
                <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" download className="sap-btn sap-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Download size={14} /> Download</a>
                <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: '1rem', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
              {previewDoc.fileType === 'pdf' ? (
                <iframe src={previewDoc.fileUrl} title="PDF" style={{ width: '100%', height: 500, border: 'none', borderRadius: 6 }} />
              ) : (previewDoc.fileType === 'jpeg' || previewDoc.fileType === 'png') ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 6 }} />
              ) : (['mp4', 'webm', 'ogg', 'mov'].includes(previewDoc.fileType)) ? (
                <video src={previewDoc.fileUrl} controls style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 6, outline: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <FileText size={56} style={{ color: '#3182ce', marginBottom: 12 }} />
                  <p style={{ color: '#718096' }}>Word files cannot be previewed in the browser.</p>
                  <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" download className="sap-btn sap-btn-primary" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Download to View</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Multiple Document Sharing Modal ──────────── */}
      {shareModalDocs && (
        <div className="modal-overlay" onClick={() => setShareModalDocs(null)}>
          <div className="sap-modal sap-share-modal" onClick={e => e.stopPropagation()}>
            <div className="sap-modal-header">
              <span><Share2 size={18} style={{ color: '#0070f2' }} /> Share Documents ({shareModalDocs.length})</span>
              <button onClick={() => setShareModalDocs(null)}><X size={18} /></button>
            </div>

            <div className="sap-modal-body">
              {/* Selected files preview chips */}
              <div className="sap-share-files-preview">
                <label className="form-label" style={{ marginBottom: 6, fontWeight: 700, fontSize: '0.8rem', color: '#2d3a4a' }}>
                  Selected Documents ({shareModalDocs.length})
                </label>
                <div className="sap-share-files-list">
                  {shareModalDocs.map(doc => (
                    <div key={doc.id} className="sap-share-file-chip">
                      {fileIcon(doc.fileType)}
                      <span className="title" title={doc.title}>{doc.title}</span>
                      <span className="type">{doc.fileType.toUpperCase()}</span>
                      {shareModalDocs.length > 1 && (
                        <button
                          className="remove-btn"
                          title="Remove from share"
                          onClick={() => setShareModalDocs(prev => prev ? prev.filter(d => d.id !== doc.id) : null)}
                        >
                          <X size={12} />
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Custom optional note/message */}
              <div className="form-group" style={{ marginTop: 4 }}>
                <label className="form-label" style={{ fontWeight: 600, fontSize: '0.8rem', color: '#4a5568' }}>Add Note / Description (Optional)</label>
                <input
                  type="text"
                  className="form-control"
                  placeholder="e.g. Please review these customer verification documents..."
                  value={shareNote}
                  onChange={e => setShareNote(e.target.value)}
                />
              </div>

              {/* Share Channel Buttons Grid */}
              <div className="sap-share-channels">
                {'share' in navigator && (
                  <button className="sap-share-channel-btn native" onClick={handleNativeShare} style={{ background: '#f0f7ff', borderColor: '#0070f2' }}>
                    <Share2 size={22} style={{ color: '#0070f2' }} />
                    <div className="text-group">
                      <span className="main-label" style={{ color: '#0070f2' }}>Attach & Share Files</span>
                      <span className="sub-label">Share actual document files directly</span>
                    </div>
                  </button>
                )}

                <button className="sap-share-channel-btn whatsapp" onClick={handleWhatsAppShare}>
                  <MessageCircle size={22} />
                  <div className="text-group">
                    <span className="main-label">Share via WhatsApp</span>
                    <span className="sub-label">Send document list to WhatsApp</span>
                  </div>
                </button>

                <button className="sap-share-channel-btn email" onClick={handleEmailShare}>
                  <Mail size={22} />
                  <div className="text-group">
                    <span className="main-label">Share via Email</span>
                    <span className="sub-label">Open mail app with document list</span>
                  </div>
                </button>

                <button className="sap-share-channel-btn download" onClick={handleDownloadShareModalDocs} style={{ background: '#f0fdf4', borderColor: '#16a34a' }}>
                  <Download size={22} style={{ color: '#16a34a' }} />
                  <div className="text-group">
                    <span className="main-label" style={{ color: '#16a34a' }}>Download Documents</span>
                    <span className="sub-label">Save files to device for manual attachment</span>
                  </div>
                </button>
              </div>

              {/* Formatted Text Preview Box */}
              <div className="sap-share-preview-box">
                <div className="sap-share-preview-header">
                  <span>Message Preview</span>
                  <button onClick={handleCopyShareMessage} title="Copy preview text"><Copy size={13} /> Copy</button>
                </div>
                <pre className="sap-share-preview-content">{getFormattedShareMessage()}</pre>
              </div>

            </div>

            <div className="sap-modal-footer">
              <button className="sap-btn sap-btn-ghost" onClick={() => setShareModalDocs(null)}>Close</button>
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Preview Modal ──────────── */}
      {previewDoc && (
        <div className="modal-overlay" onClick={() => setPreviewDoc(null)}>
          <div className="modal-content" style={{ maxWidth: 860, width: '92%' }} onClick={e => e.stopPropagation()}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.85rem 1.25rem', borderBottom: '1px solid #e2e8f0' }}>
              <h3 style={{ margin: 0, fontSize: '1rem', color: '#1a202c' }}>{previewDoc.title}</h3>
              <div style={{ display: 'flex', gap: 8 }}>
                <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" download className="sap-btn sap-btn-ghost" style={{ display: 'inline-flex', alignItems: 'center', gap: 4 }}><Download size={14} /> Download</a>
                <button onClick={() => setPreviewDoc(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#718096' }}><X size={20} /></button>
              </div>
            </div>
            <div style={{ padding: '1rem', minHeight: 300, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f7fafc' }}>
              {previewDoc.fileType === 'pdf' ? (
                <iframe src={previewDoc.fileUrl} title="PDF" style={{ width: '100%', height: 500, border: 'none', borderRadius: 6 }} />
              ) : (previewDoc.fileType === 'jpeg' || previewDoc.fileType === 'png') ? (
                <img src={previewDoc.fileUrl} alt={previewDoc.title} style={{ maxWidth: '100%', maxHeight: 500, objectFit: 'contain', borderRadius: 6 }} />
              ) : (['mp4', 'webm', 'ogg', 'mov'].includes(previewDoc.fileType)) ? (
                <video src={previewDoc.fileUrl} controls style={{ maxWidth: '100%', maxHeight: 500, borderRadius: 6, outline: 'none' }} />
              ) : (
                <div style={{ textAlign: 'center' }}>
                  <FileText size={56} style={{ color: '#3182ce', marginBottom: 12 }} />
                  <p style={{ color: '#718096' }}>Word files cannot be previewed in the browser.</p>
                  <a href={previewDoc.fileUrl} target="_blank" rel="noopener noreferrer" download className="sap-btn sap-btn-primary" style={{ marginTop: 12, display: 'inline-flex', alignItems: 'center', gap: 6 }}><Download size={14} /> Download to View</a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ──────────── Scoped CSS ──────────── */}
      <style>{`
        /* Root container */
        .sap-root {
          display: flex; flex-direction: column;
          height: calc(100vh - 110px); min-height: 560px;
          background: #f0f4f9;
          border-radius: 10px; overflow: hidden;
          border: 1px solid #d1dce8;
          font-family: '72', 'Helvetica Neue', Arial, sans-serif;
        }

        /* Toolbar */
        .sap-toolbar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.65rem 1.25rem; background: #fff;
          border-bottom: 1px solid #d1dce8; flex-shrink: 0; gap: 1rem; flex-wrap: wrap;
        }
        .sap-toolbar-left { display: flex; align-items: center; gap: 0.75rem; }
        .sap-app-title { font-size: 1rem; font-weight: 700; color: #1a2d4e; display: flex; align-items: center; gap: 6px; }
        .sap-app-sub { font-size: 0.75rem; color: #8c9cb0; border-left: 1px solid #d1dce8; padding-left: 0.75rem; }
        .sap-toolbar-right { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }

        /* Search input */
        .sap-search-wrap { position: relative; }
        .sap-search-icon { position: absolute; left: 9px; top: 50%; transform: translateY(-50%); color: #8c9cb0; pointer-events: none; }
        .sap-search-input { padding: 0.42rem 0.75rem 0.42rem 2rem; border: 1px solid #d1dce8; border-radius: 6px; font-size: 0.83rem; outline: none; width: 180px; background: #f8fafc; }
        .sap-search-input:focus { border-color: #0070f2; background: #fff; }

        /* View Mode toggle */
        .sap-view-toggle { display: flex; border: 1px solid #d1dce8; border-radius: 6px; overflow: hidden; }
        .sap-view-toggle button { padding: 0.38rem 0.6rem; border: none; background: #fff; cursor: pointer; color: #8c9cb0; display: flex; align-items: center; transition: all 0.12s; }
        .sap-view-toggle button.active { background: #0070f2; color: #fff; }
        .sap-view-toggle button:hover:not(.active) { background: #f0f4f9; }

        /* General buttons */
        .sap-btn { display: inline-flex; align-items: center; gap: 5px; padding: 0.42rem 0.85rem; border-radius: 6px; font-size: 0.83rem; font-weight: 600; cursor: pointer; border: 1px solid transparent; transition: all 0.12s; }
        .sap-btn-primary { background: #0070f2; color: #fff; border-color: #0070f2; }
        .sap-btn-primary:hover { background: #0057c2; }
        .sap-btn-ghost { background: #fff; color: #0070f2; border-color: #0070f2; }
        .sap-btn-ghost:hover { background: #e8f0fe; }

        /* Layout structure */
        .sap-body { display: flex; flex: 1; overflow: hidden; }

        /* Sidebar navigation */
        .sap-nav { width: 220px; flex-shrink: 0; background: #fff; border-right: 1px solid #d1dce8; overflow-y: auto; padding: 0.75rem 0; }
        .sap-nav-title { font-size: 0.68rem; font-weight: 700; color: #8c9cb0; text-transform: uppercase; letter-spacing: 0.08em; padding: 0 12px 0.5rem; }

        /* Tree row structure */
        .sap-tree-row { display: flex; align-items: center; gap: 6px; cursor: pointer; padding: 0.38rem 6px 0.38rem 12px; font-size: 0.83rem; color: #2d3a4a; border-left: 3px solid transparent; transition: all 0.12s; user-select: none; }
        .sap-tree-row:hover { background: #f0f4f9; }
        .sap-tree-row.active { background: #e8f0fe; color: #0070f2; font-weight: 600; border-left-color: #0070f2; }
        .sap-tree-row.drag-over { background: #e0f0ff; border: 1.5px dashed #0070f2; }
        .sap-tree-arrow { width: 14px; text-align: center; font-size: 0.7rem; color: #8c9cb0; flex-shrink: 0; }
        .sap-tree-label { flex: 1; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .sap-tree-badge { font-size: 0.65rem; background: #e8f0fe; color: #0070f2; padding: 0 5px; border-radius: 10px; flex-shrink: 0; }

        /* Sidebar inline add (+) button */
        .sap-tree-add-btn {
          display: none; align-items: center; justify-content: center;
          width: 18px; height: 18px; flex-shrink: 0;
          background: #0070f2; color: #fff; border: none; border-radius: 4px;
          font-size: 0.85rem; font-weight: 700; cursor: pointer; line-height: 1;
        }
        .sap-tree-row:hover .sap-tree-add-btn { display: inline-flex; }
        .sap-tree-add-btn:hover { background: #0057c2; }

        /* Main Workspace */
        .sap-main { flex: 1; overflow-y: auto; padding: 1.25rem; display: flex; flex-direction: column; gap: 1.25rem; position: relative; transition: background-color 0.15s; }
        .sap-main.dragging-local { background-color: #ebf4ff; }

        /* Drag and Drop Local files overlay dropzone */
        .sap-dropzone-overlay {
          position: absolute; top: 0; left: 0; right: 0; bottom: 0;
          background: rgba(235, 244, 255, 0.9);
          border: 3px dashed #0070f2; border-radius: 8px;
          display: flex; flex-direction: column; align-items: center; justify-content: center;
          color: #0070f2; font-weight: bold; font-size: 1.1rem; z-index: 20;
          pointer-events: none;
        }

        /* Path breadcrumb bar */
        .sap-path-bar { display: flex; align-items: center; justify-content: space-between; background: #fff; border: 1px solid #d1dce8; border-radius: 8px; padding: 0.55rem 1rem; }
        .sap-breadcrumb { display: flex; align-items: center; gap: 4px; flex-wrap: wrap; }
        .sap-bc-btn { background: none; border: none; cursor: pointer; color: #0070f2; font-size: 0.82rem; font-weight: 600; display: inline-flex; align-items: center; gap: 3px; padding: 2px 5px; border-radius: 4px; }
        .sap-bc-btn:hover { background: #e8f0fe; }
        .sap-bc-btn.current { color: #2d3a4a; cursor: default; }
        .sap-bc-btn.current:hover { background: none; }
        .sap-btn-back { display: inline-flex; align-items: center; gap: 4px; font-size: 0.78rem; background: none; border: 1px solid #d1dce8; border-radius: 5px; padding: 0.25rem 0.6rem; cursor: pointer; color: #4a5568; }
        .sap-btn-back:hover { background: #f0f4f9; }

        /* Empty folder display */
        .sap-empty { display: flex; flex-direction: column; align-items: center; justify-content: center; flex: 1; padding: 3rem; text-align: center; background: #fff; border-radius: 10px; border: 1px dashed #d1dce8; }
        .sap-empty-title { font-size: 1rem; font-weight: 700; color: #4a5568; margin: 0.75rem 0 0; }
        .sap-empty-sub { font-size: 0.82rem; color: #a0aec0; margin: 0.25rem 0 0; }

        /* Page section header */
        .sap-section { display: flex; flex-direction: column; gap: 0.65rem; }
        .sap-section-header { display: flex; align-items: center; gap: 0.5rem; }
        .sap-section-title { font-size: 0.78rem; font-weight: 700; color: #4a5568; text-transform: uppercase; letter-spacing: 0.06em; }
        .sap-section-count { font-size: 0.7rem; background: #e2e8f0; color: #4a5568; padding: 1px 7px; border-radius: 10px; }

        /* Inline "+ Folder" button */
        .sap-inline-add-btn {
          display: inline-flex; align-items: center; gap: 4px;
          padding: 2px 8px; background: #e8f0fe; color: #0070f2;
          border: 1px solid #bcd3f7; border-radius: 12px;
          font-size: 0.72rem; font-weight: 700; cursor: pointer;
          transition: background 0.12s; margin-left: auto;
        }
        .sap-inline-add-btn:hover { background: #0070f2; color: #fff; border-color: #0070f2; }

        /* Grid layouts */
        .sap-folders-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 0.75rem; }
        .sap-folders-list { display: flex; flex-direction: column; gap: 0.35rem; }

        /* Folder tile item */
        .sap-folder-tile {
          display: flex; align-items: center; gap: 0.75rem;
          background: #fff; border: 1px solid #d1dce8; border-radius: 8px;
          padding: 0.85rem 0.75rem; cursor: pointer; position: relative;
          transition: box-shadow 0.15s, border-color 0.15s, background-color 0.15s; user-select: none;
        }
        .sap-folders-grid .sap-folder-tile { flex-direction: column; align-items: center; text-align: center; padding: 1.1rem 0.75rem 0.85rem; }
        .sap-folder-tile:hover { box-shadow: 0 3px 12px rgba(0,112,242,0.12); border-color: #0070f2; }
        .sap-folder-tile.drag-over { background-color: #ebf4ff; border: 1.5px dashed #0070f2; }
        .sap-folder-tile-info { display: flex; flex-direction: column; gap: 2px; min-width: 0; flex: 1; }
        .sap-folders-grid .sap-folder-tile-info { align-items: center; }
        .sap-folder-tile-name { font-size: 0.83rem; font-weight: 600; color: #2d3a4a; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 100%; }
        .sap-folder-tile-sub { font-size: 0.68rem; color: #8c9cb0; }
        .sap-folder-tile-actions { display: none; gap: 3px; flex-shrink: 0; }
        .sap-folder-tile:hover .sap-folder-tile-actions { display: flex; }
        .sap-folder-tile-actions button { background: #f0f4f9; border: 1px solid #d1dce8; border-radius: 4px; padding: 3px 5px; cursor: pointer; display: flex; align-items: center; color: #4a5568; font-size: 0; }
        .sap-folder-tile-actions button.danger:hover { background: #fed7d7; color: #e53e3e; border-color: #e53e3e; }
        .sap-folder-tile-actions button:hover { background: #e8f0fe; color: #0070f2; }

        /* Files Grid view */
        .sap-files-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(140px, 1fr)); gap: 0.75rem; }
        .sap-file-card {
          display: flex; flex-direction: column; align-items: center; text-align: center;
          padding: 1rem 0.75rem 0.75rem; border: 1px solid #d1dce8; border-radius: 8px;
          cursor: pointer; position: relative; transition: box-shadow 0.15s;
        }
        .sap-file-card:hover { box-shadow: 0 3px 12px rgba(0,0,0,0.1); border-color: #8c9cb0; }
        .sap-file-card-icon { margin-bottom: 0.5rem; }
        .sap-file-card-name { font-size: 0.78rem; font-weight: 600; color: #2d3a4a; word-break: break-word; line-height: 1.3; max-height: 2.6em; overflow: hidden; }
        .sap-file-card-type { font-size: 0.65rem; color: #8c9cb0; margin-top: 3px; }
        .sap-file-card-actions { display: none; gap: 3px; margin-top: 0.5rem; }
        .sap-file-card:hover .sap-file-card-actions { display: flex; }
        .sap-file-card-actions button, .sap-file-card-actions a {
          background: #fff; border: 1px solid #d1dce8; border-radius: 4px; padding: 3px 5px;
          cursor: pointer; display: flex; align-items: center; color: #4a5568; text-decoration: none;
        }
        .sap-file-card-actions button:hover, .sap-file-card-actions a:hover { background: #e8f0fe; color: #0070f2; }
        .sap-file-card-actions button.danger:hover { background: #fed7d7; color: #e53e3e; }

        /* Files Table view */
        .sap-files-table-wrap { background: #fff; border: 1px solid #d1dce8; border-radius: 8px; overflow: hidden; }
        .sap-files-table { width: 100%; border-collapse: collapse; font-size: 0.83rem; }
        .sap-files-table thead { background: #f0f4f9; }
        .sap-files-table th { padding: 0.6rem 0.85rem; text-align: left; font-size: 0.72rem; font-weight: 700; color: #8c9cb0; text-transform: uppercase; letter-spacing: 0.06em; border-bottom: 1px solid #d1dce8; }
        .sap-files-table td { padding: 0.6rem 0.85rem; border-bottom: 1px solid #f0f4f9; vertical-align: middle; }
        .sap-files-table tr:last-child td { border-bottom: none; }
        .sap-files-table tr:hover td { background: #f8fbff; }
        .sap-table-filename { display: block; font-weight: 600; color: #2d3a4a; }
        .sap-table-filemeta { font-size: 0.68rem; color: #8c9cb0; }
        .sap-table-date { font-size: 0.78rem; color: #8c9cb0; white-space: nowrap; }
        .sap-table-actions { display: flex; gap: 4px; }
        .sap-table-actions button, .sap-table-actions a {
          background: none; border: 1px solid #d1dce8; border-radius: 4px; padding: 3px 6px;
          cursor: pointer; display: inline-flex; align-items: center; color: #4a5568; text-decoration: none;
        }
        .sap-table-actions button:hover, .sap-table-actions a:hover { background: #e8f0fe; color: #0070f2; border-color: #0070f2; }
        .sap-table-actions button.danger:hover { background: #fed7d7; color: #e53e3e; border-color: #e53e3e; }

        /* Context menus */
        .sap-ctx {
          position: fixed; z-index: 9999; background: #fff; border: 1px solid #d1dce8;
          border-radius: 8px; box-shadow: 0 8px 28px rgba(0,0,0,0.12); padding: 5px; min-width: 165px;
        }
        .sap-ctx button {
          display: flex; align-items: center; gap: 8px; width: 100%; padding: 0.42rem 0.75rem;
          background: none; border: none; font-size: 0.83rem; color: #2d3a4a; cursor: pointer; border-radius: 5px;
        }
        .sap-ctx button:hover { background: #f0f4f9; }
        .sap-ctx button.danger { color: #e53e3e; }
        .sap-ctx button.danger:hover { background: #fed7d7; }
        .sap-ctx-sep { border: none; border-top: 1px solid #e2e8f0; margin: 3px 0; }

        /* Modal styling */
        .sap-modal { background: #fff; border-radius: 10px; width: 420px; max-width: 95vw; box-shadow: 0 20px 60px rgba(0,0,0,0.18); }
        .sap-modal-header { display: flex; align-items: center; justify-content: space-between; padding: 1rem 1.25rem; border-bottom: 1px solid #e2e8f0; font-size: 1rem; font-weight: 700; color: #1a2d4e; }
        .sap-modal-header span { display: flex; align-items: center; gap: 8px; }
        .sap-modal-header button { background: none; border: none; cursor: pointer; color: #8c9cb0; }
        .sap-modal-body { padding: 1.25rem; display: flex; flex-direction: column; gap: 0.75rem; }
        .sap-modal-sub { font-size: 0.8rem; color: #8c9cb0; margin: 0; }
        .sap-modal-footer { display: flex; justify-content: flex-end; gap: 0.5rem; margin-top: 0.5rem; }

        /* ──────────── Universal Modern Enterprise Tree Palette ──────────── */
        .sap-tree-diagram-container {
          display: flex;
          flex-direction: column;
          gap: 1rem;
          width: 100%;
          max-width: 100%;
          margin: 0;
          padding: 0.25rem 0;
        }

        /* 🔵 Top/Root Parent Header Banner: Deep professional blue */
        .sap-root-header-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: linear-gradient(135deg, #0070f2 0%, #0057c2 100%);
          color: #ffffff;
          font-weight: 800;
          font-size: 1rem;
          padding: 12px 18px;
          border-radius: 8px;
          box-shadow: 0 4px 14px rgba(0, 112, 242, 0.25);
          letter-spacing: 0.02em;
          flex-wrap: wrap;
          gap: 8px;
        }
        .sap-root-header-title {
          font-size: 1.05rem;
          font-weight: 800;
          color: #ffffff;
        }
        .sap-root-header-badge {
          background: rgba(255, 255, 255, 0.22);
          color: #ffffff;
          font-size: 0.78rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 12px;
        }

        .sap-subfolders-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          width: 100%;
        }

        .sap-flow-folder-group {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          width: 100%;
          transition: all 0.15s ease;
          grid-column: span 1;
        }
        .sap-flow-folder-group.expanded {
          grid-column: 1 / -1;
        }

        /* 🔷 Subfolder Banner: Soft ice blue (#e8f0fe) with primary blue border (#0070f2) and dark blue text (#0057c2) */
        .sap-subfolder-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: 100%;
          background: #e8f0fe;
          color: #0057c2;
          font-weight: 700;
          font-size: 0.9rem;
          padding: 9px 14px;
          border: 1.5px solid #0070f2;
          border-radius: 6px;
          box-shadow: 0 1px 4px rgba(0, 112, 242, 0.1);
          cursor: pointer;
          user-select: none;
          transition: all 0.15s ease;
          gap: 8px;
        }
        .sap-subfolder-banner:hover {
          background: #0070f2;
          color: #ffffff;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 112, 242, 0.2);
        }
        .sap-subfolder-banner:hover .sap-subfolder-arrow,
        .sap-subfolder-banner:hover .sap-subfolder-icon {
          color: #ffffff !important;
        }
        .sap-subfolder-banner:hover .sap-subfolder-badge {
          background: rgba(255, 255, 255, 0.25);
          color: #ffffff;
        }
        .sap-subfolder-left {
          display: flex;
          align-items: center;
          gap: 8px;
          min-width: 0;
          flex: 1;
        }
        .sap-subfolder-arrow {
          font-size: 0.85rem;
          color: #0057c2;
          flex-shrink: 0;
          width: 12px;
        }
        .sap-subfolder-icon {
          color: #0057c2;
          flex-shrink: 0;
        }
        .sap-subfolder-title {
          font-weight: 700;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sap-subfolder-badge {
          background: #ffffff;
          color: #0070f2;
          font-size: 0.72rem;
          font-weight: 700;
          padding: 1px 8px;
          border-radius: 10px;
          flex-shrink: 0;
        }

        .sap-subfolder-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
        }
        .sap-subfolder-actions button {
          background: #ffffff;
          border: 1px solid #bcd3f7;
          color: #0070f2;
          border-radius: 4px;
          padding: 3px 7px;
          font-size: 0.72rem;
          font-weight: 600;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          gap: 4px;
          transition: all 0.12s;
        }
        .sap-subfolder-banner:hover .sap-subfolder-actions button {
          background: rgba(255, 255, 255, 0.2);
          border-color: rgba(255, 255, 255, 0.4);
          color: #ffffff;
        }
        .sap-subfolder-actions button:hover,
        .sap-subfolder-banner:hover .sap-subfolder-actions button:hover {
          background: #ffffff !important;
          color: #0070f2 !important;
        }
        .sap-subfolder-actions button.danger:hover,
        .sap-subfolder-banner:hover .sap-subfolder-actions button.danger:hover {
          background: #e53e3e !important;
          color: #ffffff !important;
          border-color: #e53e3e !important;
        }

        .sap-subfolder-content {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          width: 100%;
          padding-top: 0.25rem;
        }
        .sap-subfolder-nested-list {
          display: flex;
          flex-direction: column;
          gap: 0.65rem;
          width: 100%;
        }

        /* 📄 Side-by-Side File Link Cards (Full Space Utilization) */
        .sap-file-cards-grid {
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
          gap: 12px;
          width: 100%;
        }
        .sap-file-link-card {
          display: flex;
          align-items: center;
          justify-content: space-between;
          background: #ffffff;
          border: 1px solid #d1dce8;
          border-radius: 6px;
          padding: 10px 14px;
          cursor: pointer;
          transition: all 0.15s ease-in-out;
          box-shadow: 0 1px 3px rgba(0,0,0,0.02);
          min-width: 0;
        }
        .sap-file-link-card:hover {
          background: #f0f7ff;
          border-color: #0070f2;
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 112, 242, 0.12);
        }
        .sap-file-card-main {
          display: flex;
          align-items: center;
          gap: 10px;
          min-width: 0;
          flex: 1;
        }
        .sap-file-card-icon {
          flex-shrink: 0;
        }
        .sap-file-card-text {
          display: flex;
          flex-direction: column;
          min-width: 0;
          flex: 1;
        }
        .sap-file-card-title {
          font-weight: 600;
          font-size: 0.85rem;
          color: #2d3a4a;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sap-file-card-meta {
          font-size: 0.68rem;
          color: #8c9cb0;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }
        .sap-file-card-actions {
          display: flex;
          align-items: center;
          gap: 4px;
          flex-shrink: 0;
          opacity: 0.7;
          transition: opacity 0.15s;
        }
        .sap-file-link-card:hover .sap-file-card-actions {
          opacity: 1;
        }
        .sap-file-card-actions button, .sap-file-card-actions a {
          background: #ffffff;
          border: 1px solid #d1dce8;
          border-radius: 4px;
          padding: 3px 6px;
          color: #4a5568;
          cursor: pointer;
          display: inline-flex;
          align-items: center;
          transition: all 0.12s;
        }
        .sap-file-card-actions button:hover, .sap-file-card-actions a:hover {
          background: #0070f2;
          color: #ffffff;
          border-color: #0070f2;
        }
        .sap-file-card-actions button.danger:hover {
          background: #e53e3e;
          color: #ffffff;
          border-color: #e53e3e;
        }

        .sap-empty-folder-notice {
          padding: 6px 12px;
          font-size: 0.75rem;
          font-style: italic;
          color: #8c9cb0;
        }

        /* ──────────── Sticky Batch Selection Bar ──────────── */
        .sap-batch-bar {
          display: flex; align-items: center; justify-content: space-between;
          padding: 0.65rem 1.25rem; background: linear-gradient(135deg, #1e3a8a 0%, #0070f2 100%);
          color: #ffffff; flex-shrink: 0; gap: 1rem; flex-wrap: wrap;
          box-shadow: 0 4px 14px rgba(0, 112, 242, 0.3); z-index: 10;
          animation: slideDown 0.2s ease-out;
        }
        @keyframes slideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
        .sap-batch-info { display: flex; align-items: center; gap: 8px; font-size: 0.9rem; }
        .sap-batch-actions { display: flex; align-items: center; gap: 0.5rem; flex-wrap: wrap; }
        
        .sap-btn-primary-bright { background: #ffffff; color: #0070f2; border-color: #ffffff; font-weight: 700; }
        .sap-btn-primary-bright:hover { background: #f0f7ff; }
        .sap-btn-white-ghost { background: rgba(255, 255, 255, 0.18); color: #ffffff; border: 1px solid rgba(255, 255, 255, 0.35); font-weight: 600; }
        .sap-btn-white-ghost:hover { background: rgba(255, 255, 255, 0.3); }
        .sap-btn-danger-bright { background: #e53e3e; color: #ffffff; border-color: #e53e3e; }
        .sap-btn-danger-bright:hover { background: #c53030; }
        .sap-btn-icon-bright { background: transparent; color: #ffffff; border: none; padding: 4px; cursor: pointer; opacity: 0.8; }
        .sap-btn-icon-bright:hover { opacity: 1; }

        /* ──────────── Multiple Document Sharing Modal ──────────── */
        .sap-share-modal { width: 560px; max-width: 95vw; }
        
        .sap-share-files-preview { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 12px; }
        .sap-share-files-list { display: flex; flex-wrap: wrap; gap: 6px; max-height: 120px; overflow-y: auto; padding-top: 4px; }
        .sap-share-file-chip {
          display: inline-flex; align-items: center; gap: 6px;
          background: #ffffff; border: 1px solid #cbd5e0; border-radius: 16px;
          padding: 3px 10px; font-size: 0.75rem; color: #2d3a4a; max-width: 220px;
        }
        .sap-share-file-chip .title { font-weight: 600; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 120px; }
        .sap-share-file-chip .type { font-size: 0.65rem; color: #718096; background: #edf2f7; padding: 1px 5px; border-radius: 8px; }
        .sap-share-file-chip .remove-btn { background: none; border: none; cursor: pointer; color: #a0aec0; display: flex; align-items: center; padding: 0; }
        .sap-share-file-chip .remove-btn:hover { color: #e53e3e; }

        /* Share Channels 2x2 Grid */
        .sap-share-channels { display: grid; grid-template-columns: 1fr 1fr; gap: 10px; margin-top: 8px; }
        .sap-share-channel-btn {
          display: flex; align-items: center; gap: 10px; padding: 10px 12px;
          border-radius: 8px; border: 1px solid #e2e8f0; cursor: pointer;
          background: #ffffff; text-align: left; transition: all 0.15s ease;
        }
        .sap-share-channel-btn:hover { transform: translateY(-1px); box-shadow: 0 4px 12px rgba(0,0,0,0.08); }
        
        .sap-share-channel-btn.whatsapp { border-color: #25d366; background: #f0fdf4; color: #166534; }
        .sap-share-channel-btn.whatsapp:hover { background: #25d366; color: #ffffff; }
        
        .sap-share-channel-btn.email { border-color: #0070f2; background: #eff6ff; color: #1e40af; }
        .sap-share-channel-btn.email:hover { background: #0070f2; color: #ffffff; }
        
        .sap-share-channel-btn.copy { border-color: #475569; background: #f8fafc; color: #334155; }
        .sap-share-channel-btn.copy:hover { background: #475569; color: #ffffff; }
        
        .sap-share-channel-btn.native { border-color: #8b5cf6; background: #f5f3ff; color: #5b21b6; }
        .sap-share-channel-btn.native:hover { background: #8b5cf6; color: #ffffff; }

        .sap-share-channel-btn .text-group { display: flex; flex-direction: column; }
        .sap-share-channel-btn .main-label { font-weight: 700; font-size: 0.82rem; }
        .sap-share-channel-btn .sub-label { font-size: 0.68rem; opacity: 0.8; }

        /* Formatted Share Preview Box */
        .sap-share-preview-box { background: #0f172a; border-radius: 8px; padding: 10px 12px; color: #e2e8f0; font-size: 0.78rem; margin-top: 6px; }
        .sap-share-preview-header { display: flex; align-items: center; justify-content: space-between; border-bottom: 1px solid #334155; padding-bottom: 6px; margin-bottom: 6px; font-weight: 700; color: #94a3b8; font-size: 0.75rem; text-transform: uppercase; }
        .sap-share-preview-header button { background: #334155; color: #f8fafc; border: none; padding: 2px 8px; border-radius: 4px; font-size: 0.7rem; cursor: pointer; display: inline-flex; align-items: center; gap: 4px; }
        .sap-share-preview-header button:hover { background: #0070f2; }
        .sap-share-preview-content { white-space: pre-wrap; font-family: monospace; font-size: 0.75rem; color: #cbd5e1; margin: 0; max-height: 110px; overflow-y: auto; }

        /* Selected table rows */
        .sap-files-table tr.selected-row td { background: #e8f0fe !important; }

        /* Mobile Responsiveness Improvements */
        @media (max-width: 768px) {
          .sap-nav {
            width: 100% !important;
            max-height: 180px;
            border-right: none;
            border-bottom: 1px solid #d1dce8;
          }
          .sap-file-cards-grid {
            grid-template-columns: 1fr;
          }
          .hide-mobile {
            display: none;
          }
          .sap-toolbar {
            padding: 0.5rem 0.75rem;
          }
          .sap-main {
            padding: 0.5rem;
          }
          .sap-folders-grid {
            grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
          }
          .sap-share-channels {
            grid-template-columns: 1fr;
          }
        }
        @media (max-width: 600px) {
          .sap-body {
            flex-direction: column;
          }
        }
      `}</style>
    </div>
  );
};
