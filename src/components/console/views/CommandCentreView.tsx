import React from 'react';
import { ConsoleView, SystemUser } from '../../../types/console';
import { CommandCentrePage } from '../../../features/command-centre/components/CommandCentrePage';

interface CommandCentreViewProps {
  isDarkMode?: boolean;
  onNavigate?: (view: ConsoleView) => void;
  onSelectOrder?: (orderId: string) => void;
  onOpenNotifications?: () => void;
  unreadNotificationsCount?: number;
  currentUser?: SystemUser | null;
}

/**
 * Compatibility entry point kept at the existing console route.
 * The redesigned page owns its read-only analytics data and leaves workflow
 * actions (orders, approvals, QC, PDI, dispatch) in their existing views.
 */
export const CommandCentreView: React.FC<CommandCentreViewProps> = (props) => (
  <CommandCentrePage {...props} />
);
