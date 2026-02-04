import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Input from '../components/ui/Input';
import Card from '../components/ui/Card';

const Register = () => {
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        password: '',
        confirmPassword: ''
    });
    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { register } = useAuth();
    const navigate = useNavigate();

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
        // Clear error when user types
        if (errors[name]) {
            setErrors(prev => ({ ...prev, [name]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};
        if (!formData.name.trim()) newErrors.name = "Full name is required";
        if (!formData.email.trim()) newErrors.email = "Email is required";
        // Simple email regex
        else if (!/\S+@\S+\.\S+/.test(formData.email)) newErrors.email = "Email is invalid";

        if (!formData.password) newErrors.password = "Password is required";
        else if (formData.password.length < 8) newErrors.password = "Password must be at least 8 characters";
        else if (!/\d/.test(formData.password)) newErrors.password = "Password must contain at least one number";

        if (formData.password !== formData.confirmPassword) {
            newErrors.confirmPassword = "Passwords do not match";
        }

        return newErrors;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const validationErrors = validate();
        if (Object.keys(validationErrors).length > 0) {
            setErrors(validationErrors);
            return;
        }

        setIsSubmitting(true);
        const result = await register({ name: formData.name, email: formData.email, password: formData.password });

        if (result.success) {
            navigate('/dashboard');
        } else {
            setErrors({ form: result.message });
            setIsSubmitting(false);
        }
    };

    return (
        <div className="flex items-center justify-center min-h-[calc(100vh-200px)] py-12 px-4 sm:px-6 lg:px-8">
            <Card className="w-full max-w-md p-8 shadow-lg">
                <div className="text-center mb-8">
                    <h2 className="text-3xl font-extrabold text-slate-900">Create Account</h2>
                    <p className="mt-2 text-sm text-slate-600">
                        Get started with your free risk analysis account
                    </p>
                </div>

                <form className="space-y-6" onSubmit={handleSubmit}>
                    {errors.form && (
                        <div className="bg-red-50 text-red-700 p-3 rounded-md text-sm">
                            {errors.form}
                        </div>
                    )}

                    <Input
                        label="Full Name"
                        name="name"
                        value={formData.name}
                        onChange={handleChange}
                        placeholder="John Doe"
                        error={errors.name}
                    />

                    <Input
                        label="Email address"
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleChange}
                        placeholder="you@example.com"
                        error={errors.email}
                    />

                    <Input
                        label="Password"
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleChange}
                        placeholder="••••••••"
                        error={errors.password}
                    />

                    <Input
                        label="Confirm Password"
                        type="password"
                        name="confirmPassword"
                        value={formData.confirmPassword}
                        onChange={handleChange}
                        placeholder="••••••••"
                        error={errors.confirmPassword}
                    />

                    <Button
                        type="submit"
                        className="w-full"
                        isLoading={isSubmitting}
                    >
                        Register
                    </Button>
                </form>

                <div className="mt-6 text-center text-sm">
                    <span className="text-slate-500">Already have an account? </span>
                    <Link to="/login" className="font-medium text-blue-600 hover:text-blue-500">
                        Sign in
                    </Link>
                </div>
            </Card>
        </div>
    );
};

export default Register;
