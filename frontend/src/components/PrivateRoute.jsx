import { Navigate, useLocation } from 'react-router-dom';
import useApiStore from '../store/apiStore';

/**
 * PrivateRoute component that protects routes requiring authentication
 * Redirects to /auth if user is not authenticated
 */
const PrivateRoute = ({ children }) => {
  const { isAuthenticated } = useApiStore();
  const location = useLocation();

  if (!isAuthenticated) {
    // Redirect to auth page, saving the attempted location
    return <Navigate to="/auth" state={{ from: location }} replace />;
  }

  return children;
};

export default PrivateRoute;
