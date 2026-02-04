import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldAlert } from 'lucide-react';

const Footer = () => {
    return (
        <footer className="bg-white border-t border-slate-200 mt-auto">
            <div className="max-w-7xl mx-auto py-12 px-4 sm:px-6 md:flex md:items-center md:justify-between lg:px-8">
                <div className="flex justify-center space-x-6 md:order-2">
                    <Link to="/" className="text-gray-400 hover:text-gray-500">
                        Home
                    </Link>
                    <Link to="/about" className="text-gray-400 hover:text-gray-500">
                        About
                    </Link>
                    <Link to="/login" className="text-gray-400 hover:text-gray-500">
                        Login
                    </Link>
                    <Link to="/register" className="text-gray-400 hover:text-gray-500">
                        Register
                    </Link>
                </div>
                <div className="mt-8 md:mt-0 md:order-1">
                    <div className="flex items-center justify-center md:justify-start">
                        <ShieldAlert className="h-6 w-6 text-gray-400" />
                        <p className="ml-2 text-center text-base text-gray-400">
                            &copy; 2026 RiskLens. All rights reserved.
                        </p>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
