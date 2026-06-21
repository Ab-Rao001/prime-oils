import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { useLocation, useNavigate } from 'react-router-dom';
import ForgotPassword from './ForgotPassword';
import { Button, Input, Select, Typography, Alert } from '../components/ui';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import C from '../theme';

const SUPER_ADMIN_EMAIL = 'admin@primeoil.com';
const isSuperAdminEmail = (email) => email === SUPER_ADMIN_EMAIL;

const loginSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email.'),
  password: z.string().min(1, 'Password is required')
});

const signupSchema = z.object({
  name: z.string().min(1, 'Full name is required'),
  email: z.string().min(1, 'Email is required').email('Please enter a valid email.'),
  password: z.string().min(8, 'Password must be at least 8 characters.'),
  confirmPassword: z.string().min(1, 'Please confirm your password.'),
  role: z.enum(['shopkeeper', 'salesman', 'supplier'])
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ["confirmPassword"]
});

export default function Auth({ defaultTab = 'login', onBack }) {
  const { login, signup } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [tab, setTab] = useState(location.state?.tab || defaultTab);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const { register: registerLogin, handleSubmit: handleLoginSubmit, formState: { errors: loginErrors } } = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' }
  });

  const { register: registerSignup, handleSubmit: handleSignupSubmit, formState: { errors: signupErrors } } = useForm({
    resolver: zodResolver(signupSchema),
    defaultValues: { name: '', email: '', password: '', confirmPassword: '', role: 'shopkeeper' }
  });

  useEffect(() => {
    if (location.state?.tab) {
      setTab(location.state.tab);
    }
  }, [location.state?.tab]);

  const onLogin = async (data) => {
    setLoading(true);
    setError('');
    try {
      await login(data.email.trim().toLowerCase(), data.password);
      navigate('/dashboard');
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  const onSignup = async (data) => {
    const email = data.email.trim().toLowerCase();

    if (isSuperAdminEmail(email)) {
      return setError(`This email is reserved for the super admin. Contact ${SUPER_ADMIN_EMAIL}.`);
    }

    setLoading(true);
    setError('');

    try {
      await signup(data.name.trim(), email, data.password, data.confirmPassword, data.role);
      setTab('login');
      setError('');
    } catch (err) {
      setError(err.message || 'Registration failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center font-sans p-5 relative overflow-hidden bg-gradient-to-br from-sidebar to-sidebar-border">
      {/* Overlay */}
      <div className="absolute inset-0 z-0 bg-gradient-to-br from-black/40 to-black/20" />

      {/* Form Container */}
      <div className="w-full max-w-[480px] bg-[#0d2a14]/85 backdrop-blur-md border border-gold-border rounded-2xl p-10 relative z-10 shadow-[0_20px_60px_rgba(0,0,0,0.4)]">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="bg-transparent border-none text-gold/80 cursor-pointer text-[13px] mb-3 p-0 hover:text-gold transition-colors"
          >
            &larr; Back
          </button>
        )}
        
        {/* Header */}
        <div className="text-center mb-8">
          <div className="font-serif text-2xl text-gold font-bold mb-2">
            Prime <span className="text-[#D4880A] italic">Oil</span>
          </div>
          <div className="text-xs text-gold/70 tracking-widest uppercase font-medium">
            Management System
          </div>
        </div>

        {/* Tab Navigation */}
        {tab !== 'forgot' && (
          <div className="flex gap-2 mb-6 bg-white/10 p-1.5 rounded-xl">
            {[
              { key: 'login', label: 'Login' },
              { key: 'signup', label: 'Sign Up' },
            ].map(t => (
              <button
                key={t.key}
                onClick={() => {
                  setTab(t.key);
                  setError('');
                }}
                className={`flex-1 py-2.5 px-3 border-none rounded-lg cursor-pointer text-[13px] font-semibold transition-all duration-300 ${
                  tab === t.key 
                    ? 'bg-gold text-[#0D0A05] shadow-sm' 
                    : 'bg-transparent text-[#FDF6E3]/70 hover:text-[#FDF6E3]'
                }`}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}

        {/* Login Form */}
        {tab === 'login' && (
          <form onSubmit={handleLoginSubmit(onLogin)} className="space-y-4 animate-fadeIn">
            <Input 
              label="Email Address" 
              type="email" 
              placeholder="admin@primeoil.com" 
              {...registerLogin('email')} 
              error={loginErrors.email}
              className="bg-black/10 text-white border-gold/30 focus:border-gold"
              labelClassName="text-gold/90"
            />

            <Input 
              label="Password" 
              type="password" 
              placeholder="••••••••" 
              {...registerLogin('password')} 
              error={loginErrors.password}
              className="bg-black/10 text-white border-gold/30 focus:border-gold"
              labelClassName="text-gold/90"
            />

            {error && <Alert variant="danger" className="text-center">{error}</Alert>}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-gold hover:bg-gold-dark text-black font-bold shadow-[0_4px_14px_rgba(245,200,66,0.3)] border-none mt-2"
            >
              {loading ? 'Logging in...' : 'Login to Dashboard'}
            </Button>

            <button
              type="button"
              onClick={() => {
                setTab('forgot');
                setError('');
              }}
              className="w-full py-2.5 bg-transparent text-gold/80 border-none rounded-lg text-xs cursor-pointer transition-colors hover:text-gold mt-2"
            >
              Forgot Password?
            </button>
          </form>
        )}

        {/* Signup Form */}
        {tab === 'signup' && (
          <form onSubmit={handleSignupSubmit(onSignup)} className="space-y-4 animate-fadeIn">
            <Input 
              label="Full Name" 
              placeholder="John Doe" 
              {...registerSignup('name')} 
              error={signupErrors.name}
              className="bg-black/10 text-white border-gold/30 focus:border-gold"
              labelClassName="text-gold/90"
            />

            <Input 
              label="Email Address" 
              type="email" 
              placeholder="your@email.com" 
              {...registerSignup('email')} 
              error={signupErrors.email}
              className="bg-black/10 text-white border-gold/30 focus:border-gold"
              labelClassName="text-gold/90"
            />

            <div className="space-y-1">
              <Input 
                label="Password" 
                type="password" 
                placeholder="••••••••" 
                {...registerSignup('password')} 
                error={signupErrors.password}
                className="bg-black/10 text-white border-gold/30 focus:border-gold"
                labelClassName="text-gold/90"
              />
              {!signupErrors.password && (
                <Typography variant="caption" className="text-gold/60 block mt-1">Min 8 characters</Typography>
              )}
            </div>

            <Input 
              label="Confirm Password" 
              type="password" 
              placeholder="••••••••" 
              {...registerSignup('confirmPassword')} 
              error={signupErrors.confirmPassword}
              className="bg-black/10 text-white border-gold/30 focus:border-gold"
              labelClassName="text-gold/90"
            />

            <Select 
              label="Role" 
              {...registerSignup('role')} 
              error={signupErrors.role}
              className="bg-black/10 text-white border-gold/30 focus:border-gold cursor-pointer"
              labelClassName="text-gold/90"
            >
              <option value="shopkeeper" className="text-[#FDF6E3] bg-[#2D4A2D]">Shopkeeper</option>
              <option value="salesman" className="text-[#FDF6E3] bg-[#2D4A2D]">Salesman</option>
              <option value="supplier" className="text-[#FDF6E3] bg-[#2D4A2D]">Supplier</option>
            </Select>

            {error && <Alert variant="danger" className="text-center">{error}</Alert>}

            <Button
              type="submit"
              isLoading={loading}
              className="w-full bg-gold hover:bg-gold-dark text-black font-bold shadow-[0_4px_14px_rgba(245,200,66,0.3)] border-none mt-2"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </Button>
          </form>
        )}

        {/* Forgot Password Form */}
        {tab === 'forgot' && (
          <ForgotPassword onBack={() => {
            setTab('login');
            setError('');
          }} />
        )}
      </div>
    </div>
  );
}
