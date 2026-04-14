// src/pages/Chat.tsx
//
// Real-time quest chat using STOMP over WebSocket.
// Layout: sidebar (thread list + search) | main chat area
//
// WebSocket connection lifecycle:
//  1. Connect to /ws with JWT in header
//  2. Subscribe to /topic/quest/{questId} when opening a thread
//  3. Send to /app/chat/{questId} on message submit
//  4. REST fallback: POST /api/v1/guilds/{guildId}/quests/{questId}/messages
//     (used for the auto "accepted your quest" message)

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface ChatThread {
  questId: number;
  questTitle: string;
  guildId: number;
  guildName: string;
  otherUserId: number | null;
  otherUsername: string | null;
  otherProfilePicture: string | null;
  lastMessage: string | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  questId: number;
  senderId: number;
  senderUsername: string;
  senderProfilePicture: string | null;
  content: string;
  isRead: boolean;
  sentAt: string | null;
}

// ── STOMP client (plain SockJS + STOMP.js loaded from CDN) ───────────────────
// We reference the global `Stomp` and `SockJS` from window after scripts load.
declare global {
  interface Window {
    Stomp: any;
    SockJS: any;
  }
}

const API_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '');

// ── Avatar helper ─────────────────────────────────────────────────────────────

function Avatar({ username, pictureUrl, size = 36 }: {
  username: string | null; pictureUrl: string | null; size?: number;
}) {
  if (pictureUrl) {
    return <img src={pictureUrl} alt={username ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: '50%',
      backgroundColor: '#52734D', color: '#DDFFBC',
      fontFamily: "'Prompt', sans-serif", fontWeight: 700,
      fontSize: size * 0.38, display: 'flex', alignItems: 'center', justifyContent: 'center',
      flexShrink: 0, userSelect: 'none',
    }}>
      {(username?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

// ── Format timestamp ──────────────────────────────────────────────────────────

function formatTime(dateStr: string | null): string {
  if (!dateStr) return '';
  try {
    const d = new Date(dateStr);
    const now = new Date();
    const isToday = d.toDateString() === now.toDateString();
    if (isToday) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

// ── Main Component ────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  const [threads, setThreads] = useState<ChatThread[]>([]);
  const [filteredThreads, setFilteredThreads] = useState<ChatThread[]>([]);
  const [threadSearch, setThreadSearch] = useState('');
  const [threadsLoading, setThreadsLoading] = useState(true);

  const [activeThread, setActiveThread] = useState<ChatThread | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageInput, setMessageInput] = useState('');
  const [sending, setSending] = useState(false);

  const [stompConnected, setStompConnected] = useState(false);
  const stompClientRef = useRef<any>(null);
  const subscriptionRef = useRef<any>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const scriptsLoadedRef = useRef(false);

  // ── Load SockJS + STOMP scripts ───────────────────────────────────────────

  useEffect(() => {
    if (scriptsLoadedRef.current) return;
    scriptsLoadedRef.current = true;

    const loadScript = (src: string): Promise<void> => new Promise((resolve, reject) => {
      if (document.querySelector(`script[src="${src}"]`)) { resolve(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = () => resolve(); s.onerror = reject;
      document.head.appendChild(s);
    });

    Promise.all([
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js'),
      loadScript('https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js'),
    ]).then(() => {
      connectStomp();
    }).catch(err => console.error('Failed to load WebSocket libs:', err));

    return () => {
      disconnectStomp();
    };
  }, []); // eslint-disable-line

  // ── STOMP connect ─────────────────────────────────────────────────────────

  const connectStomp = useCallback(() => {
    const token = localStorage.getItem('guildhall_token');
    if (!token || !window.Stomp || !window.SockJS) return;

    const socket = new window.SockJS(`${API_BASE}/ws`);
    const client = window.Stomp.over(socket);
    client.debug = null; // suppress console spam

    client.connect(
      { Authorization: `Bearer ${token}` },
      () => {
        stompClientRef.current = client;
        setStompConnected(true);
      },
      (err: any) => {
        console.error('STOMP error:', err);
        setStompConnected(false);
        // Retry after 3s
        setTimeout(() => {
          if (window.Stomp && window.SockJS) connectStomp();
        }, 3000);
      }
    );
  }, []); // eslint-disable-line

  const disconnectStomp = useCallback(() => {
    if (subscriptionRef.current) { try { subscriptionRef.current.unsubscribe(); } catch { /**/ } }
    if (stompClientRef.current?.connected) { try { stompClientRef.current.disconnect(); } catch { /**/ } }
    stompClientRef.current = null;
    setStompConnected(false);
  }, []);

  // ── Subscribe to quest topic when active thread changes ───────────────────

  useEffect(() => {
    if (subscriptionRef.current) {
      try { subscriptionRef.current.unsubscribe(); } catch { /**/ }
      subscriptionRef.current = null;
    }
    if (!activeThread || !stompClientRef.current?.connected) return;

    subscriptionRef.current = stompClientRef.current.subscribe(
      `/topic/quest/${activeThread.questId}`,
      (frame: any) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body);
          setMessages(prev => {
            if (prev.some(m => m.id === msg.id)) return prev;
            return [...prev, msg];
          });
        } catch { /**/ }
      }
    );
  }, [activeThread, stompConnected]); // eslint-disable-line

  // ── Scroll to bottom when messages change ─────────────────────────────────

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Load threads on mount ─────────────────────────────────────────────────

  useEffect(() => {
    api.get('/chat/threads')
      .then(res => {
        const data = res.data?.data ?? res.data;
        const list: ChatThread[] = Array.isArray(data) ? data : [];
        setThreads(list);
        setFilteredThreads(list);

        // If questId is in URL params, auto-open that thread
        const questIdParam = searchParams.get('questId');
        if (questIdParam) {
          const target = list.find(t => t.questId === Number(questIdParam));
          if (target) openThread(target);
        }
      })
      .catch(() => setThreads([]))
      .finally(() => setThreadsLoading(false));
  }, []); // eslint-disable-line

  // ── Filter threads by search ───────────────────────────────────────────────

  useEffect(() => {
    if (!threadSearch.trim()) {
      setFilteredThreads(threads);
    } else {
      const q = threadSearch.toLowerCase();
      setFilteredThreads(threads.filter(t =>
        t.otherUsername?.toLowerCase().includes(q) ||
        t.questTitle?.toLowerCase().includes(q) ||
        t.guildName?.toLowerCase().includes(q)
      ));
    }
  }, [threadSearch, threads]);

  // ── Open a thread ──────────────────────────────────────────────────────────

  const openThread = useCallback(async (thread: ChatThread) => {
    setActiveThread(thread);
    setMessages([]);
    setMessagesLoading(true);
    try {
      const res = await api.get(`/guilds/${thread.guildId}/quests/${thread.questId}/messages`);
      const data = res.data?.data ?? res.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch {
      setMessages([]);
    } finally {
      setMessagesLoading(false);
      setTimeout(() => inputRef.current?.focus(), 100);
    }
  }, []);

  // ── Send message ───────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!activeThread || !messageInput.trim() || sending) return;
    const content = messageInput.trim();
    setMessageInput('');
    setSending(true);

    if (stompClientRef.current?.connected) {
      // Send via WebSocket
      stompClientRef.current.send(
        `/app/chat/${activeThread.questId}`,
        { Authorization: `Bearer ${localStorage.getItem('guildhall_token')}` },
        JSON.stringify({ questId: String(activeThread.questId), content })
      );
      setSending(false);
    } else {
      // Fallback to REST
      try {
        await api.post(`/guilds/${activeThread.guildId}/quests/${activeThread.questId}/messages`, { content });
      } catch { /**/ } finally {
        setSending(false);
      }
    }

    // Update sidebar last message preview
    setThreads(prev => prev.map(t =>
      t.questId === activeThread.questId
        ? { ...t, lastMessage: content, lastMessageAt: new Date().toISOString() }
        : t
    ));
  }, [activeThread, messageInput, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          <div style={s.sidebarHeader}>
            <h2 style={s.sidebarTitle}>Chats</h2>
          </div>

          <div style={s.searchWrap}>
            <svg style={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              style={s.searchInput}
              placeholder="Search chats..."
              value={threadSearch}
              onChange={e => setThreadSearch(e.target.value)}
            />
          </div>

          <div style={s.threadList}>
            {threadsLoading ? (
              <div style={s.sidebarEmpty}>Loading chats...</div>
            ) : filteredThreads.length === 0 ? (
              <div style={s.sidebarEmpty}>
                {threadSearch ? 'No matching chats.' : 'No chats yet.\nAccept a quest to start chatting!'}
              </div>
            ) : filteredThreads.map(thread => (
              <button
                key={thread.questId}
                style={{
                  ...s.threadItem,
                  ...(activeThread?.questId === thread.questId ? s.threadItemActive : {}),
                }}
                onClick={() => openThread(thread)}
              >
                <Avatar username={thread.otherUsername} pictureUrl={thread.otherProfilePicture} size={40} />
                <div style={s.threadInfo}>
                  <div style={s.threadName}>{thread.otherUsername ?? 'Unknown'}</div>
                  <div style={s.threadPreview}>
                    {thread.lastMessage
                      ? (thread.lastMessage.length > 40 ? thread.lastMessage.slice(0, 40) + '…' : thread.lastMessage)
                      : <span style={{ fontStyle: 'italic', color: '#aaa' }}>No messages yet</span>
                    }
                  </div>
                </div>
                <div style={s.threadMeta}>
                  <div style={s.threadTime}>{formatTime(thread.lastMessageAt)}</div>
                  {thread.unreadCount > 0 && (
                    <div style={s.unreadBadge}>{thread.unreadCount}</div>
                  )}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Main chat area ── */}
        <main style={s.chatArea}>
          {!activeThread ? (
            <div style={s.emptyState}>
              <div style={s.emptyIcon}>
                <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="#DDFFBC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={s.emptyTitle}>Select a chat</div>
              <div style={s.emptySubtitle}>Choose a quest conversation from the sidebar to start chatting.</div>
            </div>
          ) : (
            <>
              {/* Chat header */}
              <div style={s.chatHeader}>
                <Avatar
                  username={activeThread.otherUsername}
                  pictureUrl={activeThread.otherProfilePicture}
                  size={38}
                />
                <div style={s.chatHeaderInfo}>
                  <div style={s.chatHeaderName}>{activeThread.otherUsername}</div>
                  <div style={s.chatHeaderSub}>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                      <polyline points="14 2 14 8 20 8"/>
                    </svg>
                    {activeThread.questTitle}
                    <span style={s.guildDot}>·</span>
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}>
                      <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>
                      <polyline points="9 22 9 12 15 12 15 22"/>
                    </svg>
                    {activeThread.guildName}
                  </div>
                </div>
                <button
                  style={s.viewQuestBtn}
                  onClick={() => navigate(`/guilds/${activeThread.guildId}`)}
                  title="Go to guild"
                >
                  View Guild →
                </button>
              </div>

              {/* Messages */}
              <div style={s.messages}>
                {messagesLoading ? (
                  <div style={s.loadingMsg}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={s.noMessages}>
                    <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.4 }}>⚔️</div>
                    <div style={{ fontSize: '14px', color: '#888' }}>No messages yet. Say hello!</div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const prevMsg = idx > 0 ? messages[idx - 1] : null;
                    const showTimestamp = !prevMsg ||
                      (prevMsg && new Date(msg.sentAt ?? '').getTime() - new Date(prevMsg.sentAt ?? '').getTime() > 5 * 60 * 1000);

                    return (
                      <React.Fragment key={msg.id}>
                        {showTimestamp && msg.sentAt && (
                          <div style={s.timestamp}>{formatTime(msg.sentAt)}</div>
                        )}
                        <div style={{ ...s.messageRow, ...(isMine ? s.messageRowMine : {}) }}>
                          {!isMine && (
                            <Avatar username={msg.senderUsername} pictureUrl={msg.senderProfilePicture} size={28} />
                          )}
                          <div style={{ maxWidth: '70%' }}>
                            {/* System message style */}
                            {msg.content.includes('accepted your quest') ? (
                              <div style={s.systemBubble}>
                                <div style={s.questTag}>
                                  <svg width="13" height="13" viewBox="0 0 40 40" fill="none">
                                    <rect x="4" y="2" width="22" height="32" rx="3" fill="#52734D"/>
                                    <rect x="18" y="0" width="14" height="18" rx="2" fill="#34C759"/>
                                    <polygon points="18,18 25,14 32,18" fill="#52734D"/>
                                  </svg>
                                  {activeThread.questTitle}
                                </div>
                                <div style={s.systemText}>{msg.content}</div>
                              </div>
                            ) : (
                              <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleOther) }}>
                                {msg.content}
                              </div>
                            )}
                          </div>
                          {isMine && (
                            <Avatar username={msg.senderUsername} pictureUrl={msg.senderProfilePicture} size={28} />
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input bar */}
              <div style={s.inputBar}>
                <input
                  ref={inputRef}
                  style={s.textInput}
                  placeholder={`Message ${activeThread.otherUsername ?? 'them'}...`}
                  value={messageInput}
                  onChange={e => setMessageInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  maxLength={1000}
                />
                <button
                  style={{
                    ...s.sendBtn,
                    opacity: (!messageInput.trim() || sending) ? 0.5 : 1,
                  }}
                  onClick={handleSend}
                  disabled={!messageInput.trim() || sending}
                  title="Send"
                >
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="22" y1="2" x2="11" y2="13"/>
                    <polygon points="22 2 15 22 11 13 2 9 22 2"/>
                  </svg>
                </button>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}

// ── Styles ─────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: {
    minHeight: '100vh',
    backgroundColor: '#f5f5f5',
    fontFamily: "'Prompt', sans-serif",
    display: 'flex',
    flexDirection: 'column',
  },
  layout: {
    display: 'flex',
    flex: 1,
    overflow: 'hidden',
    height: 'calc(100vh - 56px)',
  },

  // Sidebar
  sidebar: {
    width: '280px',
    minWidth: '280px',
    backgroundColor: '#DDFFBC',
    borderRight: '1px solid rgba(82,115,77,0.2)',
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
  },
  sidebarHeader: {
    padding: '20px 20px 8px',
  },
  sidebarTitle: {
    color: '#34C759',
    fontWeight: 700,
    fontSize: '24px',
    margin: 0,
  },
  searchWrap: {
    position: 'relative',
    margin: '8px 16px 8px',
  },
  searchIcon: {
    position: 'absolute',
    left: '10px',
    top: '50%',
    transform: 'translateY(-50%)',
    pointerEvents: 'none',
  },
  searchInput: {
    width: '100%',
    padding: '8px 12px 8px 30px',
    border: '1.5px solid rgba(82,115,77,0.25)',
    borderRadius: '20px',
    fontFamily: "'Prompt', sans-serif",
    fontSize: '13px',
    backgroundColor: '#fff',
    outline: 'none',
    boxSizing: 'border-box',
  },
  threadList: {
    flex: 1,
    overflowY: 'auto',
    padding: '4px 0',
  },
  sidebarEmpty: {
    padding: '32px 20px',
    textAlign: 'center',
    color: '#888',
    fontSize: '13px',
    lineHeight: '1.6',
    whiteSpace: 'pre-line',
  },
  threadItem: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '12px 16px',
    background: 'none',
    border: 'none',
    borderBottom: '1px solid rgba(82,115,77,0.1)',
    cursor: 'pointer',
    textAlign: 'left',
    width: '100%',
    transition: 'background 0.1s',
  },
  threadItemActive: {
    backgroundColor: 'rgba(52,199,89,0.15)',
    borderLeft: '3px solid #34C759',
    paddingLeft: '13px',
  },
  threadInfo: {
    flex: 1,
    minWidth: 0,
  },
  threadName: {
    fontWeight: 700,
    fontSize: '14px',
    color: '#222',
    marginBottom: '2px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadPreview: {
    fontSize: '12px',
    color: '#666',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  threadMeta: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: '4px',
    flexShrink: 0,
  },
  threadTime: {
    fontSize: '11px',
    color: '#aaa',
  },
  unreadBadge: {
    backgroundColor: '#34C759',
    color: '#fff',
    fontSize: '10px',
    fontWeight: 700,
    padding: '1px 6px',
    borderRadius: '20px',
    minWidth: '18px',
    textAlign: 'center',
  },

  // Chat area
  chatArea: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  emptyState: {
    flex: 1,
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '10px',
    padding: '48px',
  },
  emptyIcon: {
    width: '80px',
    height: '80px',
    borderRadius: '50%',
    backgroundColor: '#52734D',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: '8px',
  },
  emptyTitle: {
    fontWeight: 700,
    fontSize: '20px',
    color: '#333',
  },
  emptySubtitle: {
    fontSize: '14px',
    color: '#888',
    textAlign: 'center',
    maxWidth: '260px',
    lineHeight: '1.5',
  },

  // Chat header
  chatHeader: {
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    padding: '14px 20px',
    borderBottom: '1px solid #f0f0f0',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  chatHeaderInfo: {
    flex: 1,
    minWidth: 0,
  },
  chatHeaderName: {
    fontWeight: 700,
    fontSize: '15px',
    color: '#222',
    marginBottom: '2px',
  },
  chatHeaderSub: {
    display: 'flex',
    alignItems: 'center',
    gap: '5px',
    fontSize: '12px',
    color: '#888',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  guildDot: {
    color: '#ccc',
  },
  viewQuestBtn: {
    background: 'none',
    border: '1.5px solid #52734D',
    borderRadius: '20px',
    padding: '5px 14px',
    fontFamily: "'Prompt', sans-serif",
    fontWeight: 600,
    fontSize: '12px',
    color: '#52734D',
    cursor: 'pointer',
    flexShrink: 0,
    whiteSpace: 'nowrap',
  },

  // Messages
  messages: {
    flex: 1,
    overflowY: 'auto',
    padding: '16px 20px',
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  loadingMsg: {
    textAlign: 'center',
    color: '#888',
    fontSize: '14px',
    marginTop: '32px',
  },
  noMessages: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    marginTop: '60px',
  },
  timestamp: {
    textAlign: 'center',
    fontSize: '11px',
    color: '#bbb',
    margin: '12px 0 4px',
    fontWeight: 500,
  },
  messageRow: {
    display: 'flex',
    alignItems: 'flex-end',
    gap: '8px',
    marginBottom: '2px',
  },
  messageRowMine: {
    flexDirection: 'row-reverse',
  },
  bubble: {
    padding: '10px 14px',
    borderRadius: '18px',
    fontSize: '14px',
    lineHeight: '1.5',
    maxWidth: '100%',
    wordBreak: 'break-word',
  },
  bubbleMine: {
    backgroundColor: '#34C759',
    color: '#fff',
    borderBottomRightRadius: '4px',
  },
  bubbleOther: {
    backgroundColor: '#DDFFBC',
    color: '#222',
    borderBottomLeftRadius: '4px',
  },
  systemBubble: {
    backgroundColor: '#f9fdf5',
    border: '1px solid rgba(82,115,77,0.25)',
    borderRadius: '14px',
    padding: '12px 16px',
    maxWidth: '340px',
  },
  questTag: {
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    fontSize: '12px',
    fontWeight: 700,
    color: '#52734D',
    marginBottom: '6px',
    paddingBottom: '6px',
    borderBottom: '1px solid rgba(82,115,77,0.15)',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
  },
  systemText: {
    fontSize: '13px',
    color: '#555',
    lineHeight: '1.5',
  },

  // Input bar
  inputBar: {
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    padding: '12px 20px 16px',
    borderTop: '1px solid #f0f0f0',
    backgroundColor: '#fff',
    flexShrink: 0,
  },
  textInput: {
    flex: 1,
    padding: '10px 16px',
    border: '1.5px solid #e0e0e0',
    borderRadius: '24px',
    fontFamily: "'Prompt', sans-serif",
    fontSize: '14px',
    outline: 'none',
    backgroundColor: '#fafafa',
    transition: 'border-color 0.15s',
  },
  sendBtn: {
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    backgroundColor: '#34C759',
    border: 'none',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
    transition: 'opacity 0.15s, filter 0.15s',
  },
};