import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

interface ConfirmationDialogProps {
  children: React.ReactNode;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void;
  variant?: 'default' | 'destructive';
  disabled?: boolean;
}

export function ConfirmationDialog({
  children,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  disabled = false,
}: ConfirmationDialogProps) {
  return (
    <AlertDialog>
      <AlertDialogTrigger asChild disabled={disabled}>
        {children}
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>{cancelText}</AlertDialogCancel>
          <AlertDialogAction
            onClick={onConfirm}
            className={variant === 'destructive' ? 'bg-red-600 hover:bg-red-700 text-white' : ''}
          >
            {confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}

// Hook for programmatic confirmation dialogs
export function useConfirmation() {
  const [dialogState, setDialogState] = React.useState<{
    isOpen: boolean;
    title: string;
    description: string;
    confirmText: string;
    cancelText: string;
    variant: 'default' | 'destructive';
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    description: '',
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    variant: 'default',
    onConfirm: () => {},
  });

  const confirm = React.useCallback((options: {
    title: string;
    description: string;
    confirmText?: string;
    cancelText?: string;
    variant?: 'default' | 'destructive';
  }) => {
    return new Promise<boolean>((resolve) => {
      setDialogState({
        isOpen: true,
        title: options.title,
        description: options.description,
        confirmText: options.confirmText || 'Confirm',
        cancelText: options.cancelText || 'Cancel',
        variant: options.variant || 'default',
        onConfirm: () => {
          setDialogState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
      });
    });
  }, []);

  const ConfirmationDialogComponent = React.useCallback(() => (
    <AlertDialog open={dialogState.isOpen} onOpenChange={(open) => 
      setDialogState(prev => ({ ...prev, isOpen: open }))
    }>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{dialogState.title}</AlertDialogTitle>
          <AlertDialogDescription>
            {dialogState.description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={() => 
            setDialogState(prev => ({ ...prev, isOpen: false }))
          }>
            {dialogState.cancelText}
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={dialogState.onConfirm}
            className={dialogState.variant === 'destructive' ? 'bg-red-600 hover:bg-red-700' : ''}
          >
            {dialogState.confirmText}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  ), [dialogState]);

  return { confirm, ConfirmationDialog: ConfirmationDialogComponent };
} 