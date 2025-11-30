import ErrorScreen from '../components/ErrorScreen';

const GenericErrorPage = () => {
  return (
    <ErrorScreen 
      type="generic" 
      showHomeButton={true}
      showRetryButton={true}
    />
  );
};

export default GenericErrorPage;
