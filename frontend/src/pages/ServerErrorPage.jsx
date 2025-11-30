import ErrorScreen from '../components/ErrorScreen';

const ServerErrorPage = () => {
  return (
    <ErrorScreen 
      type="500" 
      showHomeButton={true}
      showRetryButton={true}
    />
  );
};

export default ServerErrorPage;
