import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import Badge from '../components/ui/Badge';
import { Plus, Activity, AlertTriangle, Calendar, FileText } from 'lucide-react';

const Dashboard = () => {
    const [recentScans, setRecentScans] = useState([]);
    const [stats, setStats] = useState({
        totalScans: 0,
        highRiskCount: 0,
        lastScanDate: 'N/A'
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const fetchData = async () => {
            try {
                // In a real app, we might have a specific dashboard endpoint.
                // Here we fetch reports and calculate stats.
                const response = await api.get('/reports');
                const reports = response.data;

                setRecentScans(reports.slice(0, 5));
                setStats({
                    totalScans: 124, // Mock total
                    highRiskCount: reports.filter(r => r.status === 'High').length + 14, // Mock total high risk
                    lastScanDate: reports.length > 0 ? reports[0].date : 'N/A'
                });
            } catch (error) {
                console.error("Failed to fetch dashboard data", error);
            } finally {
                setLoading(false);
            }
        };

        fetchData();
    }, []);

    const getRiskVariant = (risk) => {
        switch (risk?.toLowerCase()) {
            case 'high': return 'danger';
            case 'medium': return 'warning';
            case 'low': return 'success';
            default: return 'default';
        }
    };

    return (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
                    <p className="mt-1 text-sm text-slate-500">Overview of your risk analysis activities.</p>
                </div>
                <div className="mt-4 sm:mt-0">
                    <Link to="/scan">
                        <Button>
                            <Plus className="mr-2 h-4 w-4" /> Run New Scan
                        </Button>
                    </Link>
                </div>
            </div>

            {/* Stats Grid */}
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3 mb-8">
                <Card className="p-6 border-l-4 border-l-blue-500">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-blue-100 rounded-md p-3">
                            <Activity className="h-6 w-6 text-blue-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">Total Scans</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-slate-900">{stats.totalScans}</div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-red-500">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-red-100 rounded-md p-3">
                            <AlertTriangle className="h-6 w-6 text-red-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">High Risk Detections</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-slate-900">{stats.highRiskCount}</div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>

                <Card className="p-6 border-l-4 border-l-slate-500">
                    <div className="flex items-center">
                        <div className="flex-shrink-0 bg-slate-100 rounded-md p-3">
                            <Calendar className="h-6 w-6 text-slate-600" />
                        </div>
                        <div className="ml-5 w-0 flex-1">
                            <dl>
                                <dt className="text-sm font-medium text-slate-500 truncate">Last Activity</dt>
                                <dd className="flex items-baseline">
                                    <div className="text-2xl font-semibold text-slate-900">{stats.lastScanDate}</div>
                                </dd>
                            </dl>
                        </div>
                    </div>
                </Card>
            </div>

            {/* Recent Activity Table */}
            <Card className="overflow-hidden">
                <div className="px-6 py-5 border-b border-slate-200 bg-slate-50">
                    <h3 className="text-lg font-medium leading-6 text-slate-900">Recent Activity</h3>
                </div>
                <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-slate-200">
                        <thead className="bg-slate-50">
                            <tr>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Name/File</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Date</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Risk Score</th>
                                <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Level</th>
                                <th scope="col" className="px-6 py-3 text-right text-xs font-medium text-slate-500 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-slate-200">
                            {loading ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">Loading...</td>
                                </tr>
                            ) : recentScans.length === 0 ? (
                                <tr>
                                    <td colSpan="5" className="px-6 py-4 text-center text-sm text-slate-500">No recent activity found.</td>
                                </tr>
                            ) : (
                                recentScans.map((scan) => (
                                    <tr key={scan.id} className="hover:bg-slate-50">
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 bg-blue-100 rounded-full flex items-center justify-center text-blue-600">
                                                    <FileText className="h-4 w-4" />
                                                </div>
                                                <div className="ml-4">
                                                    <div className="text-sm font-medium text-slate-900">{scan.name}</div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-500">{scan.date}</div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <div className="text-sm text-slate-900">{scan.riskScore}/100</div>
                                            <div className="w-24 bg-slate-200 rounded-full h-1.5 mt-1">
                                                <div
                                                    className={`h-1.5 rounded-full ${scan.riskScore > 70 ? 'bg-red-500' : scan.riskScore > 30 ? 'bg-yellow-500' : 'bg-green-500'}`}
                                                    style={{ width: `${scan.riskScore}%` }}
                                                ></div>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap">
                                            <Badge variant={getRiskVariant(scan.status)}>{scan.status}</Badge>
                                        </td>
                                        <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                                            <Link to={`/reports/${scan.id}`} className="text-blue-600 hover:text-blue-900">View</Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 text-right">
                    <Link to="/reports" className="text-sm font-medium text-blue-600 hover:text-blue-500">View all scans &rarr;</Link>
                </div>
            </Card>
        </div>
    );
};

export default Dashboard;
