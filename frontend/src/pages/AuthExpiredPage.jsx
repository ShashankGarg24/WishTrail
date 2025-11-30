import ErrorScreen from '../components/ErrorScreen';

const AuthExpiredPage = () => {
  return (
    <ErrorScreen 
      type="auth" 
      showHomeButton={false}
    />
  );
};

export default AuthExpiredPage;
