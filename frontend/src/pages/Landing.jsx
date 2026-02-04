import React from 'react';
import { Link } from 'react-router-dom';
import Button from '../components/ui/Button';
import { ShieldCheck, BarChart3, FileText, ArrowRight } from 'lucide-react';

const Landing = () => {
    return (
        <div className="bg-slate-50">
            {/* Hero Section */}
            <section className="relative overflow-hidden pt-16 pb-20 lg:pt-24 lg:pb-28">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
                    <h1 className="text-4xl tracking-tight font-extrabold text-slate-900 sm:text-5xl md:text-6xl">
                        <span className="block">RiskLens</span>
                        <span className="block text-blue-600 mt-2">AI Privacy Risk Analysis System</span>
                    </h1>
                    <p className="mt-4 max-w-2xl mx-auto text-xl text-slate-500">
                        Secure your AI interactions with real-time privacy risk assessment. Identify sensitive data integration issues before they happen.
                    </p>
                    <div className="mt-8 flex justify-center gap-4">
                        <Link to="/register">
                            <Button size="lg" className="shadow-lg shadow-blue-500/20">
                                Get Started <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                        </Link>
                        <Link to="/login">
                            <Button variant="outline" size="lg">
                                Login
                            </Button>
                        </Link>
                    </div>
                </div>

                {/* Background blobs */}
                <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full z-0 pointer-events-none opacity-30 overflow-hidden">
                    <div className="absolute top-[10%] left-[20%] w-72 h-72 bg-blue-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob"></div>
                    <div className="absolute top-[10%] right-[20%] w-72 h-72 bg-purple-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-2000"></div>
                    <div className="absolute -bottom-8 left-[30%] w-72 h-72 bg-pink-400 rounded-full mix-blend-multiply filter blur-3xl animate-blob animation-delay-4000"></div>
                </div>
            </section>

            {/* Feature Section */}
            <section className="py-16 bg-white">
                <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                    <div className="text-center mb-16">
                        <h2 className="text-3xl font-bold text-slate-900">Comprehensive Risk Analysis</h2>
                        <p className="mt-4 text-lg text-slate-500">Everything you need to ensure your AI models respect user privacy.</p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Feature 1 */}
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center mb-6 text-blue-600">
                                <ShieldCheck className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Privacy Risk Scan</h3>
                            <p className="text-slate-500">
                                Instantly analyze text or documents for PII, sensitive data leaks, and compliance violations.
                            </p>
                        </div>

                        {/* Feature 2 */}
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center mb-6 text-purple-600">
                                <BarChart3 className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Model Confidence Insights</h3>
                            <p className="text-slate-500">
                                Get detailed confidence scores and explainable AI metrics to understand risk factors.
                            </p>
                        </div>

                        {/* Feature 3 */}
                        <div className="bg-slate-50 p-8 rounded-2xl border border-slate-100 hover:shadow-lg transition-shadow">
                            <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center mb-6 text-green-600">
                                <FileText className="h-6 w-6" />
                            </div>
                            <h3 className="text-xl font-bold text-slate-900 mb-3">Reports and History</h3>
                            <p className="text-slate-500">
                                Keep track of all analyses. Export detailed reports for compliance audits and team reviews.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </div>
    );
};

export default Landing;
