import ErrorScreen from '../components/ErrorScreen';

const PermissionErrorPage = () => {
  return (
    <ErrorScreen 
      type="permission" 
      showHomeButton={true}
      showBackButton={true}
    />
  );
};

export default PermissionErrorPage;
