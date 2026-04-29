import React, { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Bot, User, Loader2 } from 'lucide-react';
import api from '../../services/api';

const ChatBot = ({ variant = 'floating', context = null }) => {
    const [isOpen, setIsOpen] = useState(variant === 'embedded');
    const [messages, setMessages] = useState([
        { role: 'assistant', text: "Hello! I am your AI Privacy Consultant. How can I help you today?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        if (isOpen) {
            scrollToBottom();
        }
    }, [messages, isOpen]);

    const handleSend = async (e) => {
        e?.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMsg = input.trim();
        setInput('');
        setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
        setIsLoading(true);

        try {
            const response = await api.post('/chat', {
                message: userMsg,
                context: context
            });
            setMessages(prev => [...prev, { role: 'assistant', text: response.data.response }]);
        } catch (error) {
            setMessages(prev => [...prev, { role: 'assistant', text: "I'm having trouble connecting to my brain right now. Please try again later!" }]);
        } finally {
            setIsLoading(false);
        }
    };

    const chatWindowJSX = (
        <div className={`flex flex-col bg-white overflow-hidden ${variant === 'floating' ? 'fixed bottom-20 right-6 w-80 sm:w-96 h-[500px] shadow-2xl rounded-2xl border border-slate-200 z-50 animate-in slide-in-from-bottom-2' : 'w-full h-96 border border-slate-200 rounded-xl shadow-sm'}`}>
            {/* Header */}
            <div className="bg-blue-600 p-4 text-white flex justify-between items-center z-10 shadow-sm relative">
                <div className="flex items-center space-x-2">
                    <Bot className="h-5 w-5" />
                    <h3 className="font-semibold text-sm">RiskLens AI Assistant</h3>
                </div>
                {variant === 'floating' && (
                    <button onClick={() => setIsOpen(false)} className="text-white/80 hover:text-white transition-colors">
                        <X className="h-5 w-5" />
                    </button>
                )}
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50 relative">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-br-none shadow-sm' : 'bg-white text-slate-800 border border-slate-200 rounded-bl-none shadow-sm'}`}>
                            {msg.text.split('\n').map((line, i) => (
                                <p key={i} className="mb-1 last:mb-0">{line}</p>
                            ))}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-3 shadow-sm">
                            <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white border-t border-slate-100 z-10 relative">
                <form onSubmit={handleSend} className="flex items-center relative">
                    <input
                        type="text"
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="Ask me anything..."
                        className="flex-1 py-2.5 pl-4 pr-10 bg-slate-100 border-none rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all placeholder:text-slate-400"
                    />
                    <button
                        type="submit"
                        disabled={isLoading || !input.trim()}
                        className="absolute right-1 p-1.5 bg-blue-600 text-white rounded-full hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                        <Send className="h-4 w-4" />
                    </button>
                </form>
            </div>
        </div>
    );

    if (variant === 'embedded') {
        return (
            <div className="mt-8 pt-6 border-t border-slate-200">
                <h3 className="text-lg font-bold text-slate-900 mb-4 flex items-center">
                    <Bot className="mr-2 h-5 w-5 text-blue-600" /> Consult AI Assistant
                </h3>
                <p className="text-sm text-slate-500 mb-4">
                    The assistant already knows your scan result. Ask any specific questions about your risk score or entities!
                </p>
                {chatWindowJSX}
            </div>
        );
    }

    // Floating variant
    return (
        <>
            {isOpen && chatWindowJSX}
            {!isOpen && (
                <button
                    onClick={() => setIsOpen(true)}
                    className="fixed bottom-6 right-6 p-4 bg-blue-600 text-white rounded-full shadow-2xl hover:bg-blue-700 hover:scale-105 transition-all z-50 flex items-center justify-center animate-in zoom-in"
                >
                    <MessageSquare className="h-6 w-6" />
                </button>
            )}
        </>
    );
};

export default ChatBot;
