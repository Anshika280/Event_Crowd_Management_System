import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { Mail, Lock, User, UserCheck, ShieldAlert } from 'lucide-react';

const Login = ({ setView }) => {
  const [isSignUp, setIsSignUp] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState('user'); // user or admin
  const [localError, setLocalError] = useState('');
  const [localSuccess, setLocalSuccess] = useState('');

  const { login, register, loading } = useAuth();

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const modeParam = params.get('mode'); // 'login' or 'signup'
    const roleParam = params.get('role'); // 'user' or 'admin'
    if (modeParam === 'signup') {
      setIsSignUp(true);
    } else if (modeParam === 'login') {
      setIsSignUp(false);
    }
    if (roleParam === 'admin' || roleParam === 'user') {
      setRole(roleParam);
    }
  }, []);

  // Reset form fields when mode or role changes to ensure clean entry
  useEffect(() => {
    setName('');
    setEmail('');
    setPassword('');
    setLocalError('');
    setLocalSuccess('');
  }, [isSignUp, role]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLocalError('');
    setLocalSuccess('');

    if (!email || !password || (isSignUp && !name)) {
      setLocalError('Please fill in all required fields');
      return;
    }

    try {
      if (isSignUp) {
        await register(name, email, password, role);
        setLocalSuccess('Registration successful! Redirecting...');
        setTimeout(() => {
          setView(role === 'admin' ? 'admin-dashboard' : 'events');
        }, 1500);
      } else {
        const loggedInUser = await login(email, password);
        setLocalSuccess('Login successful! Welcome back.');
        setTimeout(() => {
          setView(loggedInUser.role === 'admin' ? 'admin-dashboard' : 'events');
        }, 1500);
      }
    } catch (err) {
      setLocalError(err.message || 'Authentication failed. Please try again.');
    }
  };

  // Form fields are reset when role changes to ensure clean entry

  return (
    <div style={{ 
      display: 'flex', 
      justifyContent: 'center', 
      alignItems: 'center', 
      minHeight: '80vh',
      padding: '1rem'
    }}>
      <div className="glass-panel" style={{ 
        width: '100%', 
        maxWidth: '450px', 
        padding: '2.5rem 2rem', 
        border: '1px solid var(--border-glow)',
        boxShadow: '0 15px 35px rgba(255, 65, 108, 0.15)'
      }}>
        
        {/* Role Tabs */}
        <div className="tabs-header" style={{ marginBottom: '1.5rem', justifyContent: 'center' }}>
          <button 
            type="button"
            className={`tab-btn ${role === 'user' ? 'active' : ''}`}
            onClick={() => setRole('user')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Attendee Portal
          </button>
          <button 
            type="button"
            className={`tab-btn ${role === 'admin' ? 'active' : ''}`}
            onClick={() => setRole('admin')}
            style={{ flex: 1, textAlign: 'center' }}
          >
            Admin Portal
          </button>
        </div>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
          <h2 style={{ fontSize: '2rem', fontWeight: 800 }}>
            {isSignUp 
              ? (role === 'admin' ? 'Create Admin Account' : 'Create Account') 
              : (role === 'admin' ? 'Admin Portal' : 'Welcome Back')
            }
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', marginTop: '0.5rem' }}>
            {isSignUp 
              ? (role === 'admin' ? 'Register as security, staff, or crowd monitor' : 'Sign up to register for global crowd events') 
              : (role === 'admin' ? 'Sign in to access control panels & dashboards' : 'Sign in to access your attendee dashboard')
            }
          </p>
        </div>

        {/* Alerts */}
        {localError && (
          <div style={{ 
            background: 'rgba(239, 68, 68, 0.1)', 
            border: '1px solid rgba(239, 68, 68, 0.2)', 
            color: 'var(--danger)', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <ShieldAlert size={16} />
            <span>{localError}</span>
          </div>
        )}

        {localSuccess && (
          <div style={{ 
            background: 'rgba(16, 185, 129, 0.1)', 
            border: '1px solid rgba(16, 185, 129, 0.2)', 
            color: 'var(--success)', 
            padding: '0.75rem', 
            borderRadius: '8px', 
            fontSize: '0.85rem', 
            marginBottom: '1.5rem',
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem'
          }}>
            <UserCheck size={16} />
            <span>{localSuccess}</span>
          </div>
        )}

        {/* Auth Form */}
        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          {isSignUp && (
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Full Name</label>
              <div style={{ position: 'relative' }}>
                <input 
                  type="text" 
                  className="form-control" 
                  placeholder="Enter your name" 
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  style={{ paddingLeft: '2.5rem' }}
                  required
                />
                <User size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
              </div>
            </div>
          )}

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Email Address</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="email" 
                className="form-control" 
                placeholder={role === 'admin' ? "admin@crowd.com" : "user@crowd.com"} 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
              <Mail size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: 0 }}>
            <label className="form-label">Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type="password" 
                className="form-control" 
                placeholder={role === 'admin' ? "admin123" : "user123"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={{ paddingLeft: '2.5rem' }}
                required
              />
              <Lock size={16} style={{ position: 'absolute', left: '12px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
            </div>
          </div>

          {/* Account Role is determined automatically by the selected portal tab */}

          <button 
            type="submit" 
            className="btn btn-primary" 
            style={{ width: '100%', marginTop: '0.75rem', padding: '0.85rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : isSignUp ? 'Create Account' : 'Sign In'}
          </button>
        </form>

        {/* Toggle Mode */}
        <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
            {isSignUp ? "Already have an account? " : "Don't have an account? "}
            <span 
              onClick={() => setIsSignUp(!isSignUp)} 
              style={{ 
                color: 'var(--primary-start)', 
                cursor: 'pointer', 
                fontWeight: 600,
                textDecoration: 'underline',
                marginLeft: '0.25rem'
              }}
            >
              {isSignUp ? 'Sign In' : 'Sign Up'}
            </span>
          </p>
        </div>

        {/* Help Note */}
        <div style={{ 
          marginTop: '1.5rem', 
          borderTop: '1px solid var(--border-light)', 
          paddingTop: '1.5rem',
          textAlign: 'center'
        }}>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
            Need help? Use the placeholder credentials shown in the inputs.
          </span>
        </div>

      </div>
    </div>
  );
};

export default Login;
