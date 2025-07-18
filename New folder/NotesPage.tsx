import React, { useState, useEffect, useCallback, useRef, useLayoutEffect } from 'react';
import axios, { AxiosError } from 'axios';
import { EditorContent, useEditor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Image from '@tiptap/extension-image';
import Underline from '@tiptap/extension-underline';
import TextStyle from '@tiptap/extension-text-style';
import Highlight from '@tiptap/extension-highlight';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import TextAlign from '@tiptap/extension-text-align';
import Code from '@tiptap/extension-code';
import Link from '@tiptap/extension-link';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';
import FirstCapIcon from './assets/icons/FirstCap.svg';
import AllCapIcon from './assets/icons/AllCap.svg';
import BoldIcon from './assets/icons/Bold.svg';
import ItalicIcon from './assets/icons/Italic.svg';
import UnderlineIcon from './assets/icons/Underline.svg';
import StrikeThroughIcon from './assets/icons/StrikeThrough.svg';
import ChecklistIcon from './assets/icons/Checklist.svg';
import BulletPointsIcon from './assets/icons/BulletPoint.svg';

interface Note {
  id: number;
  user_id: number;
  title: string;
  content: string;
  updated_at: string;
}

interface TrashedNote extends Note {
  trashed_at: string;
}

interface NotesPageProps {
  token: string;
  setIsTrashView: React.Dispatch<React.SetStateAction<boolean>>;
  fetchNotes: () => Promise<Note[]>;
  fetchTrashedNotes: () => Promise<TrashedNote[]>;
}

const NotesPage: React.FC<NotesPageProps> = ({ token, setIsTrashView, fetchNotes, fetchTrashedNotes }) => {
  const [notes, setNotes] = useState<Note[]>([]);
  const [selectedNoteId, setSelectedNoteId] = useState<number | null>(null);
  const [newContent, setNewContent] = useState('');
  const [originalContent, setOriginalContent] = useState<string>('');
  const [currentTitle, setCurrentTitle] = useState('');
  const [originalTitle, setOriginalTitle] = useState('');
  const [isTitleManual, setIsTitleManual] = useState(false);
  const [tempDeletedNote, setTempDeletedNote] = useState<Note | null>(null);
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const taskbarRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [taskbarPosition, setTaskbarPosition] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  // Tiptap editor setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        bulletList: { HTMLAttributes: { class: 'list-disc pl-5' } },
        orderedList: { HTMLAttributes: { class: 'list-decimal pl-5' } },
        paragraph: { 
          HTMLAttributes: { 
            style: 'white-space: pre-wrap; word-break: break-word; overflow-wrap: break-word; margin: 0; padding: 0;' 
          } 
        },
      }),
      Image,
      Underline,
      TextStyle,
      Highlight,
      TaskList,
      TaskItem.configure({ HTMLAttributes: { class: 'pl-5' } }),
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Code,
      Link,
    ],
    content: '',
    onUpdate: ({ editor }) => {
      const content = editor.getHTML();
      setNewContent(content);
      handleContentChange(content);
    },
    onFocus: ({ editor }) => editor.commands.focus(),
    onTransaction: ({ editor, transaction }) => {
      if (transaction.docChanged) {
        const { from } = editor.state.selection;
        editor.commands.setTextSelection(from); // Preserve cursor position
      }
    },
  });

  // Load notes on mount
  useEffect(() => {
    fetchNotes().then(setNotes);
  }, [fetchNotes]);

  // Update editor content when selected note changes
  useEffect(() => {
    if (editor) {
      if (selectedNoteId === null) {
        editor.commands.setContent('');
      } else {
        const note = notes.find((n) => n.id === selectedNoteId);
        if (note) {
          editor.commands.setContent(note.content);
          editor.commands.focus();
        }
      }
    }
  }, [selectedNoteId, notes, editor]);

  // Format date
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time}, ${dateStr}`;
  };

  // Filter and sort notes
  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  // Add a new note
  const addNote = useCallback(async () => {
    if (!token || !editor) return;
    const content = editor.getHTML();
    const words = content.replace(/<[^>]+>/g, '').trim().split(/\s+/);
    const title = currentTitle.trim() || words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : '');
    try {
      const response = await axios.post<Note>(
        'https://localhost:3002/notes',
        { title, content },
        { headers: { Authorization: token } }
      );
      const updatedNotes = [response.data, ...notes].sort(
        (a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      );
      setNotes(updatedNotes);
      setSelectedNoteId(response.data.id);
      setCurrentTitle(response.data.title);
      setOriginalTitle(response.data.title);
      setOriginalContent(content);
      setTempDeletedNote(null);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Add note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to add note');
    }
  }, [token, currentTitle, notes, editor]);

  // Reset note state
  const resetNoteState = useCallback(() => {
    setSelectedNoteId(null);
    setNewContent('');
    setOriginalContent('');
    setCurrentTitle('');
    setOriginalTitle('');
    setIsTitleManual(false);
    setTempDeletedNote(null);
    if (editor) {
      editor.commands.setContent('');
      editor.commands.focus();
    }
  }, [editor]);

  // Delete a note
  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setNotes(notes.filter((note) => note.id !== id));
      await fetchTrashedNotes();
      if (selectedNoteId === id) resetNoteState();
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to move note to trash');
      await fetchNotes().then(setNotes);
      await fetchTrashedNotes();
    }
  };

  // Save edits to an existing note
  const saveEdit = useCallback(async () => {
    if (!token || typeof selectedNoteId !== 'number' || !editor) return;
    const content = editor.getHTML();
    const titleToSave = content === '' ? '' : currentTitle;
    if (content === '' && tempDeletedNote) {
      setTempDeletedNote(null);
      setSelectedNoteId(null);
      setNewContent('');
      setCurrentTitle('');
      return;
    }
    try {
      const response = await axios.put<Note>(
        `https://localhost:3002/notes/${selectedNoteId}`,
        { title: titleToSave, content },
        { headers: { Authorization: token } }
      );
      const updatedNotes = notes
        .map((note) => (note.id === selectedNoteId ? response.data : note))
        .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());
      setNotes(updatedNotes);
      setOriginalContent(content);
      setOriginalTitle(titleToSave);
      setCurrentTitle(titleToSave);
      setTempDeletedNote(null);
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Update note error:', axiosError.response?.data || axiosError.message);
    }
  }, [token, currentTitle, selectedNoteId, notes, tempDeletedNote, editor]);

  // Handle content change for temp deletion
  const handleContentChange = (content: string) => {
    if (content.trim() === '' && typeof selectedNoteId === 'number' && !tempDeletedNote) {
      const noteToDelete = notes.find((note) => note.id === selectedNoteId);
      if (noteToDelete) {
        setTempDeletedNote(noteToDelete);
        setNotes(notes.filter((note) => note.id !== selectedNoteId));
        setSelectedNoteId(null);
      }
    } else if (content.trim() !== '' && tempDeletedNote) {
      setTempDeletedNote(null);
    }
  };

  // Auto-generate title
  useEffect(() => {
    if (!isTitleManual && editor) {
      const content = editor.getHTML();
      if (content.trim() === '') {
        setCurrentTitle('');
      } else {
        const words = content.replace(/<[^>]+>/g, '').trim().split(/\s+/);
        setCurrentTitle(words.slice(0, 5).join(' ') + (words.length > 5 ? '...' : ''));
      }
    }
  }, [newContent, isTitleManual, editor]);

  // Handle context menu
  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, noteId: number) => {
    e.preventDefault();
    const tile = e.currentTarget;
    const rect = tile.getBoundingClientRect();
    const x = rect.right - 2;
    let y = rect.top + 10;
    const menuHeight = 100;
    if (rect.top + menuHeight > window.innerHeight) {
      y = rect.top - menuHeight;
    }
    setContextMenu({ noteId, x, y });
  };

  // Taskbar positioning
  useLayoutEffect(() => {
    const updateTaskbarPosition = () => {
      if (containerRef.current && taskbarRef.current) {
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const styles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(styles.paddingLeft);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingRight = parseFloat(styles.paddingRight);
        const paddingBottom = parseFloat(styles.paddingBottom);
        const taskbarWidth = 400;
        const taskbarHeight = 32;
        const boundaryOffset = 5;

        const minX = boundaryOffset;
        const minY = boundaryOffset;
        const maxX = containerRect.width - taskbarWidth - paddingRight - boundaryOffset;
        const maxY = containerRect.height - taskbarHeight - paddingBottom - boundaryOffset;

        const initialX = maxX;
        const initialY = minY;

        setTaskbarPosition({
          x: Math.max(minX, Math.min(initialX, maxX)),
          y: Math.max(minY, Math.min(initialY, maxY)),
        });
      }
    };

    updateTaskbarPosition();
    window.addEventListener('resize', updateTaskbarPosition);
    return () => window.removeEventListener('resize', updateTaskbarPosition);
  }, []);

  // Handle taskbar dragging
  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (taskbarRef.current) {
      const rect = taskbarRef.current.getBoundingClientRect();
      setDragOffset({
        x: e.clientX - rect.left,
        y: e.clientY - rect.top,
      });
      setIsDragging(true);
    }
  };

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (isDragging && containerRef.current && taskbarRef.current) {
        e.preventDefault();
        const container = containerRef.current;
        const containerRect = container.getBoundingClientRect();
        const styles = window.getComputedStyle(container);
        const paddingLeft = parseFloat(styles.paddingLeft);
        const paddingTop = parseFloat(styles.paddingTop);
        const paddingRight = parseFloat(styles.paddingRight);
        const paddingBottom = parseFloat(styles.paddingBottom);
        const taskbarWidth = 400;
        const taskbarHeight = 32;
        const boundaryOffset = 10;

        const minX = boundaryOffset;
        const minY = boundaryOffset;
        const maxX = containerRect.width - taskbarWidth - paddingRight - boundaryOffset;
        const maxY = containerRect.height - taskbarHeight - paddingBottom - boundaryOffset;

        const newX = e.clientX - dragOffset.x - containerRect.left;
        const newY = e.clientY - dragOffset.y - containerRect.top;

        setTaskbarPosition({
          x: Math.max(minX, Math.min(newX, maxX)),
          y: Math.max(minY, Math.min(newY, maxY)),
        });
      }
    };

    const handleMouseUp = () => setIsDragging(false);

    if (isDragging) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [isDragging, dragOffset]);

  // Formatting functions
  const capitalizeFirst = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const tr = editor.state.tr;

    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const text = node.text || '';
        const newText = text.replace(/\b\w+\b/g, (word) =>
          word.length > 0 ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
        );
        if (newText !== text) {
          tr.insertText(newText, pos, pos + text.length);
        }
      }
    });

    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  const capitalizeAll = () => {
    if (!editor) return;
    const { from, to } = editor.state.selection;
    const tr = editor.state.tr;

    editor.state.doc.nodesBetween(from, to, (node, pos) => {
      if (node.isText) {
        const text = node.text || '';
        const newText = text.toUpperCase();
        if (newText !== text) {
          tr.insertText(newText, pos, pos + text.length);
        }
      }
    });

    editor.view.dispatch(tr);
    editor.commands.focus();
  };

  const applyTextFormat = (format: 'bold' | 'italic' | 'underline' | 'strike') => {
    if (editor) {
      editor.chain().focus().toggleMark(format).run();
    }
  };

  const toggleBulletList = () => {
    if (!editor) return;
    if (editor.isActive('bulletList')) {
      editor.chain().focus().liftListItem('listItem').setParagraph().run();
    } else {
      editor.chain().focus().toggleBulletList().run();
    }
  };

  const toggleChecklist = () => {
    if (!editor) return;
    if (editor.isActive('taskList')) {
      editor.chain().focus().liftListItem('taskItem').setParagraph().run();
    } else {
      editor.chain().focus().toggleTaskList().run();
    }
  };

  // Handle click on editor container to focus
  const handleEditorClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (editor) {
      e.preventDefault();
      editor.commands.focus();
    }
  };

  return (
    <div className="flex w-full max-w-[1640px] h-full" onClick={() => setContextMenu(null)}>
      <style>
        {`
          .custom-scrollbar::-webkit-scrollbar { width: 8px; }
          .custom-scrollbar::-webkit-scrollbar-track { background: transparent; }
          .custom-scrollbar::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
          .custom-scrollbar::-webkit-scrollbar-thumb:hover { background: #555; }
          .custom-scrollbar { scrollbar-width: thin; scrollbar-color: #888 transparent; }
          .note-tile .ring { display: none; outline: 2px solid #f6f6f6; }
          .note-tile:hover .ring, .note-tile.selected .ring { outline: 1px solid #fefefe; display: block; }
          .note-tile.selected .ring { background-color: #5062e7; }
          .note-title {
            display: -webkit-box;
            -webkit-line-clamp: 1;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            max-height: 1.5em;
            font-size: 14px;
          }
          .note-content {
            display: -webkit-box;
            -webkit-line-clamp: 3;
            -webkit-box-orient: vertical;
            overflow: hidden;
            text-overflow: ellipsis;
            max-height: 4.5em;
            font-size: 12px;
          }
          .editor-container {
            position: relative;
            height: 100%;
            width: 100%;
            overflow: hidden; /* Contain all content */
            max-width: 100%; /* Prevent exceeding parent */
          }
          .editor-input {
            height: 100%;
            width: 100%;
            padding: 10px;
            overflow-y: auto;
            overflow-x: hidden; /* Strictly prevent horizontal overflow */
            scrollbar-width: thin;
            scrollbar-color: #888 transparent;
            box-sizing: border-box;
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: break-word;
            line-break: strict;
            max-width: 100%; /* Match container width */
          }
          .editor-input .ProseMirror {
            white-space: pre-wrap;
            word-break: break-word;
            overflow-wrap: break-word;
            max-width: 100%; /* Ensure content stays within bounds */
            overflow-x: hidden; /* Double-check overflow */
          }
          .editor-input p {
            margin: 0;
            padding: 0;
            white-space: pre-wrap;
            max-width: 100%;
          }
          .editor-input::-webkit-scrollbar { width: 8px; height: 8px; }
          .editor-input::-webkit-scrollbar-track { background: transparent; }
          .editor-input::-webkit-scrollbar-thumb { background: #888; border-radius: 4px; }
          .editor-input::-webkit-scrollbar-thumb:hover { background: #555; }
          select.no-arrow { -webkit-appearance: none; -moz-appearance: none; appearance: none; }
          .editor-input ul { color: white; margin: 0; padding-left: 20px; }
          .editor-input ul li { color: white; margin: 0; }
          .editor-input ul li::marker { color: white; }
          .editor-input li[data-type="taskItem"] { 
            display: flex; 
            align-items: center; 
            position: relative; 
            padding-left: 18px; 
            margin: 0; 
          }
          .editor-input li[data-type="taskItem"] input[type="checkbox"] { 
            position: absolute; 
            left: 3px; 
            margin: 0 8px 0 0; 
          }
          .editor-input li[data-checked="true"]::before,
          .editor-input li[data-checked="false"]::before { border-color: white; }
          .editor-input li[data-checked="true"]::before { background-color: white; }
          .editor-input u { color: white; text-decoration: underline white; }
          .editor-input s { color: white; text-decoration: line-through white; }
          .placeholder {
            position: absolute;
            top: 10px;
            left: 10px;
            color: #888;
            pointer-events: none;
            z-index: 2;
          }
        `}
      </style>
      <div className="w-[300px] flex flex-col flex-shrink-0 h-full relative">
        <div className="flex-shrink-0">
          <input
            type="text"
            placeholder="Search Notes"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="h-[35px] w-full bg-[#252525] text-white px-4 rounded-[20px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:outline-none focus:ring-[0.5px] focus:ring-[#5062E7] transition-all duration-300 mt-[10px]"
          />
          <div className="h-[45px] w-full flex mt-[10px] justify-center items-center">
            <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] hover:bg-[#383838] transition-all duration-300">
              All
            </button>
            <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838] transition-all duration-300">
              Groups
            </button>
            <button className="w-[45px] h-[45px] bg-[#1F1F1F] text-white text-[10px] rounded-[25px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] focus:ring-[0.5px] focus:ring-[#5062E7] ml-[30px] hover:bg-[#383838] transition-all duration-300">
              Projects
            </button>
          </div>
        </div>
        <div className="flex-1 overflow-y-auto custom-scrollbar mt-[10px] pb-20 pr-1">
          {!filteredNotes.length && !tempDeletedNote && (
            <p className="text-center text-gray-500 mt-10">No notes yet.</p>
          )}
          {filteredNotes.map((note) => (
            <div
              key={note.id}
              className={`note-tile relative w-full h-[120px] bg-[#1F1F1F] p-2 rounded-[15px] shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] mb-3 cursor-pointer hover:bg-[#383838] transition-all duration-300 ${
                note.id === selectedNoteId ? 'bg-[#2a2a2a]' : ''
              }`}
              onClick={(e) => {
                e.stopPropagation();
                if (note.id !== selectedNoteId) {
                  setSelectedNoteId(note.id);
                  setNewContent(note.content);
                  setCurrentTitle(note.title);
                  setOriginalContent(note.content);
                  setOriginalTitle(note.title);
                  setTempDeletedNote(null);
                  if (editor) editor.commands.focus();
                }
              }}
              onContextMenu={(e) => handleContextMenu(e, note.id)}
            >
              <div
                className={`absolute left-1 top-[12px] h-[96px] bg-gradient-to-b from-[#2996FC] via-[#1238D4] to-[#592BFF] ${
                  note.id === selectedNoteId ? 'w-[4px]' : 'w-0'
                } transition-all duration-300 rounded-[4px]`}
              ></div>
              <div className={`transition-all duration-300 ${note.id === selectedNoteId ? 'ml-[7px]' : 'ml-0'}`}>
                <strong className="text-white note-title">{note.title || '(Untitled)'}</strong>
                <p className="text-gray-400 note-content">{note.content.replace(/<[^>]+>/g, '')}</p>
              </div>
              <span className="absolute bottom-1 right-2 text-[10px] text-gray-500">{formatDate(note.updated_at)}</span>
            </div>
          ))}
        </div>
        <div className="absolute bottom-[5px] left-0 right-2 h-18 flex items-center justify-end pr-4 z-10 backdrop-blur-sm rounded-[30px]">
          <button
            onClick={() => {
              setIsTrashView(true);
              setSearchQuery('');
            }}
            className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] mr-6 transition-all duration-300"
          >
            <img src={TrashIcon} alt="Trash" className="w-7 h-7" />
          </button>
          <button
            onClick={resetNoteState}
            className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] transition-all duration-300"
          >
            <img src={PlusIcon} alt="Add" className="w-7 h-7" />
          </button>
        </div>
      </div>
      <div className="flex-1 flex flex-col ml-[5px]">
        <div className="h-[55px] w-full flex-shrink-0">{/* Placeholder for future buttons */}</div>
        <div ref={containerRef} className="flex-1 relative editor-container" onClick={handleEditorClick}>
          <EditorContent
            editor={editor}
            className="editor-input bg-gradient-to-b from-[#191919] to-[#141414] border border-[#5062E7] rounded-[15px] text-white focus:border-[#5062E7] focus:outline-none"
          />
          <div className="placeholder" style={{ display: newContent ? 'none' : 'block' }}>
            Start typing...
          </div>
          <div
            ref={taskbarRef}
            style={{
              position: 'absolute',
              left: `${taskbarPosition.x}px`,
              top: `${taskbarPosition.y}px`,
              width: '400px',
              height: '32px',
              borderRadius: '15px',
              backgroundColor: '#252525',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.4)',
              zIndex: 10,
              pointerEvents: 'auto',
              userSelect: 'none',
              padding: '0 25px',
              gap: '10px',
            }}
            onMouseDown={handleMouseDown}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                style={{ width: '27px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={capitalizeFirst}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={FirstCapIcon} alt="First Cap" style={{ width: '27px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <button
                style={{ width: '28px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={capitalizeAll}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={AllCapIcon} alt="All Cap" style={{ width: '28px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <select
                className="no-arrow"
                style={{
                  width: '28px',
                  height: '25px',
                  backgroundColor: '#171717',
                  borderRadius: '6px',
                  color: '#FFFFFF',
                  border: 'none',
                  outline: 'none',
                  cursor: 'pointer',
                  marginLeft: '4px',
                }}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <option value="">...</option>
              </select>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#888', margin: '0 8px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button
                style={{ width: '19px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => applyTextFormat('bold')}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={BoldIcon} alt="Bold" style={{ width: '19px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <button
                style={{ width: '18px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => applyTextFormat('italic')}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={ItalicIcon} alt="Italic" style={{ width: '18px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <button
                style={{ width: '16px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => applyTextFormat('underline')}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={UnderlineIcon} alt="Underline" style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <button
                style={{ width: '36px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={() => applyTextFormat('strike')}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={StrikeThroughIcon} alt="Strike Through" style={{ width: '36px', height: '16px', pointerEvents: 'none' }} />
              </button>
            </div>
            <div style={{ width: '1px', height: '20px', backgroundColor: '#888', margin: '0 8px' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
              <button
                style={{ width: '16px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={toggleBulletList}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={BulletPointsIcon} alt="Bullet Points" style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
              </button>
              <button
                style={{ width: '16px', height: '16px', padding: 0, border: 'none', background: 'transparent', cursor: 'pointer' }}
                onClick={toggleChecklist}
                onMouseDown={(e) => e.stopPropagation()}
              >
                <img src={ChecklistIcon} alt="Checklist" style={{ width: '16px', height: '16px', pointerEvents: 'none' }} />
              </button>
            </div>
          </div>
        </div>
      </div>
      <div className="w-[250px] h-[780px] bg-gradient-to-b from-[#191919] to-[#141414] p-2 flex-shrink-0 mt-[8px]">
        <div className="w-full h-[40px] border border-gray-300"></div>
      </div>
      {contextMenu && (
        <div
          className="absolute bg-[#1F1F1F] text-white rounded-[10px] shadow-xl w-[120px] flex flex-col py-2 z-50 transition-all duration-300"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          <button
            onClick={() => {
              const note = notes.find((n) => n.id === contextMenu.noteId);
              if (note) {
                setSelectedNoteId(note.id);
                setNewContent(note.content);
                setCurrentTitle(note.title);
                setOriginalContent(note.content);
                setOriginalTitle(note.title);
                setTempDeletedNote(null);
                if (editor) editor.commands.focus();
              }
              setContextMenu(null);
            }}
            className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838]"
          >
            Edit
          </button>
          <button
            onClick={() => {
              alert('Pin not implemented.');
              setContextMenu(null);
            }}
            className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] mt-2"
          >
            Pin
          </button>
          <button
            onClick={() => {
              deleteNote(contextMenu.noteId);
              setContextMenu(null);
            }}
            className="w-[100px] h-[25px] mx-auto text-left pl-3 text-[14px] rounded-[13px] hover:shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] text-red-400 mt-4"
          >
            Delete
          </button>
        </div>
      )}
    </div>
  );
};

export default NotesPage;