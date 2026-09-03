'use client';

import { useEffect, useState } from 'react';
import { Loader2, Paperclip } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { TASK_STATUS_LABELS } from '@/lib/labels';

export interface StatusChangePayload {
  status: string;
  progress: number;
  comment: string;
  file: File | null;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentStatus: string;
  currentProgress?: number;
  transitions: string[];
  onSubmit: (payload: StatusChangePayload) => void | Promise<void>;
  isPending?: boolean;
}

export function StatusChangeModal({ open, onOpenChange, currentStatus, currentProgress = 0, transitions, onSubmit, isPending }: Props) {
  const [status, setStatus] = useState('');
  const [progress, setProgress] = useState(currentProgress);
  const [comment, setComment] = useState('');
  const [file, setFile] = useState<File | null>(null);

  const transitionKey = transitions.join('|');
  useEffect(() => {
    if (open) {
      setStatus(transitions[0] || '');
      setProgress(currentProgress);
      setComment('');
      setFile(null);
    }
  }, [open, currentProgress, transitionKey]);

  const submit = async () => {
    if (!status) return;
    await onSubmit({ status, progress: Math.max(0, Math.min(100, progress)), comment: comment.trim(), file });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>تغییر وضعیت تسک</DialogTitle>
          <DialogDescription>وضعیت فعلی: {TASK_STATUS_LABELS[currentStatus] || currentStatus} — وضعیت، پیشرفت و مستندات را یکجا ثبت کنید.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>وضعیت بعدی *</Label>
            <Select value={status} onValueChange={setStatus}>
              {transitions.map((target) => <option key={target} value={target}>{TASK_STATUS_LABELS[target] || target}</option>)}
            </Select>
          </div>
          <div>
            <Label>پیشرفت ({progress}٪)</Label>
            <Input type="number" min={0} max={100} value={progress} onChange={(e) => setProgress(Number(e.target.value))} />
          </div>
          <div>
            <Label>توضیح تغییر (اختیاری)</Label>
            <Textarea value={comment} onChange={(e) => setComment(e.target.value)} placeholder="دلیل یا توضیح تغییر وضعیت..." />
          </div>
          <div>
            <Label className="flex items-center gap-2"><Paperclip className="h-4 w-4" /> فایل (اختیاری، حداکثر ۲۰ مگابایت)</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] || null)} />
          </div>
          <Button className="w-full" disabled={!status || isPending} onClick={submit}>
            {isPending && <Loader2 className="h-4 w-4 animate-spin ml-2" />} ثبت تغییر
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
