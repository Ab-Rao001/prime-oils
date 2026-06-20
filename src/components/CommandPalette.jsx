import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useUIStore } from '../store/uiStore';
import { useAuth } from '../hooks/useAuth';

const commands = [
  { id: 'go-dashboard', label: 'Go to Dashboard', icon: '🏠', path: '/dashboard/overview' },
  { id: 'go-orders', label: 'Manage Orders', icon: '📦', path: '/dashboard/orders' },
  { id: 'go-inventory', label: 'Manage Inventory', icon: 'Warehouse', path: '/dashboard/inventory' },
  { id: 'go-dispatch', label: 'Dispatch Routing', icon: '🚚', path: '/dashboard/dispatch' },
  { id: 'go-reports', label: 'View Reports', icon: '📊', path: '/dashboard/reports' },
  { id: 'go-cashflow', label: 'Cash Flow', icon: '💰', path: '/dashboard/cashflow' },
  { id: 'go-users', label: 'Manage Users', icon: '👥', path: '/dashboard/users' },
];

export default function CommandPalette() {
  const { commandPaletteOpen, closeCommandPalette } = useUIStore();
  const [search, setSearch] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const { user } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const listRef = useRef(null);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        useUIStore.getState().commandPaletteOpen ? closeCommandPalette() : useUIStore.getState().openCommandPalette();
      }
      if (e.key === 'Escape' && useUIStore.getState().commandPaletteOpen) {
        closeCommandPalette();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [closeCommandPalette]);

  useEffect(() => {
    if (commandPaletteOpen) {
      setSearch('');
      setActiveIndex(0);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, [commandPaletteOpen]);

  const filteredCommands = commands.filter(cmd => 
    cmd.label.toLowerCase().includes(search.toLowerCase())
  );

  useEffect(() => {
    setActiveIndex(0);
  }, [search]);

  useEffect(() => {
    if (listRef.current) {
      const activeEl = listRef.current.children[activeIndex];
      if (activeEl) {
        activeEl.scrollIntoView({ block: 'nearest' });
      }
    }
  }, [activeIndex]);

  const executeCommand = (cmd) => {
    if (cmd.path) {
      navigate(cmd.path);
    }
    closeCommandPalette();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex((prev) => (prev < filteredCommands.length - 1 ? prev + 1 : prev));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex((prev) => (prev > 0 ? prev - 1 : prev));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (filteredCommands[activeIndex]) {
        executeCommand(filteredCommands[activeIndex]);
      }
    }
  };

  if (!commandPaletteOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-[100] flex items-start justify-center pt-[15vh] bg-black/60 backdrop-blur-sm p-4"
      onClick={closeCommandPalette}
      role="dialog"
      aria-modal="true"
      aria-label="Command Palette"
    >
      <div 
        className="w-full max-w-lg bg-card border border-border dark:border-border-dark rounded-xl shadow-2xl overflow-hidden animate-slideUp flex flex-col max-h-[60vh]"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center px-4 border-b border-border dark:border-border-dark">
          <span className="text-muted-foreground mr-2">🔍</span>
          <input
            ref={inputRef}
            type="text"
            className="flex-1 bg-transparent border-none py-4 outline-none text-foreground text-[15px] placeholder-muted-foreground"
            placeholder="Type a command or search..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            onKeyDown={handleKeyDown}
            aria-label="Command palette search input"
            role="combobox"
            aria-expanded="true"
            aria-controls="command-palette-listbox"
            aria-activedescendant={filteredCommands[activeIndex]?.id}
          />
          <kbd className="hidden md:inline-block px-2 py-1 text-[10px] font-semibold text-muted-foreground bg-bg rounded border border-border dark:border-border-dark ml-2">ESC</kbd>
        </div>

        <div 
          ref={listRef}
          className="overflow-y-auto flex-1 p-2" 
          role="listbox" 
          id="command-palette-listbox"
        >
          {filteredCommands.length === 0 ? (
            <div className="py-10 text-center text-muted-foreground text-sm">
              No results found for "{search}"
            </div>
          ) : (
            filteredCommands.map((cmd, index) => (
              <div
                key={cmd.id}
                id={cmd.id}
                role="option"
                aria-selected={activeIndex === index}
                className={`flex items-center px-4 py-3 rounded-lg cursor-pointer mb-1 transition-colors ${activeIndex === index ? 'bg-primary text-white' : 'text-foreground hover:bg-card-hover'}`}
                onClick={() => executeCommand(cmd)}
                onMouseEnter={() => setActiveIndex(index)}
              >
                <span className="mr-3 text-lg opacity-80">{cmd.icon}</span>
                <span className="font-medium text-sm">{cmd.label}</span>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
