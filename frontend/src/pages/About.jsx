import React from 'react';
import Card from '../components/ui/Card';
import { Users, Shield } from 'lucide-react';

const About = () => {
    return (
        <div className="bg-white">
            <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:py-20 lg:px-8">
                <div className="text-center mb-16">
                    <h2 className="text-base font-semibold text-blue-600 tracking-wide uppercase">Our Mission</h2>
                    <h1 className="mt-2 text-4xl font-extrabold text-slate-900 tracking-tight sm:text-5xl">
                        RiskLens: AI Privacy Risk Analysis System
                    </h1>
                    <p className="mt-4 max-w-2xl text-xl text-slate-500 mx-auto">
                        Dedicated to ensuring the safe and ethical deployment of Artificial Intelligence through identifying and mitigating privacy risks in real-time.
                    </p>
                </div>

                <div className="max-w-4xl mx-auto">
                    <Card className="p-8 md:p-12 bg-slate-50 border-none shadow-xl">
                        <div className="flex flex-col md:flex-row items-center justify-between mb-12">
                            <div className="flex-1">
                                <h3 className="text-2xl font-bold text-slate-900 flex items-center">
                                    <Shield className="h-6 w-6 mr-2 text-blue-600" />
                                    Project Vision
                                </h3>
                                <p className="mt-4 text-slate-600 leading-relaxed">
                                    As AI becomes integral to modern software, the risk of inadvertent data leakage grows.
                                    RiskLens serves as a guardian layer, analyzing inputs and datasets to provide transparency
                                    and control over privacy vulnerabilities.
                                </p>
                            </div>
                        </div>

                        <div className="border-t border-slate-200 pt-12">
                            <div className="flex items-center justify-center mb-8">
                                <Users className="h-8 w-8 text-blue-600" />
                                <h3 className="text-2xl font-bold text-slate-900 ml-3">The Team</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                                    <div className="h-20 w-20 bg-blue-100 rounded-full mx-auto flex items-center justify-center text-blue-600 text-2xl font-bold mb-4">
                                        WP
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900">Wishma Pathirage</h4>
                                    <p className="text-blue-600 text-sm font-medium uppercase tracking-wide mt-1">Developer / Researcher</p>
                                    <p className="mt-3 text-slate-500 text-sm">
                                        Lead architecture and implementation of the RiskLens platform.
                                    </p>
                                </div>

                                <div className="text-center p-6 bg-white rounded-xl shadow-sm border border-slate-100">
                                    <div className="h-20 w-20 bg-purple-100 rounded-full mx-auto flex items-center justify-center text-purple-600 text-2xl font-bold mb-4">
                                        KG
                                    </div>
                                    <h4 className="text-lg font-bold text-slate-900">Miss Kavindi Gimshani</h4>
                                    <p className="text-purple-600 text-sm font-medium uppercase tracking-wide mt-1">Mentor / Supervisor</p>
                                    <p className="mt-3 text-slate-500 text-sm">
                                        Project guidance, research direction, and supervision.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default About;
