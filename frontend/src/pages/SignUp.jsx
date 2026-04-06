import { useState, useRef, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import GetStartedImage from '../assets/stock1.png';
import { authAPI, setAuthToken } from '../utils/api';

const OTP_LENGTH = 6;
const RESEND_COOLDOWN = 60;

const SignUp = () => {
  const navigate = useNavigate();

  // step: 'register' | 'otp' | 'success'
  const [step, setStep] = useState('register');

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
  });
  const [otp, setOtp] = useState(Array(OTP_LENGTH).fill(''));
  const otpRefs = useRef([]);

  const [error, setError] = useState('');
  const [status, setStatus] = useState('');
  const [loading, setLoading] = useState(false);

  // Resend cooldown
  const [resendTimer, setResendTimer] = useState(0);
  useEffect(() => {
    if (resendTimer <= 0) return;
    const id = setInterval(() => setResendTimer((t) => t - 1), 1000);
    return () => clearInterval(id);
  }, [resendTimer]);

  // ── Handlers ──────────────────────────────────────────

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setError('');
  };

  // OTP input helpers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const next = [...otp];
    next[index] = value;
    setOtp(next);
    if (value && index < OTP_LENGTH - 1) otpRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, OTP_LENGTH);
    if (!pasted) return;
    const next = [...otp];
    pasted.split('').forEach((ch, i) => { next[i] = ch; });
    setOtp(next);
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    otpRefs.current[focusIdx]?.focus();
  };

  // Step 1 – register
  const handleRegister = async (e) => {
    e.preventDefault();
    setError('');

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      await authAPI.signUp({
        name: formData.name,
        email: formData.email,
        password: formData.password,
      });

      // Always move to OTP step — backend no longer auto-logs-in
      setResendTimer(RESEND_COOLDOWN);
      setStep('otp');
    } catch (err) {
      setError(err.message || 'Failed to create account');
    } finally {
      setLoading(false);
    }
  };

  // Step 2 – verify OTP
  const handleVerifyOtp = useCallback(async () => {
    const code = otp.join('');
    if (code.length !== OTP_LENGTH) {
      setError('Please enter the full 6-digit code');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const res = await authAPI.verifyOtp(formData.email, code);
      if (res.token) {
        setAuthToken(res.token);
        // Auto-login: go straight to dashboard
        navigate('/dashboard');
        return;
      }
      // Fallback: show success with link to sign-in
      setStep('success');
    } catch (err) {
      setError(err.message || 'Invalid or expired OTP');
    } finally {
      setLoading(false);
    }
  }, [otp, formData.email, navigate]);

  // Auto-submit when all 6 digits filled
  useEffect(() => {
    if (otp.every((d) => d !== '')) handleVerifyOtp();
  }, [otp, handleVerifyOtp]);

  // Resend OTP
  const handleResend = async () => {
    setError('');
    setStatus('');
    try {
      await authAPI.resendOtp(formData.email, 'verify');
      setStatus('A new code has been sent to your email');
      setOtp(Array(OTP_LENGTH).fill(''));
      otpRefs.current[0]?.focus();
      setResendTimer(RESEND_COOLDOWN);
    } catch (err) {
      setError(err.message || 'Failed to resend code');
    }
  };

  // ── Render ────────────────────────────────────────────

  const renderRegister = () => (
    <>
      <header className="mb-8">
        <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Sign Up</h1>
        <p className="text-gray-500 mt-2 text-lg">First create your account</p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}

      <form className="space-y-6" onSubmit={handleRegister}>
        <div className="space-y-4">
          <input
            type="text"
            name="name"
            placeholder="Full name"
            value={formData.name}
            onChange={handleChange}
            className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
            required
          />
          <input
            type="email"
            name="email"
            placeholder="Email"
            value={formData.email}
            onChange={handleChange}
            className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
            required
          />
          <input
            type="password"
            name="password"
            placeholder="Password"
            value={formData.password}
            onChange={handleChange}
            className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
            required
          />
          <input
            type="password"
            name="confirmPassword"
            placeholder="Confirm your password"
            value={formData.confirmPassword}
            onChange={handleChange}
            className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
            required
          />
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-4 rounded-full font-bold shadow-lg hover:shadow-purple-200 hover:scale-[1.02] active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
        >
          {loading ? 'Creating account...' : 'SIGN UP'}
        </button>
      </form>

      <div className="mt-8 text-center text-sm text-gray-500">
        Already have an account?{' '}
        <Link
          to="/signin"
          className="text-transparent bg-clip-text bg-linear-to-r from-purple-600 to-indigo-600 font-bold hover:opacity-80"
        >
          Sign In
        </Link>
      </div>
    </>
  );

  const renderOtp = () => (
    <>
      <header className="mb-8 text-center">
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-purple-100">
          <svg className="h-8 w-8 text-purple-600" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75" />
          </svg>
        </div>
        <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">Verify Your Email</h1>
        <p className="text-gray-500 mt-2">
          We sent a 6-digit code to <span className="font-semibold text-gray-700">{formData.email}</span>
        </p>
      </header>

      {error && (
        <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">{error}</div>
      )}
      {status && (
        <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm">{status}</div>
      )}

      {/* OTP boxes */}
      <div className="flex justify-center gap-3 mb-6" onPaste={handleOtpPaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (otpRefs.current[i] = el)}
            type="text"
            inputMode="numeric"
            maxLength={1}
            value={digit}
            onChange={(e) => handleOtpChange(i, e.target.value)}
            onKeyDown={(e) => handleOtpKeyDown(i, e)}
            className="h-14 w-12 rounded-xl border-2 border-gray-200 text-center text-2xl font-bold text-gray-900 focus:border-purple-500 focus:ring-2 focus:ring-purple-200 outline-none transition-all"
          />
        ))}
      </div>

      <button
        onClick={handleVerifyOtp}
        disabled={loading || otp.join('').length !== OTP_LENGTH}
        className="w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
      >
        {loading ? 'Verifying...' : 'Verify Email'}
      </button>

      {/* Resend */}
      <div className="mt-6 text-center text-sm text-gray-500">
        {resendTimer > 0 ? (
          <span>Resend code in <span className="font-semibold text-purple-600">{resendTimer}s</span></span>
        ) : (
          <button onClick={handleResend} className="text-indigo-600 font-semibold hover:underline">
            Resend Code
          </button>
        )}
      </div>

      <button
        onClick={() => { setStep('register'); setOtp(Array(OTP_LENGTH).fill('')); setError(''); setStatus(''); }}
        className="mt-4 w-full text-center text-sm text-gray-400 hover:text-gray-600 transition-colors"
      >
        &larr; Back to registration
      </button>
    </>
  );

  const renderSuccess = () => (
    <div className="text-center py-6">
      <div className="mx-auto mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-emerald-100">
        <svg className="h-10 w-10 text-emerald-600" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
        </svg>
      </div>
      <h1 className="text-3xl font-extrabold text-gray-900 mb-2">Email Verified!</h1>
      <p className="text-gray-500 mb-8">Your account has been created and verified successfully.</p>
      <Link
        to="/signin"
        className="inline-block w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all text-center"
      >
        Sign In
      </Link>
    </div>
  );

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white text-black">
      {/* LEFT – FORM */}
      <div className="flex flex-col justify-center items-center px-4 py-8 md:px-16 lg:px-24">
        <div className="w-full max-w-md shadow-lg rounded-2xl px-5 py-10">
          {step === 'register' && renderRegister()}
          {step === 'otp' && renderOtp()}
          {step === 'success' && renderSuccess()}
        </div>
      </div>

      {/* RIGHT – IMAGE */}
      <div className="hidden md:flex items-center justify-center p-12">
        <img
          src={GetStartedImage}
          alt="Sign Up illustration"
          className="max-w-full h-auto max-h-[80vh] object-contain"
        />
      </div>
    </div>
  );
};

export default SignUp;