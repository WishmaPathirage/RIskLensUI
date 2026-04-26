import React from 'react';
import Navbar from './Navbar';
import Footer from './Footer';
import ChatBot from '../ui/ChatBot';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen flex flex-col bg-slate-50">
            <Navbar />
            <main className="flex-grow">
                {children}
            </main>
            <Footer />
            <ChatBot variant="floating" />
        </div>
    );
};

export default Layout;
