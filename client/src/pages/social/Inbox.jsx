import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Inbox as InboxIcon, MessageCircle, Search, Send } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import Api from '../../Api';
import { getImageUrl } from '../../config';
import { useAuth } from '../../context/AuthContext';
import { getSocket } from '../../socket';
import TopNav from '../../components/layout/TopNav';
import '../../styles/inbox.css';

const formatMessageTime = (dateString) => {
  if (!dateString) return '';
  return new Intl.DateTimeFormat('en-US', {
    hour: 'numeric',
    minute: '2-digit'
  }).format(new Date(dateString));
};

const Inbox = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const [activeTab, setActiveTab] = useState('messages');
  const [search, setSearch] = useState('');
  const [conversations, setConversations] = useState([]);
  const [people, setPeople] = useState([]);
  const [selectedConversation, setSelectedConversation] = useState(null);
  const [draftRecipient, setDraftRecipient] = useState(null);
  const [messages, setMessages] = useState([]);
  const [messageText, setMessageText] = useState('');
  const [loading, setLoading] = useState(true);

  const selectedUser = selectedConversation?.otherUser || draftRecipient;
  const requestedUserId = searchParams.get('user');

  const loadConversations = useCallback(async () => {
    setLoading(true);
    try {
      const response = await Api.get('/messages/conversations', {
        params: { box: activeTab, search }
      });
      setConversations(response.data.data || []);
    } catch {
      setConversations([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, search]);

  const loadPeople = useCallback(async () => {
    if (!search.trim()) {
      setPeople([]);
      return;
    }

    try {
      const response = await Api.get('/social/users', { params: { q: search } });
      setPeople((response.data.data || []).filter(item => item._id !== user?._id));
    } catch {
      setPeople([]);
    }
  }, [search, user?._id]);

  useEffect(() => {
    loadConversations();
  }, [loadConversations]);

  useEffect(() => {
    loadPeople();
  }, [loadPeople]);

  const openDraft = useCallback((recipient) => {
    setDraftRecipient(recipient);
    setSelectedConversation(null);
    setMessages([]);
  }, []);

  useEffect(() => {
    if (!requestedUserId || requestedUserId === user?._id) return;

    const loadRequestedUser = async () => {
      try {
        const response = await Api.get(`/social/profiles/${requestedUserId}`);
        openDraft(response.data.data.user);
      } catch {
        setDraftRecipient(null);
      }
    };

    loadRequestedUser();
  }, [openDraft, requestedUserId, user?._id]);

  const openConversation = async (conversation) => {
    setSelectedConversation(conversation);
    setDraftRecipient(null);
    try {
      const response = await Api.get(`/messages/conversations/${conversation._id}/messages`);
      setMessages(response.data.data.messages || []);
      await Api.put(`/messages/conversations/${conversation._id}/read`);
      setConversations(prev => prev.map(item => item._id === conversation._id ? { ...item, unreadCount: 0 } : item));
      window.dispatchEvent(new Event('messages:refresh'));
    } catch {
      setMessages([]);
    }
  };

  const upsertConversation = useCallback((conversation, box) => {
    if (box !== activeTab) return;
    setConversations(prev => {
      const withoutExisting = prev.filter(item => item._id !== conversation._id);
      return [conversation, ...withoutExisting];
    });
  }, [activeTab]);

  useEffect(() => {
    if (!user) return undefined;

    const socket = getSocket();
    if (!socket) return undefined;

    const handleIncoming = ({ conversation, message, box }) => {
      upsertConversation(conversation, box);
      if (selectedConversation?._id === conversation._id) {
        setMessages(prev => prev.some(item => item._id === message._id) ? prev : [...prev, message]);
        Api.put(`/messages/conversations/${conversation._id}/read`).catch(() => {});
        window.dispatchEvent(new Event('messages:refresh'));
      }
    };

    socket.on('message:new', handleIncoming);
    socket.on('message:sent', handleIncoming);

    return () => {
      socket.off('message:new', handleIncoming);
      socket.off('message:sent', handleIncoming);
    };
  }, [selectedConversation?._id, upsertConversation, user]);

  const sendMessage = async (event) => {
    event.preventDefault();
    const text = messageText.trim();
    if (!text || !selectedUser) return;

    setMessageText('');
    try {
      const response = await Api.post('/messages', {
        recipientId: selectedUser._id,
        text
      });
      const { conversation, message, box } = response.data.data;
      setSelectedConversation(conversation);
      setDraftRecipient(null);
      setMessages(prev => prev.some(item => item._id === message._id) ? prev : [...prev, message]);
      upsertConversation(conversation, box);
      if (box !== activeTab) setActiveTab(box);
      window.dispatchEvent(new Event('messages:refresh'));
    } catch (error) {
      setMessageText(text);
      console.error(error.response?.data?.message || 'Failed to send message');
    }
  };

  const filteredPeople = useMemo(() => {
    const conversationUserIds = new Set(conversations.map(item => item.otherUser?._id));
    return people.filter(person => !conversationUserIds.has(person._id)).slice(0, 8);
  }, [conversations, people]);

  return (
    <div className="steam-dashboard">
      <TopNav />
      <main className="inbox-page">
        <aside className="inbox-sidebar">
          <div className="inbox-title-row">
            <div>
              <p>{user?.username}</p>
              <h1>Inbox</h1>
            </div>
          </div>

          <div className="inbox-search">
            <Search size={20} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search"
            />
          </div>

          <div className="inbox-tabs">
            <button
              className={activeTab === 'messages' ? 'active' : ''}
              onClick={() => setActiveTab('messages')}
              type="button"
            >
              Messages
            </button>
            <button
              className={activeTab === 'requests' ? 'active' : ''}
              onClick={() => setActiveTab('requests')}
              type="button"
            >
              Requests
            </button>
          </div>

          <div className="inbox-list">
            {loading ? (
              <p className="inbox-empty-copy">Loading...</p>
            ) : conversations.length === 0 ? (
              <p className="inbox-empty-copy">No {activeTab} yet.</p>
            ) : (
              conversations.map(conversation => (
                <button
                  className={`inbox-thread ${selectedConversation?._id === conversation._id ? 'active' : ''}`}
                  key={conversation._id}
                  onClick={() => openConversation(conversation)}
                  type="button"
                >
                  <span className="inbox-avatar">
                    {conversation.otherUser?.profilePic ? (
                      <img src={getImageUrl(conversation.otherUser.profilePic)} alt={conversation.otherUser.username} />
                    ) : (
                      conversation.otherUser?.username?.[0]?.toUpperCase() || '?'
                    )}
                  </span>
                  <span className="inbox-thread-main">
                    <strong>{conversation.otherUser?.username}</strong>
                    <small>{conversation.lastMessage?.text || 'Start a conversation'}</small>
                  </span>
                  {conversation.unreadCount > 0 && <span className="inbox-unread">{conversation.unreadCount}</span>}
                </button>
              ))
            )}

            {filteredPeople.length > 0 && (
              <div className="inbox-people-results">
                <span>People</span>
                {filteredPeople.map(person => (
                  <button key={person._id} className="inbox-thread" onClick={() => openDraft(person)} type="button">
                    <span className="inbox-avatar">
                      {person.profilePic ? <img src={getImageUrl(person.profilePic)} alt={person.username} /> : person.username?.[0]?.toUpperCase()}
                    </span>
                    <span className="inbox-thread-main">
                      <strong>{person.username}</strong>
                      <small>Message this user</small>
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </aside>

        <section className="inbox-chat">
          {selectedUser ? (
            <>
              <header className="inbox-chat-header">
                <span className="inbox-avatar large">
                  {selectedUser.profilePic ? <img src={getImageUrl(selectedUser.profilePic)} alt={selectedUser.username} /> : selectedUser.username?.[0]?.toUpperCase()}
                </span>
                <div>
                  <h2>{selectedUser.username}</h2>
                  <p>{activeTab === 'requests' ? 'Message request' : 'Direct message'}</p>
                </div>
              </header>

              <div className="inbox-messages">
                {messages.length === 0 ? (
                  <div className="inbox-empty-chat">
                    <MessageCircle size={34} />
                    <p>Send the first message.</p>
                  </div>
                ) : (
                  messages.map(message => {
                    const isMine = message.sender?._id === user?._id || message.sender === user?._id;
                    return (
                      <div key={message._id} className={`inbox-bubble-row ${isMine ? 'mine' : ''}`}>
                        <div className="inbox-bubble">
                          <p>{message.text}</p>
                          <span>{formatMessageTime(message.createdAt)}</span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              <form className="inbox-composer" onSubmit={sendMessage}>
                <input
                  value={messageText}
                  onChange={(event) => setMessageText(event.target.value)}
                  placeholder={`Message ${selectedUser.username}`}
                  maxLength={2000}
                />
                <button type="submit" disabled={!messageText.trim()} aria-label="Send message">
                  <Send size={18} />
                </button>
              </form>
            </>
          ) : (
            <div className="inbox-placeholder">
              <InboxIcon size={46} />
              <h2>Messages</h2>
              <p>Select a conversation or search for a username.</p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
};

export default Inbox;
