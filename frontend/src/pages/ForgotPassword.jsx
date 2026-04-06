import { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { authAPI } from '../utils/api';
import GetStartedImage from '../assets/stock1.png';

function ForgotPassword() {
  const [step, setStep] = useState(1); // 1 = email, 2 = OTP + new password
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [passwords, setPasswords] = useState({ password: '', confirm: '' });
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const inputRefs = useRef([]);

  const startCountdown = () => {
    setCountdown(60);
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) { clearInterval(timer); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  // Step 1: Send OTP to email
  const handleSendOtp = async (e) => {
    e.preventDefault();
    setLoading(true);
    setStatus('');
    setError('');
    try {
      await authAPI.requestPasswordReset(email);
      setStep(2);
      startCountdown();
      setStatus('A 6-digit OTP has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  // OTP input handlers
  const handleOtpChange = (index, value) => {
    if (!/^\d?$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleOtpKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleOtpPaste = (e) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    const newOtp = [...otp];
    pasted.split('').forEach((ch, i) => { newOtp[i] = ch; });
    setOtp(newOtp);
    const nextIndex = Math.min(pasted.length, 5);
    inputRefs.current[nextIndex]?.focus();
  };

  // Resend OTP
  const handleResend = async () => {
    setResending(true);
    setError('');
    try {
      await authAPI.resendOtp(email, 'reset');
      startCountdown();
      setStatus('A new OTP has been sent to your email.');
    } catch (err) {
      setError(err.message || 'Failed to resend OTP');
    } finally {
      setResending(false);
    }
  };

  // Step 2: Verify OTP + set new password
  const handleResetPassword = async (e) => {
    e.preventDefault();
    setStatus('');
    setError('');
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP.');
      return;
    }
    if (passwords.password !== passwords.confirm) {
      setError('Passwords do not match.');
      return;
    }
    if (passwords.password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      await authAPI.setNewPassword(email, otpCode, passwords.password);
      setStatus('Password reset successful! You can now sign in.');
      setStep(3);
    } catch (err) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen grid grid-cols-1 md:grid-cols-2 bg-white text-black">
      <div className="flex items-center justify-center px-4 py-8 md:px-16 lg:px-24">
        <div className="w-full max-w-md shadow-lg rounded-2xl px-5 py-10">
          <header>
            <h1 className="text-4xl font-bold text-gray-900 tracking-tight mb-2">
              {step === 3 ? 'All Done!' : 'Reset Password'}
            </h1>
            <p className="text-gray-500 mb-6 text-lg">
              {step === 1 && 'Enter your email to receive a 6-digit OTP'}
              {step === 2 && (
                <>
                  OTP sent to <span className="font-semibold text-indigo-600">{email}</span>
                </>
              )}
              {step === 3 && 'Your password has been updated'}
            </p>
          </header>

          {status && (
            <div className="bg-emerald-50 text-emerald-700 px-4 py-3 rounded-lg mb-4 text-sm">
              {status}
            </div>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 px-4 py-3 rounded-lg mb-4 text-sm">
              {error}
            </div>
          )}

          {/* STEP 1: Email Input */}
          {step === 1 && (
            <form onSubmit={handleSendOtp} className="space-y-6">
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Email"
                className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                required
              />
              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Sending OTP...' : 'Send OTP'}
              </button>
            </form>
          )}

          {/* STEP 2: OTP + New Password */}
          {step === 2 && (
            <form onSubmit={handleResetPassword} className="space-y-6">
              {/* OTP Input */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-3">Enter 6-digit OTP</label>
                <div className="flex justify-between gap-2">
                  {otp.map((digit, i) => (
                    <input
                      key={i}
                      ref={(el) => (inputRefs.current[i] = el)}
                      type="text"
                      inputMode="numeric"
                      maxLength={1}
                      value={digit}
                      onChange={(e) => handleOtpChange(i, e.target.value)}
                      onKeyDown={(e) => handleOtpKeyDown(i, e)}
                      onPaste={i === 0 ? handleOtpPaste : undefined}
                      className="w-12 h-14 text-center text-2xl font-bold border-2 border-gray-200 rounded-xl focus:border-purple-600 focus:ring-2 focus:ring-purple-100 outline-none transition-all"
                    />
                  ))}
                </div>
                <div className="flex items-center justify-between mt-3">
                  <p className="text-xs text-gray-500">Check your email inbox</p>
                  <button
                    type="button"
                    onClick={handleResend}
                    disabled={countdown > 0 || resending}
                    className="text-xs font-semibold text-indigo-600 hover:text-purple-700 disabled:text-gray-400 disabled:cursor-not-allowed transition-colors"
                  >
                    {resending ? 'Sending...' : countdown > 0 ? `Resend in ${countdown}s` : 'Resend OTP'}
                  </button>
                </div>
              </div>

              {/* New password fields */}
              <input
                type="password"
                placeholder="New password"
                value={passwords.password}
                onChange={(e) => setPasswords({ ...passwords, password: e.target.value })}
                className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                required
              />
              <input
                type="password"
                placeholder="Confirm new password"
                value={passwords.confirm}
                onChange={(e) => setPasswords({ ...passwords, confirm: e.target.value })}
                className="w-full border-b border-gray-300 py-3 focus:outline-none focus:border-purple-600 transition-colors bg-transparent"
                required
              />

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-linear-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all disabled:opacity-50"
              >
                {loading ? 'Resetting...' : 'Reset Password'}
              </button>

              <button
                type="button"
                onClick={() => { setStep(1); setOtp(['', '', '', '', '', '']); setError(''); setStatus(''); }}
                className="w-full text-sm text-gray-500 hover:text-gray-700 transition-colors"
              >
                ← Change email
              </button>
            </form>
          )}

          {/* STEP 3: Success */}
          {step === 3 && (
            <Link
              to="/signin"
              className="block w-full text-center bg-linear-to-r from-purple-600 to-indigo-600 text-white py-3.5 rounded-full font-bold shadow-md hover:shadow-lg transition-all"
            >
              Go to Sign In
            </Link>
          )}

          <div className="mt-8 text-center text-sm text-gray-500">
            Remembered your password?{' '}
            <Link to="/signin" className="text-indigo-600 font-bold hover:underline">
              Sign in
            </Link>
          </div>
        </div>
      </div>

      <div className="hidden md:flex items-center justify-center p-12">
        <img src={GetStartedImage} alt="Reset illustration" className="max-w-full h-auto max-h-[80vh] object-contain" />
      </div>
    </div>
  );
}

export default ForgotPassword;
