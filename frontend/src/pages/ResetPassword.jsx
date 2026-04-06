import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

function ResetPassword() {
  const navigate = useNavigate();

  // The entire reset flow is now handled on the ForgotPassword page via OTP.
  // Redirect any legacy links or direct visits to the forgot-password page.
  useEffect(() => {
    navigate('/forgot-password', { replace: true });
  }, [navigate]);

  return null;
}

export default ResetPassword;
