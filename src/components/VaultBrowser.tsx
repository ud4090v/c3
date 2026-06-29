import { useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api';

interface TreeNode {
  name: string;
  path: string;
  type: 'file' | 'directory';
  children?: TreeNode[];
}

interface VaultFile {
  path: string;
  filename: string;
  markdown: string;
  html: string;
  lastModified: string;
}

interface SearchResult {
  path: string;
  filename: string;
  excerpt: string;
}

export function VaultBrowser() {
  const [tree, setTree] = useState<TreeNode[]>([]);
  const [selectedFile, setSelectedFile] = useState<VaultFile | null>(null);
  const [loading, setLoading] = useState(false);
  const [treeLoading, setTreeLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[] | null>(null);
  const [searchLoading, setSearchLoading] = useState(false);
  const [mobileTreeOpen, setMobileTreeOpen] = useState(false);

  // Load tree on mount
  useEffect(() => {
    api.vault.tree().then((res) => {
      setTree((res as { data: TreeNode[] }).data || []);
      setTreeLoading(false);
    }).catch(() => setTreeLoading(false));
  }, []);

  // Debounced search
  useEffect(() => {
    if (!searchQuery || searchQuery.length < 2) {
      setSearchResults(null);
      return;
    }
    const timeout = setTimeout(() => {
      setSearchLoading(true);
      api.vault.search(searchQuery).then((res) => {
        setSearchResults((res as { data: SearchResult[] }).data || []);
        setSearchLoading(false);
      }).catch(() => setSearchLoading(false));
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchQuery]);

  const loadFile = useCallback((filePath: string) => {
    setLoading(true);
    setMobileTreeOpen(false);
    api.vault.file(filePath).then((res) => {
      setSelectedFile((res as { data: VaultFile }).data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] min-h-[400px]">
      {/* Mobile toggle */}
      <button
        className="md:hidden flex items-center gap-2 mb-3 px-3 py-2 rounded bg-c3-surface border border-c3-border text-sm text-c3-muted hover:text-white min-h-[44px]"
        onClick={() => setMobileTreeOpen(!mobileTreeOpen)}
      >
        <span>{mobileTreeOpen ? '✕' : '📁'}</span>
        <span>{mobileTreeOpen ? 'Close file browser' : 'Browse vault files'}</span>
      </button>

      <div className="flex flex-1 gap-4 overflow-hidden">
        {/* Left panel — File tree */}
        <div className={`${mobileTreeOpen ? 'block' : 'hidden'} md:block w-full md:w-72 lg:w-80 flex-shrink-0 rounded-lg bg-c3-surface border border-c3-border overflow-hidden flex flex-col`}>
          {/* Search */}
          <div className="p-3 border-b border-c3-border">
            <div className="relative">
              <input
                type="text"
                placeholder="Search vault…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full rounded bg-c3-bg border border-c3-border px-3 py-2 pl-8 text-sm text-c3-text placeholder-c3-muted focus:border-c3-accent focus:outline-none min-h-[44px]"
              />
              <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 text-c3-muted" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="11" cy="11" r="8" />
                <path d="m21 21-4.3-4.3" />
              </svg>
              {searchQuery && (
                <button
                  onClick={clearSearch}
                  className="absolute right-2 top-1/2 -translate-y-1/2 text-c3-muted hover:text-white text-xs min-w-[44px] min-h-[44px] flex items-center justify-center"
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Tree or search results */}
          <div className="flex-1 overflow-y-auto p-2">
            {searchLoading ? (
              <p className="text-sm text-c3-muted p-2">Searching…</p>
            ) : searchResults ? (
              searchResults.length === 0 ? (
                <p className="text-sm text-c3-muted p-2">No results for "{searchQuery}"</p>
              ) : (
                <div className="space-y-1">
                  {searchResults.map((r) => (
                    <button
                      key={r.path}
                      onClick={() => { loadFile(r.path); clearSearch(); }}
                      className="w-full text-left rounded px-3 py-2 hover:bg-c3-border/30 transition-colors"
                    >
                      <div className="text-sm text-white font-medium truncate">{r.filename}</div>
                      <div className="text-xs text-c3-muted truncate">{r.path}</div>
                      <div className="text-xs text-c3-muted/70 mt-0.5 line-clamp-2">{r.excerpt}</div>
                    </button>
                  ))}
                </div>
              )
            ) : treeLoading ? (
              <p className="text-sm text-c3-muted p-2">Loading vault…</p>
            ) : tree.length === 0 ? (
              <p className="text-sm text-c3-muted p-2">Vault is empty</p>
            ) : (
              <div className="space-y-0.5">
                {tree.map((node) => (
                  <TreeItem
                    key={node.path}
                    node={node}
                    depth={0}
                    selectedPath={selectedFile?.path}
                    onSelect={loadFile}
                  />
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right panel — Markdown viewer */}
        <div className="flex-1 rounded-lg bg-c3-surface border border-c3-border overflow-hidden flex flex-col min-w-0">
          {loading ? (
            <div className="flex-1 flex items-center justify-center text-c3-muted">Loading…</div>
          ) : selectedFile ? (
            <>
              <div className="flex items-center justify-between px-4 py-3 border-b border-c3-border flex-shrink-0">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-white truncate">{selectedFile.filename}</h3>
                  <p className="text-xs text-c3-muted truncate">{selectedFile.path}</p>
                </div>
                <span className="text-xs text-c3-muted flex-shrink-0 ml-3">
                  {new Date(selectedFile.lastModified).toLocaleDateString()}
                </span>
              </div>
              <div
                className="flex-1 overflow-y-auto p-4 md:p-6 vault-content"
                dangerouslySetInnerHTML={{ __html: selectedFile.html }}
              />
            </>
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-c3-muted gap-2">
              <span className="text-4xl">📄</span>
              <p className="text-sm">Select a file to view</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: {
  node: TreeNode;
  depth: number;
  selectedPath?: string;
  onSelect: (path: string) => void;
}) {
  const [expanded, setExpanded] = useState(depth < 1);
  const isSelected = node.type === 'file' && node.path === selectedPath;

  if (node.type === 'directory') {
    return (
      <div>
        <button
          onClick={() => setExpanded(!expanded)}
          className="w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-sm text-c3-muted hover:text-white hover:bg-c3-border/20 transition-colors min-h-[36px]"
          style={{ paddingLeft: `${depth * 12 + 8}px` }}
        >
          <span className="text-xs flex-shrink-0">{expanded ? '▼' : '▶'}</span>
          <span className="truncate">{node.name}</span>
        </button>
        {expanded && node.children && (
          <div>
            {node.children.map((child) => (
              <TreeItem
                key={child.path}
                node={child}
                depth={depth + 1}
                selectedPath={selectedPath}
                onSelect={onSelect}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <button
      onClick={() => onSelect(node.path)}
      className={`w-full flex items-center gap-1.5 rounded px-2 py-1.5 text-sm transition-colors min-h-[36px] ${
        isSelected
          ? 'bg-c3-accent/20 text-c3-accent font-medium'
          : 'text-c3-text hover:text-white hover:bg-c3-border/20'
      }`}
      style={{ paddingLeft: `${depth * 12 + 20}px` }}
    >
      <span className="truncate">{node.name.replace(/\.md$/, '')}</span>
    </button>
  );
}
