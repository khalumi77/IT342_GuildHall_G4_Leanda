// src/pages/Chat.tsx
//
// 1-to-1 user chat using STOMP over WebSocket.
// One conversation per user-pair — quest-acceptance shows as a clickable card.
// Sidebar: recent conversations + username search to start new ones.

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';
import api from '../api/authApi';

// ── Types ─────────────────────────────────────────────────────────────────────

interface Conversation {
  conversationId: number;
  otherUserId: number;
  otherUsername: string;
  otherProfilePicture: string | null;
  lastMessage: string | null;
  lastMessageType: 'TEXT' | 'SYSTEM' | null;
  lastMessageAt: string | null;
  unreadCount: number;
}

interface ChatMessage {
  id: number;
  conversationId: number;
  senderId: number;
  senderUsername: string;
  senderProfilePicture: string | null;
  content: string;
  messageType: 'TEXT' | 'SYSTEM';
  questId: number | null;
  guildId: number | null;
  questTitle: string | null;
  guildName: string | null;
  isRead: boolean;
  sentAt: string | null;
}

interface UserSearchResult {
  id: number;
  username: string;
  profilePictureUrl: string | null;
  rank: string;
}

// ── Globals ───────────────────────────────────────────────────────────────────

declare global { interface Window { Stomp: any; SockJS: any; } }
const WS_BASE = (import.meta.env.VITE_API_URL || 'http://localhost:8080/api/v1').replace('/api/v1', '');

// ── Avatar ────────────────────────────────────────────────────────────────────

