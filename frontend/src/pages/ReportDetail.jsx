import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import Button from '../components/ui/Button';
import { ArrowLeft, Download, ShieldAlert, CheckCircle, Calendar } from 'lucide-react';

const ReportDetail = () => {
    const { id } = useParams();
    const [report, setReport] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchReport = async () => {
            try {
                const response = await api.get(`/reports/${id}`);
                setReport(response.data);
            } catch (error) {
                console.error("Failed to fetch report details", error);
            } finally {
                setLoading(false);
            }
        };

        fetchReport();
    }, [id]);

    const getRiskVariant = (risk) => {
        switch (risk?.toLowerCase()) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    if (loading) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <p className="text-slate-500">Loading report details...</p>
            </div>
        );
    }

    if (!report) {
        return (
            <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 text-center">
                <p className="text-red-500">Report not found.</p>
                <Link to="/reports">
                    <Button variant="outline" className="mt-4">Back to Reports</Button>
                </Link>
            </div>
        );
    }

    return (
        <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="mb-6 flex items-center justify-between">
                <Link to="/reports" className="text-slate-500 hover:text-slate-700 flex items-center">
                    <ArrowLeft className="h-4 w-4 mr-1" /> Back to Reports
                </Link>
                <div className="flex space-x-2">
                    <Button variant="outline">
                        <Download className="h-4 w-4 mr-2" /> Export PDF
                    </Button>
                </div>
            </div>

            <Card className="overflow-hidden mb-6">
                <div className="bg-slate-900 px-6 py-8 text-white">
                    <div className="flex justify-between items-start">
                        <div>
                            <h1 className="text-2xl font-bold">{report.name}</h1>
                            <div className="mt-2 flex items-center text-slate-300 text-sm">
                                <Calendar className="h-4 w-4 mr-1.5" />
                                Created on {report.date}
                            </div>
                        </div>
                        <div className="text-right">
                            <span className={`inline-flex items-center px-4 py-1 rounded-full text-sm font-bold bg-white/10 backdrop-blur-sm border border-white/20 uppercase tracking-wide
                                ${report.status === 'High' ? 'text-red-400' : report.status === 'Medium' ? 'text-yellow-400' : 'text-green-400'}
                             `}>
                                {report.status} Risk Level
                            </span>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                        {/* Details Column */}
                        <div className="md:col-span-2 space-y-8">
                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">Risk Analysis Summary</h3>
                                <p className="text-slate-600 leading-relaxed">
                                    {report.details} This is a simulated detailed report content. The analysis engine detected patterns consistent with privacy risks.
                                    Review the breakdown below for specific actionable insights.
                                </p>
                            </div>

                            <div>
                                <h3 className="text-lg font-semibold text-slate-900 border-b border-slate-200 pb-2 mb-4">Detected Vulnerabilities</h3>
                                <ul className="space-y-3">
                                    <li className="bg-red-50 p-3 rounded-lg flex items-start">
                                        <ShieldAlert className="h-5 w-5 text-red-500 mt-0.5 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-red-800">PII Exposure</p>
                                            <p className="text-xs text-red-600 mt-1">Found likely credit card numbers or social security patterns in the dataset.</p>
                                        </div>
                                    </li>
                                    <li className="bg-yellow-50 p-3 rounded-lg flex items-start">
                                        <ShieldAlert className="h-5 w-5 text-yellow-500 mt-0.5 mr-3 flex-shrink-0" />
                                        <div>
                                            <p className="text-sm font-medium text-yellow-800">Indirect Identifiers</p>
                                            <p className="text-xs text-yellow-600 mt-1">Combination of zip code and birth date may lead to re-identification.</p>
                                        </div>
                                    </li>
                                </ul>
                            </div>
                        </div>

                        {/* Sidebar Column */}
                        <div className="space-y-6">
                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Overall Score</h4>
                                <div className="flex items-center justify-center">
                                    <div className="relative h-32 w-32 flex items-center justify-center">
                                        <svg className="h-full w-full transform -rotate-90">
                                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-200" />
                                            <circle cx="64" cy="64" r="56" stroke="currentColor" strokeWidth="8" fill="transparent"
                                                className={`${report.riskScore > 70 ? 'text-red-500' : report.riskScore > 30 ? 'text-yellow-500' : 'text-green-500'}`}
                                                strokeDasharray={351.86}
                                                strokeDashoffset={351.86 - (351.86 * report.riskScore) / 100}
                                            />
                                        </svg>
                                        <span className="absolute text-3xl font-bold text-slate-900">{report.riskScore}</span>
                                    </div>
                                </div>
                                <div className="mt-4 text-center">
                                    <p className="text-xs text-slate-400">0 = Safe, 100 = Critical</p>
                                </div>
                            </div>

                            <div className="bg-slate-50 rounded-xl p-5 border border-slate-100">
                                <h4 className="text-sm font-semibold text-slate-500 uppercase tracking-widest mb-4">Recommendation</h4>
                                <div className="flex items-start">
                                    <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                                    <p className="text-sm text-slate-700">
                                        Requires immediate attention. Anonymize PII before proceeding with model training.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </Card>
        </div>
    );
};

export default ReportDetail;
