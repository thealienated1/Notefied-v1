import React, { useState, useRef, useEffect } from 'react';
import axios, { AxiosError } from 'axios';
import TrashIcon from './assets/icons/trash.svg';
import PlusIcon from './assets/icons/plus.svg';

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

interface NoteListProps {
  notes: Note[];
  setNotes: React.Dispatch<React.SetStateAction<Note[]>>;
  selectedNoteId: number | null;
  setSelectedNoteId: React.Dispatch<React.SetStateAction<number | null>>;
  setNewContent: React.Dispatch<React.SetStateAction<string>>;
  setCurrentTitle: React.Dispatch<React.SetStateAction<string>>;
  setOriginalContent: React.Dispatch<React.SetStateAction<string>>;
  setOriginalTitle: React.Dispatch<React.SetStateAction<string>>;
  setTempDeletedNote: React.Dispatch<React.SetStateAction<Note | null>>;
  setIsTrashView: React.Dispatch<React.SetStateAction<boolean>>;
  setSearchQuery: React.Dispatch<React.SetStateAction<string>>;
  searchQuery: string;
  resetNoteState: () => void;
  token: string;
  fetchNotes: () => Promise<void>;
  fetchTrashedNotes: () => Promise<TrashedNote[]>;
  setIsCreatingNewNote: React.Dispatch<React.SetStateAction<boolean>>;
}

const NoteList: React.FC<NoteListProps> = ({
  notes,
  setNotes,
  selectedNoteId,
  setSelectedNoteId,
  setNewContent,
  setCurrentTitle,
  setOriginalContent,
  setOriginalTitle,
  setTempDeletedNote,
  setIsTrashView,
  setSearchQuery,
  searchQuery,
  resetNoteState,
  token,
  fetchNotes,
  fetchTrashedNotes,
  setIsCreatingNewNote,
}) => {
  const [contextMenu, setContextMenu] = useState<{ noteId: number; x: number; y: number } | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const contextMenuRef = useRef<HTMLDivElement>(null);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const time = date.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false });
    const dateStr = date.toLocaleDateString('en-GB', { day: '2-digit', month: '2-digit', year: 'numeric' });
    return `${time}, ${dateStr}`;
  };

  const filteredNotes = notes
    .filter(
      (note) =>
        note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        note.content.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime());

  const handleContextMenu = (e: React.MouseEvent<HTMLDivElement>, noteId: number) => {
    e.preventDefault();
    const rect = e.currentTarget.getBoundingClientRect();
    const menuWidth = 120;
    const menuHeight = 100;
    let x = e.pageX;
    let y = rect.top + 10;

    const viewportBottom = window.innerHeight;
    const tileBottom = rect.bottom;
    const isNearBottom = tileBottom + menuHeight > viewportBottom - 20;

    if (isNearBottom) {
      y = rect.top - menuHeight - 10;
    } else if (rect.top + menuHeight > viewportBottom) {
      y = rect.top - menuHeight - 10;
    }

    if (x + menuWidth > window.innerWidth) {
      x = window.innerWidth - menuWidth - 5;
    }
    if (x < 0) {
      x = 5;
    }
    if (y < 0) {
      y = 5;
    }

    setContextMenu({ noteId, x, y });
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        contextMenuRef.current &&
        !contextMenuRef.current.contains(event.target as Node)
      ) {
        setContextMenu(null);
      }
    };

    if (contextMenu) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [contextMenu]);

  const deleteNote = async (id: number) => {
    if (!token) return;
    try {
      await axios.delete(`https://localhost:3002/notes/${id}`, {
        headers: { Authorization: token },
      });
      setNotes(notes.filter((note) => note.id !== id));
      await fetchTrashedNotes();
      if (selectedNoteId === id) {
        resetNoteState();
      }
      await fetchNotes(); // Ensure notes are refreshed after deletion
    } catch (error) {
      const axiosError = error as AxiosError;
      console.error('Delete note error:', axiosError.response?.data || axiosError.message);
      alert('Failed to move note to trash');
      await fetchNotes();
      await fetchTrashedNotes();
    }
  };

  return (
    <div className="w-[300px] flex flex-col flex-shrink-0 h-full relative" onClick={() => setContextMenu(null)}>
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
        `}
      </style>
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
      <div
        ref={scrollContainerRef}
        className="flex-1 overflow-y-auto custom-scrollbar mt-[10px] pb-20 pr-1"
      >
        {!filteredNotes.length && (
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
                setIsCreatingNewNote(false);
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
          onClick={() => {
            resetNoteState();
            setIsCreatingNewNote(true);
          }}
          className="w-[45px] h-[45px] bg-[#1F1F1F] text-white rounded-full flex items-center justify-center shadow-[0_4px_6px_-1px_rgba(0,0,0,0.4)] hover:bg-[#383838] transition-all duration-300"
        >
          <img src={PlusIcon} alt="Add" className="w-7 h-7" />
        </button>
      </div>
      {contextMenu && (
        <div
          ref={contextMenuRef}
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
                setIsCreatingNewNote(false);
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

export default NoteList;