import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button, Input, Typography, Alert } from '../components/ui';

const forgotPasswordSchema = z.object({
  email: z.string().min(1, 'Email is required').email('Please enter a valid email address.')
});

export default function ForgotPassword({ onBack }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState('');

  const { register, handleSubmit, formState: { errors } } = useForm({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' }
  });

  const handleReset = async (data) => {
    setLoading(true);
    setMessage('');
    setMessageType('');

    // Simulate API call
    setTimeout(() => {
      setMessageType('error');
      setMessage('Self-service password reset is currently unavailable. Please contact an administrator.');
      setLoading(false);
    }, 1000);
  };

  return (
    <div className="animate-fadeIn">
      <Typography variant="body" className="text-muted-foreground mb-5 text-center leading-relaxed">
        Enter your email address and we'll send you a link to reset your password.
      </Typography>

      <form onSubmit={handleSubmit(handleReset)} className="space-y-4">
        <Input 
          label="Email Address" 
          type="email" 
          placeholder="your@email.com" 
          {...register('email')} 
          error={errors.email}
          className="bg-black/20 text-white border-gold/30 focus:border-gold"
          labelClassName="text-gold"
        />

        {message && (
          <Alert variant={messageType === 'success' ? 'success' : 'danger'} className="text-center">
            {message}
          </Alert>
        )}

        <Button
          type="submit"
          isLoading={loading}
          className="w-full bg-gold hover:bg-gold-dark text-black font-bold shadow-[0_4px_14px_rgba(245,200,66,0.3)] border-none"
        >
          {loading ? 'Sending...' : 'Send Reset Link'}
        </Button>

        <Button
          type="button"
          onClick={onBack}
          variant="outline"
          className="w-full bg-black/10 text-gold/90 border-gold/20 hover:bg-black/20 hover:border-gold/40 hover:text-gold"
        >
          &larr; Back to Login
        </Button>
      </form>
    </div>
  );
}
