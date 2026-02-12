import React, { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Send, Bot, User, Database, FileText, MessageSquare } from 'lucide-react';
import { auth } from '../firebase-config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { API_BASE_URL } from '../api/apiClient';

const ChatPage = () => {
    const { t } = useTranslation();
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: t('chat.welcome')
        }
    ]);
    const [input, setInput] = useState('');
    const [mode, setMode] = useState('data'); // 'data' or 'docs'
    const [loading, setLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async (e) => {
        e.preventDefault();
        if (!input.trim()) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setLoading(true);

        try {
            const user = auth.currentUser;
            if (!user) throw new Error("Not authenticated");
            const token = await user.getIdToken();

            // TODO: Use env var
            const response = await fetch(`${API_BASE_URL}/chat/data`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: userMessage.content, mode: mode })
            });

            if (!response.ok) throw new Error("Failed to get response");

            const data = await response.json();

            // Handle different response formats (SQL vs Docs)
            let content = "";
            let sql = null;

            if (mode === 'docs') {
                // Docs mode returns { response: "...", type: "text" }
                content = data.response || "No answer found in documents.";
            } else {
                // Data mode returns { answer: "...", sql: "..." }
                content = data.answer;
                sql = data.sql;
            }

            const assistantMessage = {
                role: 'assistant',
                content: content,
                sql: sql
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: t('chat.error')
            }]);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header">
                <h1 className="page-title" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <MessageSquare size={32} color="#10b981" />
                    {t('chat.title')}
                </h1>
                <p className="page-subtitle">{t('chat.subtitle')}</p>
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem', padding: '0 1rem' }}>
                <button
                    onClick={() => setMode('data')}
                    className={`btn-animated ${mode === 'data' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'data' ? 'var(--primary-color)' : 'var(--surface-color)', color: mode === 'data' ? 'white' : 'var(--text-color)' }}
                >
                    <Database size={16} />
                    <span>Data (SQL)</span>
                </button>
                <button
                    onClick={() => setMode('docs')}
                    className={`btn-animated ${mode === 'docs' ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer', backgroundColor: mode === 'docs' ? 'var(--primary-color)' : 'var(--surface-color)', color: mode === 'docs' ? 'white' : 'var(--text-color)' }}
                >
                    <FileText size={16} />
                    <span>Documents (RAG)</span>
                </button>
            </div>

            <div className="chat-container" style={{
                flex: 1,
                backgroundColor: 'var(--surface-color)',
                borderRadius: '8px',
                border: '1px solid var(--border-color)',
                display: 'flex',
                flexDirection: 'column',
                overflow: 'hidden'
            }}>
                <div className="messages-area" style={{ flex: 1, overflowY: 'auto', padding: '1.5rem' }}>
                    {messages.map((msg, idx) => (
                        <div key={idx} style={{
                            display: 'flex',
                            gap: '1rem',
                            marginBottom: '1.5rem',
                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                        }}>
                            <div style={{
                                width: '32px', height: '32px',
                                borderRadius: '50%',
                                backgroundColor: msg.role === 'user' ? '#3b82f6' : '#10b981',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0
                            }}>
                                {msg.role === 'user' ? <User size={18} color="white" /> : <Bot size={18} color="white" />}
                            </div>

                            <div style={{
                                maxWidth: '70%',
                                backgroundColor: msg.role === 'user' ? 'var(--primary-color)' : 'var(--bg-color)',
                                padding: '1rem',
                                borderRadius: '12px',
                                borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                                borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px',
                                border: msg.role === 'assistant' ? '1px solid var(--border-color)' : 'none',
                                color: msg.role === 'user' ? 'white' : 'var(--text-color)'
                            }}>
                                <div style={{ lineHeight: '1.5' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                                {msg.sql && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: 'var(--text-secondary)', borderTop: '1px solid var(--border-color)', paddingTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                            <Database size={12} />
                                            <span>{t('chat.generatedSQL')}</span>
                                        </div>
                                        <code style={{ backgroundColor: 'var(--bg-primary)', padding: '4px', borderRadius: '4px', display: 'block', overflowX: 'auto', color: 'var(--text-color)' }}>
                                            {msg.sql}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--success-color)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={18} color="white" />
                            </div>
                            <div style={{ backgroundColor: 'var(--bg-color)', padding: '1rem', borderRadius: '12px', borderTopLeftRadius: '2px', color: 'var(--text-secondary)', border: '1px solid var(--border-color)' }}>
                                {t('chat.thinking')}
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid var(--border-color)', backgroundColor: 'var(--bg-color)', display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder={t('chat.placeholder')}
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid var(--border-color)',
                            backgroundColor: 'var(--surface-color)',
                            color: 'var(--text-color)',
                            outline: 'none'
                        }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        className="btn-animated btn-primary"
                        style={{
                            width: '48px',
                            height: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1,
                            padding: 0
                        }}
                    >
                        <Send size={20} />
                    </button>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;
