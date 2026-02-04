import React, { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { ShieldAlert, Menu, X, User } from 'lucide-react';
import Button from '../ui/Button';

const Navbar = () => {
    const { user, logout } = useAuth();
    const location = useLocation();
    const [isMenuOpen, setIsMenuOpen] = useState(false);

    // Only show navbar links on dashboard/protected pages usually, or show minimal on landing
    // But requirement says Dashboard has top navbar. Landing has its own or same? 
    // Requirement: "Dashboard: Top navbar...". "Landing Page: Footer with links..."
    // Let's make a global navbar that adapts.

    // Actually, Landing page spec says: "Hero section... Footer...". But doesn't explicitly mention a Navbar for Landing.
    // However, usually Landing has a navbar. I'll add one.

    const isDashboard = location.pathname.includes('/dashboard') ||
        location.pathname.includes('/scan') ||
        location.pathname.includes('/reports');

    return (
        <nav className="bg-white border-b border-slate-200 sticky top-0 z-40">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16">
                    <div className="flex items-center">
                        <Link to="/" className="flex items-center">
                            <ShieldAlert className="h-8 w-8 text-blue-600" />
                            <span className="ml-2 text-xl font-bold text-slate-900">RiskLens</span>
                        </Link>

                        {/* Desktop Nav - Dashboard */}
                        {user && isDashboard && (
                            <div className="hidden md:ml-10 md:flex md:space-x-8">
                                <Link to="/dashboard" className={`${location.pathname === '/dashboard' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                    Dashboard
                                </Link>
                                <Link to="/scan" className={`${location.pathname === '/scan' ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                    Scan
                                </Link>
                                <Link to="/reports" className={`${location.pathname.startsWith('/reports') ? 'border-blue-500 text-gray-900' : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'} inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium`}>
                                    Reports
                                </Link>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center">
                        {/* Desktop Nav - Auth Buttons */}
                        <div className="hidden md:flex items-center space-x-4">
                            <Link to="/about" className="text-gray-500 hover:text-gray-900 px-3 py-2 rounded-md text-sm font-medium">About</Link>
                            {user ? (
                                <div className="ml-3 relative flex items-center space-x-4">
                                    <span className="text-sm text-gray-700 font-medium">{user.name}</span>
                                    <Button variant="outline" size="sm" onClick={logout}>Logout</Button>
                                </div>
                            ) : (
                                <>
                                    <Link to="/login">
                                        <Button variant="ghost" size="sm">Login</Button>
                                    </Link>
                                    <Link to="/register">
                                        <Button size="sm">Get Started</Button>
                                    </Link>
                                </>
                            )}
                        </div>

                        {/* Mobile menu button */}
                        <div className="flex items-center md:hidden">
                            <button
                                onClick={() => setIsMenuOpen(!isMenuOpen)}
                                className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
                            >
                                {isMenuOpen ? <X className="block h-6 w-6" /> : <Menu className="block h-6 w-6" />}
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Mobile Menu */}
            {isMenuOpen && (
                <div className="md:hidden bg-white border-b border-gray-200">
                    <div className="pt-2 pb-3 space-y-1">
                        {user && (
                            <>
                                <Link to="/dashboard" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">Dashboard</Link>
                                <Link to="/scan" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">Scan</Link>
                                <Link to="/reports" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">Reports</Link>
                            </>
                        )}
                        <Link to="/about" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">About</Link>
                        {!user && (
                            <>
                                <Link to="/login" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">Login</Link>
                                <Link to="/register" className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800">Register</Link>
                            </>
                        )}
                        {user && (
                            <div className="pt-4 pb-3 border-t border-gray-200">
                                <div className="flex items-center px-4">
                                    <div className="flex-shrink-0">
                                        <User className="h-10 w-10 rounded-full bg-gray-100 p-2 text-gray-500" />
                                    </div>
                                    <div className="ml-3">
                                        <div className="text-base font-medium text-gray-800">{user.name}</div>
                                        <div className="text-sm font-medium text-gray-500">{user.email}</div>
                                    </div>
                                </div>
                                <div className="mt-3 space-y-1">
                                    <button onClick={logout} className="block w-full text-left px-4 py-2 text-base font-medium text-gray-500 hover:text-gray-800 hover:bg-gray-100">
                                        Logout
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </nav>
    );
};

export default Navbar;
