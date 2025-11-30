import ErrorScreen from '../components/ErrorScreen';

const NetworkErrorPage = () => {
  return (
    <ErrorScreen 
      type="network" 
      showHomeButton={true}
      showRetryButton={true}
    />
  );
};

export default NetworkErrorPage;
