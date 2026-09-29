import { Navigate } from 'react-router-dom';
import { getAccess } from '../api/auth';

function ProtectedRoute({ children }) {
  const token = getAccess();
  if (!token) {
    return <Navigate to="/login" replace />;
  }
  return children;
}

export default ProtectedRoute;