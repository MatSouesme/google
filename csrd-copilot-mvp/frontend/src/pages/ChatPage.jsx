import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Database } from 'lucide-react';
import { auth } from '../firebase-config';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

const ChatPage = () => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: "Hello! I'm your CSRD Data Assistant. You can ask me questions about your environmental data, like:\n\n* \"What were the total CO2 emissions in 2024?\"\n* \"Which facility consumed the most energy?\"\n* \"Compare water consumption between Paris and London.\""
        }
    ]);
    const [input, setInput] = useState('');
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
            const response = await fetch('http://localhost:8000/chat/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ query: userMessage.content })
            });

            if (!response.ok) throw new Error("Failed to get response");

            const data = await response.json();

            const assistantMessage = {
                role: 'assistant',
                content: data.answer,
                sql: data.sql // We can optionally show the SQL used
            };

            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: "Sorry, I encountered an error processing your request. Please try again."
            }]);
            console.error(err);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="chat-page" style={{ height: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column' }}>
            <div className="page-header">
                <h1 className="page-title">Chat with Data</h1>
                <p className="page-subtitle">Ask natural language questions about your CSRD metrics.</p>
            </div>

            <div className="chat-container" style={{
                flex: 1,
                backgroundColor: '#1e1e1e',
                borderRadius: '8px',
                border: '1px solid #333',
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
                                backgroundColor: msg.role === 'user' ? '#2563eb' : '#2a2a2a',
                                padding: '1rem',
                                borderRadius: '12px',
                                borderTopRightRadius: msg.role === 'user' ? '2px' : '12px',
                                borderTopLeftRadius: msg.role === 'assistant' ? '2px' : '12px'
                            }}>
                                <div style={{ lineHeight: '1.5' }}>
                                    <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
                                </div>
                                {msg.sql && (
                                    <div style={{ marginTop: '0.5rem', fontSize: '0.8rem', color: '#888', borderTop: '1px solid #444', paddingTop: '0.5rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '4px' }}>
                                            <Database size={12} />
                                            <span>Generated SQL:</span>
                                        </div>
                                        <code style={{ backgroundColor: '#111', padding: '4px', borderRadius: '4px', display: 'block', overflowX: 'auto' }}>
                                            {msg.sql}
                                        </code>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#10b981', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Bot size={18} color="white" />
                            </div>
                            <div style={{ backgroundColor: '#2a2a2a', padding: '1rem', borderRadius: '12px', borderTopLeftRadius: '2px', color: '#aaa' }}>
                                Thinking...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                <form onSubmit={handleSend} style={{ padding: '1rem', borderTop: '1px solid #333', backgroundColor: '#252525', display: 'flex', gap: '1rem' }}>
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask a question about your data..."
                        style={{
                            flex: 1,
                            padding: '12px',
                            borderRadius: '8px',
                            border: '1px solid #444',
                            backgroundColor: '#1e1e1e',
                            color: 'white',
                            outline: 'none'
                        }}
                        disabled={loading}
                    />
                    <button
                        type="submit"
                        disabled={loading || !input.trim()}
                        style={{
                            backgroundColor: '#10b981',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            width: '48px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.7 : 1
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
