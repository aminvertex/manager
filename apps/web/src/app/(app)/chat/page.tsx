'use client';

import { useState, useEffect, useRef, useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { io, Socket } from 'socket.io-client';
import { api } from '@/lib/api';
import { useAuth } from '@/lib/auth-context';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Loader2, Send, MessageSquare, Mic, Paperclip, Pin, MoreVertical } from 'lucide-react';
import { toJalaliDateTime, toPersianDigits } from '@/lib/date';
import { resolveAvatarUrl } from '@/lib/utils';

interface Room {
  id: string; type: string; name: string; unread?: number;
  project?: { id: string; name: string } | null;
  lastMessage?: { content: string; createdAt: string; senderId: string } | null;
}
interface User { id: string; mobile: string; employeeProfile?: { id: string; firstName: string; lastName: string; avatarUrl?: string; position?: string } }
interface Message {
  id: string; content: string; createdAt: string; senderId: string; roomId?: string; type?: string;
  editedAt?: string | null; pinned?: boolean; readAt?: string | null;
  sender?: { id: string; mobile: string; employeeProfile?: { id: string; firstName: string; lastName: string; avatarUrl?: string } };
}

export default function ChatPage() {
  const { user } = useAuth();
  const qc = useQueryClient();
  const searchParams = useSearchParams();
  const roomParam = searchParams.get('room');
  const [socket, setSocket] = useState<Socket | null>(null);
  const [activeRoom, setActiveRoom] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [text, setText] = useState('');
  const [connected, setConnected] = useState(false);
  const [typingUsers, setTypingUsers] = useState<Record<string, string[]>>({});
  const typingTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({});
  const bottomRef = useRef<HTMLDivElement>(null);
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [menuMessageId, setMenuMessageId] = useState<string | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [recTime, setRecTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const recTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const reloadMessages = useCallback(async (roomId: string) => {
    api.get<{ data: Message[] }>(`/chat/rooms/${roomId}/messages`).then((r) => setMessages(r.data));
  }, []);

  const editMessage = useMutation({
    mutationFn: ({ msgId, content }: { msgId: string; content: string }) => api.patch(`/chat/messages/${msgId}`, { content }),
    onSuccess: () => { setEditingMsg(null); if (activeRoom) reloadMessages(activeRoom); },
  });

  const deleteMessage = useMutation({
    mutationFn: (msgId: string) => api.delete(`/chat/messages/${msgId}`),
    onSuccess: () => { if (activeRoom) reloadMessages(activeRoom); },
  });

  const pinMessage = useMutation({
    mutationFn: ({ msgId, pinned }: { msgId: string; pinned: boolean }) => api.post(`/chat/messages/${msgId}/pin`, { pinned }),
    onSuccess: () => { if (activeRoom) reloadMessages(activeRoom); },
  });

  const { data: roomsData, isLoading } = useQuery({
    queryKey: ['chat-rooms'],
    queryFn: () => api.get<{ data: Room[] }>('/chat/rooms'),
    refetchInterval: 10000,
  });
  const rooms = roomsData?.data || [];

  // Phase 59: auto-open room from ?room=<id> param
  useEffect(() => {
    if (roomParam && rooms.some((r) => r.id === roomParam)) {
      setActiveRoom(roomParam);
    }
  }, [roomParam, rooms]);

  const { data: usersData } = useQuery({
    queryKey: ['chat-users'],
    queryFn: () => api.get<{ data: User[] }>('/chat/users'),
  });
  const users = usersData?.data || [];

  const markRead = useCallback((roomId: string) => {
    if (activeRoom === roomId) {
      api.post(`/chat/rooms/${roomId}/read`, {}).catch(() => {});
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
    }
  }, [activeRoom, qc]);

  useEffect(() => {
    const token = localStorage.getItem('accessToken');
    if (!token) return;
    const s = io(`${process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:4000'}/chat`, {
      auth: { token },
      transports: ['websocket'],
    });
    s.on('connect', () => setConnected(true));
    s.on('disconnect', () => setConnected(false));
    s.on('message:new', (msg: Message) => {
      setMessages((prev) => (prev.some((m) => m.id === msg.id) ? prev : [...prev, msg]));
      qc.invalidateQueries({ queryKey: ['chat-rooms'] });
      qc.invalidateQueries({ queryKey: ['chat-unread'] });
      if (msg.senderId !== user?.id && msg.roomId) {
        markRead(msg.roomId);
      }
    });
    s.on('typing', (data: { userId: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        const roomId = activeRoom || '';
        const list = prev[roomId] || [];
        if (data.isTyping) {
          if (!list.includes(data.userId)) return { ...prev, [roomId]: [...list, data.userId] };
        } else {
          return { ...prev, [roomId]: list.filter((u) => u !== data.userId) };
        }
        return prev;
      });
    });
    setSocket(s);
    return () => { s.disconnect(); };
  }, [qc, markRead, activeRoom, user?.id]);

  useEffect(() => {
    if (activeRoom) {
      api.get<{ data: Message[] }>(`/chat/rooms/${activeRoom}/messages`).then((r) => setMessages(r.data));
      socket?.emit('joinRoom', activeRoom);
      markRead(activeRoom);
    }
  }, [activeRoom, socket, markRead]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const openDirect = async (uid: string) => {
    const res = await api.post<{ data: Room }>('/chat/rooms/direct', { userId: uid });
    setActiveRoom(res.data.id);
    qc.invalidateQueries({ queryKey: ['chat-rooms'] });
  };

  const send = () => {
    if (!text.trim() || !activeRoom) return;
    socket?.emit('sendMessage', { roomId: activeRoom, content: text });
    socket?.emit('typing', { roomId: activeRoom, isTyping: false });
    setText('');
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = MediaRecorder.isTypeSupported('audio/webm') ? 'audio/webm' : 'audio/mp4';
      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => { if (e.data.size > 0) chunksRef.current.push(e.data); };
      recorder.onstop = () => {
        stream.getTracks().forEach((t) => t.stop());
        const blob = new Blob(chunksRef.current, { type: mimeType });
        uploadVoice(blob, mimeType);
        if (recTimerRef.current) clearInterval(recTimerRef.current);
        setIsRecording(false);
        setRecTime(0);
      };
      mediaRecorderRef.current = recorder;
      recorder.start();
      setIsRecording(true);
      setRecTime(0);
      recTimerRef.current = setInterval(() => setRecTime((t) => t + 1), 1000);
    } catch { alert('دسترسی به میکروفون مجاز نیست'); }
  };

  const stopRecording = () => mediaRecorderRef.current?.stop();

  const cancelRecording = () => {
    if (recTimerRef.current) clearInterval(recTimerRef.current);
    mediaRecorderRef.current?.stream?.getTracks()?.forEach((t) => t.stop());
    mediaRecorderRef.current = null;
    setIsRecording(false);
    setRecTime(0);
  };

  const uploadVoice = async (blob: Blob, mimeType: string) => {
    if (!activeRoom) return;
    const fd = new FormData();
    const ext = mimeType.includes('webm') ? 'webm' : 'mp4';
    fd.append('file', blob, `voice-${Date.now()}.${ext}`);
    await api.upload(`/chat/rooms/${activeRoom}/upload`, fd);
    reloadMessages(activeRoom);
  };

  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  const uploadChatFile = async (file: File, caption = '') => {
    if (!activeRoom) return;
    if (file.size > 50 * 1024 * 1024) { alert('حجم فایل حداکثر ۵۰ مگابایت'); return; }
    setUploadingFile(true);
    const fd = new FormData();
    fd.append('file', file);
    if (caption.trim()) fd.append('caption', caption.trim());
    try {
      await api.upload(`/chat/rooms/${activeRoom}/upload`, fd);
      setSelectedFile(null);
      reloadMessages(activeRoom);
    } catch (e) {
      alert((e as Error).message);
    } finally {
      setUploadingFile(false);
    }
  };

  const sendMessage = async () => {
    if (!activeRoom) return;
    if (selectedFile) {
      await uploadChatFile(selectedFile, text);
      setText('');
      return;
    }
    send();
  };

  const typingPeople = (typingUsers[activeRoom || ''] || []).filter((uid) => uid !== user?.id);
  const typingName = typingPeople.length > 0
    ? users.find((u) => u.id === typingPeople[0])?.employeeProfile?.firstName
    : null;

  return (
    <div className="space-y-6 h-[calc(100vh-160px)] flex flex-col">
      <div className="flex items-center gap-2">
        <h1 className="text-2xl font-bold">پیام‌ها</h1>
        <span className={`flex items-center gap-1.5 text-xs px-2 py-1 rounded-full ${connected ? 'bg-success/15 text-success' : 'bg-muted text-muted-foreground'}`}>
          <span className={`h-2 w-2 rounded-full ${connected ? 'bg-success' : 'bg-muted-foreground'}`} />
          {connected ? 'متصل' : 'قطع'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 flex-1 min-h-0">
        <Card className="lg:col-span-1 overflow-hidden flex flex-col">
          <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
            <div className="p-3 border-b">
              <p className="text-sm font-medium">گفتگوها</p>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {isLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>
              ) : rooms.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-8">گفتگویی وجود ندارد</p>
              ) : (
                rooms.map((room) => (
                  <button
                    key={room.id}
                    onClick={() => setActiveRoom(room.id)}
                    className={`w-full text-right p-3 hover:bg-accent/50 transition-colors ${activeRoom === room.id ? 'bg-accent' : ''}`}
                  >
                    <div className="flex items-center gap-2">
                      <MessageSquare className="h-4 w-4 text-primary shrink-0" />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium truncate">{room.name}{room.type === 'PROJECT' ? ' (پروژه)' : ''}</p>
                        {room.lastMessage && <p className="text-xs text-muted-foreground truncate">{room.lastMessage.content}</p>}
                      </div>
                      {(room.unread ?? 0) > 0 && (
                        <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-destructive px-1.5 text-[10px] font-bold text-white shrink-0">
                          {toPersianDigits(room.unread ?? 0)}
                        </span>
                      )}
                    </div>
                  </button>
                ))
              )}
            </div>
            <div className="p-3 border-t">
              <p className="text-xs text-muted-foreground mb-2">شروع گفتگو با همکار</p>
              <select
                className="w-full h-9 rounded-md border border-input bg-background px-3 text-sm"
                onChange={(e) => e.target.value && openDirect(e.target.value)}
                defaultValue=""
              >
                <option value="" disabled>انتخاب...</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.employeeProfile?.firstName} {u.employeeProfile?.lastName} {u.employeeProfile?.position ? `(${u.employeeProfile.position})` : ''}
                  </option>
                ))}
              </select>
            </div>
          </CardContent>
        </Card>

        <Card className="lg:col-span-2 overflow-hidden flex flex-col">
          {!activeRoom ? (
            <div className="flex-1 flex items-center justify-center text-muted-foreground">
              یک گفتگو را انتخاب کنید
            </div>
          ) : (
            <CardContent className="p-0 flex-1 flex flex-col overflow-hidden">
              <div className="p-3 border-b">
                <p className="font-medium">{rooms.find((r) => r.id === activeRoom)?.name || 'گفتگو'}</p>
                {typingName && <p className="text-xs text-primary mt-0.5">{typingName} در حال تایپ...</p>}
              </div>
              {messages.filter((m) => m.pinned && m.type !== 'SYSTEM').length > 0 && (
                <div className="px-4 pt-2 pb-1 border-b bg-warning/5">
                  {messages.filter((m) => m.pinned && m.type !== 'SYSTEM').map((p) => (
                    <div key={p.id} className="flex items-center gap-2 text-xs py-0.5">
                      <Pin className="h-3 w-3 text-warning shrink-0" />
                      <span className="text-muted-foreground truncate">
                        <span className="font-medium text-foreground">{p.sender?.employeeProfile?.firstName || 'کاربر'}: </span>
                        {p.content}
                      </span>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {messages.map((m, index) => {
                  const isMine = m.senderId === user?.id;
                  const firstUnread = !m.readAt && m.senderId !== user?.id && (index === 0 || messages[index - 1]?.readAt);
                  if (m.type === 'SYSTEM') {
                    return (
                      <div key={m.id} className="flex justify-center">
                        <div className="rounded-lg bg-muted/50 px-4 py-2 text-xs text-muted-foreground max-w-[80%] text-center">
                          {m.content}
                          <p className="text-[9px] mt-1">{toJalaliDateTime(m.createdAt)}</p>
                        </div>
                      </div>
                    );
                  }
                  return (
                    <div key={m.id} className="space-y-2">
                      {firstUnread && <div className="flex items-center gap-3 py-2 text-[10px] text-primary"><span className="h-px flex-1 bg-primary/20" /><span className="rounded-full bg-primary/10 px-3 py-1">پیام‌های جدید</span><span className="h-px flex-1 bg-primary/20" /></div>}
                    <div className={`flex ${isMine ? 'justify-start' : 'justify-end'}`}>
                      <div className={`max-w-[75%] rounded-lg px-3 py-2 ${isMine ? 'bg-primary text-primary-foreground' : 'bg-muted'}`}>
                        {!isMine && m.sender?.employeeProfile && (
                          <p className="text-[10px] opacity-70 mb-1">{m.sender.employeeProfile.firstName} {m.sender.employeeProfile.lastName}</p>
                        )}
                        {m.type === 'FILE' ? (() => {
                          let media: { url?: string; fileName?: string; fileType?: string; caption?: string };
                          try { media = JSON.parse(m.content); } catch { media = { fileName: m.content }; }
                          const url = media.url || '';
                          const type = media.fileType || '';
                          return (
                            <div className="space-y-2">
                              {type.startsWith('image/') && url && <img src={url} alt={media.fileName || 'Uploaded image'} className="max-h-72 rounded-lg object-contain" />}
                              {type.startsWith('video/') && url && <video src={url} controls className="max-h-72 max-w-full rounded-lg" />}
                              {type.startsWith('audio/') && url && (
                                <div className="rounded-xl bg-background/20 p-2 shadow-inner">
                                  <div className="mb-1 flex items-center gap-2 text-xs font-medium"><Mic className="h-3.5 w-3.5" /> پیام صوتی</div>
                                  <audio src={url} controls preload="metadata" className="h-9 w-64 max-w-full accent-primary" />
                                </div>
                              )}
                              {!type.startsWith('image/') && !type.startsWith('video/') && !type.startsWith('audio/') && (
                                <a href={url} target="_blank" rel="noreferrer" className="underline text-sm break-words">{media.fileName || 'فایل'}</a>
                              )}
                              {media.caption && <p className="text-sm break-words">{media.caption}</p>}
                            </div>
                          );
                        })() : editingMsg === m.id ? (
                          <div className="flex gap-1">
                            <input
                              value={editText}
                              onChange={(e) => setEditText(e.target.value)}
                              className="text-sm rounded px-2 py-1 bg-background text-foreground flex-1 min-w-[140px]"
                            />
                            <button onClick={() => editMessage.mutate({ msgId: m.id, content: editText })} className="text-xs underline">ذخیره</button>
                            <button onClick={() => setEditingMsg(null)} className="text-xs underline">انصراف</button>
                          </div>
                        ) : (
                          <p className="text-sm break-words">{m.content}</p>
                        )}
                        {m.editedAt && !editingMsg && <p className="text-[9px] opacity-50">(ویرایش شده)</p>}
                        <div className={`flex items-center gap-2 mt-1 ${isMine ? 'text-primary-foreground/70' : 'text-muted-foreground'}`}>
                          <span className="text-[10px]">{toJalaliDateTime(m.createdAt)}</span>
                          <div className="relative mr-auto">
                            <button type="button" aria-label="گزینه‌های پیام" onClick={() => setMenuMessageId(menuMessageId === m.id ? null : m.id)}><MoreVertical className="h-3.5 w-3.5" /></button>
                            {menuMessageId === m.id && <div className="absolute bottom-5 left-0 z-20 min-w-28 rounded-lg border bg-popover p-1 text-popover-foreground shadow-lg">
                              {m.type !== 'FILE' && isMine && <button className="block w-full rounded px-2 py-1 text-right text-xs hover:bg-muted" onClick={() => { setEditingMsg(m.id); setEditText(m.content); setMenuMessageId(null); }}>ویرایش</button>}
                              {isMine && <button className="block w-full rounded px-2 py-1 text-right text-xs hover:bg-muted" onClick={() => { deleteMessage.mutate(m.id); setMenuMessageId(null); }}>حذف</button>}
                              <button className="block w-full rounded px-2 py-1 text-right text-xs hover:bg-muted" onClick={() => { pinMessage.mutate({ msgId: m.id, pinned: !m.pinned }); setMenuMessageId(null); }}>{m.pinned ? 'برداشتن سنجاق' : 'سنجاق'}</button>
                            </div>}
                          </div>
                        </div>
                      </div>
                    </div>
                    </div>
                  );
                })}
                <div ref={bottomRef} />
              </div>
              <div className="p-3 border-t flex gap-2 items-center">
                {isRecording ? (
                  <>
                    <span className="text-xs text-destructive font-medium whitespace-nowrap flex items-center gap-1">
                      <span className="h-2 w-2 rounded-full bg-destructive animate-pulse" /> {toPersianDigits(recTime)} ثانیه
                    </span>
                    <Button size="sm" variant="destructive" onClick={stopRecording}><Send className="h-4 w-4 ml-1" /> ارسال صدا</Button>
                    <Button size="sm" variant="ghost" onClick={cancelRecording}>انصراف</Button>
                  </>
                ) : (
                  <>
                    <Button variant="ghost" size="icon" onClick={startRecording} title="ضبط صدا" disabled={!activeRoom}>
                      <Mic className="h-4 w-4" />
                    </Button>
                    <Button variant="ghost" size="icon" disabled={!activeRoom || uploadingFile} onClick={() => fileInputRef.current?.click()} title="آپلود فایل">
                      {uploadingFile ? <Loader2 className="h-4 w-4 animate-spin" /> : <Paperclip className="h-4 w-4" />}
                    </Button>
                    <input type="file" ref={fileInputRef} className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) setSelectedFile(f); e.target.value = ''; }} />
                    {selectedFile && (
                      <div className="absolute bottom-12 left-12 flex max-w-xs items-center gap-2 rounded-lg border bg-card p-2 text-xs shadow-lg">
                        {selectedFile.type.startsWith('image/') ? <img src={URL.createObjectURL(selectedFile)} alt="پیش‌نمایش" className="h-12 w-12 rounded object-cover" /> : <Paperclip className="h-4 w-4" />}
                        <span className="truncate">{selectedFile.name}</span>
                        <button type="button" onClick={() => setSelectedFile(null)} className="text-destructive">×</button>
                      </div>
                    )}
                  </>
                )}
                <Input
                  value={text}
                  onChange={(e) => {
                    setText(e.target.value);
                    socket?.emit('typing', { roomId: activeRoom, isTyping: e.target.value.length > 0 });
                    if (typingTimer.current[activeRoom]) clearTimeout(typingTimer.current[activeRoom]);
                    typingTimer.current[activeRoom] = setTimeout(() => {
                      socket?.emit('typing', { roomId: activeRoom, isTyping: false });
                    }, 1500);
                  }}
                  onKeyDown={(e) => e.key === 'Enter' && sendMessage()}
                  placeholder="پیام خود را بنویسید..."
                />
                <Button onClick={sendMessage} disabled={(!text.trim() && !selectedFile) || uploadingFile}><Send className="h-4 w-4" /></Button>
              </div>
            </CardContent>
          )}
        </Card>
      </div>
    </div>
  );
}