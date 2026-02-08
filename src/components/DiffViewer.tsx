import { cn } from '../lib/utils';
import type { ProcessedDiff } from '../types/conversation';

interface DiffViewerProps {
  diff: ProcessedDiff;
  maxHeight?: string;
}

export function DiffViewer({ diff, maxHeight = '400px' }: DiffViewerProps) {
  return (
    <div className="rounded-lg border border-border overflow-hidden bg-bg-tertiary">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-2 bg-bg-elevated border-b border-border">
        <span className="text-text-secondary text-sm font-mono truncate">
          {diff.filePath}
        </span>
        <div className="flex items-center gap-3 text-sm">
          <span className="text-accent-green">+{diff.additions}</span>
          <span className="text-accent-red">-{diff.deletions}</span>
        </div>
      </div>

      {/* Diff content */}
      <div style={{ maxHeight }} className="overflow-auto font-mono text-sm">
        {diff.hunks.map((hunk, hunkIndex) => (
          <div key={hunkIndex} className="border-b border-border last:border-b-0">
            {/* Hunk header */}
            <div className="px-4 py-1 bg-accent-blue/10 text-accent-blue text-xs">
              @@ -{hunk.oldStart},{hunk.oldLines} +{hunk.newStart},{hunk.newLines} @@
            </div>

            {/* Lines */}
            <div>
              {hunk.lines.map((line, lineIndex) => {
                const type = getLineType(line);
                return (
                  <div
                    key={lineIndex}
                    className={cn(
                      'flex',
                      type === 'add' && 'bg-accent-green/10',
                      type === 'remove' && 'bg-accent-red/10'
                    )}
                  >
                    {/* Line indicator */}
                    <div
                      className={cn(
                        'w-6 flex-shrink-0 text-center select-none',
                        type === 'add' && 'text-accent-green bg-accent-green/20',
                        type === 'remove' && 'text-accent-red bg-accent-red/20',
                        type === 'context' && 'text-text-muted'
                      )}
                    >
                      {type === 'add' ? '+' : type === 'remove' ? '-' : ' '}
                    </div>

                    {/* Line content */}
                    <pre
                      className={cn(
                        'flex-1 px-2 py-0.5 whitespace-pre-wrap break-all',
                        type === 'add' && 'text-accent-green',
                        type === 'remove' && 'text-accent-red',
                        type === 'context' && 'text-text-secondary'
                      )}
                    >
                      {line.slice(1)}
                    </pre>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

function getLineType(line: string): 'add' | 'remove' | 'context' {
  if (line.startsWith('+') && !line.startsWith('+++')) return 'add';
  if (line.startsWith('-') && !line.startsWith('---')) return 'remove';
  return 'context';
}
