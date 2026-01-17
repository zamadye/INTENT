import React from 'react';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

interface ExternalLinkProps {
  href: string;
  children: React.ReactNode;
  className?: string;
  showIcon?: boolean;
  showWarning?: boolean;
}

/**
 * Secure External Link Component
 * 
 * Shows the full URL on hover and clearly indicates external destinations.
 * Helps prevent phishing by making link destinations transparent.
 */
export const ExternalLink: React.FC<ExternalLinkProps> = ({
  href,
  children,
  className = '',
  showIcon = true,
  showWarning = true,
}) => {
  // Parse the URL to extract domain
  let domain = '';
  try {
    const url = new URL(href);
    domain = url.hostname;
  } catch {
    domain = href;
  }

  const linkContent = (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={`inline-flex items-center gap-1 hover:underline ${className}`}
    >
      {children}
      {showIcon && <ExternalLinkIcon className="w-3 h-3 shrink-0" />}
    </a>
  );

  if (!showWarning) {
    return linkContent;
  }

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          {linkContent}
        </TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs">
          <div className="space-y-1">
            <p className="text-xs font-medium text-yellow-500">
              🔗 External Link
            </p>
            <p className="text-xs text-muted-foreground break-all">
              {href}
            </p>
            <p className="text-xs text-muted-foreground">
              Opens in new tab at: <span className="font-medium">{domain}</span>
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
};

export default ExternalLink;
