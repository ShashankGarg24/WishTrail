import { GoogleLogin } from '@react-oauth/google';

const GoogleSignInButton = ({ onSuccess, onError, mode = 'signin' }) => {
  return (
    <div className="w-full">
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
        width="100%"
      />
    </div>
  );
};

export default GoogleSignInButton;
