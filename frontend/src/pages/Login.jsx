import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Login = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState(''); // General form error or field error
    const [successMsg, setSuccessMsg] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { login } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();

    useEffect(() => {
        if (location.state?.message) {
            setSuccessMsg(location.state.message);
            // Clear state so message doesn't persist on refresh
            window.history.replaceState({}, document.title);
        }
    }, [location]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccessMsg('');
        setIsSubmitting(true);

        // Basic validation
        if (!email || !password) {
            setError('Please fill in all fields');
            setIsSubmitting(false);
            return;
        }

        const result = await login(email, password);

        if (result.success) {
            navigate('/dashboard');
        } else {
            setError(result.message);
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md p-8 shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900">Welcome back</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Please sign in to your risk analysis dashboard
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {successMsg && (
                        <div className="bg-green-50 text-green-700 p-3 rounded-md text-sm border border-green-200">
                            {successMsg}
                        </div>
                    )}
                    {error && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm border border-red-200">
                            {error}
                        </div>
                    )}

                    <Input
                        label="Email address"
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="you@example.com"
                        required
                    />

                    <Input
                        label="Password"
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        required
                    />

                    <div className="flex items-center justify-between">
                        <div className="flex items-center">
                            <input
                                id="remember-me"
                                name="remember-me"
                                type="checkbox"
                                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                            <label htmlFor="remember-me" className="ml-2 block text-sm text-gray-900">
                                Remember me
                            </label>
                        </div>

                        <div className="text-sm">
                            <a href="#" className="font-medium text-blue-600 hover:text-blue-500">
                                Forgot your password?
                            </a>
                        </div>
                    </div>

                    <Button
                        type="submit"
                        className="w-full"
                        isLoading={isSubmitting}
                    >
                        Sign in
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-500">Don't have an account? </span>
                    <Link to="/register" className="font-medium text-blue-600 hover:text-blue-500">
                        Register
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default Login;
