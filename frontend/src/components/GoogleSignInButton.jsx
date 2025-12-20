import { GoogleLogin } from '@react-oauth/google';
import { useEffect, useState, useRef } from 'react';

const GoogleSignInButton = ({ onSuccess, onError, mode = 'signin' }) => {
  const [buttonWidth, setButtonWidth] = useState(400);
  const containerRef = useRef(null);

  useEffect(() => {
    const updateButtonWidth = () => {
      if (containerRef.current) {
        // Get actual container width and use it, max 400px
        const containerWidth = containerRef.current.offsetWidth;
        const newWidth = Math.min(containerWidth, 400);
        setButtonWidth(newWidth);
      }
    };

    // Initial update with a slight delay to ensure DOM is ready
    setTimeout(updateButtonWidth, 100);
    
    window.addEventListener('resize', updateButtonWidth);
    return () => window.removeEventListener('resize', updateButtonWidth);
  }, []);

  return (
    <div className="w-full flex justify-center">
      <div ref={containerRef} className="w-full max-w-[400px]">
        <GoogleLogin
          onSuccess={async (credentialResponse) => {
            try {
              // credentialResponse.credential contains the JWT ID token
              await onSuccess(credentialResponse.credential);
            } catch (error) {
              console.error('Google sign-in error:', error);
              onError?.(error);
            }
          }}
          onError={() => {
            console.error('Google OAuth Error');
            onError?.(new Error('Google sign-in failed'));
          }}
          useOneTap={false}
          theme="outline"
          size="large"
          text={mode === 'signin' ? 'continue_with' : 'signup_with'}
          shape="rectangular"
          logo_alignment="left"
          width={buttonWidth}
        />
      </div>
    </div>
  );
};

export default GoogleSignInButton;
