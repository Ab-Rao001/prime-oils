import React, { useState, useMemo, useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import { SkeletonTable } from './common/Skeleton';
import { Typography, Input } from './ui';

const DataGrid = ({
  columns = [],
  data = [],
  loading = false,
  emptyMessage = "No records found.",
  selectable = false,
  onSelectionChange,
  bulkActions,
  style = {},
  mobileCardRender,
  rowHeight = 52
}) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });
  const [globalFilter, setGlobalFilter] = useState('');
  const [selectedRowIds, setSelectedRowIds] = useState(new Set());
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  const parentRef = useRef(null);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSort = (key) => {
    let direction = 'asc';
    if (sortConfig.key === key && sortConfig.direction === 'asc') {
      direction = 'desc';
    }
    setSortConfig({ key, direction });
  };

  const processedData = useMemo(() => {
    let filtered = data;
    if (globalFilter) {
      const lowerFilter = globalFilter.toLowerCase();
      filtered = data.filter(row => 
        columns.some(col => {
          if (!col.accessorKey) return false;
          const val = row[col.accessorKey];
          return String(val).toLowerCase().includes(lowerFilter);
        })
      );
    }

    if (sortConfig.key) {
      filtered = [...filtered].sort((a, b) => {
        const aVal = a[sortConfig.key];
        const bVal = b[sortConfig.key];
        if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    // Announce to screen reader
    const msg = `Data updated. ${filtered.length} rows found.`;
    const announcer = document.getElementById('datagrid-announcer');
    if (announcer) {
      announcer.textContent = msg;
    }

    return filtered;
  }, [data, columns, globalFilter, sortConfig]);

  const rowVirtualizer = useVirtualizer({
    count: processedData.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => isMobile ? 180 : rowHeight,
    overscan: 5,
  });

  const handleSelectAll = (e) => {
    if (e.target.checked) {
      const allIds = new Set(processedData.map((_, i) => i));
      setSelectedRowIds(allIds);
      if (onSelectionChange) onSelectionChange(Array.from(allIds).map(i => processedData[i]));
    } else {
      setSelectedRowIds(new Set());
      if (onSelectionChange) onSelectionChange([]);
    }
  };

  const handleSelectRow = (index) => {
    const newSelected = new Set(selectedRowIds);
    if (newSelected.has(index)) {
      newSelected.delete(index);
    } else {
      newSelected.add(index);
    }
    setSelectedRowIds(newSelected);
    if (onSelectionChange) onSelectionChange(Array.from(newSelected).map(i => processedData[i]));
  };

  if (loading) {
    return <SkeletonTable rows={5} cols={columns.length} />;
  }

  const renderMobileCard = (row, index) => {
    if (mobileCardRender) {
      return mobileCardRender(row, index);
    }
    
    // Default mobile card fallback
    return (
      <div className="bg-card border border-border dark:border-border-dark rounded-xl p-4 mb-3 flex flex-col gap-2.5">
        {columns.map((col, i) => (
          <div key={i} className="flex justify-between text-[13px]">
            <span className="text-muted-foreground font-semibold">{col.header}</span>
            <span className="text-foreground text-right">{col.cell ? col.cell(row) : row[col.accessorKey]}</span>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex flex-col h-full gap-3" style={style}>
      <div id="datagrid-announcer" aria-live="polite" className="sr-only"></div>
      {/* Toolbar */}
      <div className="flex justify-between items-center flex-wrap gap-3">
        <Input 
          type="text" 
          placeholder="Search..." 
          value={globalFilter}
          onChange={(e) => setGlobalFilter(e.target.value)}
          className="min-w-[200px]"
          aria-label="Search data grid"
        />
        {selectedRowIds.size > 0 && bulkActions && (
          <div className="flex items-center gap-2">
            <Typography variant="body" weight="semibold" className="text-muted-foreground text-[13px]">{selectedRowIds.size} selected</Typography>
            {bulkActions}
          </div>
        )}
      </div>

      <div 
        ref={parentRef} 
        className="flex-1 min-h-[300px] overflow-auto border border-border dark:border-border-dark rounded-xl bg-card relative"
        role="grid"
      >
        {processedData.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground text-sm" role="status">
            {emptyMessage}
          </div>
        ) : (
          <div className="w-full min-w-max" role="presentation">
            {/* Sticky Header for Desktop */}
            {!isMobile && (
              <div 
                className="flex sticky top-0 z-10 bg-bg border-b border-border dark:border-border-dark"
                role="row"
              >
                {selectable && (
                  <div className="w-12 p-3 flex items-center justify-center" role="columnheader">
                    <input 
                      type="checkbox" 
                      checked={selectedRowIds.size === processedData.length && processedData.length > 0}
                      onChange={handleSelectAll}
                      aria-label="Select all rows"
                      className="cursor-pointer w-4 h-4"
                    />
                  </div>
                )}
                {columns.map((col, i) => (
                  <button 
                    key={i} 
                    style={ { flex: col.width ? `0 0 ${col.width}px` : 1, minWidth: col.minWidth || (col.width ? undefined : '100px') } }
                    className={`p-3 text-[11px] font-semibold text-muted-foreground uppercase tracking-wider select-none flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold ${col.sortable ? 'cursor-pointer hover:text-foreground' : 'cursor-default'}`}
                    onClick={() => col.sortable && col.accessorKey && handleSort(col.accessorKey)}
                    onKeyDown={(e) => { if ((e.key === 'Enter' || e.key === ' ') && col.sortable) { e.preventDefault(); handleSort(col.accessorKey); } }}
                    role="columnheader"
                    aria-sort={sortConfig.key === col.accessorKey ? (sortConfig.direction === 'asc' ? 'ascending' : 'descending') : 'none'}
                    tabIndex={col.sortable ? 0 : -1}
                    type="button"
                  >
                    {col.header}
                    {col.sortable && sortConfig.key === col.accessorKey && (
                      <span aria-hidden="true">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>
                    )}
                  </button>
                ))}
              </div>
            )}
            <div
              style={ {
                height: `${rowVirtualizer.getTotalSize()}px`,
                width: '100%',
                position: 'relative',
              } }
            >

            {/* Virtualized Rows */}
            {rowVirtualizer.getVirtualItems().map((virtualRow) => {
              const row = processedData[virtualRow.index];
              const rowLabel = columns.map(c => c.accessorKey ? row[c.accessorKey] : '').filter(Boolean).join(', ');
              return (
                <div
                  key={virtualRow.index}
                  style={ {
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: `${virtualRow.size}px`,
                    transform: `translateY(${virtualRow.start}px)`,
                  } }
                  className={`border-b border-border dark:border-border-dark box-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gold focus-visible:z-10 ${selectedRowIds.has(virtualRow.index) ? 'bg-gold/10' : 'bg-card'} ${isMobile ? 'block px-3 py-2' : 'flex'}`}
                  role="row"
                  aria-selected={selectedRowIds.has(virtualRow.index)}
                  tabIndex={0}
                  aria-label={`Row ${virtualRow.index + 1}: ${rowLabel}`}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      if (selectable) handleSelectRow(virtualRow.index);
                    }
                  }}
                >
                  {isMobile ? (
                    renderMobileCard(row, virtualRow.index)
                  ) : (
                    <>
                      {selectable && (
                        <div className="w-12 p-3 flex items-center justify-center" role="gridcell">
                          <input 
                            type="checkbox" 
                            checked={selectedRowIds.has(virtualRow.index)}
                            onChange={() => handleSelectRow(virtualRow.index)}
                            aria-label={`Select row ${virtualRow.index}`}
                            className="cursor-pointer w-4 h-4"
                          />
                        </div>
                      )}
                      {columns.map((col, i) => (
                        <div 
                          key={i} 
                          style={ { flex: col.width ? `0 0 ${col.width}px` : (col.flex || 1), minWidth: col.minWidth || (col.width ? undefined : '100px') } }
                          className={`p-3 text-[13px] text-foreground flex items-center`}
                          role="gridcell"
                        >
                          {col.cell ? col.cell(row) : row[col.accessorKey]}
                        </div>
                      ))}
                    </>
                  )}
                </div>
              );
            })}
          </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default React.memo(DataGrid);
