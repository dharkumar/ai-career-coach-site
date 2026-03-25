'use client';

import { useState } from 'react';
import {
  ChevronDown,
  ChevronUp,
  Copy,
  Check,
  LayoutTemplate,
  History,
  Cloud,
  Radio,
  PowerOff,
  RefreshCw,
  BookOpen,
  Calendar,
  MousePointerClick,
  Search,
  Wrench,
} from 'lucide-react';

const getColor = (opacity: number) => `color-mix(in srgb, var(--theme-chart-line) ${opacity}%, transparent)`;

interface ToolCallIndicatorProps {
  toolName: string;
  parameters: Record<string, unknown>;
  timestamp?: Date;
  defaultExpanded?: boolean;
}

const TOOL_DISPLAY_CONFIG: Record<string, { label: string; Icon: React.ElementType }> = {
  navigateToSection: { label: 'generate_glass', Icon: LayoutTemplate },
  search_conversation_history: { label: 'search_history', Icon: History },
  save_visitor_info: { label: 'save_cloud', Icon: Cloud },
  bringIn: { label: 'start_beam', Icon: Radio },
  takeOut: { label: 'end_beam', Icon: PowerOff },
  informTele: { label: 'update_context', Icon: RefreshCw },
  search_knowledge: { label: 'search_knowledge', Icon: BookOpen },
  create_event: { label: 'create_event', Icon: Calendar },
  update_transcript: { label: 'update_transcript', Icon: MousePointerClick },
  generate_scene: { label: 'generate_scene', Icon: LayoutTemplate },
  show_component: { label: 'show_component', Icon: LayoutTemplate },
  hide_component: { label: 'hide_component', Icon: PowerOff },
  clear_components: { label: 'clear_components', Icon: RefreshCw },
  search: { label: 'search', Icon: Search },
};

export function ToolCallIndicator({
  toolName,
  parameters,
  defaultExpanded = false,
}: ToolCallIndicatorProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const handleCopy = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const content = JSON.stringify({ toolName, parameters }, null, 2);
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Copy failed
    }
  };

  const config = TOOL_DISPLAY_CONFIG[toolName] || { label: toolName, Icon: Wrench };
  const DisplayIcon = config.Icon;

  return (
    <div
      className="mb-2 rounded-2xl backdrop-blur-sm border overflow-hidden transition-all duration-300 relative group"
      style={{
        background: getColor(5),
        borderColor: getColor(10),
      }}
    >
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between px-3 sm:px-4 py-3 transition-colors"
        style={{ color: getColor(70) }}
      >
        <div className="flex items-center gap-2 min-w-0 pr-2">
          <DisplayIcon className="w-4 h-4 text-emerald-400 shrink-0" />
          <span
            className="text-xs font-mono font-medium truncate"
            style={{ color: getColor(50) }}
          >
            Called{' '}
            <span style={{ color: getColor(85) }}>{config.label}</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div
            onClick={handleCopy}
            className="p-1 rounded opacity-0 group-hover:opacity-100 transition-opacity duration-200 active:scale-95 cursor-pointer"
            style={{ color: getColor(50) }}
            title="Copy to clipboard"
          >
            {copied ? (
              <Check className="w-3.5 h-3.5 text-emerald-400" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
          </div>
          {isExpanded ? (
            <ChevronUp
              className="w-4 h-4 transition-transform duration-300"
              style={{ color: getColor(40) }}
            />
          ) : (
            <ChevronDown
              className="w-4 h-4 transition-transform duration-300"
              style={{ color: getColor(40) }}
            />
          )}
        </div>
      </button>

      {isExpanded && (
        <div
          className="px-3 sm:px-4 pb-4 pt-0 space-y-3 mt-1"
          style={{ borderTop: `1px solid ${getColor(5)}` }}
        >
          {Object.keys(parameters).length > 0 && (
            <div className="pt-2">
              <span
                className="text-xs uppercase font-bold tracking-wider mb-1.5 block"
                style={{ color: getColor(30) }}
              >
                Parameters
              </span>
              <ul
                className="space-y-1.5 p-2.5 rounded-lg"
                style={{
                  background: getColor(5),
                  border: `1px solid ${getColor(5)}`,
                }}
              >
                {Object.entries(parameters).map(([key, value]) => (
                  <li key={key} className="text-[11px] font-mono flex items-start">
                    <span
                      className="mr-2 w-24 shrink-0"
                      style={{ color: getColor(40) }}
                    >
                      {key}:
                    </span>
                    <span
                      className="break-words flex-1"
                      style={{ color: getColor(75) }}
                    >
                      {typeof value === 'string' ? `"${value}"` : JSON.stringify(value)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div
            className="flex justify-between items-center text-xs font-mono mt-2"
            style={{ color: getColor(30) }}
          >
            <span>Status: <span className="text-emerald-400">Success</span></span>
          </div>
        </div>
      )}
    </div>
  );
}