function Avatar({ username, pic, size = 36 }: { username: string | null; pic: string | null; size?: number }) {
  if (pic) return <img src={pic} alt={username ?? ''} style={{ width: size, height: size, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />;
  return (
    <div style={{ width: size, height: size, borderRadius: '50%', backgroundColor: '#52734D', color: '#DDFFBC', fontFamily: "'Prompt', sans-serif", fontWeight: 700, fontSize: Math.round(size * 0.38), display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, userSelect: 'none' }}>
      {(username?.[0] ?? '?').toUpperCase()}
    </div>
  );
}

// ── Time format ───────────────────────────────────────────────────────────────

function fmtTime(s: string | null): string {
  if (!s) return '';
  try {
    const d = new Date(s), now = new Date();
    if (d.toDateString() === now.toDateString()) return d.toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' });
    const diffDays = Math.floor((now.getTime() - d.getTime()) / 86400000);
    if (diffDays < 7) return d.toLocaleDateString('en-PH', { weekday: 'short' });
    return d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
  } catch { return ''; }
}

function fmtFull(s: string | null): string {
  if (!s) return '';
  try { return new Date(s).toLocaleTimeString('en-PH', { hour: '2-digit', minute: '2-digit' }); }
  catch { return ''; }
}

// ── System message bubble ─────────────────────────────────────────────────────

function SystemBubble({ msg, onClick }: { msg: ChatMessage; onClick: () => void }) {
  return (
    <div style={sm.wrap} onClick={onClick} title="Click to view quest">
      <div style={sm.tag}>
        <svg width="13" height="13" viewBox="0 0 40 40" fill="none" style={{ flexShrink: 0 }}>
          <rect x="4" y="2" width="22" height="32" rx="3" fill="#52734D"/>
          <rect x="18" y="0" width="14" height="18" rx="2" fill="#34C759"/>
          <polygon points="18,18 25,14 32,18" fill="#52734D"/>
        </svg>
        <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{msg.questTitle}</span>
        <span style={sm.guildChip}>{msg.guildName}</span>
      </div>
      <div style={sm.text}>{msg.content}</div>
      <div style={sm.hint}>Tap to view quest →</div>
    </div>
  );
}

const sm: Record<string, React.CSSProperties> = {
  wrap: { backgroundColor: '#f9fdf5', border: '1.5px solid rgba(82,115,77,0.3)', borderRadius: '14px', padding: '12px 16px', maxWidth: '320px', cursor: 'pointer', transition: 'filter 0.15s' },
  tag: { display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', fontWeight: 700, color: '#52734D', marginBottom: '6px', paddingBottom: '6px', borderBottom: '1px solid rgba(82,115,77,0.15)' },
  guildChip: { backgroundColor: 'rgba(82,115,77,0.12)', color: '#52734D', fontSize: '10px', fontWeight: 700, padding: '1px 7px', borderRadius: '20px', flexShrink: 0 },
  text: { fontSize: '13px', color: '#333', marginBottom: '5px', lineHeight: '1.4' },
  hint: { fontSize: '11px', color: '#34C759', fontWeight: 600 },
};

// ── Main ──────────────────────────────────────────────────────────────────────

export default function Chat() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { user } = useAuth();

  // Sidebar state
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [convLoading, setConvLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [searchResults, setSearchResults] = useState<UserSearchResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const searchRef = useRef<HTMLDivElement>(null);

  // Active conversation
  const [active, setActive] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [msgsLoading, setMsgsLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);

  // WebSocket
  const stompRef = useRef<any>(null);
  const subConvRef = useRef<any>(null);   // /topic/conversation/{id}
  const subSidebarRef = useRef<any>(null); // /topic/user/{myId}/conversations
  const [wsReady, setWsReady] = useState(false);
  const scriptsRef = useRef(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // ── Load scripts + connect ──────────────────────────────────────────────────

  useEffect(() => {
    if (scriptsRef.current) return;
    scriptsRef.current = true;
    const load = (src: string) => new Promise<void>((res, rej) => {
      if (document.querySelector(`script[src="${src}"]`)) { res(); return; }
      const s = document.createElement('script');
      s.src = src; s.onload = () => res(); s.onerror = rej;
      document.head.appendChild(s);
    });
    Promise.all([
      load('https://cdnjs.cloudflare.com/ajax/libs/sockjs-client/1.6.1/sockjs.min.js'),
      load('https://cdnjs.cloudflare.com/ajax/libs/stomp.js/2.3.3/stomp.min.js'),
    ]).then(connectWS).catch(console.error);
    return () => disconnect();
  }, []); // eslint-disable-line

  const connectWS = useCallback(() => {
    const token = localStorage.getItem('guildhall_token');
    if (!token || !window.Stomp || !window.SockJS) return;
    const socket = new window.SockJS(`${WS_BASE}/ws`);
    const client = window.Stomp.over(socket);
    client.debug = null;
    client.connect(
      { Authorization: `Bearer ${token}` },
      () => { stompRef.current = client; setWsReady(true); },
      () => { setWsReady(false); setTimeout(connectWS, 3000); }
    );
  }, []); // eslint-disable-line

  const disconnect = useCallback(() => {
    [subConvRef, subSidebarRef].forEach(r => { try { r.current?.unsubscribe(); } catch { } });
    try { stompRef.current?.disconnect(); } catch { }
    stompRef.current = null; setWsReady(false);
  }, []);

  // ── Subscribe to sidebar updates ────────────────────────────────────────────

  useEffect(() => {
    if (!wsReady || !user?.id) return;
    try { subSidebarRef.current?.unsubscribe(); } catch { }
    subSidebarRef.current = stompRef.current.subscribe(
      `/topic/user/${user.id}/conversations`,
      (frame: any) => {
        try {
          const update: Conversation & { type?: string } = JSON.parse(frame.body);
          setConversations(prev => {
            const exists = prev.find(c => c.conversationId === update.conversationId);
            if (exists) {
              return [...prev.filter(c => c.conversationId !== update.conversationId), update]
                .sort((a, b) => (b.lastMessageAt ?? '').localeCompare(a.lastMessageAt ?? ''));
            }
            return [update, ...prev];
          });
        } catch { }
      }
    );
  }, [wsReady, user?.id]); // eslint-disable-line

  // ── Subscribe to active conversation ───────────────────────────────────────

  useEffect(() => {
    try { subConvRef.current?.unsubscribe(); } catch { }
    subConvRef.current = null;
    if (!active || !wsReady) return;
    subConvRef.current = stompRef.current.subscribe(
      `/topic/conversation/${active.conversationId}`,
      (frame: any) => {
        try {
          const msg: ChatMessage = JSON.parse(frame.body);
          setMessages(prev => prev.some(m => m.id === msg.id) ? prev : [...prev, msg]);
        } catch { }
      }
    );
  }, [active?.conversationId, wsReady]); // eslint-disable-line

  // ── Scroll to bottom ────────────────────────────────────────────────────────

  useEffect(() => { messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  // ── Load conversations ──────────────────────────────────────────────────────

  useEffect(() => {
    api.get('/chat/conversations')
      .then(res => {
        const data = res.data?.data ?? res.data;
        const list: Conversation[] = Array.isArray(data) ? data : [];
        setConversations(list);

        // Auto-open from URL param
        const convIdParam = searchParams.get('conversationId');
        if (convIdParam) {
          const target = list.find(c => c.conversationId === Number(convIdParam));
          if (target) openConversation(target);
        }
      })
      .catch(() => setConversations([]))
      .finally(() => setConvLoading(false));
  }, []); // eslint-disable-line

  // ── User search (debounced) ─────────────────────────────────────────────────

  useEffect(() => {
    if (searchTimeoutRef.current) clearTimeout(searchTimeoutRef.current);
    if (!search.trim()) { setSearchResults([]); setShowResults(false); return; }
    searchTimeoutRef.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await api.get(`/chat/users/search?q=${encodeURIComponent(search.trim())}`);
        const data = res.data?.data ?? res.data;
        setSearchResults(Array.isArray(data) ? data : []);
        setShowResults(true);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 300);
  }, [search]);

  // Close search results when clicking outside
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowResults(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  // ── Open conversation ───────────────────────────────────────────────────────

  const openConversation = useCallback(async (conv: Conversation) => {
    setActive(conv);
    setMessages([]);
    setMsgsLoading(true);
    try {
      const res = await api.get(`/chat/conversations/${conv.conversationId}/messages`);
      const data = res.data?.data ?? res.data;
      setMessages(Array.isArray(data) ? data : []);
    } catch { setMessages([]); }
    finally { setMsgsLoading(false); setTimeout(() => inputRef.current?.focus(), 80); }
  }, []);

  // ── Start conversation with searched user ───────────────────────────────────

  const startConversation = useCallback(async (u: UserSearchResult) => {
    setShowResults(false);
    setSearch('');
    try {
      const res = await api.post(`/chat/conversations/${u.id}`);
      const conv: Conversation = res.data?.data ?? res.data;
      setConversations(prev => {
        if (prev.find(c => c.conversationId === conv.conversationId)) return prev;
        return [conv, ...prev];
      });
      openConversation(conv);
    } catch (err: any) {
      alert(err?.response?.data?.error?.message || 'Failed to open conversation.');
    }
  }, [openConversation]);

  // ── Send message ────────────────────────────────────────────────────────────

  const handleSend = useCallback(async () => {
    if (!active || !input.trim() || sending) return;
    const content = input.trim();
    setInput('');
    setSending(true);

    if (stompRef.current?.connected) {
      stompRef.current.send(
        `/app/chat/${active.conversationId}`,
        { Authorization: `Bearer ${localStorage.getItem('guildhall_token')}` },
        JSON.stringify({ conversationId: String(active.conversationId), content })
      );
      setSending(false);
    } else {
      try { await api.post(`/chat/conversations/${active.conversationId}/messages`, { content }); }
      catch { } finally { setSending(false); }
    }
  }, [active, input, sending]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
  };

  // ── Navigate to quest from system message ───────────────────────────────────

  const goToQuest = useCallback((msg: ChatMessage) => {
    if (msg.guildId) navigate(`/guilds/${msg.guildId}`);
  }, [navigate]);

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div style={s.page}>
      <Navbar />
      <div style={s.layout}>

        {/* ── Sidebar ── */}
        <aside style={s.sidebar}>
          <div style={s.sidebarHeader}>
            <h2 style={s.sidebarTitle}>Chats</h2>
          </div>

          {/* Search bar */}
          <div style={s.searchOuter} ref={searchRef}>
            <div style={s.searchWrap}>
              {searching ? (
                <span style={s.searchIcon}>⏳</span>
              ) : (
                <svg style={s.searchIcon} width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#aaa" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                </svg>
              )}
              <input
                style={s.searchInput}
                placeholder="Search users..."
                value={search}
                onChange={e => setSearch(e.target.value)}
                onFocus={() => searchResults.length > 0 && setShowResults(true)}
              />
              {search && (
                <button style={s.clearBtn} onClick={() => { setSearch(''); setSearchResults([]); setShowResults(false); }}>✕</button>
              )}
            </div>

            {/* Search results dropdown */}
            {showResults && searchResults.length > 0 && (
              <div style={s.searchDropdown}>
                {searchResults.map(u => (
                  <button key={u.id} style={s.searchResult} onClick={() => startConversation(u)}>
                    <Avatar username={u.username} pic={u.profilePictureUrl} size={32} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={s.resultName}>{u.username}</div>
                      <div style={s.resultRank}>{u.rank}</div>
                    </div>
                    <span style={s.startChip}>Message</span>
                  </button>
                ))}
              </div>
            )}

            {showResults && search && !searching && searchResults.length === 0 && (
              <div style={s.searchDropdown}>
                <div style={s.noResults}>No users found for "{search}"</div>
              </div>
            )}
          </div>

          {/* Conversation list */}
          <div style={s.convList}>
            {convLoading ? (
              <div style={s.sideEmpty}>Loading chats...</div>
            ) : conversations.length === 0 ? (
              <div style={s.sideEmpty}>
                No chats yet.{'\n'}Search for a user above to start chatting!
              </div>
            ) : conversations.map(conv => (
              <button
                key={conv.conversationId}
                style={{ ...s.convItem, ...(active?.conversationId === conv.conversationId ? s.convItemActive : {}) }}
                onClick={() => openConversation(conv)}
              >
                <Avatar username={conv.otherUsername} pic={conv.otherProfilePicture} size={40} />
                <div style={s.convInfo}>
                  <div style={s.convName}>{conv.otherUsername}</div>
                  <div style={s.convPreview}>
                    {conv.lastMessage
                      ? (conv.lastMessageType === 'SYSTEM'
                          ? <span style={{ color: '#52734D', fontWeight: 600 }}>⚔️ Quest accepted</span>
                          : conv.lastMessage.length > 36 ? conv.lastMessage.slice(0, 36) + '…' : conv.lastMessage)
                      : <span style={{ fontStyle: 'italic', color: '#aaa' }}>No messages yet</span>}
                  </div>
                </div>
                <div style={s.convMeta}>
                  <div style={s.convTime}>{fmtTime(conv.lastMessageAt)}</div>
                  {conv.unreadCount > 0 && <div style={s.unread}>{conv.unreadCount}</div>}
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* ── Chat main ── */}
        <main style={s.chatMain}>
          {!active ? (
            <div style={s.empty}>
              <div style={s.emptyCircle}>
                <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="#DDFFBC" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                </svg>
              </div>
              <div style={s.emptyTitle}>Select a conversation</div>
              <div style={s.emptySub}>Search for a user or pick a chat from the sidebar.</div>
            </div>
          ) : (
            <>
              {/* Header */}
              <div style={s.header}>
                <Avatar username={active.otherUsername} pic={active.otherProfilePicture} size={38} />
                <div style={s.headerInfo}>
                  <div style={s.headerName}>{active.otherUsername}</div>
                </div>
                <button style={s.profileBtn} onClick={async () => {
                  // Navigate to guild if there's a shared quest, else just show username
                  const lastSystem = [...messages].reverse().find(m => m.messageType === 'SYSTEM');
                  if (lastSystem?.guildId) navigate(`/guilds/${lastSystem.guildId}`);
                }} title="View shared guild">
                  View Guild →
                </button>
              </div>

              {/* Messages */}
              <div style={s.messages}>
                {msgsLoading ? (
                  <div style={s.loadingTxt}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div style={s.noMsg}>
                    <div style={{ fontSize: '32px', marginBottom: '8px', opacity: 0.35 }}>👋</div>
                    <div style={{ fontSize: '14px', color: '#888' }}>Say hello to {active.otherUsername}!</div>
                  </div>
                ) : (
                  messages.map((msg, idx) => {
                    const isMine = msg.senderId === user?.id;
                    const prev = idx > 0 ? messages[idx - 1] : null;
                    const showTs = !prev ||
                      new Date(msg.sentAt ?? '').getTime() - new Date(prev.sentAt ?? '').getTime() > 300_000;
                    const groupWithPrev = prev && prev.senderId === msg.senderId && !showTs;

                    return (
                      <React.Fragment key={msg.id}>
                        {showTs && <div style={s.ts}>{fmtFull(msg.sentAt)}</div>}
                        <div style={{ ...s.msgRow, ...(isMine ? s.msgRowMine : {}), marginTop: groupWithPrev ? '2px' : '8px' }}>
                          {!isMine && (
                            <div style={{ width: 28, flexShrink: 0 }}>
                              {!groupWithPrev && <Avatar username={msg.senderUsername} pic={msg.senderProfilePicture} size={28} />}
                            </div>
                          )}
                          <div style={{ maxWidth: '72%' }}>
                            {msg.messageType === 'SYSTEM' ? (
                              <SystemBubble msg={msg} onClick={() => goToQuest(msg)} />
                            ) : (
                              <div style={{ ...s.bubble, ...(isMine ? s.bubbleMine : s.bubbleOther) }}>
                                {msg.content}
                              </div>
                            )}
                          </div>
                          {isMine && (
                            <div style={{ width: 28, flexShrink: 0, display: 'flex', justifyContent: 'flex-end' }}>
                              {!groupWithPrev && <Avatar username={msg.senderUsername} pic={msg.senderProfilePicture} size={28} />}
                            </div>
                          )}
                        </div>
                      </React.Fragment>
                    );
                  })
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div style={s.inputBar}>
                <input
                  ref={inputRef}
                  style={s.textInput}
                  placeholder={`Message ${active.otherUsername}...`}
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  disabled={sending}
                  maxLength={1000}
                />
                <button
                  style={{ ...s.sendBtn, opacity: (!input.trim() || sending) ? 0.45 : 1 }}
                  onClick={handleSend}
                  disabled={!input.trim() || sending}
                >
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
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

// ── Styles ────────────────────────────────────────────────────────────────────

const s: Record<string, React.CSSProperties> = {
  page: { minHeight: '100vh', backgroundColor: '#f5f5f5', fontFamily: "'Prompt', sans-serif", display: 'flex', flexDirection: 'column' },
  layout: { display: 'flex', flex: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' },

  sidebar: { width: '280px', minWidth: '280px', backgroundColor: '#DDFFBC', borderRight: '1px solid rgba(82,115,77,0.2)', display: 'flex', flexDirection: 'column', overflow: 'hidden' },
  sidebarHeader: { padding: '18px 18px 6px' },
  sidebarTitle: { color: '#34C759', fontWeight: 700, fontSize: '22px', margin: 0 },

  searchOuter: { position: 'relative', margin: '6px 14px 4px' },
  searchWrap: { position: 'relative', display: 'flex', alignItems: 'center' },
  searchIcon: { position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', fontSize: '12px' },
  searchInput: { width: '100%', padding: '8px 30px 8px 30px', border: '1.5px solid rgba(82,115,77,0.3)', borderRadius: '20px', fontFamily: "'Prompt', sans-serif", fontSize: '13px', backgroundColor: '#fff', outline: 'none', boxSizing: 'border-box' },
  clearBtn: { position: 'absolute', right: '8px', background: 'none', border: 'none', cursor: 'pointer', color: '#aaa', fontSize: '12px', padding: '2px 4px', display: 'flex', alignItems: 'center' },

  searchDropdown: { position: 'absolute', top: 'calc(100% + 6px)', left: 0, right: 0, backgroundColor: '#fff', border: '1.5px solid rgba(82,115,77,0.2)', borderRadius: '12px', boxShadow: '0 8px 24px rgba(0,0,0,0.1)', zIndex: 200, overflow: 'hidden', maxHeight: '280px', overflowY: 'auto' },
  searchResult: { display: 'flex', alignItems: 'center', gap: '10px', width: '100%', padding: '10px 14px', background: 'none', border: 'none', borderBottom: '1px solid #f5f5f5', cursor: 'pointer', textAlign: 'left', fontFamily: "'Prompt', sans-serif' " },
  resultName: { fontWeight: 700, fontSize: '13px', color: '#222' },
  resultRank: { fontSize: '11px', color: '#888' },
  startChip: { backgroundColor: '#34C759', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '2px 8px', borderRadius: '20px', flexShrink: 0 },
  noResults: { padding: '14px 16px', fontSize: '13px', color: '#aaa', textAlign: 'center' },

  convList: { flex: 1, overflowY: 'auto' },
  sideEmpty: { padding: '28px 18px', textAlign: 'center', color: '#888', fontSize: '13px', lineHeight: '1.7', whiteSpace: 'pre-line' },
  convItem: { display: 'flex', alignItems: 'center', gap: '11px', padding: '11px 16px', background: 'none', border: 'none', borderBottom: '1px solid rgba(82,115,77,0.1)', cursor: 'pointer', textAlign: 'left', width: '100%', fontFamily: "'Prompt', sans-serif", transition: 'background 0.1s' },
  convItemActive: { backgroundColor: 'rgba(52,199,89,0.15)', borderLeft: '3px solid #34C759', paddingLeft: '13px' },
  convInfo: { flex: 1, minWidth: 0 },
  convName: { fontWeight: 700, fontSize: '13px', color: '#222', marginBottom: '2px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convPreview: { fontSize: '12px', color: '#666', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' },
  convMeta: { display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '3px', flexShrink: 0 },
  convTime: { fontSize: '10px', color: '#aaa' },
  unread: { backgroundColor: '#34C759', color: '#fff', fontSize: '10px', fontWeight: 700, padding: '1px 6px', borderRadius: '20px', minWidth: '17px', textAlign: 'center' },

  chatMain: { flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', backgroundColor: '#fff' },
  empty: { flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '10px' },
  emptyCircle: { width: '84px', height: '84px', borderRadius: '50%', backgroundColor: '#52734D', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '6px' },
  emptyTitle: { fontWeight: 700, fontSize: '18px', color: '#333' },
  emptySub: { fontSize: '14px', color: '#888', textAlign: 'center', maxWidth: '240px', lineHeight: '1.5' },

  header: { display: 'flex', alignItems: 'center', gap: '12px', padding: '13px 20px', borderBottom: '1px solid #f0f0f0', flexShrink: 0 },
  headerInfo: { flex: 1 },
  headerName: { fontWeight: 700, fontSize: '15px', color: '#222' },
  profileBtn: { background: 'none', border: '1.5px solid #52734D', borderRadius: '20px', padding: '5px 14px', fontFamily: "'Prompt', sans-serif", fontWeight: 600, fontSize: '12px', color: '#52734D', cursor: 'pointer', flexShrink: 0 },

  messages: { flex: 1, overflowY: 'auto', padding: '12px 20px 8px', display: 'flex', flexDirection: 'column' },
  loadingTxt: { textAlign: 'center', color: '#aaa', fontSize: '14px', marginTop: '40px' },
  noMsg: { display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', flex: 1, marginTop: '60px' },
  ts: { textAlign: 'center', fontSize: '11px', color: '#ccc', margin: '10px 0 2px', fontWeight: 500 },
  msgRow: { display: 'flex', alignItems: 'flex-end', gap: '7px' },
  msgRowMine: { flexDirection: 'row-reverse' },
  bubble: { padding: '9px 14px', borderRadius: '18px', fontSize: '14px', lineHeight: '1.5', maxWidth: '100%', wordBreak: 'break-word' },
  bubbleMine: { backgroundColor: '#34C759', color: '#fff', borderBottomRightRadius: '4px' },
  bubbleOther: { backgroundColor: '#DDFFBC', color: '#222', borderBottomLeftRadius: '4px' },

  inputBar: { display: 'flex', alignItems: 'center', gap: '10px', padding: '12px 20px 16px', borderTop: '1px solid #f0f0f0', flexShrink: 0 },
  textInput: { flex: 1, padding: '10px 16px', border: '1.5px solid #e0e0e0', borderRadius: '24px', fontFamily: "'Prompt', sans-serif", fontSize: '14px', outline: 'none', backgroundColor: '#fafafa' },
  sendBtn: { width: '42px', height: '42px', borderRadius: '50%', backgroundColor: '#34C759', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, transition: 'opacity 0.15s' },
};