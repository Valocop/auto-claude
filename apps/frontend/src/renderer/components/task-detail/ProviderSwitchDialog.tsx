/**
 * Provider Switch Dialog Component
 *
 * A dialog that asks users for confirmation before switching AI providers
 * (e.g., from iFlow to Claude). Shows the reason for the switch and provides
 * options to either switch or skip the clarification phase.
 */

import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { RefreshCw, Clock, AlertTriangle, Lightbulb, Zap } from 'lucide-react';

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { RadioGroup, RadioGroupItem } from '../ui/radio-group';
import { Label } from '../ui/label';

import type { ProviderSwitchRequest, ProviderSwitchChoice } from '../../../shared/types/human-input';

interface ProviderSwitchDialogProps {
  request: ProviderSwitchRequest;
  onAnswer: (choice: ProviderSwitchChoice) => void;
  open: boolean;
}

export function ProviderSwitchDialog({ request, onAnswer, open }: ProviderSwitchDialogProps) {
  const { t } = useTranslation(['tasks', 'common']);

  const [selected, setSelected] = useState<ProviderSwitchChoice | null>(null);
  const [timeLeft, setTimeLeft] = useState(request.timeout_seconds || 300);

  // Reset state when request changes
  useEffect(() => {
    setSelected(null);
    setTimeLeft(request.timeout_seconds || 300);
  }, [request.id, request.timeout_seconds]);

  // Countdown timer
  useEffect(() => {
    if (timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [timeLeft]);

  // Handle submit
  const handleSubmit = () => {
    if (selected) {
      onAnswer(selected);
    }
  };

  // Format time remaining
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${String(secs).padStart(2, '0')}`;
  };

  // Get icon for reason code
  const getReasonIcon = () => {
    switch (request.reason_code) {
      case 'investigation_task':
        return <Lightbulb className="h-5 w-5 text-yellow-500" />;
      case 'low_confidence':
        return <AlertTriangle className="h-5 w-5 text-orange-500" />;
      default:
        return <RefreshCw className="h-5 w-5 text-primary" />;
    }
  };

  return (
    <Dialog open={open}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            {getReasonIcon()}
            <DialogTitle>{t('tasks:providerSwitch.title')}</DialogTitle>
          </div>
          <DialogDescription className="mt-2">
            {t('tasks:providerSwitch.description', {
              from: request.current_provider,
              to: request.target_provider,
            })}
          </DialogDescription>
        </DialogHeader>

        {/* Reason explanation */}
        <div className="bg-muted/50 p-4 rounded-md text-sm my-4 space-y-3">
          <div className="flex items-start gap-2">
            <AlertTriangle className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
            <p className="text-muted-foreground">{request.reason}</p>
          </div>

          {request.task_description && (
            <div className="pt-2 border-t border-border">
              <p className="text-xs text-muted-foreground">
                <span className="font-medium">{t('tasks:providerSwitch.task')}:</span>{' '}
                {request.task_description.length > 150
                  ? `${request.task_description.slice(0, 150)}...`
                  : request.task_description}
              </p>
            </div>
          )}
        </div>

        {/* Choice options */}
        <RadioGroup
          value={selected || ''}
          onValueChange={(value) => setSelected(value as ProviderSwitchChoice)}
          className="space-y-3 my-4"
        >
          {/* Switch option */}
          <div
            className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
              ${selected === 'switch'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
              }
            `}
            onClick={() => setSelected('switch')}
          >
            <RadioGroupItem value="switch" id="switch" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="switch" className="cursor-pointer font-medium flex items-center gap-2">
                <Zap className="h-4 w-4 text-primary" />
                {t('tasks:providerSwitch.switchOption')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('tasks:providerSwitch.switchDescription')}
              </p>
            </div>
          </div>

          {/* Skip option */}
          <div
            className={`flex items-start space-x-3 p-3 rounded-lg border cursor-pointer transition-colors
              ${selected === 'skip'
                ? 'border-primary bg-primary/5'
                : 'border-border hover:border-muted-foreground/50'
              }
            `}
            onClick={() => setSelected('skip')}
          >
            <RadioGroupItem value="skip" id="skip" className="mt-0.5" />
            <div className="flex-1">
              <Label htmlFor="skip" className="cursor-pointer font-medium">
                {t('tasks:providerSwitch.skipOption')}
              </Label>
              <p className="text-sm text-muted-foreground mt-1">
                {t('tasks:providerSwitch.skipDescription')}
              </p>
            </div>
          </div>
        </RadioGroup>

        {/* Tip for future tasks */}
        <div className="bg-blue-50 dark:bg-blue-950/30 p-3 rounded-md text-sm border border-blue-200 dark:border-blue-800">
          <div className="flex items-start gap-2">
            <Lightbulb className="h-4 w-4 text-blue-500 mt-0.5 flex-shrink-0" />
            <p className="text-blue-700 dark:text-blue-300">
              {t('tasks:providerSwitch.tip')}
            </p>
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between mt-4">
          {/* Timeout indicator */}
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span className={timeLeft < 60 ? 'text-warning' : ''}>
              {formatTime(timeLeft)}
            </span>
          </div>

          <Button
            onClick={handleSubmit}
            disabled={!selected}
          >
            {t('tasks:providerSwitch.confirm')}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
